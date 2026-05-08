import request from 'supertest'
import { jest } from '@jest/globals'

// Mock AI service to avoid loading pdf-parse which causes issues in Jest ESM mode
jest.unstable_mockModule('../services/aiService.js', () => ({
  default: {
    parsePDF: jest.fn(),
    generateMatchScore: jest.fn(),
    auditJobDescription: jest.fn()
  }
}))

// Mock Clerk to avoid "Publishable key not valid" error in CI
jest.unstable_mockModule('@clerk/express', () => ({
  clerkMiddleware: jest.fn(() => (req, res, next) => next()),
  getAuth: jest.fn(() => ({ userId: 'test_user_id' }))
}))

const { app } = await import('../server.js')

describe('GET /api/health', () => {
  it('should return 200 and success message', async () => {
    const res = await request(app).get('/api/health')
    expect(res.statusCode).toEqual(200)
    expect(res.body).toHaveProperty('success', true)
    expect(res.body.message).toMatch(/SkillNest API is running/)
  })
})
