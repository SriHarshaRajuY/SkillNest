import request from 'supertest'
import { jest } from '@jest/globals'
import mongoose from 'mongoose'

// Mock AI service
jest.unstable_mockModule('../services/aiService.js', () => ({
  default: {
    parsePDF: jest.fn(),
    generateMatchScore: jest.fn(),
    auditJobDescription: jest.fn()
  }
}))

// Mock Redis
jest.unstable_mockModule('../utils/redisClient.js', () => ({
  cacheGet: jest.fn(() => null),
  cacheSet: jest.fn()
}))

// Mock Clerk to avoid "Publishable key not valid" error in CI
jest.unstable_mockModule('@clerk/express', () => ({
  clerkMiddleware: jest.fn(() => (req, res, next) => next()),
  getAuth: jest.fn(() => ({ userId: 'test_user_id' }))
}))

const { app } = await import('../server.js')

beforeAll(async () => {
  // Using live Atlas URI for speed, but targeting a separate 'skillnest_test' DB
  const baseUri = process.env.MONGODB_URI.split('?')[0]
  const testUri = baseUri.endsWith('/') ? `${baseUri}skillnest_test` : `${baseUri}/skillnest_test`
  
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect()
  }
  await mongoose.connect(testUri)
}, 20000)

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    // Optional: Clean up test DB after run
    // await mongoose.connection.db.dropDatabase(); 
    await mongoose.disconnect()
  }
})

describe('Company Controller - Public Endpoints', () => {
  it('should have a working health check', async () => {
    const res = await request(app).get('/api/health')
    expect(res.statusCode).toEqual(200)
    expect(res.body.success).toBe(true)
  })
})
