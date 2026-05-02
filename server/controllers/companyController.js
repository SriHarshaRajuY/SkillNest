import Company from '../models/Company.js'
import bcrypt from 'bcrypt'
import { v2 as cloudinary } from 'cloudinary'
import generateToken from '../utils/generateToken.js'
import Job from '../models/Job.js'
import JobApplication from '../models/JobApplication.js'
import { removeLocalFile } from '../utils/fileHelpers.js'
import { GoogleGenerativeAI } from '@google/generative-ai'
import pdfParse from 'pdf-parse'

// ─── Register a new company ───────────────────────────────────────────────────
export const registerCompany = async (req, res) => {
    const { name, email, password } = req.body
    const imageFile = req.file

    if (!name || !email || !password || !imageFile) {
        removeLocalFile(imageFile?.path)
        return res.status(400).json({ success: false, message: 'Name, email, password, and company logo are required' })
    }

    if (password.length < 8) {
        removeLocalFile(imageFile?.path)
        return res.status(400).json({ success: false, message: 'Password must be at least 8 characters long' })
    }

    try {
        const exists = await Company.findOne({ email: email.toLowerCase().trim() })
        if (exists) {
            return res.status(409).json({ success: false, message: 'An account with this email already exists. Please login instead.' })
        }

        const hashPassword = await bcrypt.hash(password, 10)
        const imageUpload = await cloudinary.uploader.upload(imageFile.path, {
            folder: 'skillnest/company-logos',
        })

        const company = await Company.create({
            name: name.trim(),
            email: email.toLowerCase().trim(),
            password: hashPassword,
            image: imageUpload.secure_url,
        })

        res.status(201).json({
            success: true,
            company: { _id: company._id, name: company.name, email: company.email, image: company.image },
            token: generateToken(company._id),
        })
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ success: false, message: 'An account with this email already exists.' })
        }
        console.error('[registerCompany]', error.message)
        res.status(500).json({ success: false, message: 'Registration failed. Please try again.' })
    } finally {
        removeLocalFile(imageFile?.path)
    }
}

// ─── Login company ────────────────────────────────────────────────────────────
export const loginCompany = async (req, res) => {
    const { email, password } = req.body

    if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Email and password are required' })
    }

    try {
        const company = await Company.findOne({ email: email.toLowerCase().trim() })
        if (!company) {
            return res.status(401).json({ success: false, message: 'Invalid email or password' })
        }

        const isMatch = await bcrypt.compare(password, company.password)
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid email or password' })
        }

        res.json({
            success: true,
            company: { _id: company._id, name: company.name, email: company.email, image: company.image },
            token: generateToken(company._id),
        })
    } catch (error) {
        console.error('[loginCompany]', error.message)
        res.status(500).json({ success: false, message: 'Login failed. Please try again.' })
    }
}

// ─── Get company data ─────────────────────────────────────────────────────────
export const getCompanyData = async (req, res) => {
    try {
        // req.company is set by protectCompany middleware (password already excluded)
        res.json({ success: true, company: req.company })
    } catch (error) {
        console.error('[getCompanyData]', error.message)
        res.status(500).json({ success: false, message: 'Failed to load company data' })
    }
}

// ─── Post a new job ───────────────────────────────────────────────────────────
export const postJob = async (req, res) => {
    const { title, description, location, salary, level, category } = req.body
    const companyId = req.company._id

    if (!title || !description || !location || !salary || !level || !category) {
        return res.status(400).json({ success: false, message: 'All fields are required' })
    }

    // Reject empty Quill editor output
    const trimmedDescription = description.trim()
    if (!trimmedDescription || trimmedDescription === '<p><br></p>') {
        return res.status(400).json({ success: false, message: 'Please enter a job description' })
    }

    if (isNaN(Number(salary)) || Number(salary) <= 0) {
        return res.status(400).json({ success: false, message: 'Please enter a valid salary' })
    }

    try {
        const job = await Job.create({
            title: title.trim(),
            description: trimmedDescription,
            location: location.trim(),
            salary: Number(salary),
            companyId,
            date: Date.now(),
            level,
            category,
        })

        res.status(201).json({ success: true, message: 'Job posted successfully!', job })
    } catch (error) {
        console.error('[postJob]', error.message)
        res.status(500).json({ success: false, message: 'Failed to post job' })
    }
}

// ─── Get applicants for this company's jobs ───────────────────────────────────
export const getCompanyJobApplicants = async (req, res) => {
    try {
        const companyId = req.company._id
        const applications = await JobApplication.find({ companyId })
            .populate('userId', 'name image resume')
            .populate('jobId', 'title location category level salary')
            .sort({ date: -1 })

        res.json({ success: true, applications })
    } catch (error) {
        console.error('[getCompanyJobApplicants]', error.message)
        res.status(500).json({ success: false, message: 'Failed to load applicants' })
    }
}

// ─── Get all jobs posted by this company ─────────────────────────────────────
export const getCompanyPostedJobs = async (req, res) => {
    try {
        const companyId = req.company._id
        const jobs = await Job.find({ companyId }).sort({ date: -1 })

        const jobsData = await Promise.all(jobs.map(async (job) => {
            const count = await JobApplication.countDocuments({ jobId: job._id })
            return { ...job.toObject(), applicants: count }
        }))

        res.json({ success: true, jobsData })
    } catch (error) {
        console.error('[getCompanyPostedJobs]', error.message)
        res.status(500).json({ success: false, message: 'Failed to load jobs' })
    }
}

// ─── Change application status ────────────────────────────────────────────────
export const changeJobApplicationStatus = async (req, res) => {
    const { id, status } = req.body

    if (!id || !status) {
        return res.status(400).json({ success: false, message: 'Application ID and status are required' })
    }

    const validStatuses = ['Pending', 'Accepted', 'Rejected']
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ success: false, message: `Status must be one of: ${validStatuses.join(', ')}` })
    }

    try {
        const application = await JobApplication.findByIdAndUpdate(id, { status }, { new: true })
        if (!application) {
            return res.status(404).json({ success: false, message: 'Application not found' })
        }
        res.json({ success: true, message: `Application ${status.toLowerCase()} successfully`, application })
    } catch (error) {
        console.error('[changeJobApplicationStatus]', error.message)
        res.status(500).json({ success: false, message: 'Failed to update status' })
    }
}

// ─── Toggle job visibility ────────────────────────────────────────────────────
export const changeVisibility = async (req, res) => {
    const { id } = req.body

    if (!id) {
        return res.status(400).json({ success: false, message: 'Job ID is required' })
    }

    try {
        const job = await Job.findById(id)
        if (!job) return res.status(404).json({ success: false, message: 'Job not found' })

        if (job.companyId.toString() !== req.company._id.toString()) {
            return res.status(403).json({ success: false, message: 'Not authorized to modify this job' })
        }

        job.visible = !job.visible
        await job.save()

        res.json({ success: true, message: `Job is now ${job.visible ? 'visible' : 'hidden'}`, job })
    } catch (error) {
        console.error('[changeVisibility]', error.message)
        res.status(500).json({ success: false, message: 'Failed to update job visibility' })
    }
}

// ─── AI Resume Matcher ────────────────────────────────────────────────────────
export const matchResume = async (req, res) => {
    try {
        const { applicationId } = req.params;
        const companyId = req.company._id;

        const application = await JobApplication.findById(applicationId)
            .populate('userId', 'resume')
            .populate('jobId', 'description companyId');

        if (!application) {
            return res.status(404).json({ success: false, message: 'Application not found' });
        }

        if (application.jobId.companyId.toString() !== companyId.toString()) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        if (!application.userId.resume) {
            return res.status(400).json({ success: false, message: 'No resume uploaded by user' });
        }

        // Fetch resume PDF from Cloudinary
        const response = await fetch(application.userId.resume);
        if (!response.ok) throw new Error('Failed to fetch resume');
        
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const pdfData = await pdfParse(buffer);
        const resumeText = pdfData.text;

        const jobDescription = application.jobId.description;

        if (!process.env.GEMINI_API_KEY) {
            return res.status(500).json({ success: false, message: 'GEMINI_API_KEY is not configured.' });
        }

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        const prompt = `
You are an expert ATS (Applicant Tracking System). 
Compare the following Job Description to the candidate's Resume Text.
Provide a match score out of 100, and a concise 2-sentence reason.
Return ONLY valid JSON in the exact format:
{
  "score": 85,
  "reason": "The candidate has strong React skills but lacks the required 5 years of Python experience."
}

Job Description:
${jobDescription}

Resume Text:
${resumeText}
`;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        
        let cleanText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleanText);

        res.json({ success: true, score: parsed.score, reason: parsed.reason });

    } catch (error) {
        console.error('[matchResume]', error.message);
        res.status(500).json({ success: false, message: 'Failed to match resume. Please try again later.' });
    }
}