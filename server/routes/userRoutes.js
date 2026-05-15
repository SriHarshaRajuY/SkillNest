import express from 'express'
import {
    getUserData,
    applyForJob,
    getUserJobApplications,
    updateUserResume,
    getResumeSignedUrl,
    getRealtimeToken,
} from '../controllers/userController.js'
import {
    getUserUnreadCount,
    listUserThreads,
    getUserThread,
    markUserThreadRead,
    postUserMessage,
} from '../controllers/messageController.js'
import upload from '../config/multer.js'
import { protectUser } from '../middleware/authMiddleware.js'
import { rateLimit } from 'express-rate-limit'
import validate from '../middleware/validationMiddleware.js'
import schemas from '../utils/validators.js'

const router = express.Router()

// Specific rate limit for applying to prevent spam
const applyLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // Max 10 applications per hour per IP
    message: { success: false, message: 'Too many applications sent, please try again later.' },
})

/**
 * @swagger
 * /api/users/user:
 *   get:
 *     summary: Get logged-in user profile
 */
router.get('/user', protectUser, getUserData)

/**
 * @swagger
 * /api/users/realtime-token:
 *   get:
 *     summary: Get token for real-time messaging
 */
router.get('/realtime-token', protectUser, getRealtimeToken)

/**
 * @swagger
 * /api/users/apply:
 *   post:
 *     summary: Apply for a job
 */
router.post('/apply', protectUser, applyLimiter, validate(schemas.applyJob), applyForJob)

/**
 * @swagger
 * /api/users/applications:
 *   get:
 *     summary: Get list of user applications
 */
router.get('/applications', protectUser, getUserJobApplications)

/**
 * @swagger
 * /api/users/update-resume:
 *   post:
 *     summary: Update candidate resume
 */
router.post('/update-resume', protectUser, upload.single('resume'), updateUserResume)

/**
 * @swagger
 * /api/users/resume:
 *   get:
 *     summary: Get signed URL for user resume
 */
router.get('/resume', protectUser, getResumeSignedUrl)

/**
 * @swagger
 * /api/users/messages/unread-count:
 *   get:
 *     summary: Get count of unread messages for the user
 */
router.get('/messages/unread-count', protectUser, getUserUnreadCount)

/**
 * @swagger
 * /api/users/messages/threads:
 *   get:
 *     summary: List all active message threads for the user
 */
router.get('/messages/threads', protectUser, listUserThreads)

/**
 * @swagger
 * /api/users/messages/thread/{applicationId}:
 *   get:
 *     summary: Get all messages in a specific thread
 */
router.get('/messages/thread/:applicationId', protectUser, getUserThread)

router.post('/messages/thread/:applicationId/read', protectUser, markUserThreadRead)

/**
 * @swagger
 * /api/users/messages:
 *   post:
 *     summary: Send a message in an application thread
 */
router.post('/messages', protectUser, validate(schemas.sendMessage), postUserMessage)

export default router
