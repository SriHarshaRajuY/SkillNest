import Company from "../models/Company.js";
import bcrypt from 'bcrypt'
import { v2 as cloudinary } from 'cloudinary'
import generateToken from "../utils/generateToken.js";
import Job from "../models/Job.js";
import JobApplication from "../models/JobApplication.js";

// Register a new company
export const registerCompany = async (req, res) => {

    const { name, email, password } = req.body

    const imageFile = req.file;

    if (!name || !email || !password || !imageFile) {
        return res.json({ success: false, message: "Missing Details" })
    }

    try {

        const companyExists = await Company.findOne({ email })

        if (companyExists) {
            return res.json({ success: false, message: 'Company already registered' })
        }

        const salt = await bcrypt.genSalt(10)
        const hashPassword = await bcrypt.hash(password, salt)

        const imageUpload = await cloudinary.uploader.upload(imageFile.path)

        const company = await Company.create({
            name,
            email,
            password: hashPassword,
            image: imageUpload.secure_url
        })

        res.json({
            success: true,
            company: {
                _id: company._id,
                name: company.name,
                email: company.email,
                image: company.image
            },
            token: generateToken(company._id)
        })

    } catch (error) {
        // Handle MongoDB duplicate key error (E11000) gracefully
        if (error.code === 11000) {
            return res.json({ success: false, message: 'An account with this email already exists. Please login instead.' })
        }
        res.json({ success: false, message: error.message })
    }
}

// Login Company
export const loginCompany = async (req, res) => {

    const { email, password } = req.body

    if (!email || !password) {
        return res.json({ success: false, message: 'Email and password are required' })
    }

    try {

        const company = await Company.findOne({ email })

        if (!company) {
            return res.json({ success: false, message: 'Invalid email or password' })
        }

        const isMatch = await bcrypt.compare(password, company.password)

        if (isMatch) {

            res.json({
                success: true,
                company: {
                    _id: company._id,
                    name: company.name,
                    email: company.email,
                    image: company.image
                },
                token: generateToken(company._id)
            })

        }
        else {
            res.json({ success: false, message: 'Invalid email or password' })
        }

    } catch (error) {
        res.json({ success: false, message: error.message })
    }

}

// Get Company Data
export const getCompanyData = async (req, res) => {

    try {

        const company = req.company

        res.json({ success: true, company })

    } catch (error) {
        res.json({
            success: false, message: error.message
        })
    }

}

// Post New Job
export const postJob = async (req, res) => {

    const { title, description, location, salary, level, category } = req.body

    const companyId = req.company._id

    if (!title || !description || !location || !salary || !level || !category) {
        return res.json({ success: false, message: 'Please fill in all required fields' })
    }

    try {

        const newJob = new Job({
            title,
            description,
            location,
            salary: Number(salary),
            companyId,
            date: Date.now(),
            level,
            category
        })

        await newJob.save()

        res.json({ success: true, message: 'Job posted successfully!', newJob })

    } catch (error) {

        res.json({ success: false, message: error.message })

    }


}

// Get Company Job Applicants
export const getCompanyJobApplicants = async (req, res) => {
    try {

        const companyId = req.company._id

        // Find job applications for the user and populate related data
        const applications = await JobApplication.find({ companyId })
            .populate('userId', 'name image resume')
            .populate('jobId', 'title location category level salary')
            .exec()

        return res.json({ success: true, applications })

    } catch (error) {
        res.json({ success: false, message: error.message })
    }
}

// Get Company Posted Jobs
export const getCompanyPostedJobs = async (req, res) => {
    try {

        const companyId = req.company._id

        const jobs = await Job.find({ companyId })

        // Adding No. of applicants info in data
        const jobsData = await Promise.all(jobs.map(async (job) => {
            const applicants = await JobApplication.find({ jobId: job._id });
            return { ...job.toObject(), applicants: applicants.length }
        }))

        res.json({ success: true, jobsData })

    } catch (error) {
        res.json({ success: false, message: error.message })
    }
}

// Change Job Application Status
export const ChangeJobApplicationsStatus = async (req, res) => {

    try {

        const { id, status } = req.body

        if (!id || !status) {
            return res.json({ success: false, message: 'Application ID and status are required' })
        }

        const validStatuses = ['Pending', 'Accepted', 'Rejected']
        if (!validStatuses.includes(status)) {
            return res.json({ success: false, message: 'Invalid status value' })
        }

        const application = await JobApplication.findByIdAndUpdate(id, { status }, { new: true })

        if (!application) {
            return res.json({ success: false, message: 'Application not found' })
        }

        res.json({ success: true, message: 'Status updated successfully' })

    } catch (error) {

        res.json({ success: false, message: error.message })

    }
}

// Change Job Visibility
export const changeVisiblity = async (req, res) => {
    try {

        const { id } = req.body

        if (!id) {
            return res.json({ success: false, message: 'Job ID is required' })
        }

        const companyId = req.company._id

        const job = await Job.findById(id)

        if (!job) {
            return res.json({ success: false, message: 'Job not found' })
        }

        if (companyId.toString() !== job.companyId.toString()) {
            return res.json({ success: false, message: 'Not authorized to modify this job' })
        }

        job.visible = !job.visible
        await job.save()

        res.json({ success: true, job })

    } catch (error) {
        res.json({ success: false, message: error.message })
    }
}