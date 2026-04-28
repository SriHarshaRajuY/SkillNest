import Job from "../models/Job.js"
import JobApplication from "../models/JobApplication.js"
import User from "../models/User.js"
import { v2 as cloudinary } from "cloudinary"
import { clerkClient } from "@clerk/express"
import axios from "axios"

// Get User Data — auto-creates user in MongoDB if not found (handles webhook race condition & local dev)
export const getUserData = async (req, res) => {

    const userId = req.auth.userId

    try {

        let user = await User.findById(userId)

        if (!user) {
            // User not in MongoDB yet.
            // This happens in two scenarios:
            //   1. Local development: webhooks can't reach localhost, so user.created webhook never fires
            //   2. Race condition: user just signed up and webhook hasn't fired yet
            // Solution: fetch user data from Clerk API and create in MongoDB right now.
            try {
                const clerkUser = await clerkClient.users.getUser(userId)

                const name = [clerkUser.firstName, clerkUser.lastName]
                    .filter(Boolean)
                    .join(' ') || 'User'

                user = await User.create({
                    _id: userId,
                    email: clerkUser.emailAddresses[0]?.emailAddress || '',
                    name,
                    image: clerkUser.imageUrl || '',
                    resume: ''
                })

            } catch (createError) {
                // Handle duplicate key: webhook may have fired simultaneously and created the user
                if (createError.code === 11000 || createError.message?.includes('duplicate')) {
                    user = await User.findById(userId)
                }
                if (!user) {
                    return res.json({ success: false, message: 'Failed to initialize user profile. Please try again.' })
                }
            }
        }

        res.json({ success: true, user })

    } catch (error) {
        console.error('getUserData error:', error.message)
        res.json({ success: false, message: error.message })
    }

}


// Apply For Job
export const applyForJob = async (req, res) => {

    const { jobId } = req.body
    const userId = req.auth.userId

    if (!jobId) {
        return res.json({ success: false, message: 'Job ID is required' })
    }

    try {

        const isAlreadyApplied = await JobApplication.findOne({ jobId, userId })

        if (isAlreadyApplied) {
            return res.json({ success: false, message: 'You have already applied for this job' })
        }

        const jobData = await Job.findById(jobId)

        if (!jobData) {
            return res.json({ success: false, message: 'Job not found' })
        }

        if (!jobData.visible) {
            return res.json({ success: false, message: 'This job is no longer accepting applications' })
        }

        await JobApplication.create({
            companyId: jobData.companyId,
            userId,
            jobId,
            date: Date.now()
        })

        res.json({ success: true, message: 'Applied Successfully!' })

    } catch (error) {
        console.error('applyForJob error:', error.message)
        res.json({ success: false, message: error.message })
    }

}

// Get User Applied Applications Data
export const getUserJobApplications = async (req, res) => {

    try {

        const userId = req.auth.userId

        const applications = await JobApplication.find({ userId })
            .populate('companyId', 'name email image')
            .populate('jobId', 'title description location category level salary')
            .exec()

        // Filter out any applications where the job or company was deleted
        const validApplications = applications.filter(app => app.jobId && app.companyId)

        return res.json({ success: true, applications: validApplications })

    } catch (error) {
        console.error('getUserJobApplications error:', error.message)
        res.json({ success: false, message: error.message })
    }

}

// Update User Resume
export const updateUserResume = async (req, res) => {
    try {

        const userId = req.auth.userId
        const resumeFile = req.file

        if (!resumeFile) {
            return res.json({ success: false, message: 'No resume file provided. Please select a PDF file.' })
        }

        const userData = await User.findById(userId)

        if (!userData) {
            return res.json({ success: false, message: 'User not found' })
        }

        // Upload to Cloudinary with auto type detection for correct Content-Type headers
        const resumeUpload = await cloudinary.uploader.upload(resumeFile.path, {
            resource_type: 'auto',
            folder: 'skillnest/resumes',
            use_filename: true,
            unique_filename: true
        })

        userData.resume = resumeUpload.secure_url
        await userData.save()

        return res.json({ success: true, message: 'Resume uploaded successfully!' })

    } catch (error) {
        console.error('updateUserResume error:', error.message)
        res.json({ success: false, message: error.message })
    }
}

// Helper: extract public_id from a Cloudinary URL correctly
// Raw type: public_id INCLUDES the file extension (e.g. 'skillnest/resumes/file.pdf')
// Image type: public_id does NOT include extension (e.g. 'skillnest/resumes/file')
const extractCloudinaryPublicId = (url) => {
    const uploadIndex = url.indexOf('/upload/')
    if (uploadIndex === -1) return null

    const afterUpload = url.substring(uploadIndex + 8) // skip '/upload/'
    const versionMatch = afterUpload.match(/^v\d+\/(.+)$/)
    const publicIdWithExt = versionMatch ? versionMatch[1] : afterUpload

    const isRaw = url.includes('/raw/upload/')
    // Raw files: public_id includes the .pdf extension
    // Image files: public_id does NOT include the extension
    return isRaw ? publicIdWithExt : publicIdWithExt.replace(/\.pdf$/i, '')
}

// Get a signed Cloudinary URL for the user's resume (valid 1 hour)
export const getResumeSignedUrl = async (req, res) => {
    try {
        const userId = req.auth.userId
        const user = await User.findById(userId)

        if (!user?.resume) {
            return res.status(404).json({ success: false, message: 'No resume found. Please upload a resume first.' })
        }

        const url = user.resume

        // Non-Cloudinary URL — return as-is
        if (!url.includes('cloudinary.com') || !url.includes('/upload/')) {
            return res.json({ success: true, url })
        }

        const publicId = extractCloudinaryPublicId(url)
        const resourceType = url.includes('/raw/upload/') ? 'raw' : 'image'

        // Generate a signed URL valid for 1 hour
        // sign_url: true adds a signature so Cloudinary allows access to private/raw files
        const signedUrl = cloudinary.url(publicId, {
            resource_type: resourceType,
            type: 'upload',
            sign_url: true,
            expires_at: Math.floor(Date.now() / 1000) + 3600,
            secure: true,
        })

        res.json({ success: true, url: signedUrl })

    } catch (error) {
        console.error('getResumeSignedUrl error:', error.message)
        // Last resort fallback: return original URL
        try {
            const user = await User.findById(req.auth?.userId)
            if (user?.resume) return res.json({ success: true, url: user.resume })
        } catch (_) { }
        res.status(500).json({ success: false, message: 'Failed to generate resume URL' })
    }
}

// Get a signed Cloudinary URL for an applicant's resume (recruiter use)
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

        if (application.jobId.companyId.toString() !== companyId.toString()) {
            return res.status(403).json({ success: false, message: 'Not authorized' })
        }

        if (!application.userId?.resume) {
            return res.status(404).json({ success: false, message: 'Applicant has no resume' })
        }

        const url = application.userId.resume

        if (!url.includes('cloudinary.com') || !url.includes('/upload/')) {
            return res.json({ success: true, url })
        }

        const publicId = extractCloudinaryPublicId(url)
        const resourceType = url.includes('/raw/upload/') ? 'raw' : 'image'

        const signedUrl = cloudinary.url(publicId, {
            resource_type: resourceType,
            type: 'upload',
            sign_url: true,
            expires_at: Math.floor(Date.now() / 1000) + 3600,
            secure: true,
        })

        res.json({ success: true, url: signedUrl })

    } catch (error) {
        console.error('getApplicantResumeSignedUrl error:', error.message)
        try {
            const appData = await JobApplication.findById(req.params.applicationId).populate('userId', 'resume')
            if (appData?.userId?.resume) return res.json({ success: true, url: appData.userId.resume })
        } catch (_) { }
        res.status(500).json({ success: false, message: 'Failed to generate resume URL' })
    }
}