import express from 'express'
import {
    getUserData,
    applyForJob,
    getUserJobApplications,
    updateUserResume,
    getResumeSignedUrl,
    getRealtimeToken,
    optimizeResume,
} from '../controllers/userController.js'
import {
    getUserUnreadCount,
    listUserThreads,
    getUserThread,
    postUserMessage,
} from '../controllers/messageController.js'
import upload from '../config/multer.js'
import { protectUser } from '../middleware/authMiddleware.js'
import { rateLimit } from 'express-rate-limit'

const router = express.Router()

// Specific rate limit for applying to prevent spam
const applyLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // Max 10 applications per hour per IP
    message: { success: false, message: 'Too many applications sent, please try again later.' },
})

// All routes require a valid Clerk session (protectUser middleware)
router.get('/user', protectUser, getUserData)
router.get('/realtime-token', protectUser, getRealtimeToken)
router.post('/apply', protectUser, applyLimiter, applyForJob)
router.get('/applications', protectUser, getUserJobApplications)
router.post('/update-resume', protectUser, upload.single('resume'), updateUserResume)
router.get('/resume', protectUser, getResumeSignedUrl)
router.get('/optimize-resume/:jobId', protectUser, optimizeResume)

router.get('/messages/unread-count', protectUser, getUserUnreadCount)
router.get('/messages/threads', protectUser, listUserThreads)
router.get('/messages/thread/:applicationId', protectUser, getUserThread)
router.post('/messages', protectUser, postUserMessage)

export default router