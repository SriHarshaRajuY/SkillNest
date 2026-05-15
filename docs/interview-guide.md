# SkillNest Interview Guide

## Project Pitch

SkillNest is an AI-assisted recruitment workflow platform. Candidates save jobs, maintain skills/preferences, receive explainable recommendations, apply with secure resumes, and track hiring progress. Recruiter teams use role-based access to manage jobs, review applicants, move candidates through a pipeline, audit sensitive actions, and communicate through application-scoped realtime chat.

## Best Questions To Prepare

### Why a modular monolith?

Because the project has one team-sized domain and does not need microservice complexity. I still separated controllers, services, middleware, models, and realtime code so the system remains maintainable.

### Why Clerk plus recruiter JWT?

Clerk handles candidate identity and sessions. Recruiter/company accounts are product-domain entities, so I store recruiter users, company membership, and roles with my own JWT flow.

### How does recruiter RBAC work?

Recruiter users belong to a company and have one of three roles. Admins manage jobs, team members, and audit logs. Recruiters can review candidates, move pipeline stages, add notes, run AI analysis, and message candidates. Viewers are read-only and cannot open resumes because resumes are sensitive personal data.

### How do you secure resumes?

Resumes are private Cloudinary assets. The backend returns signed URLs only after checking candidate ownership or recruiter-company ownership of the application. Viewer recruiters are blocked from signed resume access.

### Why audit logs?

Hiring workflows involve sensitive candidate data. SkillNest records resume views, pipeline changes, AI scoring, internal notes, job edits, and team changes so an Admin can understand who did what and when.

### What happens if Gemini fails?

The AI service wraps Gemini with timeout, retry, context truncation, and defensive JSON parsing. If Redis fails, the endpoint still works without caching. If Gemini fails, the API returns a controlled error.

### Why Redis?

AI resume analysis is expensive and can be slow. Redis caches match/summary results to reduce repeated LLM calls. Cache keys include resume/job version information to avoid stale results.

### How do recommendations work?

Recommendations use an explainable weighted ranking instead of black-box AI. Candidate skills, preferred categories, preferred locations, experience level, saved jobs, application history, and MongoDB text relevance contribute to the final ranking. The UI shows reasons such as matched skills or preferred location.

### How did you improve search performance?

Public job search and recruiter candidate/job lookup use MongoDB text indexes. Applicant filtering also uses compound indexes for company, stage, score, date, and update time so sorting/filtering remains efficient as applications grow.

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
- Audit logs are product accountability logs, not tamper-proof compliance ledgers.

## Resume Bullet Options

- Built SkillNest, a MERN recruitment workflow platform with candidate applications, role-based recruiter workflows, secure resume access, audit logs, and realtime messaging.
- Implemented AI-assisted resume summary and match scoring with timeout, retry, defensive JSON parsing, and Redis-backed caching.
- Designed authorization boundaries for Admin/Recruiter/Viewer roles, private resume signed URLs, recruiter-owned applicant data, and application-scoped Socket.io rooms.
- Added indexed applicant filtering, funnel analytics, candidate withdrawal, saved jobs, and explainable skill-based job recommendations.
