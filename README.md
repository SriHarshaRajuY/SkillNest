# SkillNest

SkillNest is a focused recruitment workflow platform for candidates and recruiters.

Candidates can browse jobs, upload a resume, apply, track pipeline updates, and message recruiters after shortlisting. Recruiters can post jobs, review applicants, move candidates through a hiring pipeline, view short-lived signed resume links, and use AI-assisted resume summaries and match scores.

The project is intentionally built as a modular monolith: simple enough to reason about as a student project, but structured around real backend concerns like authorization, validation, file privacy, caching, realtime messaging, and integration testing.

## Core Flows

- Candidate browses and filters public jobs.
- Candidate uploads a PDF resume and applies to a job.
- Recruiter posts jobs and controls job visibility.
- Recruiter reviews applicants in table or Kanban pipeline views.
- Recruiter requests AI resume summary or match score for an application.
- Candidate and recruiter communicate in application-scoped chat rooms after shortlisting.

## Tech Stack

- Frontend: React, Vite, Tailwind CSS, Clerk, Socket.io Client
- Backend: Node.js, Express, Mongoose, Socket.io, Joi, JWT
- Services: MongoDB, Cloudinary private assets, Redis-compatible cache, Gemini
- Quality: Jest, Supertest, Vitest, Swagger UI, GitHub Actions

## Engineering Highlights

- Modular monolith with separate routes, controllers, services, middleware, models, and realtime hub.
- Two auth contexts: Clerk for candidates and recruiter JWT for company accounts.
- Resume privacy through Cloudinary private assets and short-lived signed URLs.
- Database-level duplicate application prevention with a unique `{ userId, jobId }` index.
- AI reliability wrapper with PDF parsing, context truncation, timeout, retry, and defensive JSON parsing.
- Versioned AI cache keys so resume/job changes do not reuse stale match results.
- Socket.io room isolation with JWT auth and database ownership checks before joining application rooms.
- Centralized Joi validation and normalized API response envelopes.

## API Docs

Run the backend and open:

```bash
http://localhost:5000/api-docs
```

Swagger documents all active candidate, recruiter, jobs, messaging, AI, and health endpoints.

## Setup

### Backend

Create `server/.env`:

```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
MONGODB_URI=...
JWT_SECRET=...
GEMINI_API_KEY=...
REDIS_URL=...
CLOUDINARY_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_SECRET_KEY=...
CLERK_WEBHOOK_SECRET=...
```

Then run:

```bash
cd server
npm install
npm run dev
```

### Frontend

Create `client/.env`:

```env
VITE_BACKEND_URL=http://localhost:5000
VITE_CLERK_PUBLISHABLE_KEY=...
```

Then run:

```bash
cd client
npm install
npm run dev
```

You can also run the scripts from the repository root:

```bash
npm run dev:server
npm run dev:client
```

## Demo Data

To seed recruiter-focused demo data:

```bash
cd server
npm run seed
```

The seed script creates a demo recruiter company, jobs, candidates, and applications for the recruiter pipeline view.

## Tests

```bash
cd server
npm test

cd client
npm test
```

The backend test suite covers health, auth, validation, company auth, AI cache flow, and realtime initialization. The frontend suite currently covers the job card behavior and Clerk mocking setup.

## Current Limitations

- Realtime messaging is configured for a single Node.js instance. For horizontal scaling, add the Socket.io Redis adapter.
- AI resume matching is assistive only. It should support recruiter review, not make automatic hiring decisions.
- Redis is used as an optional cache. If Redis is unavailable, AI endpoints still work without caching.
- Demo candidate users are seeded for recruiter review, not real Clerk login accounts.

## Interview Positioning

SkillNest is best described as:

> An AI-assisted recruitment workflow platform with secure resume access, recruiter pipeline management, and realtime application-scoped messaging.

The strongest discussion points are the auth boundary, signed resume access, AI failure handling, cache invalidation, database indexes, duplicate application protection, and Socket.io room authorization.
