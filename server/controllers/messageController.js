import Message from '../models/Message.js'
import JobApplication from '../models/JobApplication.js'
import { emitToApplication } from '../realtime/socketHub.js'
import asyncHandler from '../middleware/asyncHandler.js'
import { getClerkAuth } from '../middleware/authMiddleware.js'

const userIdFromReq = (req) => getClerkAuth(req)?.userId

async function loadApplicationForUser(userId, applicationId) {
    const app = await JobApplication.findById(applicationId)
        .populate('jobId', 'title description')
        .populate('companyId', 'name image')
        .lean()
    if (!app || app.userId !== userId) return null
    return app
}

async function loadApplicationForCompany(companyId, applicationId) {
    const app = await JobApplication.findById(applicationId)
        .populate('jobId', 'title description')
        .populate('userId', 'name email resume resumeAsset image')
        .lean()
    if (!app || app.companyId.toString() !== companyId.toString()) return null
    return app
}

// ─── Candidate ───────────────────────────────────────────────────────────────

// @desc    Get user's unread message count
// @route   GET /api/users/messages/unread-count
// @access  Private (User)
export const getUserUnreadCount = asyncHandler(async (req, res) => {
    const userId = userIdFromReq(req)
    const apps = await JobApplication.find({ userId }).select('_id').lean()
    const ids = apps.map((a) => a._id)
    const count = await Message.countDocuments({
        applicationId: { $in: ids },
        fromUser: false,
        $or: [{ seenByUserAt: null }, { seenByUserAt: { $exists: false } }],
    })
    res.json({ 
        success: true, 
        message: 'Unread count fetched successfully',
        data: { count } 
    })
})

// @desc    Get user's message thread for an application
// @route   GET /api/users/messages/thread/:applicationId
// @access  Private (User)
export const getUserThread = asyncHandler(async (req, res) => {
    const { applicationId } = req.params
    const userId = userIdFromReq(req)
    const app = await loadApplicationForUser(userId, applicationId)
    if (!app) {
        res.status(403)
        throw new Error('Not authorized to access this thread')
    }

    const page = Math.max(1, parseInt(req.query.page) || 1)
    const limit = Math.min(100, parseInt(req.query.limit) || 50)
    const skip = (page - 1) * limit

    const totalResults = await Message.countDocuments({ applicationId })
    const messages = await Message.find({ applicationId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()

    messages.reverse()

    await Message.updateMany(
        {
            applicationId,
            fromUser: false,
            $or: [{ seenByUserAt: null }, { seenByUserAt: { $exists: false } }],
        },
        { $set: { seenByUserAt: new Date() } },
    )

    res.json({
        success: true,
        message: 'Messages fetched successfully',
        data: {
            messages,
            totalResults,
            totalPages: Math.ceil(totalResults / limit),
            currentPage: page,
            application: {
                _id: app._id,
                pipelineStage: app.pipelineStage,
                jobTitle: app.jobId?.title,
                companyName: app.companyId?.name,
                companyImage: app.companyId?.image,
            }
        }
    })
})

// @desc    Mark a candidate thread as read
// @route   POST /api/users/messages/thread/:applicationId/read
// @access  Private (User)
export const markUserThreadRead = asyncHandler(async (req, res) => {
    const { applicationId } = req.params
    const userId = userIdFromReq(req)
    const app = await loadApplicationForUser(userId, applicationId)
    if (!app) {
        res.status(403)
        throw new Error('Not authorized to access this thread')
    }

    const result = await Message.updateMany(
        {
            applicationId,
            fromUser: false,
            $or: [{ seenByUserAt: null }, { seenByUserAt: { $exists: false } }],
        },
        { $set: { seenByUserAt: new Date() } },
    )

    res.json({
        success: true,
        message: 'Thread marked as read',
        data: { modifiedCount: result.modifiedCount || 0 },
    })
})

// @desc    Post a message as a candidate
// @route   POST /api/users/messages
// @access  Private (User)
export const postUserMessage = asyncHandler(async (req, res) => {
    const { applicationId, content } = req.body
    const text = typeof content === 'string' ? content.trim() : ''
    
    const userId = userIdFromReq(req)
    const app = await loadApplicationForUser(userId, applicationId)
    if (!app) {
        res.status(403)
        throw new Error('Not authorized to message on this application')
    }

    const allowedStages = ['Screening', 'Interview', 'Offer', 'Hired']
    if (!allowedStages.includes(app.pipelineStage)) {
        res.status(403)
        throw new Error('Messaging is only available after you have been shortlisted')
    }

    const msg = await Message.create({
        applicationId,
        body: text.slice(0, 8000),
        fromUser: true,
    })
    await JobApplication.findByIdAndUpdate(applicationId, { $set: { updatedAt: new Date() } })
    emitToApplication(applicationId, 'message:new', { message: msg.toObject() })
    
    res.status(201).json({ 
        success: true, 
        message: 'Message sent successfully',
        data: { message: msg } 
    })
})

// @desc    List user's message threads
// @route   GET /api/users/messages/threads
// @access  Private (User)
export const listUserThreads = asyncHandler(async (req, res) => {
    const userId = userIdFromReq(req)
    const apps = await JobApplication.find({ userId })
        .populate('companyId', 'name image')
        .populate('jobId', 'title')
        .sort({ updatedAt: -1 })
        .lean()

    const ids = apps.map((a) => a._id)
    const lastMsgs = await Message.aggregate([
        { $match: { applicationId: { $in: ids } } },
        { $sort: { createdAt: -1 } },
        { $group: { _id: '$applicationId', doc: { $first: '$$ROOT' } } },
    ])
    const lastMap = new Map(lastMsgs.map((x) => [String(x._id), x.doc]))

    const unreadAgg = await Message.aggregate([
        { $match: { applicationId: { $in: ids }, fromUser: false } },
        {
            $group: {
                _id: '$applicationId',
                n: {
                    $sum: {
                        $cond: [{ $eq: [{ $ifNull: ['$seenByUserAt', null] }, null] }, 1, 0],
                    },
                },
            },
        },
    ])
    const unreadMap = new Map(unreadAgg.map((x) => [String(x._id), x.n]))

    const threads = apps.map((a) => ({
        applicationId: a._id,
        jobTitle: a.jobId?.title,
        companyName: a.companyId?.name,
        companyImage: a.companyId?.image,
        pipelineStage: a.pipelineStage,
        lastMessage: lastMap.get(String(a._id)) || null,
        unread: unreadMap.get(String(a._id)) || 0,
    }))

    res.json({ 
        success: true, 
        message: 'Threads fetched successfully',
        data: { threads } 
    })
})

// ─── Company / recruiter ───────────────────────────────────────────────────────

// @desc    List company's message threads
// @route   GET /api/company/messages/threads
// @access  Private (Company)
export const listCompanyThreads = asyncHandler(async (req, res) => {
    const companyId = req.company._id
    const apps = await JobApplication.find({ companyId })
        .populate('userId', 'name image')
        .populate('jobId', 'title')
        .sort({ updatedAt: -1 })
        .lean()

    const ids = apps.map((a) => a._id)
    const lastMsgs = await Message.aggregate([
        { $match: { applicationId: { $in: ids } } },
        { $sort: { createdAt: -1 } },
        { $group: { _id: '$applicationId', doc: { $first: '$$ROOT' } } },
    ])
    const lastMap = new Map(lastMsgs.map((x) => [String(x._id), x.doc]))

    const unreadAgg = await Message.aggregate([
        { $match: { applicationId: { $in: ids }, fromUser: true } },
        {
            $group: {
                _id: '$applicationId',
                n: {
                    $sum: {
                        $cond: [{ $eq: [{ $ifNull: ['$seenByCompanyAt', null] }, null] }, 1, 0],
                    },
                },
            },
        },
    ])
    const unreadMap = new Map(unreadAgg.map((x) => [String(x._id), x.n]))

    const threads = apps.map((a) => ({
        applicationId: a._id,
        candidateName: a.userId?.name,
        candidateImage: a.userId?.image,
        jobTitle: a.jobId?.title,
        pipelineStage: a.pipelineStage,
        lastMessage: lastMap.get(String(a._id)) || null,
        unread: unreadMap.get(String(a._id)) || 0,
    }))

    res.json({ 
        success: true, 
        message: 'Threads fetched successfully',
        data: { threads } 
    })
})

// @desc    Get company's message thread for an application
// @route   GET /api/company/messages/thread/:applicationId
// @access  Private (Company)
export const getCompanyThread = asyncHandler(async (req, res) => {
    const { applicationId } = req.params
    const companyId = req.company._id
    const app = await loadApplicationForCompany(companyId, applicationId)
    if (!app) {
        res.status(403)
        throw new Error('Not authorized to access this thread')
    }

    const page = Math.max(1, parseInt(req.query.page) || 1)
    const limit = Math.min(100, parseInt(req.query.limit) || 50)
    const skip = (page - 1) * limit

    const totalResults = await Message.countDocuments({ applicationId })
    const messages = await Message.find({ applicationId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
    
    messages.reverse()

    await Message.updateMany(
        {
            applicationId,
            fromUser: true,
            $or: [{ seenByCompanyAt: null }, { seenByCompanyAt: { $exists: false } }],
        },
        { $set: { seenByCompanyAt: new Date() } },
    )
    res.json({
        success: true,
        message: 'Messages fetched successfully',
        data: {
            messages,
            totalResults,
            totalPages: Math.ceil(totalResults / limit),
            currentPage: page,
            application: {
                _id: app._id,
                pipelineStage: app.pipelineStage,
                candidateName: app.userId?.name,
                candidateEmail: app.userId?.email,
                candidateImage: app.userId?.image,
                jobTitle: app.jobId?.title,
            }
        }
    })
})

// @desc    Mark a recruiter thread as read
// @route   POST /api/company/messages/thread/:applicationId/read
// @access  Private (Company)
export const markCompanyThreadRead = asyncHandler(async (req, res) => {
    const { applicationId } = req.params
    const companyId = req.company._id
    const app = await loadApplicationForCompany(companyId, applicationId)
    if (!app) {
        res.status(403)
        throw new Error('Not authorized to access this thread')
    }

    const result = await Message.updateMany(
        {
            applicationId,
            fromUser: true,
            $or: [{ seenByCompanyAt: null }, { seenByCompanyAt: { $exists: false } }],
        },
        { $set: { seenByCompanyAt: new Date() } },
    )

    res.json({
        success: true,
        message: 'Thread marked as read',
        data: { modifiedCount: result.modifiedCount || 0 },
    })
})

// @desc    Post a message as a recruiter
// @route   POST /api/company/messages
// @access  Private (Company)
export const postCompanyMessage = asyncHandler(async (req, res) => {
    const { applicationId, content } = req.body
    const text = typeof content === 'string' ? content.trim() : ''
    
    const companyId = req.company._id
    const app = await loadApplicationForCompany(companyId, applicationId)
    if (!app) {
        res.status(403)
        throw new Error('Not authorized to message on this application')
    }

    const allowedStages = ['Screening', 'Interview', 'Offer', 'Hired']
    if (!allowedStages.includes(app.pipelineStage)) {
        res.status(403)
        throw new Error('Messaging is only available for shortlisted candidates')
    }

    const msg = await Message.create({
        applicationId,
        body: text.slice(0, 8000),
        fromUser: false,
    })
    await JobApplication.findByIdAndUpdate(applicationId, { $set: { updatedAt: new Date() } })
    emitToApplication(applicationId, 'message:new', { message: msg.toObject() })
    
    res.status(201).json({ 
        success: true, 
        message: 'Message sent successfully',
        data: { message: msg } 
    })
})
