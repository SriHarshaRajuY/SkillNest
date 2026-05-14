import express from 'express'
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
    postCompanyMessage,
    aiInterviewDraft,
} from '../controllers/messageController.js'
import { getApplicantResumeSignedUrl } from '../controllers/userController.js'
import upload from '../config/multer.js'
import { protectCompany } from '../middleware/authMiddleware.js'
import rateLimit from 'express-rate-limit'
import validate from '../middleware/validationMiddleware.js'
import schemas from '../utils/validators.js'

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,
    message: { success: false, message: 'Too many login attempts. Please try again after 15 minutes.' }
})

const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5,
    message: { success: false, message: 'Too many accounts created from this IP, please try again after an hour.' }
})

const router = express.Router()

// ─── Auth ────────────────────────────────────────────────────────────────────
router.post('/register', upload.single('image'), registerLimiter, validate(schemas.recruiterRegister), registerCompany)
router.post('/login', loginLimiter, validate(schemas.recruiterLogin), loginCompany)
router.get('/company', protectCompany, getCompanyData)

// ─── Jobs & Applicants ────────────────────────────────────────────────────────
router.post('/post-job', protectCompany, validate(schemas.postJob), postJob)
router.get('/applicants', protectCompany, getCompanyJobApplicants)
router.get('/applicant-resume/:applicationId', protectCompany, getApplicantResumeSignedUrl)
router.get('/list-jobs', protectCompany, getCompanyPostedJobs)
router.post('/change-status', protectCompany, validate(schemas.updatePipeline), changeJobApplicationStatus)
router.post('/applications/:applicationId/internal-notes', protectCompany, addInternalNote)
router.post('/change-visibility', protectCompany, changeVisibility)
router.get('/match-resume/:applicationId', protectCompany, matchResume)
router.get('/resume-summary/:applicationId', protectCompany, getResumeSummary)

// ─── Messaging ────────────────────────────────────────────────────────────────
router.get('/messages/threads', protectCompany, listCompanyThreads)
router.get('/messages/thread/:applicationId', protectCompany, getCompanyThread)
router.post('/messages', protectCompany, validate(schemas.sendMessage), postCompanyMessage)
router.post('/messages/ai-draft', protectCompany, aiInterviewDraft)

// ─── Analytics ────────────────────────────────────────────────────────────────
router.get('/analytics', protectCompany, getRecruiterAnalytics)

export default router
