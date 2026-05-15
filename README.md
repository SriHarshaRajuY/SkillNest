# SkillNest

SkillNest is a focused recruitment workflow platform for candidates and recruiters.

Candidates can browse jobs, save roles, maintain career preferences, receive explainable recommendations, upload a resume, apply, track pipeline updates, withdraw applications, and message recruiters after shortlisting. Recruiter teams can review applicants, manage jobs, move candidates through a hiring pipeline, view short-lived signed resume links, use AI-assisted resume summaries/match scores, and audit sensitive actions.

The project is intentionally built as a modular monolith: simple enough to reason about as a student project, but structured around real backend concerns like authorization, validation, file privacy, caching, realtime messaging, and maintainable feature boundaries.

## Core Flows

- Candidate browses and filters public jobs.
- Candidate saves jobs and receives recommendations from skills, preferences, saved jobs, and application history.
- Candidate uploads a PDF resume and applies to a job.
- Candidate tracks applications and can withdraw when needed.
- Admin recruiter posts/edits jobs, controls visibility, manages team roles, and reviews audit logs.
- Recruiter reviews applicants in table or Kanban pipeline views.
- Recruiter requests AI resume summary or explainable match score for an application.
- Candidate and recruiter communicate in application-scoped chat rooms after shortlisting.

## Tech Stack

- Frontend: React, Vite, Tailwind CSS, Clerk, Socket.io Client
- Backend: Node.js, Express, Mongoose, Socket.io, Joi, JWT
- Services: MongoDB, Cloudinary private assets, Redis-compatible cache, Gemini
- Platform: Swagger UI, GitHub Actions, Docker

## Engineering Highlights

- Modular monolith with separate routes, controllers, services, middleware, models, and realtime hub.
- Two auth contexts: Clerk for candidates and recruiter JWT for company accounts.
- Role-based recruiter access with Admin, Recruiter, and Viewer permissions.
- Resume privacy through Cloudinary private assets and short-lived signed URLs.
- Audit logs for resume views, pipeline changes, AI scoring, internal notes, job edits, and team changes.
- Explainable job recommendations powered by candidate skills, preferences, saved jobs, application history, and MongoDB text search.
- Database-level duplicate application prevention with a unique `{ userId, jobId }` index.
- Text and compound indexes for public job search, candidate search, applicant filtering, score sorting, and audit history.
- AI reliability wrapper with PDF parsing, context truncation, timeout, retry, and defensive JSON parsing.
- Versioned AI cache keys so resume/job changes do not reuse stale match results.
- Socket.io room isolation with JWT auth and database ownership checks before joining application rooms.
- Centralized Joi validation, server-side rich text sanitization, and normalized API response envelopes.

## Recruiter Roles

| Role | Jobs | Applicants | AI Review | Resumes | Team | Audit Logs |
| --- | --- | --- | --- | --- | --- | --- |
| Admin | Create/edit/toggle | Move stages/add notes | Yes | Yes | Manage | View |
| Recruiter | Read | Move stages/add notes | Yes | Yes | No | No |
| Viewer | Read | Read only | No | No | No | No |

## API Docs

Run the backend and open:

```bash
http://localhost:5000/api-docs
```

Swagger documents active candidate, recruiter, jobs, messaging, AI, team, audit, saved-job, and recommendation endpoints.

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

## Demo Data

To seed recruiter-focused demo data:

```bash
cd server
npm run seed
```

The seed script creates a demo recruiter company, jobs, candidates, and applications for the recruiter pipeline view.

## Quality Checks

```bash
cd server
npm run lint

cd client
npm run lint
npm run build
```

## Current Limitations

- Realtime messaging is configured for a single Node.js instance. For horizontal scaling, add the Socket.io Redis adapter.
- AI resume matching is assistive only. It should support recruiter review, not make automatic hiring decisions.
- Redis is used as an optional cache. If Redis is unavailable, AI endpoints still work without caching.
- Demo candidate users are seeded for recruiter review, not real Clerk login accounts.
- Audit logs are product-level accountability logs, not tamper-proof compliance ledgers.

## Interview Positioning

SkillNest is best described as:

> An AI-assisted recruitment workflow platform with role-based recruiter teams, secure resume access, audit logs, indexed applicant search, explainable job recommendations, recruiter analytics, and realtime application-scoped messaging.

The strongest discussion points are the auth boundary, RBAC design, signed resume access, audit logging, AI failure handling, cache invalidation, database indexes, duplicate application protection, explainable recommendations, and Socket.io room authorization.
