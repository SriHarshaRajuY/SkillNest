import dotenv from 'dotenv'
import mongoose from 'mongoose'
import bcrypt from 'bcrypt'
import Company from '../models/Company.js'
import Job from '../models/Job.js'
import User from '../models/User.js'
import JobApplication from '../models/JobApplication.js'

dotenv.config()

const DEMO_COMPANY_EMAIL = 'demo@skillnest.dev'
const DEMO_USER_PREFIX = 'demo_candidate_'

async function seed() {
    if (!process.env.MONGODB_URI) {
        throw new Error('MONGODB_URI is required to seed demo data.')
    }

    await mongoose.connect(process.env.MONGODB_URI, { dbName: 'job-portal' })

    await Company.deleteOne({ email: DEMO_COMPANY_EMAIL })
    await User.deleteMany({ _id: { $regex: `^${DEMO_USER_PREFIX}` } })

    const company = await Company.create({
        name: 'SkillNest Demo Labs',
        email: DEMO_COMPANY_EMAIL,
        password: await bcrypt.hash('DemoPass123', 10),
        image: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
    })

    await Job.deleteMany({ companyId: company._id })

    const jobs = await Job.insertMany([
        {
            title: 'SDE Intern - Backend',
            description: '<p>Build APIs, MongoDB models, validation, and scalable hiring workflow features.</p>',
            location: 'Bengaluru',
            category: 'Engineering',
            level: 'Intern',
            salary: 600000,
            date: Date.now(),
            companyId: company._id,
        },
        {
            title: 'Full Stack Intern',
            description: '<p>Work across React, Express, realtime messaging, and recruiter-facing dashboards.</p>',
            location: 'Hyderabad',
            category: 'Engineering',
            level: 'Intern',
            salary: 550000,
            date: Date.now() - 86400000,
            companyId: company._id,
        },
    ])

    const users = await User.insertMany([
        {
            _id: `${DEMO_USER_PREFIX}001`,
            name: 'Aarav Sharma',
            email: 'aarav.demo@skillnest.dev',
            image: '',
            resume: 'https://res.cloudinary.com/demo/raw/upload/sample.pdf',
        },
        {
            _id: `${DEMO_USER_PREFIX}002`,
            name: 'Meera Iyer',
            email: 'meera.demo@skillnest.dev',
            image: '',
            resume: 'https://res.cloudinary.com/demo/raw/upload/sample.pdf',
        },
        {
            _id: `${DEMO_USER_PREFIX}003`,
            name: 'Rohan Patel',
            email: 'rohan.demo@skillnest.dev',
            image: '',
            resume: 'https://res.cloudinary.com/demo/raw/upload/sample.pdf',
        },
    ])

    await JobApplication.deleteMany({ companyId: company._id })
    await JobApplication.insertMany([
        {
            userId: users[0]._id,
            companyId: company._id,
            jobId: jobs[0]._id,
            date: Date.now(),
            pipelineStage: 'Applied',
        },
        {
            userId: users[1]._id,
            companyId: company._id,
            jobId: jobs[0]._id,
            date: Date.now() - 3600000,
            pipelineStage: 'Screening',
            matchScore: 82,
        },
        {
            userId: users[2]._id,
            companyId: company._id,
            jobId: jobs[1]._id,
            date: Date.now() - 7200000,
            pipelineStage: 'Interview',
            matchScore: 76,
        },
    ])

    console.log('Demo data seeded.')
    console.log(`Recruiter login: ${DEMO_COMPANY_EMAIL} / DemoPass123`)
}

seed()
    .catch((error) => {
        console.error(error)
        process.exitCode = 1
    })
    .finally(async () => {
        await mongoose.disconnect()
    })
