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

/**
 * Generate a time-limited signed URL for a Cloudinary-hosted PDF (raw resource).
 * Uses private_download_url which is the correct API for raw resource type.
 */
export const getSignedResumeUrl = (resumeUrl) => {
    if (!resumeUrl) return null
    if (!resumeUrl.includes('cloudinary.com')) return resumeUrl

    const asset = extractCloudinaryAsset(resumeUrl)
    if (!asset) return resumeUrl

    const expiresAt = Math.floor(Date.now() / 1000) + 3600 // 1 hour

    if (asset.resourceType === 'raw') {
        // Since we migrated assets to private, or for new private uploads, private_download_url works.
        // The publicId already includes the extension.
        return cloudinary.utils.private_download_url(asset.publicId, '', {
            resource_type: 'raw',
            expires_at: expiresAt,
            attachment: false,
        })
    }

    // For image resources, private_download_url also works if they are private.
    return cloudinary.utils.private_download_url(asset.publicId, asset.extension || 'pdf', {
        resource_type: asset.resourceType,
        expires_at: expiresAt,
        attachment: false,
    })
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

// GET /api/users/applications
export const getUserJobApplications = async (req, res) => {
    try {
        const userId = getUserId(req)
        const applications = await JobApplication.find({ userId })
            .select('-internalNotes')
            .populate('companyId', 'name email image')
            .populate('jobId', 'title description location category level salary')
            .sort({ date: -1 })

        const valid = applications.filter(app => app.jobId && app.companyId)
        res.json({ success: true, applications: valid })
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
            const old = extractCloudinaryAsset(user.resume)
            if (old) {
                await cloudinary.uploader.destroy(old.publicId, {
                    resource_type: old.resourceType,
                    invalidate: true,
                }).catch(err => console.warn('[updateUserResume] Could not delete old resume:', err.message))
            }
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
        const url = getSignedResumeUrl(user.resume)
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
            .populate('userId', 'resume name')
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

        const url = getSignedResumeUrl(application.userId.resume)
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

        const signedUrl = getSignedResumeUrl(user.resume)
        const response = await fetch(signedUrl)
        if (!response.ok) throw new Error('Failed to fetch resume')
        
        const arrayBuffer = await response.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        const resumeText = await aiService.parsePDF(buffer)

        const optimization = await aiService.generateResumeOptimization(resumeText, job.description)

        res.json({ success: true, ...optimization })
    } catch (error) {
        console.error('[optimizeResume]', error.message)
        res.status(500).json({ success: false, message: 'Failed to optimize resume' })
    }
}