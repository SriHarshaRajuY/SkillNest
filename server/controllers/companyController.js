import Company from '../models/Company.js'
import bcrypt from 'bcrypt'
import { v2 as cloudinary } from 'cloudinary'
import mongoose from 'mongoose'
import generateToken from '../utils/generateToken.js'
import Job from '../models/Job.js'
import JobApplication, { PIPELINE_STAGES } from '../models/JobApplication.js'
import { emitToApplication } from '../realtime/socketHub.js'
import { removeLocalFile } from '../utils/fileHelpers.js'
import { fetchResumeBuffer } from './userController.js'
import aiService from '../services/aiService.js'
import asyncHandler from '../middleware/asyncHandler.js'
import { cacheGet, cacheSet } from '../utils/redisClient.js'
import logger from '../utils/logger.js'

// @desc    Register a new company
// @route   POST /api/company/register
// @access  Public
export const registerCompany = asyncHandler(async (req, res) => {
    const { name, email, password } = req.body
    const imageFile = req.file

    if (!imageFile) {
        res.status(400)
        throw new Error('Company logo is required')
    }

    try {
        const exists = await Company.findOne({ email: email.toLowerCase().trim() })
        if (exists) {
            res.status(409)
            throw new Error('An account with this email already exists')
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
            message: 'Company registered successfully',
            data: {
                company: { _id: company._id, name: company.name, email: company.email, image: company.image },
                token: generateToken(company._id),
            }
        })
    } finally {
        removeLocalFile(imageFile?.path)
    }
})

// @desc    Login company
// @route   POST /api/company/login
// @access  Public
export const loginCompany = asyncHandler(async (req, res) => {
    const { email, password } = req.body

    const company = await Company.findOne({ email: email.toLowerCase().trim() })
    if (!company) {
        res.status(401)
        throw new Error('Invalid email or password')
    }

    const isMatch = await bcrypt.compare(password, company.password)
    if (!isMatch) {
        res.status(401)
        throw new Error('Invalid email or password')
    }

    res.json({
        success: true,
        message: 'Login successful',
        data: {
            company: { _id: company._id, name: company.name, email: company.email, image: company.image },
            token: generateToken(company._id),
        }
    })
})

// @desc    Get company data
// @route   GET /api/company/company
// @access  Private (Company)
export const getCompanyData = asyncHandler(async (req, res) => {
    res.json({ 
        success: true, 
        message: 'Company data fetched successfully',
        data: { company: req.company } 
    })
})

// @desc    Post a new job
// @route   POST /api/company/post-job
// @access  Private (Company)
export const postJob = asyncHandler(async (req, res) => {
    const { title, description, location, salary, level, category } = req.body
    const companyId = req.company._id

    const trimmedDescription = description.trim()
    if (!trimmedDescription || trimmedDescription === '<p><br></p>') {
        res.status(400)
        throw new Error('Please enter a job description')
    }

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

    res.status(201).json({ 
        success: true, 
        message: 'Job posted successfully', 
        data: { job } 
    })
})

// @desc    Get applicants for this company's jobs
// @route   GET /api/company/applicants
// @access  Private (Company)
export const getCompanyJobApplicants = asyncHandler(async (req, res) => {
    const companyId = req.company._id
    const page = Math.max(1, parseInt(req.query.page) || 1)
    const limit = Math.min(100, parseInt(req.query.limit) || 20)
    const skip = (page - 1) * limit

    const totalResults = await JobApplication.countDocuments({ companyId })
    const applications = await JobApplication.find({ companyId })
        .populate('userId', 'name image resume')
        .populate('jobId', 'title location category level salary')
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit)
        .lean()

    res.json({ 
        success: true, 
        message: 'Applicants fetched successfully',
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

// @desc    Get all jobs posted by this company
// @route   GET /api/company/list-jobs
// @access  Private (Company)
export const getCompanyPostedJobs = asyncHandler(async (req, res) => {
    const companyId = req.company._id
    const page = Math.max(1, parseInt(req.query.page) || 1)
    const limit = Math.min(100, parseInt(req.query.limit) || 20)
    const skip = (page - 1) * limit

    const totalResults = await Job.countDocuments({ companyId })
    const jobs = await Job.find({ companyId })
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit)
        .lean()

    const jobsData = await Promise.all(jobs.map(async (job) => {
        const count = await JobApplication.countDocuments({ jobId: job._id })
        return { ...job, applicants: count }
    }))

    res.json({ 
        success: true, 
        message: 'Posted jobs fetched successfully',
        data: {
            jobs: jobsData,
            pagination: {
                totalResults,
                totalPages: Math.ceil(totalResults / limit),
                currentPage: page,
                limit
            }
        }
    })
})

// @desc    Update application pipeline stage
// @route   POST /api/company/change-status
// @access  Private (Company)
export const changeJobApplicationStatus = asyncHandler(async (req, res) => {
    const { id, pipelineStage } = req.body

    const application = await JobApplication.findOne({
        _id: id,
        companyId: req.company._id,
    })
    
    if (!application) {
        res.status(404)
        throw new Error('Application not found')
    }

    application.pipelineStage = pipelineStage
    await application.save()

    emitToApplication(String(application._id), 'pipeline:updated', {
        applicationId: String(application._id),
        pipelineStage: application.pipelineStage,
        pipelineHistory: application.pipelineHistory,
        updatedAt: application.updatedAt,
    })

    res.json({
        success: true,
        message: 'Pipeline stage updated successfully',
        data: { application }
    })
})

// @desc    Add an internal note to an application
// @route   POST /api/company/applications/:applicationId/internal-notes
// @access  Private (Company)
export const addInternalNote = asyncHandler(async (req, res) => {
    const { applicationId } = req.params
    const { content, rating } = req.body
    const text = typeof content === 'string' ? content.trim() : ''

    if (!text) {
        res.status(400)
        throw new Error('Note content is required')
    }

    const application = await JobApplication.findOne({
        _id: applicationId,
        companyId: req.company._id,
    })

    if (!application) {
        res.status(404)
        throw new Error('Application not found')
    }

    application.internalNotes.push({
        authorCompanyId: req.company._id,
        authorName: req.company.name,
        body: text.slice(0, 4000),
        rating: rating ? Number(rating) : undefined,
    })
    await application.save()

    emitToApplication(String(application._id), 'feedback:updated', {
        applicationId: String(application._id),
        internalNotes: application.internalNotes,
    })

    res.status(201).json({ 
        success: true, 
        message: 'Note added successfully',
        data: { internalNotes: application.internalNotes } 
    })
})

// @desc    Toggle job visibility
// @route   POST /api/company/change-visibility
// @access  Private (Company)
export const changeVisibility = asyncHandler(async (req, res) => {
    const { id } = req.body

    const job = await Job.findOne({ _id: id, companyId: req.company._id })
    if (!job) {
        res.status(404)
        throw new Error('Job not found')
    }

    job.visible = !job.visible
    await job.save()

    res.json({ 
        success: true, 
        message: `Job is now ${job.visible ? 'visible' : 'hidden'}`, 
        data: { job } 
    })
})

// @desc    AI Resume Matcher
// @route   GET /api/company/match-resume/:applicationId
// @access  Private (Company)
export const matchResume = asyncHandler(async (req, res) => {
    const { applicationId } = req.params
    const companyId = req.company._id

    const cacheKey = `match:${applicationId}`
    let cached = await cacheGet(cacheKey).catch(() => null)
    
    if (cached) {
        return res.json({ 
            success: true, 
            message: 'Match result fetched from cache',
            data: { ...cached, cached: true } 
        })
    }

    const application = await JobApplication.findOne({ _id: applicationId, companyId })
        .populate('userId', 'resume resumeAsset')
        .populate('jobId', 'description')

    if (!application) {
        res.status(404)
        throw new Error('Application not found')
    }

    if (!application.userId?.resume) {
        res.status(400)
        throw new Error('No resume found for this applicant')
    }

    const { buffer } = await fetchResumeBuffer(application.userId)
    const resumeText = await aiService.parsePDF(buffer)
    const result = await aiService.generateMatchScore(resumeText, application.jobId.description)
    
    application.matchScore = result.score
    await application.save()

    await cacheSet(cacheKey, { score: result.score, reason: result.reason }).catch(() => null)

    res.json({ 
        success: true, 
        message: 'AI analysis completed',
        data: { score: result.score, reason: result.reason } 
    })
})

// @desc    AI Resume Summary
// @route   GET /api/company/resume-summary/:applicationId
// @access  Private (Company)
export const getResumeSummary = asyncHandler(async (req, res) => {
    const { applicationId } = req.params
    const companyId = req.company._id

    const cacheKey = `summary:${applicationId}`
    let cached = await cacheGet(cacheKey).catch(() => null)
    
    if (cached) {
        return res.json({ 
            success: true, 
            message: 'Summary fetched from cache',
            data: { ...cached, cached: true } 
        })
    }

    const application = await JobApplication.findOne({ _id: applicationId, companyId })
        .populate('userId', 'resume resumeAsset')

    if (!application) {
        res.status(404)
        throw new Error('Application not found')
    }

    if (!application.userId?.resume) {
        res.status(400)
        throw new Error('No resume found for this applicant')
    }

    const { buffer } = await fetchResumeBuffer(application.userId)
    const resumeText = await aiService.parsePDF(buffer)
    const result = await aiService.generateResumeSummary(resumeText)

    await cacheSet(cacheKey, result).catch(() => null)

    res.json({ 
        success: true, 
        message: 'AI summary generated',
        data: result 
    })
})

// @desc    Get recruiter analytics
// @route   GET /api/company/analytics
// @access  Private (Company)
export const getRecruiterAnalytics = asyncHandler(async (req, res) => {
    const companyId = req.company._id

    // 1. Applications Per Job
    const appsPerJob = await Job.aggregate([
        { $match: { companyId: new mongoose.Types.ObjectId(companyId) } },
        {
            $lookup: {
                from: 'jobapplications',
                localField: '_id',
                foreignField: 'jobId',
                as: 'apps'
            }
        },
        {
            $project: {
                title: 1,
                count: { $size: '$apps' }
            }
        },
        { $sort: { count: -1 } }
    ])

    // 2. Hiring Pipeline Distribution
    const pipelineDist = await JobApplication.aggregate([
        { $match: { companyId: new mongoose.Types.ObjectId(companyId) } },
        {
            $group: {
                _id: '$pipelineStage',
                count: { $sum: 1 }
            }
        }
    ])

    // Normalize pipeline distribution to ensure all stages are present
    const stagesMap = PIPELINE_STAGES.reduce((acc, stage) => {
        acc[stage] = 0
        return acc
    }, {})
    pipelineDist.forEach(d => {
        stagesMap[d._id] = d.count
    })

    // 3. Hiring Funnel Summary
    const totalApplicants = await JobApplication.countDocuments({ companyId })
    const interviews = stagesMap['Interview'] + stagesMap['Offer'] + stagesMap['Hired']
    const hires = stagesMap['Hired']

    res.json({
        success: true,
        message: 'Analytics fetched successfully',
        data: {
            appsPerJob,
            pipelineDistribution: Object.entries(stagesMap).map(([stage, count]) => ({ stage, count })),
            summary: {
                totalApplicants,
                interviews,
                hires,
                rejectionRate: totalApplicants > 0 
                    ? Math.round((stagesMap['Rejected'] / totalApplicants) * 100) 
                    : 0
            }
        }
    })
})
