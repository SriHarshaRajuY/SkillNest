import request from 'supertest'
import { jest } from '@jest/globals'
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'

let mongoServer

jest.unstable_mockModule('../services/aiService.js', () => ({
  default: {
    parsePDF: jest.fn(),
    generateMatchScore: jest.fn(),
    auditJobDescription: jest.fn()
  }
}))

jest.unstable_mockModule('../utils/redisClient.js', () => ({
  cacheGet: jest.fn(() => Promise.resolve(null)),
  cacheSet: jest.fn(() => Promise.resolve())
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
    uploader: {
      upload: jest.fn(() =>
        Promise.resolve({ secure_url: 'http://fake-cloudinary.com/logo.png' })
      )
    },
    utils: {
      private_download_url: jest.fn(() => 'http://fake-cloudinary.com/resume.pdf')
    }
  }
}))

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

describe('Company Auth API', () => {
  let authToken = ''

  it('POST /api/company/register - creates a new company', async () => {
    const res = await request(app)
      .post('/api/company/register')
      .field('name', 'Acme Corp')
      .field('email', 'acme@test.com')
      .field('password', 'SuperSecret1')
      .attach('image', Buffer.from('fake-png'), { filename: 'logo.png', contentType: 'image/png' })

    expect(res.statusCode).toEqual(201)
    expect(res.body.success).toBe(true)
    expect(res.body.data).toHaveProperty('token')
    authToken = res.body.data.token
  })

  it('POST /api/company/register - rejects duplicate email', async () => {
    const res = await request(app)
      .post('/api/company/register')
      .field('name', 'Acme Dupe')
      .field('email', 'acme@test.com')
      .field('password', 'SuperSecret1')
      .attach('image', Buffer.from('fake-png'), { filename: 'logo.png', contentType: 'image/png' })

    expect(res.statusCode).toEqual(409)
    expect(res.body.success).toBe(false)
    expect(res.body.message).toMatch(/exists/i)
  })

  it('POST /api/company/register - rejects missing logo', async () => {
    const res = await request(app)
      .post('/api/company/register')
      .send({ name: 'No Logo', email: 'nologo@test.com', password: 'SuperSecret1' })

    expect(res.statusCode).toEqual(400)
    expect(res.body.success).toBe(false)
  })

  it('POST /api/company/login - authenticates with correct credentials', async () => {
    const res = await request(app)
      .post('/api/company/login')
      .send({ email: 'acme@test.com', password: 'SuperSecret1' })

    expect(res.statusCode).toEqual(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data).toHaveProperty('token')
  })

  it('POST /api/company/login - rejects wrong password', async () => {
    const res = await request(app)
      .post('/api/company/login')
      .send({ email: 'acme@test.com', password: 'wrongpassword' })

    expect(res.statusCode).toEqual(401)
    expect(res.body.success).toBe(false)
  })

  it('GET /api/company/company - returns company data with valid token', async () => {
    const res = await request(app)
      .get('/api/company/company')
      .set('token', authToken)

    expect(res.statusCode).toEqual(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.company.email).toBe('acme@test.com')
  })

  it('GET /api/company/company - returns 401 without token', async () => {
    const res = await request(app).get('/api/company/company')
    expect(res.statusCode).toEqual(401)
    expect(res.body.success).toBe(false)
  })
})
