import request from 'supertest'
import { jest } from '@jest/globals'

// ── MUST come before any server.js import ────────────────────────────────────

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
    uploader: { upload: jest.fn(() => Promise.resolve({ secure_url: 'http://fake/logo.png' })) },
    utils: { private_download_url: jest.fn(() => 'http://fake/resume.pdf') }
  }
}))

const { app } = await import('../server.js')

// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/health', () => {
  it('should return 200 and a success message', async () => {
    const res = await request(app).get('/api/health')
    expect(res.statusCode).toEqual(200)
    expect(res.body).toHaveProperty('success', true)
    expect(res.body.message).toMatch(/SkillNest API is operational/)
  })
})
