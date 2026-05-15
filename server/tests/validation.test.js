import request from 'supertest'
import { jest } from '@jest/globals'
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import jwt from 'jsonwebtoken'
import Company from '../models/Company.js'

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
  clerkMiddleware: jest.fn(() => (_req, _res, next) => next()),
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

describe('API validation', () => {
  let companyToken

  beforeAll(async () => {
    const company = await Company.create({
      name: 'Validation Corp',
      email: 'validation@test.com',
      password: 'hashed',
      image: 'http://fake/logo.png'
    })
    companyToken = jwt.sign({ id: company._id }, process.env.JWT_SECRET || 'test_secret_key_for_ci')
  })

  it('returns 400 if required job fields are missing', async () => {
    const res = await request(app)
      .post('/api/company/post-job')
      .set('token', companyToken)
      .send({ title: 'Software Engineer' })

    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
    expect(res.body.message).toMatch(/Validation failed/i)
    expect(Array.isArray(res.body.errors)).toBe(true)
  })

  it('returns 400 for invalid job field types', async () => {
    const res = await request(app)
      .post('/api/company/post-job')
      .set('token', companyToken)
      .send({
        title: 'DevOps',
        description: 'Build deployment tooling',
        location: 'Remote',
        salary: 'not-a-number',
        level: 'Senior',
        category: 'Engineering'
      })

    expect(res.status).toBe(400)
  })

  it('returns 400 for malformed ObjectIds in validated bodies', async () => {
    const res = await request(app)
      .post('/api/company/change-status')
      .set('token', companyToken)
      .send({ id: 'invalid-id-123', pipelineStage: 'Screening' })

    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
  })

  it('returns 400 for unsupported pipeline stages', async () => {
    const res = await request(app)
      .post('/api/company/change-status')
      .set('token', companyToken)
      .send({ id: new mongoose.Types.ObjectId().toString(), pipelineStage: 'Technical' })

    expect(res.status).toBe(400)
  })
})
