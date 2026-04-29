import Job from '../models/Job.js'
import JobApplication from '../models/JobApplication.js'
import User from '../models/User.js'
import { v2 as cloudinary } from 'cloudinary'
import { clerkClient } from '@clerk/express'
import { removeLocalFile, extractCloudinaryAsset } from '../utils/fileHelpers.js'

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
const getSignedResumeUrl = (resumeUrl) => {
    if (!resumeUrl) return null
    if (!resumeUrl.includes('cloudinary.com')) return resumeUrl

    const asset = extractCloudinaryAsset(resumeUrl)
    if (!asset) return resumeUrl

    const expiresAt = Math.floor(Date.now() / 1000) + 3600 // 1 hour

    if (asset.resourceType === 'raw') {
        // private_download_url is the only correct method for raw/PDF files.
        // cloudinary.url() with sign_url does NOT work for raw resources.
        return cloudinary.utils.private_download_url(asset.publicId, 'pdf', {
            resource_type: 'raw',
            expires_at: expiresAt,
            attachment: false,
        })
    }

    // For image resources, use standard signed URL
    return cloudinary.url(asset.publicId, {
        resource_type: asset.resourceType,
        type: 'upload',
        secure: true,
        sign_url: true,
        expires_at: expiresAt,
    })
}

// ─── Controllers ─────────────────────────────────────────────────────────────

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
    const { jobId } = req.body
    const userId = getUserId(req)

    if (!jobId) return res.status(400).json({ success: false, message: 'Job ID is required' })

    try {
        const user = await getOrCreateUser(userId)

        if (!user?.resume) {
            return res.status(400).json({ success: false, message: 'Please upload your resume before applying' })
        }

        const jobData = await Job.findById(jobId)
        if (!jobData) return res.status(404).json({ success: false, message: 'Job not found' })
        if (!jobData.visible) return res.status(400).json({ success: false, message: 'This job is no longer accepting applications' })

        const existing = await JobApplication.findOne({ jobId, userId })
        if (existing) return res.status(409).json({ success: false, message: 'You have already applied for this job' })

        await JobApplication.create({
            companyId: jobData.companyId,
            userId,
            jobId,
            date: Date.now(),
        })

        res.status(201).json({ success: true, message: 'Application submitted successfully!' })
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ success: false, message: 'You have already applied for this job' })
        }
        console.error('[applyForJob]', error.message)
        res.status(500).json({ success: false, message: 'Failed to submit application' })
    }
}

// GET /api/users/applications
export const getUserJobApplications = async (req, res) => {
    try {
        const userId = getUserId(req)
        const applications = await JobApplication.find({ userId })
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
        // Using 'auto' causes inconsistency: Cloudinary returns 'raw' type but
        // the public_id handling differs, breaking signed URL generation later.
        const upload = await cloudinary.uploader.upload(resumeFile.path, {
            resource_type: 'raw',
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