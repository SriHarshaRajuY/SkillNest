import jwt from 'jsonwebtoken'
import JobApplication from '../models/JobApplication.js'
import User from '../models/User.js'
import { v2 as cloudinary } from 'cloudinary'
import { clerkClient } from '@clerk/express'
import { removeLocalFile, extractCloudinaryAsset } from '../utils/fileHelpers.js'
import { processApplication } from '../services/applicationService.js'
import asyncHandler from '../middleware/asyncHandler.js'
import logger from '../utils/logger.js'
import config from '../config/env.js'
import { getClerkAuth } from '../middleware/authMiddleware.js'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const getUserId = (req) => getClerkAuth(req)?.userId
const RESUME_LINK_TTL_SECONDS = 3600

const normalizeResumeAsset = (asset) => {
    if (!asset?.publicId) return null
    return {
        publicId: asset.publicId,
        resourceType: asset.resourceType || 'raw',
        deliveryType: asset.deliveryType || 'private',
        extension: asset.extension || 'pdf',
    }
}

const getResumeSource = (resumeSource) => {
    if (!resumeSource) return { resumeUrl: '', resumeAsset: null }
    if (typeof resumeSource === 'string') return { resumeUrl: resumeSource, resumeAsset: null }
    return {
        resumeUrl: resumeSource.resume || '',
        resumeAsset: normalizeResumeAsset(resumeSource.resumeAsset),
    }
}

export const getStoredResumeAsset = (resumeSource) => {
    const { resumeUrl, resumeAsset } = getResumeSource(resumeSource)
    return resumeAsset || extractCloudinaryAsset(resumeUrl)
}

const getAdminResumePublicId = (asset) => {
    if (!asset?.publicId) return ''
    if (asset.resourceType === 'raw') {
        return asset.publicId.includes('.')
            ? asset.publicId
            : `${asset.publicId}.${asset.extension || 'pdf'}`
    }
    return asset.publicId.replace(/\.[^.]+$/, '')
}

const getResumeAssetUrl = (asset) => {
    if (!asset?.publicId) return null
    if (asset.resourceType === 'image' && asset.deliveryType === 'upload') {
        return cloudinary.url(asset.publicId.replace(/\.[^.]+$/, ''), {
            secure: true,
            resource_type: 'image',
            type: 'upload',
            format: asset.extension || undefined,
        })
    }

    const publicId = getAdminResumePublicId(asset)
    const format = asset.resourceType === 'raw' ? '' : (asset.extension || '')

    return cloudinary.utils.private_download_url(publicId, format, {
        resource_type: asset.resourceType || 'raw',
        type: asset.deliveryType || 'private',
        expires_at: Math.floor(Date.now() / 1000) + RESUME_LINK_TTL_SECONDS,
        attachment: false,
    })
}

const verifyCloudinaryResumeAsset = async (resumeSource) => {
    const asset = getStoredResumeAsset(resumeSource)
    if (!asset) return false
    try {
        await cloudinary.api.resource(getAdminResumePublicId(asset), {
            resource_type: asset.resourceType,
            type: asset.deliveryType || 'private',
        })
        return true
    } catch (error) {
        if (error?.http_code === 404) return false
        throw error
    }
}

const persistResumeMetadataIfMissing = async (userDoc) => {
    if (!userDoc?.resume || userDoc.resumeAsset?.publicId) return
    const parsed = extractCloudinaryAsset(userDoc.resume)
    if (!parsed) return
    userDoc.resumeAsset = normalizeResumeAsset(parsed)
    await userDoc.save().catch((error) => {
        logger.warn('[persistResumeMetadataIfMissing]', error)
    })
}

const buildResumeAssetFromUpload = (upload) => normalizeResumeAsset({
    publicId: upload.public_id,
    resourceType: upload.resource_type,
    deliveryType: upload.type,
    extension: upload.format || extractCloudinaryAsset(upload.secure_url)?.extension || 'pdf',
})

const destroyStoredResume = async (resumeSource) => {
    const asset = getStoredResumeAsset(resumeSource)
    if (!asset) return
    await cloudinary.uploader.destroy(getAdminResumePublicId(asset), {
        resource_type: asset.resourceType,
        type: asset.deliveryType || 'private',
        invalidate: true,
    })
}

const userProfileFromClaims = (auth) => {
    const claims = auth?.sessionClaims || {}
    const email = claims.email || claims.email_address || claims.primary_email_address || ''
    const firstName = claims.first_name || claims.given_name || ''
    const lastName = claims.last_name || claims.family_name || ''
    const name = [firstName, lastName].filter(Boolean).join(' ') || claims.name || 'User'

    return {
        email: String(email).toLowerCase(),
        name,
        image: claims.picture || claims.image_url || '',
    }
}

const getOrCreateUser = async (req) => {
    const auth = getClerkAuth(req)
    const userId = auth?.userId
    let user = await User.findById(userId)
    if (user) return user

    let profile = userProfileFromClaims(auth)
    if (!profile.email) {
        const clerkUser = await clerkClient.users.getUser(userId)
        profile = {
            email: clerkUser.emailAddresses[0]?.emailAddress?.toLowerCase() || '',
            name: [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || 'User',
            image: clerkUser.imageUrl || '',
        }
    }

    if (!profile.email) {
        throw new Error('Could not resolve Clerk user email')
    }

    try {
        user = await User.create({
            _id: userId,
            email: profile.email,
            name: profile.name,
            image: profile.image,
            resume: '',
            resumeAsset: null,
        })
    } catch (err) {
        if (err.code === 11000) {
            user = await User.findById(userId)
        } else {
            throw err
        }
    }
    return user
}

export const getSignedResumeUrl = (resumeSource) => {
    const { resumeUrl } = getResumeSource(resumeSource)
    if (!resumeUrl) return null
    if (!resumeUrl.includes('cloudinary.com')) return resumeUrl
    try {
        return getResumeAssetUrl(getStoredResumeAsset(resumeSource)) || resumeUrl
    } catch (error) {
        logger.warn('[getSignedResumeUrl] Falling back to stored resume URL', { error: error.message })
        return resumeUrl
    }
}

export const fetchResumeBuffer = async (resumeSource, { timeoutMs = 10000 } = {}) => {
    const signedUrl = getSignedResumeUrl(resumeSource)
    if (!signedUrl) {
        throw new Error('Could not generate a secure link to the resume.')
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    try {
        const response = await fetch(signedUrl, { signal: controller.signal })
        if (!response.ok) {
            throw new Error(`Cloudinary responded with ${response.status}: ${response.statusText}`)
        }
        const arrayBuffer = await response.arrayBuffer()
        return { url: signedUrl, buffer: Buffer.from(arrayBuffer) }
    } catch (error) {
        if (error.name === 'AbortError') {
            throw new Error('Request to fetch resume timed out.')
        }
        throw error
    } finally {
        clearTimeout(timeoutId)
    }
}

// ─── Controllers ─────────────────────────────────────────────────────────────

// @desc    Get short-lived token for real-time messaging
// @route   GET /api/users/realtime-token
// @access  Private (User)
export const getRealtimeToken = asyncHandler(async (req, res) => {
    const userId = getUserId(req)
    const token = jwt.sign(
        { userId, role: 'candidate' },
        config.jwtSecret,
        { expiresIn: '24h' },
    )
    res.json({ 
        success: true, 
        message: 'Realtime token issued',
        data: { token } 
    })
})

// @desc    Get user profile data
// @route   GET /api/users/user
// @access  Private (User)
export const getUserData = asyncHandler(async (req, res) => {
    const user = await getOrCreateUser(req)
    if (!user) {
        res.status(404)
        throw new Error('User not found')
    }
    await persistResumeMetadataIfMissing(user)
    res.json({ 
        success: true, 
        message: 'User data fetched successfully',
        data: { user } 
    })
})

// @desc    Apply for a job
// @route   POST /api/users/apply
// @access  Private (User)
export const applyForJob = asyncHandler(async (req, res) => {
    const userId = getUserId(req)
    const { jobId } = req.body

    await getOrCreateUser(req)
    await processApplication({
        userId,
        jobId
    })

    res.status(201).json({ 
        success: true, 
        message: 'Application submitted successfully' 
    })
})

// @desc    Get user's job applications
// @route   GET /api/users/applications
// @access  Private (User)
export const getUserJobApplications = asyncHandler(async (req, res) => {
    const userId = getUserId(req)
    const page = Math.max(1, parseInt(req.query.page) || 1)
    const limit = Math.min(100, parseInt(req.query.limit) || 10)
    const skip = (page - 1) * limit

    const filter = { userId }
    if (req.query.status) filter.status = req.query.status

    const totalResults = await JobApplication.countDocuments(filter)
    const applications = await JobApplication.find(filter)
        .select('-internalNotes')
        .populate('companyId', 'name image')
        .populate('jobId', 'title location category level salary')
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit)
        .lean()

    res.json({ 
        success: true, 
        message: 'Applications fetched successfully',
        data: {
            applications,
            pagination: {
                totalResults,
                totalPages: Math.ceil(totalResults / limit),
                currentPage: page,
                limit
            }
        }
    })
})

// @desc    Update candidate resume
// @route   POST /api/users/update-resume
// @access  Private (User)
export const updateUserResume = asyncHandler(async (req, res) => {
    const userId = getUserId(req)
    const resumeFile = req.file

    if (!resumeFile) {
        res.status(400)
        throw new Error('No resume file provided')
    }

    try {
        const user = await getOrCreateUser(req)
        if (!user) {
            res.status(404)
            throw new Error('User not found')
        }

        if (user.resume) {
            await destroyStoredResume(user).catch(err => logger.warn('[updateUserResume] Could not delete old resume', err))
        }

        const upload = await cloudinary.uploader.upload(resumeFile.path, {
            resource_type: 'raw',
            type: 'private',
            folder: 'skillnest/resumes',
            use_filename: true,
            unique_filename: true,
        })

        user.resume = upload.secure_url
        user.resumeAsset = buildResumeAssetFromUpload(upload)
        await user.save()

        res.json({ 
            success: true, 
            message: 'Resume uploaded successfully',
            data: { resume: user.resume } 
        })
    } finally {
        removeLocalFile(resumeFile?.path)
    }
})

// @desc    Get signed URL for user's own resume
// @route   GET /api/users/resume
// @access  Private (User)
export const getResumeSignedUrl = asyncHandler(async (req, res) => {
    const user = await User.findById(getUserId(req)).lean()
    if (!user?.resume) {
        res.status(404)
        throw new Error('No resume found')
    }

    const url = getSignedResumeUrl(user)
    if (!url) {
        res.status(404)
        throw new Error('Resume file not found')
    }

    res.json({ 
        success: true, 
        message: 'Signed URL generated',
        data: { url } 
    })
})

// @desc    Get signed URL for applicant's resume (Recruiter)
// @route   GET /api/company/applicant-resume/:applicationId
// @access  Private (Company)
export const getApplicantResumeSignedUrl = asyncHandler(async (req, res) => {
    const { applicationId } = req.params
    const companyId = req.company._id

    const application = await JobApplication.findById(applicationId)
        .populate('userId', 'resume resumeAsset name')
        .populate('jobId', 'companyId')
        .lean()

    if (!application) {
        res.status(404)
        throw new Error('Application not found')
    }

    if (application.jobId?.companyId?.toString() !== companyId.toString()) {
        res.status(403)
        throw new Error('Not authorized to view this resume')
    }

    if (!application.userId?.resume) {
        res.status(404)
        throw new Error('No resume found for this applicant')
    }

    const url = getSignedResumeUrl(application.userId)
    res.json({ 
        success: true, 
        message: 'Signed URL generated',
        data: { url } 
    })
})
