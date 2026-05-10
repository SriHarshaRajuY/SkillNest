import jwt from 'jsonwebtoken'
import Job from '../models/Job.js'
import JobApplication from '../models/JobApplication.js'
import User from '../models/User.js'
import { v2 as cloudinary } from 'cloudinary'
import { clerkClient } from '@clerk/express'
import { removeLocalFile, extractCloudinaryAsset } from '../utils/fileHelpers.js'
import Joi from 'joi'
import { processApplication } from '../services/applicationService.js'
import aiService from '../services/aiService.js'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const getUserId = (req) => req.auth?.userId
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
        console.warn('[persistResumeMetadataIfMissing]', error.message)
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

/**
 * Get or auto-create a MongoDB user record for a Clerk userId.
 * Handles webhook race conditions and local dev (no webhooks).
 */
const getOrCreateUser = async (userId) => {
    let user = await User.findById(userId)
    if (user) return user

    // User not in MongoDB yet — fetch from Clerk and create
    const clerkUser = await clerkClient.users.getUser(userId)
    const name = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || 'User'

    try {
        user = await User.create({
            _id: userId,
            email: clerkUser.emailAddresses[0]?.emailAddress?.toLowerCase() || '',
            name,
            image: clerkUser.imageUrl || '',
            resume: '',
            resumeAsset: null,
        })
    } catch (err) {
        // Handle race condition: duplicate key means webhook created it first
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
    return getResumeAssetUrl(getStoredResumeAsset(resumeSource)) || resumeUrl
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

// GET /api/users/realtime-token — short-lived JWT for Socket.io (candidate)
export const getRealtimeToken = async (req, res) => {
    try {
        const userId = getUserId(req)
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Unauthorized' })
        }
        const token = jwt.sign(
            { userId, role: 'candidate' },
            process.env.JWT_SECRET,
            { expiresIn: '24h' },
        )
        res.json({ success: true, token })
    } catch (error) {
        console.error('[getRealtimeToken]', error.message)
        res.status(500).json({ success: false, message: 'Failed to issue realtime token' })
    }
}

// GET /api/users/user
export const getUserData = async (req, res) => {
    try {
        const user = await getOrCreateUser(getUserId(req))
        if (!user) return res.status(404).json({ success: false, message: 'User not found' })
        await persistResumeMetadataIfMissing(user)
        res.json({ success: true, user })
    } catch (error) {
        console.error('[getUserData]', error.message)
        res.status(500).json({ success: false, message: 'Failed to load user profile' })
    }
}

// POST /api/users/apply
export const applyForJob = async (req, res) => {
    const userId = getUserId(req)

    // Joi Validation for Input
    const schema = Joi.object({
        jobId: Joi.string().required(),
        assessmentScore: Joi.number().min(0).max(100).optional()
    })

    const { error, value } = schema.validate(req.body)
    if (error) {
        return res.status(400).json({ success: false, message: error.details[0].message })
    }

    try {
        await processApplication({
            userId,
            jobId: value.jobId,
            assessmentScore: value.assessmentScore
        })

        res.status(201).json({ success: true, message: 'Application submitted successfully!' })
    } catch (err) {
        // Handle explicit logic errors gracefully
        if (['User not found', 'Job not found', 'This job is no longer accepting applications', 'Please upload your resume before applying'].includes(err.message)) {
            return res.status(400).json({ success: false, message: err.message })
        }
        if (err.message === 'You have already applied for this job' || err.code === 11000) {
            return res.status(409).json({ success: false, message: 'You have already applied for this job' })
        }
        console.error('[applyForJob]', err.message)
        res.status(500).json({ success: false, message: 'Failed to submit application' })
    }
}

// GET /api/users/applications (Paginated)
export const getUserJobApplications = async (req, res) => {
    try {
        const userId = getUserId(req)
        const page = parseInt(req.query.page) || 1
        const limit = parseInt(req.query.limit) || 10
        const skip = (page - 1) * limit

        const totalResults = await JobApplication.countDocuments({ userId })
        const applications = await JobApplication.find({ userId })
            .select('-internalNotes')
            .populate('companyId', 'name email image')
            .populate('jobId', 'title description location category level salary')
            .sort({ date: -1 })
            .skip(skip)
            .limit(limit)

        const valid = applications.filter(app => app.jobId && app.companyId)
        res.json({ 
            success: true, 
            applications: valid,
            pagination: {
                totalResults,
                totalPages: Math.ceil(totalResults / limit),
                currentPage: page,
                limit
            }
        })
    } catch (error) {
        console.error('[getUserJobApplications]', error.message)
        res.status(500).json({ success: false, message: 'Failed to load applications' })
    }
}

// POST /api/users/update-resume
export const updateUserResume = async (req, res) => {
    const userId = getUserId(req)
    const resumeFile = req.file

    if (!resumeFile) {
        return res.status(400).json({ success: false, message: 'No resume file provided. Please select a PDF file.' })
    }

    try {
        const user = await getOrCreateUser(userId)
        if (!user) return res.status(404).json({ success: false, message: 'User not found' })

        // Delete old resume from Cloudinary if exists
        if (user.resume) {
            await destroyStoredResume(user).catch(err => console.warn('[updateUserResume] Could not delete old resume:', err.message))
        }

        // Upload new resume — must use resource_type: 'raw' for PDFs
        // We use type: 'private' to ensure Cloudinary's Admin API private_download_url
        // works securely without triggering Strict Delivery profile blocks.
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

        res.json({ success: true, message: 'Resume uploaded successfully!' })
    } catch (error) {
        console.error('[updateUserResume]', error.message)
        res.status(500).json({ success: false, message: 'Failed to upload resume' })
    } finally {
        removeLocalFile(resumeFile?.path)
    }
}

// GET /api/users/resume — returns 1-hour signed URL to view own resume
export const getResumeSignedUrl = async (req, res) => {
    try {
        const user = await User.findById(getUserId(req))
        if (!user?.resume) {
            return res.status(404).json({ success: false, message: 'No resume found. Please upload a resume first.' })
        }
        await persistResumeMetadataIfMissing(user)
        const exists = await verifyCloudinaryResumeAsset(user)
        if (!exists) {
            return res.status(404).json({ success: false, message: 'Resume file could not be found in storage. Please upload it again.' })
        }
        const url = getSignedResumeUrl(user)
        res.json({ success: true, url })
    } catch (error) {
        console.error('[getResumeSignedUrl]', error.message)
        res.status(500).json({ success: false, message: 'Failed to generate resume link' })
    }
}

// GET /api/company/applicant-resume/:applicationId — recruiter views applicant PDF
export const getApplicantResumeSignedUrl = async (req, res) => {
    try {
        const { applicationId } = req.params
        const companyId = req.company._id

        const application = await JobApplication.findById(applicationId)
            .populate('userId', 'resume resumeAsset name')
            .populate('jobId', 'companyId')

        if (!application) {
            return res.status(404).json({ success: false, message: 'Application not found' })
        }

        // Verify recruiter owns the job this application is for
        if (application.jobId?.companyId?.toString() !== companyId.toString()) {
            return res.status(403).json({ success: false, message: 'Not authorized to view this resume' })
        }

        if (!application.userId?.resume) {
            return res.status(404).json({ success: false, message: 'This applicant has not uploaded a resume' })
        }

        await persistResumeMetadataIfMissing(application.userId)
        const exists = await verifyCloudinaryResumeAsset(application.userId)
        if (!exists) {
            return res.status(404).json({ success: false, message: 'Resume file could not be found in storage. Please ask the candidate to upload it again.' })
        }
        const url = getSignedResumeUrl(application.userId)
        res.json({ success: true, url })
    } catch (error) {
        console.error('[getApplicantResumeSignedUrl]', error.message)
        res.status(500).json({ success: false, message: 'Failed to generate resume link' })
    }
}

// GET /api/users/optimize-resume/:jobId
export const optimizeResume = async (req, res) => {
    try {
        const userId = getUserId(req)
        const { jobId } = req.params

        const user = await User.findById(userId)
        const job = await Job.findById(jobId)

        if (!user?.resume) {
            return res.status(400).json({ success: false, message: 'Please upload a resume first' })
        }
        if (!job) {
            return res.status(404).json({ success: false, message: 'Job not found' })
        }

        await persistResumeMetadataIfMissing(user)
        const { buffer } = await fetchResumeBuffer(user)
        const resumeText = await aiService.parsePDF(buffer)

        const optimization = await aiService.generateResumeOptimization(resumeText, job.description)

        res.json({ success: true, ...optimization })
    } catch (error) {
        console.error('[optimizeResume]', error.message)
        res.status(500).json({ success: false, message: 'Failed to optimize resume' })
    }
}
