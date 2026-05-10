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
    addInternalNote,
    auditJob,
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

/**
 * @swagger
 * /api/company/register:
 *   post:
 *     summary: Register a new company
 *     tags: [Company]
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               email: { type: string }
 *               password: { type: string }
 *               image: { type: string, format: binary }
 */
router.post('/register', upload.single('image'), registerLimiter, registerCompany)

/**
 * @swagger
 * /api/company/login:
 *   post:
 *     summary: Company login
 *     tags: [Company]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email: { type: string }
 *               password: { type: string }
 */
router.post('/login', loginLimiter, loginCompany)

/**
 * @swagger
 * /api/company/company:
 *   get:
 *     summary: Get logged-in company data
 *     tags: [Company]
 *     security: [{ bearerAuth: [] }]
 */
router.get('/company', protectCompany, getCompanyData)

/**
 * @swagger
 * /api/company/post-job:
 *   post:
 *     summary: Post a new job
 *     tags: [Company]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title: { type: string }
 *               description: { type: string }
 *               location: { type: string }
 *               category: { type: string }
 *               level: { type: string }
 *               salary: { type: number }
 */
router.post('/post-job', protectCompany, postJob)

/**
 * @swagger
 * /api/company/applicants:
 *   get:
 *     summary: Get all applicants for company jobs
 *     tags: [Company]
 *     security: [{ bearerAuth: [] }]
 */
router.get('/applicants', protectCompany, getCompanyJobApplicants)
router.get('/applicant-resume/:applicationId', protectCompany, getApplicantResumeSignedUrl)

/**
 * @swagger
 * /api/company/list-jobs:
 *   get:
 *     summary: List all jobs posted by the company
 *     tags: [Company]
 *     security: [{ bearerAuth: [] }]
 */
router.get('/list-jobs', protectCompany, getCompanyPostedJobs)

/**
 * @swagger
 * /api/company/change-status:
 *   post:
 *     summary: Change application status
 *     tags: [Company]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id: { type: string }
 *               status: { type: string, enum: [Accepted, Rejected, Shortlisted, Pending] }
 */
router.post('/change-status', protectCompany, changeJobApplicationStatus)

/**
 * @swagger
 * /api/company/applications/{applicationId}/internal-notes:
 *   post:
 *     summary: Add an internal note to an application
 *     tags: [Company]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: applicationId
 *         required: true
 *         schema: { type: string }
 */
router.post('/applications/:applicationId/internal-notes', protectCompany, addInternalNote)

/**
 * @swagger
 * /api/company/change-visibility:
 *   post:
 *     summary: Toggle job visibility
 *     tags: [Company]
 *     security: [{ bearerAuth: [] }]
 */
router.post('/change-visibility', protectCompany, changeVisibility)

/**
 * @swagger
 * /api/company/match-resume/{applicationId}:
 *   get:
 *     summary: AI Resume Matching for a specific application
 *     tags: [AI]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: applicationId
 *         required: true
 *         schema: { type: string }
 */
router.get('/match-resume/:applicationId', protectCompany, matchResume)

/**
 * @swagger
 * /api/company/audit-job:
 *   post:
 *     summary: AI DEI Audit for a job description
 *     tags: [AI]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               description: { type: string }
 */
router.post('/audit-job', protectCompany, auditJob)

/**
 * @swagger
 * /api/company/messages/threads:
 *   get:
 *     summary: List all active message threads
 *     tags: [Messaging]
 *     security: [{ bearerAuth: [] }]
 */
router.get('/messages/threads', protectCompany, listCompanyThreads)

router.get('/messages/thread/:applicationId', protectCompany, getCompanyThread)
router.post('/messages', protectCompany, postCompanyMessage)
router.post('/messages/ai-draft', protectCompany, aiInterviewDraft)

export default router
