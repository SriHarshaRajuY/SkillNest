import request from 'supertest';
import { app } from '../server.js';
import { generateMockCompanyToken } from './helpers/mockAuth.js';

describe('API Validation Tests', () => {
    let companyToken = generateMockCompanyToken('mock-id');

    describe('Job Posting Validation', () => {
        it('should return 400 if required fields are missing', async () => {
            const res = await request(app)
                .post('/api/company/post-job')
                .set('token', companyToken)
                .send({ title: 'Software Engineer' }); // Missing description, location, etc.

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toMatch(/Validation failed/i);
            expect(Array.isArray(res.body.errors)).toBe(true);
        });

        it('should return 400 for invalid data types (e.g., salary as string)', async () => {
            const res = await request(app)
                .post('/api/company/post-job')
                .set('token', companyToken)
                .send({
                    title: 'DevOps',
                    description: 'Build things',
                    location: 'Remote',
                    salary: 'not-a-number',
                    level: 'Senior',
                    category: 'Engineering'
                });

            expect(res.status).toBe(400);
        });
    });

    describe('Generic Parameter Validation', () => {
        it('should handle malformed ObjectIds gracefully', async () => {
            const res = await request(app)
                .get('/api/company/match-resume/invalid-id-123')
                .set('token', companyToken);
            
            // Joi or Mongoose should catch this before it crashes
            expect(res.status).toBe(400);
        });
    });
});
