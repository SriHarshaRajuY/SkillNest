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
/**
 * @swagger
 * /api/users/user:
 *   get:
 *     summary: Get logged-in user profile
 *     tags: [User]
 *     security: [{ bearerAuth: [] }]
 */
router.get('/user', protectUser, getUserData)

/**
 * @swagger
 * /api/users/realtime-token:
 *   get:
 *     summary: Get token for real-time messaging
 *     tags: [Messaging]
 *     security: [{ bearerAuth: [] }]
 */
router.get('/realtime-token', protectUser, getRealtimeToken)

/**
 * @swagger
 * /api/users/apply:
 *   post:
 *     summary: Apply for a job
 *     tags: [User]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               jobId: { type: string }
 */
router.post('/apply', protectUser, applyLimiter, applyForJob)

/**
 * @swagger
 * /api/users/applications:
 *   get:
 *     summary: Get list of user applications
 *     tags: [User]
 *     security: [{ bearerAuth: [] }]
 */
router.get('/applications', protectUser, getUserJobApplications)

/**
 * @swagger
 * /api/users/update-resume:
 *   post:
 *     summary: Update candidate resume
 *     tags: [User]
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               resume: { type: string, format: binary }
 */
router.post('/update-resume', protectUser, upload.single('resume'), updateUserResume)

/**
 * @swagger
 * /api/users/resume:
 *   get:
 *     summary: Get signed URL for user resume
 *     tags: [User]
 *     security: [{ bearerAuth: [] }]
 */
router.get('/resume', protectUser, getResumeSignedUrl)

/**
 * @swagger
 * /api/users/optimize-resume/{jobId}:
 *   get:
 *     summary: AI Resume Optimization suggestions
 *     tags: [AI]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema: { type: string }
 */
router.get('/optimize-resume/:jobId', protectUser, optimizeResume)

/**
 * @swagger
 * /api/users/messages/unread-count:
 *   get:
 *     summary: Get count of unread messages for the user
 *     tags: [Messaging]
 *     security: [{ bearerAuth: [] }]
 */
router.get('/messages/unread-count', protectUser, getUserUnreadCount)

/**
 * @swagger
 * /api/users/messages/threads:
 *   get:
 *     summary: List all active message threads for the user
 *     tags: [Messaging]
 *     security: [{ bearerAuth: [] }]
 */
router.get('/messages/threads', protectUser, listUserThreads)

/**
 * @swagger
 * /api/users/messages/thread/{applicationId}:
 *   get:
 *     summary: Get all messages in a specific thread
 *     tags: [Messaging]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: applicationId
 *         required: true
 *         schema: { type: string }
 */
router.get('/messages/thread/:applicationId', protectUser, getUserThread)

/**
 * @swagger
 * /api/users/messages:
 *   post:
 *     summary: Send a message in an application thread
 *     tags: [Messaging]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               applicationId: { type: string }
 *               content: { type: string }
 */
router.post('/messages', protectUser, postUserMessage)

export default router