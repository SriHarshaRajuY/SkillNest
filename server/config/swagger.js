import swaggerUi from 'swagger-ui-express'
import { PIPELINE_STAGES } from '../constants/pipeline.js'

const envelope = (dataSchema) => ({
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    message: { type: 'string' },
    data: dataSchema,
  },
})

const errorResponse = {
  type: 'object',
  properties: {
    success: { type: 'boolean', example: false },
    message: { type: 'string' },
    errors: { type: 'array', items: { type: 'string' } },
  },
}

const idParam = (name, description) => ({
  in: 'path',
  name,
  required: true,
  description,
  schema: { type: 'string', pattern: '^[0-9a-fA-F]{24}$' },
})

const jsonBody = (schema) => ({
  required: true,
  content: { 'application/json': { schema } },
})

const success = (description, dataSchema = { type: 'object' }) => ({
  description,
  content: { 'application/json': { schema: envelope(dataSchema) } },
})

const failure = (description) => ({
  description,
  content: { 'application/json': { schema: errorResponse } },
})

const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'SkillNest API',
    version: '1.0.0',
    description: 'Complete API reference for the SkillNest recruitment workflow platform.',
  },
  servers: [
    {
      url: process.env.SERVER_URL || 'http://localhost:5000',
      description: 'SkillNest API server',
    },
  ],
  tags: [
    { name: 'Health' },
    { name: 'Jobs' },
    { name: 'Candidate' },
    { name: 'Recruiter' },
    { name: 'Messaging' },
    { name: 'AI' },
  ],
  components: {
    securitySchemes: {
      clerkBearer: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'Clerk JWT',
        description: 'Candidate authentication token issued by Clerk.',
      },
      recruiterToken: {
        type: 'apiKey',
        in: 'header',
        name: 'token',
        description: 'Recruiter JWT returned by /api/company/login.',
      },
    },
    schemas: {
      Error: errorResponse,
      Company: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
          image: { type: 'string' },
        },
      },
      Job: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          title: { type: 'string' },
          description: { type: 'string' },
          location: { type: 'string' },
          category: { type: 'string' },
          level: { type: 'string' },
          salary: { type: 'number' },
          visible: { type: 'boolean' },
          companyId: { oneOf: [{ type: 'string' }, { $ref: '#/components/schemas/Company' }] },
        },
      },
      Application: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          userId: { type: 'object' },
          companyId: { oneOf: [{ type: 'string' }, { $ref: '#/components/schemas/Company' }] },
          jobId: { oneOf: [{ type: 'string' }, { $ref: '#/components/schemas/Job' }] },
          status: { type: 'string', enum: ['Pending', 'Accepted', 'Rejected'] },
          pipelineStage: { type: 'string', enum: PIPELINE_STAGES },
          pipelineHistory: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                stage: { type: 'string', enum: PIPELINE_STAGES },
                at: { type: 'string', format: 'date-time' },
              },
            },
          },
          matchScore: { type: 'number' },
        },
      },
      Message: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          applicationId: { type: 'string' },
          body: { type: 'string' },
          fromUser: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  },
  paths: {
    '/api/health': {
      get: {
        tags: ['Health'],
        summary: 'Check API health',
        responses: {
          200: success('API is operational', {
            type: 'object',
            properties: { uptime: { type: 'number' } },
          }),
        },
      },
    },
    '/api/jobs': {
      get: {
        tags: ['Jobs'],
        summary: 'List visible public jobs',
        parameters: [
          { in: 'query', name: 'page', schema: { type: 'integer', minimum: 1 } },
          { in: 'query', name: 'limit', schema: { type: 'integer', minimum: 1, maximum: 100 } },
          { in: 'query', name: 'search', schema: { type: 'string' } },
          { in: 'query', name: 'location', schema: { type: 'string' } },
          { in: 'query', name: 'locationFilter', schema: { type: 'string', description: 'Comma-separated locations.' } },
          { in: 'query', name: 'category', schema: { type: 'string', description: 'Single category or comma-separated categories.' } },
          { in: 'query', name: 'level', schema: { type: 'string' } },
          { in: 'query', name: 'sort', schema: { type: 'string', enum: ['newest', 'oldest'] } },
        ],
        responses: {
          200: success('Jobs fetched successfully', {
            type: 'object',
            properties: {
              jobs: { type: 'array', items: { $ref: '#/components/schemas/Job' } },
              totalResults: { type: 'integer' },
              totalPages: { type: 'integer' },
              currentPage: { type: 'integer' },
            },
          }),
        },
      },
    },
    '/api/jobs/{id}': {
      get: {
        tags: ['Jobs'],
        summary: 'Get public job details',
        parameters: [idParam('id', 'Job id')],
        responses: {
          200: success('Job details fetched successfully', {
            type: 'object',
            properties: { job: { $ref: '#/components/schemas/Job' } },
          }),
          400: failure('Invalid job id'),
          404: failure('Job not found'),
        },
      },
    },
    '/api/users/user': {
      get: {
        tags: ['Candidate'],
        summary: 'Get or create the signed-in candidate profile',
        security: [{ clerkBearer: [] }],
        responses: { 200: success('User data fetched successfully'), 401: failure('Authentication required') },
      },
    },
    '/api/users/realtime-token': {
      get: {
        tags: ['Candidate'],
        summary: 'Issue a short-lived candidate realtime token',
        security: [{ clerkBearer: [] }],
        responses: { 200: success('Realtime token issued', { type: 'object', properties: { token: { type: 'string' } } }) },
      },
    },
    '/api/users/apply': {
      post: {
        tags: ['Candidate'],
        summary: 'Apply to a job',
        security: [{ clerkBearer: [] }],
        requestBody: jsonBody({
          type: 'object',
          required: ['jobId'],
          properties: { jobId: { type: 'string' } },
        }),
        responses: { 201: success('Application submitted successfully'), 400: failure('Invalid request'), 401: failure('Authentication required') },
      },
    },
    '/api/users/applications': {
      get: {
        tags: ['Candidate'],
        summary: 'List candidate applications',
        security: [{ clerkBearer: [] }],
        parameters: [
          { in: 'query', name: 'page', schema: { type: 'integer' } },
          { in: 'query', name: 'limit', schema: { type: 'integer' } },
          { in: 'query', name: 'status', schema: { type: 'string', enum: ['Pending', 'Accepted', 'Rejected'] } },
        ],
        responses: { 200: success('Applications fetched successfully') },
      },
    },
    '/api/users/update-resume': {
      post: {
        tags: ['Candidate'],
        summary: 'Upload or replace candidate resume',
        security: [{ clerkBearer: [] }],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['resume'],
                properties: { resume: { type: 'string', format: 'binary' } },
              },
            },
          },
        },
        responses: { 200: success('Resume uploaded successfully'), 400: failure('Invalid or missing PDF') },
      },
    },
    '/api/users/resume': {
      get: {
        tags: ['Candidate'],
        summary: 'Get signed URL for own resume',
        security: [{ clerkBearer: [] }],
        responses: { 200: success('Signed URL generated', { type: 'object', properties: { url: { type: 'string' } } }) },
      },
    },
    '/api/users/messages/unread-count': {
      get: {
        tags: ['Messaging'],
        summary: 'Get candidate unread message count',
        security: [{ clerkBearer: [] }],
        responses: { 200: success('Unread count fetched successfully', { type: 'object', properties: { count: { type: 'integer' } } }) },
      },
    },
    '/api/users/messages/threads': {
      get: {
        tags: ['Messaging'],
        summary: 'List candidate message threads',
        security: [{ clerkBearer: [] }],
        responses: { 200: success('Threads fetched successfully') },
      },
    },
    '/api/users/messages/thread/{applicationId}': {
      get: {
        tags: ['Messaging'],
        summary: 'Get candidate message thread',
        security: [{ clerkBearer: [] }],
        parameters: [idParam('applicationId', 'Application id')],
        responses: { 200: success('Messages fetched successfully'), 403: failure('Not authorized') },
      },
    },
    '/api/users/messages/thread/{applicationId}/read': {
      post: {
        tags: ['Messaging'],
        summary: 'Mark candidate message thread as read',
        security: [{ clerkBearer: [] }],
        parameters: [idParam('applicationId', 'Application id')],
        responses: { 200: success('Thread marked as read'), 403: failure('Not authorized') },
      },
    },
    '/api/users/messages': {
      post: {
        tags: ['Messaging'],
        summary: 'Send candidate message',
        security: [{ clerkBearer: [] }],
        requestBody: jsonBody({
          type: 'object',
          required: ['applicationId', 'content'],
          properties: { applicationId: { type: 'string' }, content: { type: 'string', maxLength: 5000 } },
        }),
        responses: { 201: success('Message sent successfully'), 403: failure('Messaging not allowed') },
      },
    },
    '/api/company/register': {
      post: {
        tags: ['Recruiter'],
        summary: 'Register recruiter company',
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['name', 'email', 'password', 'image'],
                properties: {
                  name: { type: 'string' },
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', minLength: 8 },
                  image: { type: 'string', format: 'binary' },
                },
              },
            },
          },
        },
        responses: { 201: success('Company registered successfully'), 400: failure('Invalid input'), 409: failure('Email already exists') },
      },
    },
    '/api/company/login': {
      post: {
        tags: ['Recruiter'],
        summary: 'Login recruiter company',
        requestBody: jsonBody({
          type: 'object',
          required: ['email', 'password'],
          properties: { email: { type: 'string', format: 'email' }, password: { type: 'string' } },
        }),
        responses: { 200: success('Login successful'), 401: failure('Invalid credentials') },
      },
    },
    '/api/company/company': {
      get: {
        tags: ['Recruiter'],
        summary: 'Get recruiter company profile',
        security: [{ recruiterToken: [] }],
        responses: { 200: success('Company data fetched successfully'), 401: failure('Recruiter authentication required') },
      },
    },
    '/api/company/post-job': {
      post: {
        tags: ['Recruiter'],
        summary: 'Post a job',
        security: [{ recruiterToken: [] }],
        requestBody: jsonBody({
          type: 'object',
          required: ['title', 'description', 'location', 'salary', 'level', 'category'],
          properties: {
            title: { type: 'string' },
            description: { type: 'string' },
            location: { type: 'string' },
            salary: { type: 'number' },
            level: { type: 'string' },
            category: { type: 'string' },
          },
        }),
        responses: { 201: success('Job posted successfully'), 400: failure('Validation failed') },
      },
    },
    '/api/company/applicants': {
      get: {
        tags: ['Recruiter'],
        summary: 'List applicants for recruiter company',
        security: [{ recruiterToken: [] }],
        parameters: [
          { in: 'query', name: 'page', schema: { type: 'integer' } },
          { in: 'query', name: 'limit', schema: { type: 'integer' } },
        ],
        responses: { 200: success('Applicants fetched successfully') },
      },
    },
    '/api/company/applicant-resume/{applicationId}': {
      get: {
        tags: ['Recruiter'],
        summary: 'Get signed URL for an applicant resume',
        security: [{ recruiterToken: [] }],
        parameters: [idParam('applicationId', 'Application id')],
        responses: { 200: success('Signed URL generated'), 403: failure('Not authorized') },
      },
    },
    '/api/company/list-jobs': {
      get: {
        tags: ['Recruiter'],
        summary: 'List jobs posted by recruiter company',
        security: [{ recruiterToken: [] }],
        responses: { 200: success('Posted jobs fetched successfully') },
      },
    },
    '/api/company/change-status': {
      post: {
        tags: ['Recruiter'],
        summary: 'Move an application through the hiring pipeline',
        security: [{ recruiterToken: [] }],
        requestBody: jsonBody({
          type: 'object',
          required: ['id', 'pipelineStage'],
          properties: { id: { type: 'string' }, pipelineStage: { type: 'string', enum: PIPELINE_STAGES } },
        }),
        responses: { 200: success('Pipeline stage updated successfully'), 400: failure('Validation failed'), 404: failure('Application not found') },
      },
    },
    '/api/company/applications/{applicationId}/internal-notes': {
      post: {
        tags: ['Recruiter'],
        summary: 'Add recruiter-only internal feedback to an application',
        security: [{ recruiterToken: [] }],
        parameters: [idParam('applicationId', 'Application id')],
        requestBody: jsonBody({
          type: 'object',
          required: ['content'],
          properties: { content: { type: 'string', maxLength: 4000 }, rating: { type: 'integer', minimum: 1, maximum: 5 } },
        }),
        responses: { 201: success('Note added successfully') },
      },
    },
    '/api/company/change-visibility': {
      post: {
        tags: ['Recruiter'],
        summary: 'Toggle job public visibility',
        security: [{ recruiterToken: [] }],
        requestBody: jsonBody({ type: 'object', required: ['id'], properties: { id: { type: 'string' } } }),
        responses: { 200: success('Job visibility changed'), 404: failure('Job not found') },
      },
    },
    '/api/company/match-resume/{applicationId}': {
      get: {
        tags: ['AI'],
        summary: 'Generate or fetch cached AI resume match score',
        security: [{ recruiterToken: [] }],
        parameters: [idParam('applicationId', 'Application id')],
        responses: { 200: success('AI analysis completed'), 400: failure('Resume missing'), 404: failure('Application not found') },
      },
    },
    '/api/company/resume-summary/{applicationId}': {
      get: {
        tags: ['AI'],
        summary: 'Generate or fetch cached AI resume summary',
        security: [{ recruiterToken: [] }],
        parameters: [idParam('applicationId', 'Application id')],
        responses: { 200: success('AI summary generated'), 400: failure('Resume missing'), 404: failure('Application not found') },
      },
    },
    '/api/company/messages/threads': {
      get: {
        tags: ['Messaging'],
        summary: 'List recruiter message threads',
        security: [{ recruiterToken: [] }],
        responses: { 200: success('Threads fetched successfully') },
      },
    },
    '/api/company/messages/thread/{applicationId}': {
      get: {
        tags: ['Messaging'],
        summary: 'Get recruiter message thread',
        security: [{ recruiterToken: [] }],
        parameters: [idParam('applicationId', 'Application id')],
        responses: { 200: success('Messages fetched successfully'), 403: failure('Not authorized') },
      },
    },
    '/api/company/messages/thread/{applicationId}/read': {
      post: {
        tags: ['Messaging'],
        summary: 'Mark recruiter message thread as read',
        security: [{ recruiterToken: [] }],
        parameters: [idParam('applicationId', 'Application id')],
        responses: { 200: success('Thread marked as read'), 403: failure('Not authorized') },
      },
    },
    '/api/company/messages': {
      post: {
        tags: ['Messaging'],
        summary: 'Send recruiter message',
        security: [{ recruiterToken: [] }],
        requestBody: jsonBody({
          type: 'object',
          required: ['applicationId', 'content'],
          properties: { applicationId: { type: 'string' }, content: { type: 'string', maxLength: 5000 } },
        }),
        responses: { 201: success('Message sent successfully'), 403: failure('Messaging not allowed') },
      },
    },
    '/api/company/analytics': {
      get: {
        tags: ['Recruiter'],
        summary: 'Get basic recruiter dashboard metrics',
        security: [{ recruiterToken: [] }],
        responses: { 200: success('Analytics fetched successfully') },
      },
    },
  },
}

const setupSwagger = (app) => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec))
}

export default setupSwagger
