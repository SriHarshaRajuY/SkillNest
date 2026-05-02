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
    matchResume
} from '../controllers/companyController.js'
import { getApplicantResumeSignedUrl } from '../controllers/userController.js'
import upload from '../config/multer.js'
import { protectCompany } from '../middleware/authMiddleware.js'
import rateLimit from 'express-rate-limit'

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

router.post('/register', upload.single('image'), registerLimiter, registerCompany)
router.post('/login', loginLimiter, loginCompany)
router.get('/company', protectCompany, getCompanyData)
router.post('/post-job', protectCompany, postJob)
router.get('/applicants', protectCompany, getCompanyJobApplicants)
router.get('/list-jobs', protectCompany, getCompanyPostedJobs)
router.post('/change-status', protectCompany, changeJobApplicationStatus)
router.post('/change-visibility', protectCompany, changeVisibility)
router.get('/applicant-resume/:applicationId', protectCompany, getApplicantResumeSignedUrl)
router.get('/match-resume/:applicationId', protectCompany, matchResume)

export default router