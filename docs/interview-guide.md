# SkillNest Interview Guide

## Project Pitch

SkillNest is an AI-assisted recruitment workflow platform. Candidates apply with secure resumes and track hiring progress, while recruiters manage jobs, review applicants, move candidates through a pipeline, and communicate through application-scoped realtime chat.

## Best Questions To Prepare

### Why a modular monolith?

Because the project has one team-sized domain and does not need microservice complexity. I still separated controllers, services, middleware, models, and realtime code so the system remains maintainable.

### Why Clerk plus recruiter JWT?

Clerk handles candidate identity and sessions. Recruiter/company accounts are product-domain entities, so I store and authenticate them with my own JWT flow.

### How do you secure resumes?

Resumes are private Cloudinary assets. The backend returns signed URLs only after checking candidate ownership or recruiter-company ownership of the application.

### What happens if Gemini fails?

The AI service wraps Gemini with timeout, retry, context truncation, and defensive JSON parsing. If Redis fails, the endpoint still works without caching. If Gemini fails, the API returns a controlled error.

### Why Redis?

AI resume analysis is expensive and can be slow. Redis caches match/summary results to reduce repeated LLM calls. Cache keys include resume/job version information to avoid stale results.

### Why Socket.io?

Pipeline updates and chat are user-facing realtime events. Socket.io gives bidirectional communication and room-based isolation. Each application has its own room, and joining requires authorization.

### How would you scale realtime?

Add a Socket.io Redis adapter and run multiple Node instances behind a load balancer. The current design is correct for one instance and prepared for that next step.

### How do you prevent duplicate applications?

There is both a service-level check and a unique database index on `{ userId, jobId }`. The DB index protects against races.

## Honest Limitations

- The project is not a full enterprise ATS.
- AI is assistive, not a hiring decision engine.
- Realtime horizontal scaling needs a Socket.io Redis adapter.
- Frontend test coverage is intentionally small and should grow around the main candidate and recruiter flows.

## Resume Bullet Options

- Built SkillNest, a MERN recruitment workflow platform with candidate applications, recruiter pipeline management, secure resume access, and realtime messaging.
- Implemented AI-assisted resume summary and match scoring with timeout, retry, defensive JSON parsing, and Redis-backed caching.
- Designed authorization boundaries for recruiter-owned applicant data, private resume signed URLs, and application-scoped Socket.io rooms.
- Added integration tests for auth, validation, AI cache behavior, and API health using Jest, Supertest, and MongoDB Memory Server.
