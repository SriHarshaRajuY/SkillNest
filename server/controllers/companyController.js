import Company from '../models/Company.js'
import bcrypt from 'bcrypt'
import { v2 as cloudinary } from 'cloudinary'
import generateToken from '../utils/generateToken.js'
import Job from '../models/Job.js'
import JobApplication, { PIPELINE_STAGES } from '../models/JobApplication.js'
import { emitToApplication } from '../realtime/socketHub.js'
import { removeLocalFile } from '../utils/fileHelpers.js'
import { getSignedResumeUrl } from './userController.js'
import aiService from '../services/aiService.js'
import asyncHandler from '../middleware/asyncHandler.js'
import { cacheGet, cacheSet } from '../utils/redisClient.js'

// ─── Register a new company ───────────────────────────────────────────────────
export const registerCompany = async (req, res) => {
    const { name, email, password } = req.body
    const imageFile = req.file

    if (!name || !email || !password || !imageFile) {
        removeLocalFile(imageFile?.path)
        return res.status(400).json({ success: false, message: 'Name, email, password, and company logo are required' })
    }

    if (password.length < 8) {
        removeLocalFile(imageFile?.path)
        return res.status(400).json({ success: false, message: 'Password must be at least 8 characters long' })
    }

    try {
        const exists = await Company.findOne({ email: email.toLowerCase().trim() })
        if (exists) {
            return res.status(409).json({ success: false, message: 'An account with this email already exists. Please login instead.' })
        }

        const hashPassword = await bcrypt.hash(password, 10)
        const imageUpload = await cloudinary.uploader.upload(imageFile.path, {
            folder: 'skillnest/company-logos',
        })

        const company = await Company.create({
            name: name.trim(),
            email: email.toLowerCase().trim(),
            password: hashPassword,
            image: imageUpload.secure_url,
        })

        res.status(201).json({
            success: true,
            company: { _id: company._id, name: company.name, email: company.email, image: company.image },
            token: generateToken(company._id),
        })
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ success: false, message: 'An account with this email already exists.' })
        }
        console.error('[registerCompany]', error.message)
        res.status(500).json({ success: false, message: 'Registration failed. Please try again.' })
    } finally {
        removeLocalFile(imageFile?.path)
    }
}

// ─── Login company ────────────────────────────────────────────────────────────
export const loginCompany = async (req, res) => {
    const { email, password } = req.body

    if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Email and password are required' })
    }

    try {
        const company = await Company.findOne({ email: email.toLowerCase().trim() })
        if (!company) {
            return res.status(401).json({ success: false, message: 'Invalid email or password' })
        }

        const isMatch = await bcrypt.compare(password, company.password)
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid email or password' })
        }

        res.json({
            success: true,
            company: { _id: company._id, name: company.name, email: company.email, image: company.image },
            token: generateToken(company._id),
        })
    } catch (error) {
        console.error('[loginCompany]', error.message)
        res.status(500).json({ success: false, message: 'Login failed. Please try again.' })
    }
}

// ─── Get company data ─────────────────────────────────────────────────────────
export const getCompanyData = async (req, res) => {
    try {
        // req.company is set by protectCompany middleware (password already excluded)
        res.json({ success: true, company: req.company })
    } catch (error) {
        console.error('[getCompanyData]', error.message)
        res.status(500).json({ success: false, message: 'Failed to load company data' })
    }
}

// ─── Post a new job ───────────────────────────────────────────────────────────
export const postJob = async (req, res) => {
    const { title, description, location, salary, level, category } = req.body
    const companyId = req.company._id

    if (!title || !description || !location || !salary || !level || !category) {
        return res.status(400).json({ success: false, message: 'All fields are required' })
    }

    // Reject empty Quill editor output
    const trimmedDescription = description.trim()
    if (!trimmedDescription || trimmedDescription === '<p><br></p>') {
        return res.status(400).json({ success: false, message: 'Please enter a job description' })
    }

    if (isNaN(Number(salary)) || Number(salary) <= 0) {
        return res.status(400).json({ success: false, message: 'Please enter a valid salary' })
    }

    try {
        const job = await Job.create({
            title: title.trim(),
            description: trimmedDescription,
            location: location.trim(),
            salary: Number(salary),
            companyId,
            date: Date.now(),
            level,
            category,
        })

        res.status(201).json({ success: true, message: 'Job posted successfully!', job })
    } catch (error) {
        console.error('[postJob]', error.message)
        res.status(500).json({ success: false, message: 'Failed to post job' })
    }
}

// ─── Get applicants for this company's jobs ───────────────────────────────────
export const getCompanyJobApplicants = async (req, res) => {
    try {
        const companyId = req.company._id
        const applications = await JobApplication.find({ companyId })
            .populate('userId', 'name image resume')
            .populate('jobId', 'title location category level salary')
            .sort({ date: -1 })

        res.json({ success: true, applications })
    } catch (error) {
        console.error('[getCompanyJobApplicants]', error.message)
        res.status(500).json({ success: false, message: 'Failed to load applicants' })
    }
}

// ─── Get all jobs posted by this company ─────────────────────────────────────
export const getCompanyPostedJobs = async (req, res) => {
    try {
        const companyId = req.company._id
        const jobs = await Job.find({ companyId }).sort({ date: -1 })

        const jobsData = await Promise.all(jobs.map(async (job) => {
            const count = await JobApplication.countDocuments({ jobId: job._id })
            return { ...job.toObject(), applicants: count }
        }))

        res.json({ success: true, jobsData })
    } catch (error) {
        console.error('[getCompanyPostedJobs]', error.message)
        res.status(500).json({ success: false, message: 'Failed to load jobs' })
    }
}

// ─── Pipeline / legacy status ───────────────────────────────────────────────────
export const changeJobApplicationStatus = async (req, res) => {
    const { id, pipelineStage, status } = req.body

    if (!id) {
        return res.status(400).json({ success: false, message: 'Application ID is required' })
    }

    let stage = pipelineStage
    if (!stage && status) {
        if (status === 'Accepted') stage = 'Offer'
        else if (status === 'Rejected') stage = 'Rejected'
        else stage = 'Applied'
    }

    if (!stage || !PIPELINE_STAGES.includes(stage)) {
        return res.status(400).json({
            success: false,
            message: `pipelineStage must be one of: ${PIPELINE_STAGES.join(', ')}`,
        })
    }

    try {
        const application = await JobApplication.findOne({
            _id: id,
            companyId: req.company._id,
        })
        if (!application) {
            return res.status(404).json({ success: false, message: 'Application not found' })
        }

        application.pipelineStage = stage
        await application.save()

        await application.populate('userId', 'name image resume')
        await application.populate('jobId', 'title location category level salary')

        emitToApplication(String(application._id), 'pipeline:updated', {
            applicationId: String(application._id),
            pipelineStage: application.pipelineStage,
            pipelineHistory: application.pipelineHistory,
            status: application.status,
            updatedAt: application.updatedAt,
        })

        res.json({
            success: true,
            message: 'Pipeline updated',
            application,
        })
    } catch (error) {
        console.error('[changeJobApplicationStatus]', error.message)
        res.status(500).json({ success: false, message: 'Failed to update pipeline' })
    }
}

// ─── Internal hiring-team notes (recruiters only, real-time) ───────────────────
export const addInternalNote = async (req, res) => {
    const { applicationId } = req.params
    const { body, rating } = req.body
    const text = typeof body === 'string' ? body.trim() : ''

    if (!applicationId || !text) {
        return res.status(400).json({ success: false, message: 'Note text is required' })
    }

    let ratingNum
    if (rating !== undefined && rating !== null && rating !== '') {
        ratingNum = Number(rating)
        if (Number.isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
            return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5' })
        }
    }

    try {
        const application = await JobApplication.findOne({
            _id: applicationId,
            companyId: req.company._id,
        })

        if (!application) {
            return res.status(404).json({ success: false, message: 'Application not found' })
        }

        application.internalNotes.push({
            authorCompanyId: req.company._id,
            authorName: req.company.name,
            body: text.slice(0, 4000),
            rating: ratingNum,
        })
        await application.save()

        emitToApplication(String(application._id), 'feedback:updated', {
            applicationId: String(application._id),
            internalNotes: application.internalNotes,
        })

        res.status(201).json({ success: true, internalNotes: application.internalNotes })
    } catch (error) {
        console.error('[addInternalNote]', error.message)
        res.status(500).json({ success: false, message: 'Failed to save note' })
    }
}

// ─── Toggle job visibility ────────────────────────────────────────────────────
export const changeVisibility = async (req, res) => {
    const { id } = req.body

    if (!id) {
        return res.status(400).json({ success: false, message: 'Job ID is required' })
    }

    try {
        const job = await Job.findById(id)
        if (!job) return res.status(404).json({ success: false, message: 'Job not found' })

        if (job.companyId.toString() !== req.company._id.toString()) {
            return res.status(403).json({ success: false, message: 'Not authorized to modify this job' })
        }

        job.visible = !job.visible
        await job.save()

        res.json({ success: true, message: `Job is now ${job.visible ? 'visible' : 'hidden'}`, job })
    } catch (error) {
        console.error('[changeVisibility]', error.message)
        res.status(500).json({ success: false, message: 'Failed to update job visibility' })
    }
}


// ─── AI Resume Matcher ────────────────────────────────────────────────────────
export const matchResume = asyncHandler(async (req, res) => {
    const { applicationId } = req.params;
    const companyId = req.company._id;

    // Check cache first
    const cacheKey = `match:${applicationId}`;
    const cached = await cacheGet(cacheKey);
    if (cached) {
        return res.json({ success: true, ...cached, cached: true });
    }

    const application = await JobApplication.findById(applicationId)
        .populate('userId', 'resume')
        .populate('jobId', 'description companyId');

    if (!application) {
        return res.status(404).json({ success: false, message: 'Application not found' });
    }

    if (application.jobId.companyId.toString() !== companyId.toString()) {
        return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (!application.userId?.resume) {
        return res.status(400).json({ success: false, message: 'No resume uploaded by user' });
    }

    // Fetch resume PDF from Cloudinary using a signed URL
    const signedUrl = getSignedResumeUrl(application.userId.resume);
    const response = await fetch(signedUrl);
    if (!response.ok) throw new Error('Failed to fetch resume securely. Status: ' + response.status);
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Process with AI Service
    const resumeText = await aiService.parsePDF(buffer);
    const jobDescription = application.jobId.description;
    
    const result = await aiService.generateMatchScore(resumeText, jobDescription);

    // Store in cache for 24 hours
    await cacheSet(cacheKey, { score: result.score, reason: result.reason });

    res.json({ success: true, score: result.score, reason: result.reason });
})

// ─── AI Diversity Audit ───────────────────────────────────────────────────────
export const auditJob = asyncHandler(async (req, res) => {
    const { description } = req.body;

    if (!description || description.trim() === '' || description === '<p><br></p>') {
        return res.status(400).json({ success: false, message: 'Job description is required for audit.' });
    }

    try {
        const result = await aiService.auditJobDescription(description);
        res.json({ success: true, audit: result });
    } catch (error) {
        console.error('[auditJob]', error.message);
        res.status(500).json({ success: false, message: 'Failed to perform diversity audit.' });
    }
});