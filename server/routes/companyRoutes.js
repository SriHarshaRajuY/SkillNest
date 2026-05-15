import express from 'express'
import rateLimit from 'express-rate-limit'
import {
    registerCompany,
    loginCompany,
    getCompanyData,
    postJob,
    getCompanyJobApplicants,
    getCompanyPostedJobs,
    changeJobApplicationStatus,
    changeVisibility,
    matchResume,
    getResumeSummary,
    addInternalNote,
    getRecruiterAnalytics,
} from '../controllers/companyController.js'
import {
    listCompanyThreads,
    getCompanyThread,
    markCompanyThreadRead,
    postCompanyMessage,
} from '../controllers/messageController.js'
import { getApplicantResumeSignedUrl } from '../controllers/userController.js'
import upload from '../config/multer.js'
import { protectCompany } from '../middleware/authMiddleware.js'
import validate from '../middleware/validationMiddleware.js'
import schemas from '../utils/validators.js'

const router = express.Router()

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { success: false, message: 'Too many login attempts. Please try again after 15 minutes.' }
})

const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 5,
    message: { success: false, message: 'Too many accounts created from this IP, please try again after an hour.' }
})

// Auth
router.post('/register', upload.single('image'), registerLimiter, validate(schemas.recruiterRegister), registerCompany)
router.post('/login', loginLimiter, validate(schemas.recruiterLogin), loginCompany)
router.get('/company', protectCompany, getCompanyData)

// Jobs and applicants
router.post('/post-job', protectCompany, validate(schemas.postJob), postJob)
router.get('/applicants', protectCompany, getCompanyJobApplicants)
router.get('/applicant-resume/:applicationId', protectCompany, getApplicantResumeSignedUrl)
router.get('/list-jobs', protectCompany, getCompanyPostedJobs)
router.post('/change-status', protectCompany, validate(schemas.updatePipeline), changeJobApplicationStatus)
router.post('/applications/:applicationId/internal-notes', protectCompany, validate(schemas.internalNote), addInternalNote)
router.post('/change-visibility', protectCompany, validate(schemas.changeVisibility), changeVisibility)
router.get('/match-resume/:applicationId', protectCompany, matchResume)
router.get('/resume-summary/:applicationId', protectCompany, getResumeSummary)

// Messaging
router.get('/messages/threads', protectCompany, listCompanyThreads)
router.get('/messages/thread/:applicationId', protectCompany, getCompanyThread)
router.post('/messages/thread/:applicationId/read', protectCompany, markCompanyThreadRead)
router.post('/messages', protectCompany, validate(schemas.sendMessage), postCompanyMessage)

// Analytics
router.get('/analytics', protectCompany, getRecruiterAnalytics)

export default router
