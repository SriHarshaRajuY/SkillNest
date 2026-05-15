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

// ── MUST come before any server.js import ────────────────────────────────────

jest.unstable_mockModule('../services/aiService.js', () => ({
  default: {
    parsePDF: jest.fn(() => Promise.resolve('Candidate has 5 years React experience.')),
    generateMatchScore: jest.fn(() =>
      Promise.resolve({ score: 82, reason: 'Strong React/Node match. Missing Docker.' })
    ),
  }
}))

const mockCacheGet = jest.fn(() => Promise.resolve(null))
const mockCacheSet = jest.fn(() => Promise.resolve())
const mockCacheDel = jest.fn(() => Promise.resolve())

jest.unstable_mockModule('../utils/redisClient.js', () => ({
  cacheGet: mockCacheGet,
  cacheSet: mockCacheSet,
  cacheDel: mockCacheDel
}))

jest.unstable_mockModule('@clerk/express', () => ({
  clerkMiddleware: jest.fn(() => (_req, _res, next) => next()),
  getAuth: jest.fn((req) => req.auth || { userId: null }),
  clerkClient: { users: { getUser: jest.fn(), updateUser: jest.fn() } },
  requireAuth: jest.fn(() => (_req, _res, next) => next())
}))

jest.unstable_mockModule('cloudinary', () => ({
  v2: {
    config: jest.fn(),
    uploader: { upload: jest.fn(() => Promise.resolve({ secure_url: 'http://fake/logo.png' })) },
    utils: { private_download_url: jest.fn(() => 'http://fake/resume.pdf') }
  }
}))

global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    arrayBuffer: () => Promise.resolve(Buffer.from('fake pdf content').buffer)
  })
)

const { app } = await import('../server.js')

// ─────────────────────────────────────────────────────────────────────────────

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create()
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect()
  await mongoose.connect(mongoServer.getUri())
}, 30000)

afterAll(async () => {
  await mongoose.disconnect()
  await mongoServer?.stop()
})

describe('AI Resume Matching Pipeline', () => {
  let companyToken
  let applicationId

  beforeAll(async () => {
    const company = await Company.create({
      name: 'AI Ventures',
      email: 'ai@ventures.com',
      image: 'http://fake/logo.png',
      password: 'hashed_pw'
    })
    companyToken = jwt.sign(
      { id: company._id },
      process.env.JWT_SECRET || 'test_secret_key_for_ci'
    )

    const job = await Job.create({
      title: 'Senior React Developer',
      description: 'Must know React, Node.js, and TypeScript.',
      location: 'Remote',
      category: 'Technology',
      level: 'Senior',
      salary: 120000,
      date: Date.now(),
      companyId: company._id
    })

    await User.create({
      _id: 'clerk_user_test_001',
      name: 'Jane Doe',
      email: 'jane@doe.com',
      resume: 'http://fake-cloudinary.com/resume.pdf'
    })

    const application = await JobApplication.create({
      userId: 'clerk_user_test_001',
      companyId: company._id,
      jobId: job._id,
      status: 'Pending',
      date: Date.now()
    })
    applicationId = application._id.toString()
  })

  beforeEach(() => {
    mockCacheGet.mockResolvedValue(null)
  })

  it('should return 401 when no token is provided', async () => {
    const res = await request(app).get(`/api/company/match-resume/${applicationId}`)
    expect(res.statusCode).toEqual(401)
    expect(res.body.success).toBe(false)
  })

  it('should call AI and return score on cache miss', async () => {
    mockCacheGet.mockResolvedValue(null)

    const res = await request(app)
      .get(`/api/company/match-resume/${applicationId}`)
      .set('token', companyToken)

    expect(res.statusCode).toEqual(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.score).toBe(82)
    expect(res.body.data.reason).toBe('Strong React/Node match. Missing Docker.')
    expect(res.body.data.cached).toBeFalsy()
  })

  it('should return cached result without calling AI on cache hit', async () => {
    mockCacheGet.mockResolvedValue({ score: 95, reason: 'Previously cached result' })

    const res = await request(app)
      .get(`/api/company/match-resume/${applicationId}`)
      .set('token', companyToken)

    expect(res.statusCode).toEqual(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.score).toBe(95)
    expect(res.body.data.reason).toBe('Previously cached result')
    expect(res.body.data.cached).toBe(true)
  })

  it('should return 404 for a non-existent application ID', async () => {
    const fakeId = new mongoose.Types.ObjectId()
    const res = await request(app)
      .get(`/api/company/match-resume/${fakeId}`)
      .set('token', companyToken)

    expect(res.statusCode).toEqual(404)
    expect(res.body.success).toBe(false)
  })
})
