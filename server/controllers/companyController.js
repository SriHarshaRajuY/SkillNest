import Company from '../models/Company.js'
import RecruiterUser from '../models/RecruiterUser.js'
import AuditLog from '../models/AuditLog.js'
import bcrypt from 'bcrypt'
import { v2 as cloudinary } from 'cloudinary'
import mongoose from 'mongoose'
import sanitizeHtml from 'sanitize-html'
import generateToken from '../utils/generateToken.js'
import Job from '../models/Job.js'
import JobApplication from '../models/JobApplication.js'
import User from '../models/User.js'
import { PIPELINE_STAGES } from '../constants/pipeline.js'
import { emitToApplication } from '../realtime/socketHub.js'
import { removeLocalFile } from '../utils/fileHelpers.js'
import { fetchResumeBuffer } from './userController.js'
import aiService from '../services/aiService.js'
import asyncHandler from '../middleware/asyncHandler.js'
import { cacheGet, cacheSet } from '../utils/redisClient.js'
import { logAuditEvent } from '../services/auditService.js'

const sanitizeJobDescription = (html) => sanitizeHtml(html, {
    allowedTags: [
        'p', 'br', 'strong', 'b', 'em', 'i', 'u',
        'ul', 'ol', 'li', 'h2', 'h3', 'blockquote',
        'a', 'code', 'pre',
    ],
    allowedAttributes: {
        a: ['href', 'target', 'rel'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    transformTags: {
        a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer', target: '_blank' }),
    },
})

const buildJobPayload = ({ title, description, location, salary, level, category }) => {
    const trimmedDescription = sanitizeJobDescription(description.trim())
    if (!trimmedDescription || trimmedDescription === '<p><br></p>') {
        const error = new Error('Please enter a job description')
        error.statusCode = 400
        throw error
    }

    return {
        title: title.trim(),
        description: trimmedDescription,
        location: location.trim(),
        salary: Number(salary),
        level,
        category,
    }
}

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
        const normalizedEmail = email.toLowerCase().trim()
        const exists = await Promise.all([
            Company.findOne({ email: normalizedEmail }),
            RecruiterUser.findOne({ email: normalizedEmail }),
        ])
        if (exists.some(Boolean)) {
            res.status(409)
            throw new Error('An account with this email already exists')
        }

        const hashPassword = await bcrypt.hash(password, 10)
        const imageUpload = await cloudinary.uploader.upload(imageFile.path, {
            folder: 'skillnest/company-logos',
        })

        const company = await Company.create({
            name: name.trim(),
            email: normalizedEmail,
            password: hashPassword,
            image: imageUpload.secure_url,
        })

        const recruiter = await RecruiterUser.create({
            companyId: company._id,
            name: `${name.trim()} Admin`,
            email: normalizedEmail,
            password: hashPassword,
            role: 'Admin',
        })

        res.status(201).json({
            success: true,
            message: 'Company registered successfully',
            data: {
                company: {
                    _id: company._id,
                    name: company.name,
                    email: company.email,
                    image: company.image,
                    currentRecruiter: {
                        _id: recruiter._id,
                        name: recruiter.name,
                        email: recruiter.email,
                        role: recruiter.role,
                    },
                },
                token: generateToken({ companyId: company._id, recruiterId: recruiter._id, role: recruiter.role }),
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
    const normalizedEmail = email.toLowerCase().trim()

    let recruiter = await RecruiterUser.findOne({ email: normalizedEmail })
    let company = null

    if (recruiter) {
        if (recruiter.status !== 'Active') {
            res.status(403)
            throw new Error('This recruiter account is suspended')
        }
        company = await Company.findById(recruiter.companyId)
    } else {
        company = await Company.findOne({ email: normalizedEmail })
    }

    if (!company) {
        res.status(401)
        throw new Error('Invalid email or password')
    }

    const passwordHash = recruiter?.password || company.password
    const isMatch = await bcrypt.compare(password, passwordHash)
    if (!isMatch) {
        res.status(401)
        throw new Error('Invalid email or password')
    }

    if (!recruiter) {
        recruiter = await RecruiterUser.create({
            companyId: company._id,
            name: `${company.name} Admin`,
            email: company.email,
            password: company.password,
            role: 'Admin',
        })
    }

    recruiter.lastLoginAt = new Date()
    await recruiter.save()

    res.json({
        success: true,
        message: 'Login successful',
        data: {
            company: {
                _id: company._id,
                name: company.name,
                email: company.email,
                image: company.image,
                currentRecruiter: {
                    _id: recruiter._id,
                    name: recruiter.name,
                    email: recruiter.email,
                    role: recruiter.role,
                },
            },
            token: generateToken({ companyId: company._id, recruiterId: recruiter._id, role: recruiter.role }),
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
        data: {
            company: {
                ...req.company,
                currentRecruiter: {
                    _id: req.recruiter?._id,
                    name: req.recruiter?.name,
                    email: req.recruiter?.email,
                    role: req.recruiter?.role || 'Admin',
                },
            },
        }
    })
})

// @desc    Post a new job
// @route   POST /api/company/post-job
// @access  Private (Company)
export const postJob = asyncHandler(async (req, res) => {
    const companyId = req.company._id

    const job = await Job.create({
        ...buildJobPayload(req.body),
        companyId,
        date: Date.now(),
    })

    res.status(201).json({ 
        success: true, 
        message: 'Job posted successfully', 
        data: { job } 
    })
})

// @desc    Update a job owned by this company
// @route   PUT /api/company/jobs/:id
// @access  Private (Company)
export const updateJob = asyncHandler(async (req, res) => {
    const { id } = req.params

    if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400)
        throw new Error('Invalid Job ID format')
    }

    const job = await Job.findOneAndUpdate(
        { _id: id, companyId: req.company._id },
        buildJobPayload(req.body),
        { new: true, runValidators: true },
    ).lean()

    if (!job) {
        res.status(404)
        throw new Error('Job not found')
    }

    await logAuditEvent(req, {
        action: 'JOB_EDITED',
        targetType: 'Job',
        targetId: job._id,
        metadata: { title: job.title, location: job.location, salary: job.salary },
    })

    res.json({
        success: true,
        message: 'Job updated successfully',
        data: { job },
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

    const filter = { companyId }
    if (req.query.pipelineStage) filter.pipelineStage = req.query.pipelineStage
    if (req.query.jobId && mongoose.Types.ObjectId.isValid(req.query.jobId)) {
        filter.jobId = req.query.jobId
    }

    const minScore = Number(req.query.minScore)
    const maxScore = Number(req.query.maxScore)
    if (!Number.isNaN(minScore) || !Number.isNaN(maxScore)) {
        filter.matchScore = {}
        if (!Number.isNaN(minScore)) filter.matchScore.$gte = Math.max(0, minScore)
        if (!Number.isNaN(maxScore)) filter.matchScore.$lte = Math.min(100, maxScore)
    }

    const search = String(req.query.search || '').trim()
    if (search) {
        const [users, jobs] = await Promise.all([
            User.find({ $text: { $search: search } }).select('_id').lean(),
            Job.find({
                companyId,
                $text: { $search: search },
            }).select('_id').lean(),
        ])

        const userIds = users.map((u) => u._id)
        const jobIds = jobs.map((j) => j._id)
        filter.$or = [
            { userId: { $in: userIds } },
            { jobId: { $in: jobIds } },
        ]
    }

    const sortOptions = {
        oldest: { date: 1 },
        score_desc: { matchScore: -1, date: -1 },
        score_asc: { matchScore: 1, date: -1 },
        updated: { updatedAt: -1 },
        newest: { date: -1 },
    }
    const sort = sortOptions[req.query.sort] || sortOptions.newest

    const totalResults = await JobApplication.countDocuments(filter)
    const applications = await JobApplication.find(filter)
        .populate('userId', 'name image resume')
        .populate('jobId', 'title location category level salary')
        .sort(sort)
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

    await logAuditEvent(req, {
        action: 'PIPELINE_STAGE_CHANGED',
        targetType: 'Application',
        targetId: application._id,
        metadata: { pipelineStage },
    })

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

    await logAuditEvent(req, {
        action: 'INTERNAL_NOTE_ADDED',
        targetType: 'Application',
        targetId: application._id,
        metadata: { rating: rating ? Number(rating) : null },
    })

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

    const application = await JobApplication.findOne({ _id: applicationId, companyId })
        .populate('userId', 'resume resumeAsset updatedAt')
        .populate('jobId', 'description updatedAt')

    if (!application) {
        res.status(404)
        throw new Error('Application not found')
    }

    if (!application.userId?.resume) {
        res.status(400)
        throw new Error('No resume found for this applicant')
    }

    const resumeVersion = application.userId?.resumeAsset?.publicId || application.userId?.resume || 'no-resume'
    const jobVersion = application.jobId?.updatedAt?.getTime?.() || 'no-job-version'
    const aiModelKey = aiService.getCacheModelKey()
    const cacheKey = `match:${aiModelKey}:${applicationId}:${resumeVersion}:${jobVersion}`
    let cached = await cacheGet(cacheKey).catch(() => null)

    if (cached) {
        return res.json({
            success: true,
            message: 'Match result fetched from cache',
            data: { ...cached, cached: true }
        })
    }

    const { buffer } = await fetchResumeBuffer(application.userId)
    const resumeText = await aiService.parsePDF(buffer)
    const result = await aiService.generateMatchScore(resumeText, application.jobId.description)

    application.matchScore = result.score
    await application.save()

    await logAuditEvent(req, {
        action: 'AI_SCORE_GENERATED',
        targetType: 'Application',
        targetId: application._id,
        metadata: {
            score: result.score,
            recommendation: result.recommendation,
            source: result.source,
            model: result.model,
            cached: false,
        },
    })

    if (result.cacheable) {
        await cacheSet(cacheKey, result).catch(() => null)
    }

    res.json({
        success: true,
        message: 'AI analysis completed',
        data: result
    })
})

// @desc    List recruiter team members for a company
// @route   GET /api/company/team
// @access  Private (Admin)
export const getRecruiterTeam = asyncHandler(async (req, res) => {
    const members = await RecruiterUser.find({ companyId: req.company._id })
        .select('-password')
        .sort({ role: 1, name: 1 })
        .lean()

    res.json({
        success: true,
        message: 'Team members fetched successfully',
        data: { members },
    })
})

// @desc    Create a recruiter team member
// @route   POST /api/company/team
// @access  Private (Admin)
export const createRecruiterTeamMember = asyncHandler(async (req, res) => {
    const { name, email, password, role } = req.body
    const normalizedEmail = email.toLowerCase().trim()

    const exists = await Promise.all([
        RecruiterUser.findOne({ email: normalizedEmail }),
        Company.findOne({ email: normalizedEmail }),
    ])
    if (exists.some(Boolean)) {
        res.status(409)
        throw new Error('A recruiter with this email already exists')
    }

    const member = await RecruiterUser.create({
        companyId: req.company._id,
        name: name.trim(),
        email: normalizedEmail,
        password: await bcrypt.hash(password, 10),
        role,
    })

    await logAuditEvent(req, {
        action: 'TEAM_MEMBER_CREATED',
        targetType: 'RecruiterUser',
        targetId: member._id,
        metadata: { email: member.email, role: member.role },
    })

    const safeMember = member.toObject()
    delete safeMember.password

    res.status(201).json({
        success: true,
        message: 'Team member created successfully',
        data: { member: safeMember },
    })
})

// @desc    Update recruiter team member role/status
// @route   PATCH /api/company/team/:memberId
// @access  Private (Admin)
export const updateRecruiterTeamMember = asyncHandler(async (req, res) => {
    const { memberId } = req.params
    const { role, status, name } = req.body

    if (!mongoose.Types.ObjectId.isValid(memberId)) {
        res.status(400)
        throw new Error('Invalid team member ID format')
    }

    const update = {}
    if (role) update.role = role
    if (status) update.status = status
    if (name) update.name = name.trim()

    if (String(memberId) === String(req.recruiter?._id) && status === 'Suspended') {
        res.status(400)
        throw new Error('You cannot suspend your own account')
    }

    const member = await RecruiterUser.findOneAndUpdate(
        { _id: memberId, companyId: req.company._id },
        update,
        { new: true, runValidators: true },
    ).select('-password').lean()

    if (!member) {
        res.status(404)
        throw new Error('Team member not found')
    }

    await logAuditEvent(req, {
        action: 'TEAM_MEMBER_UPDATED',
        targetType: 'RecruiterUser',
        targetId: member._id,
        metadata: update,
    })

    res.json({
        success: true,
        message: 'Team member updated successfully',
        data: { member },
    })
})

// @desc    List audit logs for a company
// @route   GET /api/company/audit-logs
// @access  Private (Admin)
export const getAuditLogs = asyncHandler(async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page) || 1)
    const limit = Math.min(100, parseInt(req.query.limit) || 30)
    const skip = (page - 1) * limit
    const filter = { companyId: req.company._id }
    if (req.query.action) filter.action = req.query.action

    const [totalResults, logs] = await Promise.all([
        AuditLog.countDocuments(filter),
        AuditLog.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
    ])

    res.json({
        success: true,
        message: 'Audit logs fetched successfully',
        data: {
            logs,
            pagination: {
                totalResults,
                totalPages: Math.ceil(totalResults / limit),
                currentPage: page,
                limit,
            },
        },
    })
})

// @desc    AI Resume Summary
// @route   GET /api/company/resume-summary/:applicationId
// @access  Private (Company)
export const getResumeSummary = asyncHandler(async (req, res) => {
    const { applicationId } = req.params
    const companyId = req.company._id

    const application = await JobApplication.findOne({ _id: applicationId, companyId })
        .populate('userId', 'resume resumeAsset updatedAt')

    if (!application) {
        res.status(404)
        throw new Error('Application not found')
    }

    if (!application.userId?.resume) {
        res.status(400)
        throw new Error('No resume found for this applicant')
    }

    const resumeVersion = application.userId?.resumeAsset?.publicId || application.userId?.resume || 'no-resume'
    const userVersion = application.userId?.updatedAt?.getTime?.() || 'no-user-version'
    const aiModelKey = aiService.getCacheModelKey()
    const cacheKey = `summary:${aiModelKey}:${applicationId}:${resumeVersion}:${userVersion}`
    let cached = await cacheGet(cacheKey).catch(() => null)

    if (cached) {
        return res.json({
            success: true,
            message: 'Summary fetched from cache',
            data: { ...cached, cached: true }
        })
    }

    const { buffer } = await fetchResumeBuffer(application.userId)
    const resumeText = await aiService.parsePDF(buffer)
    const result = await aiService.generateResumeSummary(resumeText)

    if (result.cacheable) {
        await cacheSet(cacheKey, result).catch(() => null)
    }

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
    const companyObjectId = new mongoose.Types.ObjectId(companyId)

    // 1. Applications Per Job
    const appsPerJob = await Job.aggregate([
        { $match: { companyId: companyObjectId } },
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
        { $match: { companyId: companyObjectId } },
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
    const activeApplicants = totalApplicants - (stagesMap['Withdrawn'] || 0)

    const [scoreStats] = await JobApplication.aggregate([
        { $match: { companyId: companyObjectId, matchScore: { $gt: 0 } } },
        {
            $group: {
                _id: null,
                averageMatchScore: { $avg: '$matchScore' },
                scoredApplicants: { $sum: 1 },
            },
        },
    ])

    const since = new Date()
    since.setDate(since.getDate() - 13)
    since.setHours(0, 0, 0, 0)
    const applicationsOverTimeRaw = await JobApplication.aggregate([
        { $match: { companyId: companyObjectId, date: { $gte: since.getTime() } } },
        {
            $group: {
                _id: { $dateToString: { format: '%Y-%m-%d', date: { $toDate: '$date' } } },
                count: { $sum: 1 },
            },
        },
        { $sort: { _id: 1 } },
    ])
    const trendMap = applicationsOverTimeRaw.reduce((acc, item) => {
        acc[item._id] = item.count
        return acc
    }, {})
    const applicationsOverTime = Array.from({ length: 14 }, (_, index) => {
        const day = new Date(since)
        day.setDate(since.getDate() + index)
        const date = day.toISOString().slice(0, 10)
        return { date, count: trendMap[date] || 0 }
    })

    const applicationsForTiming = await JobApplication.find({ companyId })
        .select('pipelineHistory')
        .lean()
    const stageDurations = PIPELINE_STAGES.reduce((acc, stage) => {
        acc[stage] = []
        return acc
    }, {})
    applicationsForTiming.forEach((application) => {
        const history = application.pipelineHistory || []
        const applied = history.find((event) => event.stage === 'Applied')?.at
        if (!applied) return
        const appliedAt = new Date(applied).getTime()
        history.forEach((event) => {
            if (event.stage === 'Applied' || !stageDurations[event.stage]) return
            const days = (new Date(event.at).getTime() - appliedAt) / (1000 * 60 * 60 * 24)
            if (days >= 0) stageDurations[event.stage].push(days)
        })
    })
    const timeToStage = Object.entries(stageDurations)
        .filter(([, durations]) => durations.length > 0)
        .map(([stage, durations]) => ({
            stage,
            averageDays: Number((durations.reduce((sum, n) => sum + n, 0) / durations.length).toFixed(1)),
        }))

    const conversionRates = PIPELINE_STAGES.map((stage) => ({
        stage,
        count: stagesMap[stage] || 0,
        rate: totalApplicants > 0 ? Math.round(((stagesMap[stage] || 0) / totalApplicants) * 100) : 0,
    }))

    res.json({
        success: true,
        message: 'Analytics fetched successfully',
        data: {
            appsPerJob,
            pipelineDistribution: Object.entries(stagesMap).map(([stage, count]) => ({ stage, count })),
            applicationsOverTime,
            conversionRates,
            timeToStage,
            summary: {
                totalApplicants,
                activeApplicants,
                interviews,
                hires,
                averageMatchScore: scoreStats ? Math.round(scoreStats.averageMatchScore) : 0,
                scoredApplicants: scoreStats?.scoredApplicants || 0,
                shortlistRate: totalApplicants > 0
                    ? Math.round(((stagesMap['Screening'] + stagesMap['Interview'] + stagesMap['Offer'] + stagesMap['Hired']) / totalApplicants) * 100)
                    : 0,
                rejectionRate: totalApplicants > 0 
                    ? Math.round((stagesMap['Rejected'] / totalApplicants) * 100) 
                    : 0
            }
        }
    })
})
