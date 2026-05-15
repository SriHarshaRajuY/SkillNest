import request from 'supertest'
import { jest } from '@jest/globals'
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import jwt from 'jsonwebtoken'
import Company from '../models/Company.js'
import Job from '../models/Job.js'
import JobApplication from '../models/JobApplication.js'
import User from '../models/User.js'

let mongoServer

jest.unstable_mockModule('../services/aiService.js', () => ({
  default: { parsePDF: jest.fn(), generateMatchScore: jest.fn(), generateResumeSummary: jest.fn() }
}))

jest.unstable_mockModule('../utils/redisClient.js', () => ({
  cacheGet: jest.fn(() => Promise.resolve(null)),
  cacheSet: jest.fn(() => Promise.resolve()),
  cacheDel: jest.fn(() => Promise.resolve())
}))

jest.unstable_mockModule('@clerk/express', () => ({
  clerkMiddleware: jest.fn(() => (req, _res, next) => {
    const auth = req.headers.authorization || ''
    if (auth === 'Bearer candidate-token') req.auth = { userId: 'clerk_user_auth_001' }
    next()
  }),
  getAuth: jest.fn((req) => req.auth || {}),
  clerkClient: { users: { getUser: jest.fn() } },
}))

jest.unstable_mockModule('cloudinary', () => ({
  v2: {
    config: jest.fn(),
    uploader: { upload: jest.fn() },
    api: { resource: jest.fn() },
    utils: { private_download_url: jest.fn(() => 'http://fake/resume.pdf') }
  }
}))

const { app } = await import('../server.js')

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create()
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect()
  await mongoose.connect(mongoServer.getUri())
}, 30000)

afterAll(async () => {
  await mongoose.disconnect()
  await mongoServer?.stop()
})

describe('Authorization and resource isolation', () => {
  let company
  let otherCompany
  let companyToken
  let applicationId

  beforeAll(async () => {
    company = await Company.create({
      name: 'Auth Corp',
      email: 'auth@test.com',
      password: 'hashed',
      image: 'http://fake/logo.png'
    })
    otherCompany = await Company.create({
      name: 'Other Corp',
      email: 'other-auth@test.com',
      password: 'hashed',
      image: 'http://fake/logo.png'
    })
    companyToken = jwt.sign({ id: company._id }, process.env.JWT_SECRET || 'test_secret_key_for_ci')

    const job = await Job.create({
      title: 'Backend Intern',
      description: 'Node and MongoDB',
      location: 'Remote',
      category: 'Engineering',
      level: 'Intern',
      salary: 50000,
      date: Date.now(),
      companyId: company._id
    })
    await User.create({
      _id: 'clerk_user_auth_001',
      name: 'Candidate',
      email: 'candidate-auth@test.com',
      resume: 'http://fake-cloudinary.com/resume.pdf'
    })
    const application = await JobApplication.create({
      userId: 'clerk_user_auth_001',
      companyId: company._id,
      jobId: job._id,
      date: Date.now()
    })
    applicationId = application._id.toString()
  })

  it('blocks company routes without a token', async () => {
    const res = await request(app).get('/api/company/company')
    expect(res.status).toBe(401)
    expect(res.body.success).toBe(false)
  })

  it('blocks company routes with an invalid token', async () => {
    const res = await request(app).get('/api/company/company').set('token', 'invalid-token')
    expect(res.status).toBe(401)
  })

  it('allows company routes with a valid token', async () => {
    const res = await request(app).get('/api/company/company').set('token', companyToken)
    expect(res.status).toBe(200)
    expect(res.body.data.company.email).toBe('auth@test.com')
  })

  it('blocks candidate routes without Clerk auth', async () => {
    const res = await request(app).get('/api/users/user')
    expect(res.status).toBe(401)
  })

  it('prevents one company from reading another company applicant resume', async () => {
    const otherToken = jwt.sign({ id: otherCompany._id }, process.env.JWT_SECRET || 'test_secret_key_for_ci')
    const res = await request(app)
      .get(`/api/company/applicant-resume/${applicationId}`)
      .set('token', otherToken)

    expect(res.status).toBe(403)
    expect(res.body.success).toBe(false)
  })
})
