import express from 'express'
import { ChangeJobApplicationsStatus, changeVisiblity, getCompanyData, getCompanyJobApplicants, getCompanyPostedJobs, loginCompany, postJob, registerCompany } from '../controllers/companyController.js'
import { getApplicantResumeSignedUrl } from '../controllers/userController.js'
import upload from '../config/multer.js'
import { protectCompany } from '../middleware/authMiddleware.js'

const router = express.Router()

// Register a company
router.post('/register', upload.single('image'), registerCompany)

// Company login
router.post('/login', loginCompany)

// Get company data
router.get('/company', protectCompany, getCompanyData)

// Post a job
router.post('/post-job', protectCompany, postJob)

// Get Applicants Data of Company
router.get('/applicants', protectCompany, getCompanyJobApplicants)

// Get Company Job List
router.get('/list-jobs', protectCompany, getCompanyPostedJobs)

// Change Application Status
router.post('/change-status', protectCompany, ChangeJobApplicationsStatus)

// Change Job Visibility
router.post('/change-visiblity', protectCompany, changeVisiblity)

// Get signed URL for applicant's resume (recruiter only, 1-hour expiry)
router.get('/applicant-resume/:applicationId', protectCompany, getApplicantResumeSignedUrl)

export default router