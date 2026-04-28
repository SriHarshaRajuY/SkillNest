import express from 'express'
import { applyForJob, getUserData, getUserJobApplications, updateUserResume, getResumeSignedUrl } from '../controllers/userController.js'
import upload from '../config/multer.js'

const router = express.Router()

// Get user Data
router.get('/user', getUserData)

// Apply for a job
router.post('/apply', applyForJob)

// Get applied jobs data
router.get('/applications', getUserJobApplications)

// Update user profile (resume)
router.post('/update-resume', upload.single('resume'), updateUserResume)

// Get a signed URL to view the user's resume (1-hour expiry, avoids Cloudinary 401)
router.get('/resume', getResumeSignedUrl)

export default router;