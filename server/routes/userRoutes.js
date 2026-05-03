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
    postUserMessage,
} from '../controllers/messageController.js'
import upload from '../config/multer.js'
import { protectUser } from '../middleware/authMiddleware.js'

const router = express.Router()

// All routes require a valid Clerk session (protectUser middleware)
router.get('/user', protectUser, getUserData)
router.get('/realtime-token', protectUser, getRealtimeToken)
router.post('/apply', protectUser, applyForJob)
router.get('/applications', protectUser, getUserJobApplications)
router.post('/update-resume', protectUser, upload.single('resume'), updateUserResume)
router.get('/resume', protectUser, getResumeSignedUrl)

router.get('/messages/unread-count', protectUser, getUserUnreadCount)
router.get('/messages/threads', protectUser, listUserThreads)
router.get('/messages/thread/:applicationId', protectUser, getUserThread)
router.post('/messages', protectUser, postUserMessage)

export default router