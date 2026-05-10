import Message from '../models/Message.js'
import JobApplication from '../models/JobApplication.js'
import Company from '../models/Company.js'
import aiService from '../services/aiService.js'
import { fetchResumeBuffer } from './userController.js'
import { emitToApplication } from '../realtime/socketHub.js'

const userIdFromReq = (req) => req.auth?.userId

async function loadApplicationForUser(userId, applicationId) {
    const app = await JobApplication.findById(applicationId)
        .populate('jobId', 'title description')
        .populate('companyId', 'name image')
    if (!app || app.userId !== userId) return null
    return app
}

async function loadApplicationForCompany(companyId, applicationId) {
    const app = await JobApplication.findById(applicationId)
        .populate('jobId', 'title description')
        .populate('userId', 'name email resume resumeAsset image')
    if (!app || app.companyId.toString() !== companyId.toString()) return null
    return app
}

// ─── Candidate ───────────────────────────────────────────────────────────────

export const getUserUnreadCount = async (req, res) => {
    try {
        const userId = userIdFromReq(req)
        const apps = await JobApplication.find({ userId }).select('_id')
        const ids = apps.map((a) => a._id)
        const count = await Message.countDocuments({
            applicationId: { $in: ids },
            fromUser: false,
            $or: [{ seenByUserAt: null }, { seenByUserAt: { $exists: false } }],
        })
        res.json({ success: true, count })
    } catch (error) {
        console.error('[getUserUnreadCount]', error.message)
        res.status(500).json({ success: false, message: 'Failed to load unread count' })
    }
}

export const getUserThread = async (req, res) => {
    try {
        const { applicationId } = req.params
        const userId = userIdFromReq(req)
        const app = await loadApplicationForUser(userId, applicationId)
        if (!app) {
            return res.status(403).json({ success: false, message: 'Not authorized' })
        }
        const messages = await Message.find({ applicationId }).sort({ createdAt: 1 }).limit(500).lean()
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
            messages,
            application: {
                _id: app._id,
                pipelineStage: app.pipelineStage,
                jobTitle: app.jobId?.title,
                companyName: app.companyId?.name,
                companyImage: app.companyId?.image,
            },
        })
    } catch (error) {
        console.error('[getUserThread]', error.message)
        res.status(500).json({ success: false, message: 'Failed to load messages' })
    }
}

export const postUserMessage = async (req, res) => {
    try {
        const { applicationId, body } = req.body
        const text = typeof body === 'string' ? body.trim() : ''
        if (!applicationId || !text) {
            return res.status(400).json({ success: false, message: 'applicationId and body are required' })
        }
        const userId = userIdFromReq(req)
        const app = await loadApplicationForUser(userId, applicationId)
        if (!app) {
            return res.status(403).json({ success: false, message: 'Not authorized' })
        }

        const allowedStages = ['Screening', 'Interview', 'Offer', 'Hired']
        if (!allowedStages.includes(app.pipelineStage)) {
            return res.status(403).json({ success: false, message: 'Messaging is only available after you have been shortlisted.' })
        }
        const msg = await Message.create({
            applicationId,
            body: text.slice(0, 8000),
            fromUser: true,
        })
        await JobApplication.findByIdAndUpdate(applicationId, { $set: { updatedAt: new Date() } })
        emitToApplication(applicationId, 'message:new', { message: msg.toObject() })
        res.status(201).json({ success: true, message: msg })
    } catch (error) {
        console.error('[postUserMessage]', error.message)
        res.status(500).json({ success: false, message: 'Failed to send message' })
    }
}

export const listUserThreads = async (req, res) => {
    try {
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

        res.json({ success: true, threads })
    } catch (error) {
        console.error('[listUserThreads]', error.message)
        res.status(500).json({ success: false, message: 'Failed to load conversations' })
    }
}

// ─── Company / recruiter ───────────────────────────────────────────────────────

export const listCompanyThreads = async (req, res) => {
    try {
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

        res.json({ success: true, threads })
    } catch (error) {
        console.error('[listCompanyThreads]', error.message)
        res.status(500).json({ success: false, message: 'Failed to load conversations' })
    }
}

export const getCompanyThread = async (req, res) => {
    try {
        const { applicationId } = req.params
        const companyId = req.company._id
        const app = await loadApplicationForCompany(companyId, applicationId)
        if (!app) {
            return res.status(403).json({ success: false, message: 'Not authorized' })
        }
        const messages = await Message.find({ applicationId }).sort({ createdAt: 1 }).limit(500).lean()
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
            messages,
            application: {
                _id: app._id,
                pipelineStage: app.pipelineStage,
                candidateName: app.userId?.name,
                candidateEmail: app.userId?.email,
                candidateImage: app.userId?.image,
                jobTitle: app.jobId?.title,
            },
        })
    } catch (error) {
        console.error('[getCompanyThread]', error.message)
        res.status(500).json({ success: false, message: 'Failed to load messages' })
    }
}

export const postCompanyMessage = async (req, res) => {
    try {
        const { applicationId, body } = req.body
        const text = typeof body === 'string' ? body.trim() : ''
        if (!applicationId || !text) {
            return res.status(400).json({ success: false, message: 'applicationId and body are required' })
        }
        const companyId = req.company._id
        const app = await loadApplicationForCompany(companyId, applicationId)
        if (!app) {
            return res.status(403).json({ success: false, message: 'Not authorized' })
        }

        const allowedStages = ['Screening', 'Interview', 'Offer', 'Hired']
        if (!allowedStages.includes(app.pipelineStage)) {
            return res.status(403).json({ success: false, message: 'Messaging is only available for shortlisted candidates.' })
        }
        const msg = await Message.create({
            applicationId,
            body: text.slice(0, 8000),
            fromUser: false,
        })
        await JobApplication.findByIdAndUpdate(applicationId, { $set: { updatedAt: new Date() } })
        emitToApplication(applicationId, 'message:new', { message: msg.toObject() })
        res.status(201).json({ success: true, message: msg })
    } catch (error) {
        console.error('[postCompanyMessage]', error.message)
        res.status(500).json({ success: false, message: 'Failed to send message' })
    }
}

export const aiInterviewDraft = async (req, res) => {
    try {
        const { applicationId } = req.body
        if (!applicationId) {
            return res.status(400).json({ success: false, message: 'applicationId is required' })
        }
        const companyId = req.company._id
        const application = await JobApplication.findById(applicationId)
            .populate('userId', 'name resume')
            .populate('jobId', 'title description')
        if (!application || application.companyId.toString() !== companyId.toString()) {
            return res.status(403).json({ success: false, message: 'Not authorized' })
        }

        const company = await Company.findById(companyId).select('name')
        let resumeSnippet = ''
        if (application.userId?.resume) {
            try {
                const { buffer } = await fetchResumeBuffer(application.userId, { timeoutMs: 8000 })
                const full = await aiService.parsePDF(buffer)
                resumeSnippet = full.slice(0, 6000)
            } catch {
                resumeSnippet = ''
            }
        }

        const draft = await aiService.generateInterviewInviteDraft({
            candidateName: application.userId?.name || 'Candidate',
            jobTitle: application.jobId?.title || 'Role',
            jobDescription: application.jobId?.description || '',
            companyName: company?.name || 'Our team',
            resumeSnippet,
        })

        res.json({ success: true, draft })
    } catch (error) {
        console.error('[aiInterviewDraft]', error.message)
        res.status(500).json({
            success: false,
            message: error.message || 'Could not generate draft',
        })
    }
}
