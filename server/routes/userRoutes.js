import express from 'express'
import {
    getUserData,
    applyForJob,
    getUserJobApplications,
    updateUserResume,
    getResumeSignedUrl,
} from '../controllers/userController.js'
import upload from '../config/multer.js'
import { protectUser } from '../middleware/authMiddleware.js'

const router = express.Router()

// All routes require a valid Clerk session (protectUser middleware)
router.get('/user', protectUser, getUserData)
router.post('/apply', protectUser, applyForJob)
router.get('/applications', protectUser, getUserJobApplications)
router.post('/update-resume', protectUser, upload.single('resume'), updateUserResume)
router.get('/resume', protectUser, getResumeSignedUrl)

export default router