# SkillNest Architecture Decisions

## 1. Modular Monolith

SkillNest uses a modular monolith instead of microservices.

Reason: the domain is still compact, and splitting early would add deployment, network, and data consistency complexity without clear benefit. The code is still separated by responsibility: routes, controllers, services, models, middleware, and realtime infrastructure.

Interview answer:

> I kept deployment simple but organized the code so individual domains can be separated later if the product grows.

## 2. Candidate Clerk Auth and Recruiter JWT

Candidates use Clerk because user sign-up, sessions, and profile identity are commodity auth problems. Recruiters use a custom JWT because a recruiter company is a first-class domain entity owned by SkillNest.

Tradeoff: two auth systems add complexity. The benefit is a clearer separation between external candidate identity and internal recruiter/company accounts.

## 3. Private Resume Storage

Resumes are stored as private Cloudinary assets. The API returns short-lived signed URLs only after checking ownership:

- candidates can access their own resume
- recruiters can access resumes only for applications belonging to their company

This avoids exposing permanent public resume links.

## 4. AI as Assistive Review

AI is used for resume summary and match scoring, not automatic selection.

The AI service handles:

- PDF text extraction
- context truncation
- timeout protection
- retry
- defensive JSON parsing
- Redis-compatible caching

The recruiter remains the final decision-maker.

## 5. Versioned AI Cache Keys

AI calls are expensive and slow, so match/summary results are cached. Cache keys include the application plus resume/job version information so updated resumes or job descriptions do not reuse stale results.

## 6. Socket.io Rooms Per Application

Realtime messages and pipeline updates are scoped to application rooms.

Before a socket joins a room, the server validates:

- the realtime JWT
- whether the candidate owns the application, or
- whether the recruiter company owns the application

For multiple Node instances, the next step is adding the Socket.io Redis adapter.

## 7. Database-Level Duplicate Protection

The `JobApplication` model has a unique index on `{ userId, jobId }`.

Reason: frontend checks are useful for UX, but the database constraint prevents race-condition duplicates.
