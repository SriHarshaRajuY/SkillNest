import express from 'express'
import rateLimit from 'express-rate-limit'
import {
    registerCompany,
    loginCompany,
    getCompanyData,
    postJob,
    updateJob,
    getCompanyJobApplicants,
    getCompanyPostedJobs,
    changeJobApplicationStatus,
    changeVisibility,
    matchResume,
    getResumeSummary,
    addInternalNote,
    getRecruiterAnalytics,
    getRecruiterTeam,
    createRecruiterTeamMember,
    updateRecruiterTeamMember,
    getAuditLogs,
} from '../controllers/companyController.js'
import {
    listCompanyThreads,
    getCompanyThread,
    markCompanyThreadRead,
    postCompanyMessage,
} from '../controllers/messageController.js'
import { getApplicantResumeSignedUrl } from '../controllers/userController.js'
import upload from '../config/multer.js'
import { protectCompany, requireRecruiterRole } from '../middleware/authMiddleware.js'
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
router.post('/post-job', protectCompany, requireRecruiterRole('Admin'), validate(schemas.postJob), postJob)
router.put('/jobs/:id', protectCompany, requireRecruiterRole('Admin'), validate(schemas.updateJob), updateJob)
router.get('/applicants', protectCompany, getCompanyJobApplicants)
router.get('/applicant-resume/:applicationId', protectCompany, requireRecruiterRole('Admin', 'Recruiter'), getApplicantResumeSignedUrl)
router.get('/list-jobs', protectCompany, getCompanyPostedJobs)
router.post('/change-status', protectCompany, requireRecruiterRole('Admin', 'Recruiter'), validate(schemas.updatePipeline), changeJobApplicationStatus)
router.post('/applications/:applicationId/internal-notes', protectCompany, requireRecruiterRole('Admin', 'Recruiter'), validate(schemas.internalNote), addInternalNote)
router.post('/change-visibility', protectCompany, requireRecruiterRole('Admin'), validate(schemas.changeVisibility), changeVisibility)
router.get('/match-resume/:applicationId', protectCompany, requireRecruiterRole('Admin', 'Recruiter'), matchResume)
router.get('/resume-summary/:applicationId', protectCompany, requireRecruiterRole('Admin', 'Recruiter'), getResumeSummary)

// Team and audit
router.get('/team', protectCompany, requireRecruiterRole('Admin'), getRecruiterTeam)
router.post('/team', protectCompany, requireRecruiterRole('Admin'), validate(schemas.createTeamMember), createRecruiterTeamMember)
router.patch('/team/:memberId', protectCompany, requireRecruiterRole('Admin'), validate(schemas.updateTeamMember), updateRecruiterTeamMember)
router.get('/audit-logs', protectCompany, requireRecruiterRole('Admin'), getAuditLogs)

// Messaging
router.get('/messages/threads', protectCompany, listCompanyThreads)
router.get('/messages/thread/:applicationId', protectCompany, getCompanyThread)
router.post('/messages/thread/:applicationId/read', protectCompany, markCompanyThreadRead)
router.post('/messages', protectCompany, requireRecruiterRole('Admin', 'Recruiter'), validate(schemas.sendMessage), postCompanyMessage)

// Analytics
router.get('/analytics', protectCompany, getRecruiterAnalytics)

export default router
