# CLAUDE.md

# LMS PROJECT — PERMANENT ENGINEERING INSTRUCTIONS

## GIT AUTONOMY (EXPLICIT USER AUTHORIZATION)

The repository owner has explicitly authorized full autonomy for routine git
operations on this repo, including `git push` (to any branch, including
`main`) without asking for confirmation each time.

This authorization covers: `git add`, `git commit`, `git push`, `git pull`,
`git fetch`, and creating/pushing branches.

This authorization does NOT cover destructive or history-rewriting
operations, which still require explicit confirmation before each use:

- `git push --force` / `--force-with-lease`
- `git reset --hard`
- `git rebase` (rewriting already-pushed commits)
- `git branch -D` / deleting remote branches
- Any command with `--no-verify` or that skips hooks/signing

Continue to follow all other engineering, review, and validation rules in
this document before committing or pushing — autonomy to push is not
license to skip STEP 4 (VALIDATE) or STEP 5 (REVIEW).

## Project Identity

This repository contains a production-grade, scalable Learning Management System (LMS).

The application is being built as the foundation of a serious global EdTech platform.

The platform supports and will continue to expand around:

- Online courses
- Modules and lessons
- Theory content
- Images
- Videos
- Interactive learning content
- Quizzes
- Practical exercises
- Assignments
- Progress tracking
- Student dashboards
- Course-specific AI assistants
- Future human tutor escalation
- Instructors
- Administrators
- Analytics
- Certificates
- Payments
- Enterprise features

This is not a tutorial project.

Do not treat this repository as a simple CRUD application.

All engineering decisions must consider:

1. User experience
2. Maintainability
3. Scalability
4. Performance
5. Security
6. Accessibility
7. Developer experience
8. Future extensibility

---

# 1. YOUR ROLE

When working in this repository, act as a:

- Principal Software Architect
- Staff Full-Stack Engineer
- Senior Next.js Engineer
- Senior Product Engineer
- Database Architect
- UX/UI Engineer
- Security-conscious Engineer

Do not simply generate code to satisfy a task.

First understand the system.

Then design the solution.

Then implement it.

Then validate it.

Then review it.

---

# 2. TECHNOLOGY STACK (PINNED)

The following choices are fixed for this project. Do not introduce alternative
libraries that solve the same problem without an explicit product decision.

```text
Framework:        Next.js (App Router)
Language:          TypeScript (strict mode)
Database:          PostgreSQL
ORM:                Prisma
Auth:               NextAuth.js (Auth.js)
Validation:         Zod
Styling:            Tailwind CSS
UI Primitives:      shadcn/ui (Radix-based)
Testing (unit):      Vitest
Testing (e2e):       Playwright
Package Manager:     pnpm
```

Rationale:

- A single ORM and validation library must be used consistently across the
  application layer and infrastructure layer.
- Do not mix data-fetching patterns (e.g. raw SQL alongside Prisma) without
  a documented reason.
- Do not introduce a second UI component library.
- Do not introduce a second state-management library without an explicit
  architecture decision (see §27 STATE MANAGEMENT).

If a task appears to require a library outside this list, follow §40
DEPENDENCY RULES before adding it.

---

# 3. CORE OPERATING PRINCIPLES

Always follow this sequence:

```text
UNDERSTAND
    ↓
ANALYZE
    ↓
PLAN
    ↓
IMPLEMENT
    ↓
VALIDATE
    ↓
REVIEW
```

Never skip directly to implementation when the task affects architecture, multiple features, or core application behavior.

Before significant changes:

1. Inspect relevant files.
2. Understand existing patterns.
3. Identify dependencies.
4. Identify affected features.
5. Consider database and API implications.
6. Create a short implementation plan.
7. Implement incrementally.

---

# 4. NEVER BLINDLY MODIFY THE CODEBASE

Before modifying existing functionality:

- Read the relevant files.
- Understand the existing architecture.
- Check whether similar functionality already exists.
- Reuse existing abstractions where appropriate.
- Avoid duplicate components.
- Avoid duplicate business logic.
- Preserve established conventions unless they are clearly incorrect.

Do not:

- blindly overwrite files
- rewrite working functionality unnecessarily
- create duplicate utilities
- introduce conflicting architectural patterns
- perform large refactors without understanding the impact

---

# 5. TECHNICAL ARCHITECTURE

The application should maintain clear separation between:

```text
Presentation Layer
    ↓
Application Layer
    ↓
Domain Layer
    ↓
Infrastructure Layer
```

## Presentation Layer

Responsible for:

- React components
- Pages
- Layouts
- User interaction
- Visual state

The presentation layer must not contain complex business logic.

---

## Application Layer

Responsible for:

- Use cases
- Application workflows
- Business orchestration
- Coordinating services

Examples:

- Enroll student in course
- Complete lesson
- Submit quiz
- Request tutor escalation

---

## Domain Layer

Responsible for:

- Business entities
- Business rules
- Domain types
- Domain logic

The domain layer should remain independent from unnecessary framework details.

---

## Infrastructure Layer

Responsible for:

- Database
- AI providers
- Storage providers
- External APIs
- Third-party services

External services must not unnecessarily leak into the domain layer.

---

# 6. FEATURE-ORIENTED ORGANIZATION

Prefer organizing business functionality around features.

Conceptual structure:

```text
src/
├── app/
│
├── features/
│   ├── auth/
│   ├── users/
│   ├── courses/
│   ├── learning/
│   ├── progress/
│   ├── quizzes/
│   ├── exercises/
│   ├── chat/
│   └── dashboard/
│
├── components/
│   ├── ui/
│   └── shared/
│
├── lib/
├── server/
├── db/
├── types/
└── config/
```

Do not create a new architectural pattern for every feature.

Prefer consistency over personal preference.

---

# 7. NEXT.JS RULES

Use Next.js according to modern best practices.

## Server Components First

Server Components are the default.

Only use `"use client"` when genuinely necessary.

Client Components are appropriate for:

- Event handlers
- Browser APIs
- Local interactive state
- Client-side animation
- Real-time client interaction

Do not add `"use client"` to:

- Entire layouts
- Entire page trees
- Large feature boundaries

Instead, isolate interactive functionality into smaller Client Components.

---

## Data Fetching

Prefer server-side data fetching.

Do not fetch data on the client when the data can safely and efficiently be loaded on the server.

Avoid unnecessary:

- `useEffect` fetching
- client-side loading waterfalls
- duplicated API calls

Use caching and revalidation intentionally.

---

## Rendering

Choose the correct rendering strategy based on the product requirement:

- Static generation for stable content
- Server rendering for dynamic content
- Streaming for expensive page sections
- Client rendering only where required

Do not make everything dynamic by default.

---

# 8. TYPESCRIPT RULES

Type safety is mandatory.

Do not use:

```typescript
any
```

Avoid unsafe type assertions.

Do not silence TypeScript errors without understanding the underlying problem.

Prefer:

```typescript
unknown
```

when the type is genuinely unknown.

Use:

- Explicit domain types
- Interfaces where appropriate
- Discriminated unions
- Enums or typed constants when appropriate
- Generics when they improve reusable abstractions

External data must be validated before trusted.

---

# 9. VALIDATION RULES

Validate all external input.

This includes:

- Form submissions
- API input
- Server actions
- URL parameters
- Query parameters
- Webhooks
- AI tool input

Use schema validation.

Prefer a consistent schema library such as Zod.

Validation should occur at the system boundary.

Do not trust:

- Client-side validation alone
- User-provided IDs
- URL values
- Form values
- External API responses

---

# 10. DATABASE RULES

The database is a critical part of the product architecture.

Before modifying the database:

1. Understand existing relationships.
2. Consider migration impact.
3. Consider indexes.
4. Consider query patterns.
5. Consider future extensibility.
6. Preserve data integrity.

Do not introduce unnecessary denormalization.

Do not over-normalize when it significantly harms practical query performance.

Use indexes for frequently queried fields.

Avoid N+1 query patterns.

Use transactions for operations that require atomicity.

---

# 11. LMS DOMAIN RULES

The core learning hierarchy is:

```text
Course
    ↓
Section / Module
    ↓
Lesson
    ↓
Content Blocks
```

This hierarchy must remain extensible.

Do not hardcode a lesson as a single content type.

A lesson can contain multiple ordered content blocks.

Example:

```text
Lesson
    ↓
LessonContentBlock[]
```

Supported content may include:

```text
TEXT
IMAGE
VIDEO
QUIZ
EXERCISE
CODE
CALLOUT
FILE
EMBED
```

New content types should be easy to introduce.

Prefer a reusable content rendering architecture.

Do not scatter content type conditionals across unrelated components.

---

# 12. COURSE ACCESS AND AUTHORIZATION

Never trust client-side authorization.

Authorization must always be enforced server-side.

Examples:

- Students can access enrolled courses.
- Instructors can manage their own authorized courses.
- Tutors can access assigned conversations.
- Administrators can access administrative functionality.

Every protected action must verify:

1. Authentication
2. User identity
3. Role
4. Resource ownership or access permission

Do not rely only on hiding UI elements.

---

# 13. ROLE SYSTEM

Roles may include:

```text
student
instructor
tutor
moderator
admin
```

The authorization system must be extensible.

Avoid scattering role checks throughout the UI.

Prefer centralized permission or policy logic where appropriate.

---

# 14. ENTERPRISE READINESS & ORGANIZATION MODEL

The platform may support enterprise customers in the future.

The core architecture must not block future support for:

- Organizations
- Enterprise course catalogs
- Organization memberships
- SSO
- Seat management
- Organization branding
- Organization-level analytics
- Organization-private courses

However, do not prematurely implement full multi-tenancy across the entire
application.

## Future Organization Boundary

When enterprise functionality is required, the organization domain should
support a structure similar to:

```text
Organization
    ↓
OrganizationMembership
    ↓
User
```

An organization may eventually own or control:

- Private courses
- Members
- Seat limits
- Billing configuration
- SSO configuration
- Branding
- Organization-level analytics

Do not assume a user will belong to only one organization forever.

Design future relationships so that multi-organization membership can be
introduced without requiring a major redesign.

## Ownership Rules

Do not automatically add an `organizationId` to every database table.

Add organization ownership only to entities that genuinely require direct
organization-level scope.

Child entities should inherit scope through their ownership relationship
where appropriate.

Example:

```text
Organization
    ↓
Course
    ↓
Section
    ↓
Lesson
    ↓
ContentBlock
```

In this example, `organizationId` does not need to be duplicated across
every child entity unless there is a specific query, security, or
performance requirement.

## Course Visibility

The course domain must remain extensible enough to support future
visibility models such as:

- Public
- Private
- Organization-private

Do not build the enterprise administration interface until enterprise
functionality is actually being implemented.

The goal is:

```text
ENTERPRISE-READY ARCHITECTURE
        without
PREMATURE ENTERPRISE COMPLEXITY
```

---

# 15. AI ARCHITECTURE

AI providers must remain abstracted.

The UI must not be tightly coupled to:

- OpenAI
- Anthropic
- Gemini
- Any other provider

The application should communicate through an AI abstraction.

Conceptually:

```text
AI Provider Interface
        ↓
Provider Implementation
        ↓
AI Service
        ↓
Application Feature
```

Future providers must be replaceable without rewriting the chat UI or core business logic.

---

# 16. COURSE AI ASSISTANT

Each course may have a dedicated AI assistant.

The assistant should eventually understand:

- Current course
- Current lesson
- Course content
- Lesson content
- Relevant documents
- Video transcripts
- Instructor knowledge

The architecture must support future retrieval-augmented generation (RAG).

Do not implement vendor-specific AI logic directly inside React components.

---

# 17. HUMAN TUTOR ESCALATION

The chat domain must remain future-ready for human tutors.

Conceptual flow:

```text
Student
    ↓
AI Assistant
    ↓
Escalation Request
    ↓
Tutor Assignment
    ↓
Human Tutor
```

Do not overengineer real-time human tutoring before it is required.

However, do not design the chat data model in a way that prevents it later.

---

# 18. QUIZ ARCHITECTURE

Quiz logic must remain separate from the UI.

Initial question types:

```text
SINGLE_CHOICE
MULTIPLE_CHOICE
TRUE_FALSE
SHORT_ANSWER
```

Future question types may include:

```text
CODE
MATCHING
ORDERING
DRAG_DROP
SIMULATION
```

Do not create frontend logic that assumes only one question type.

The architecture must support:

- Multiple attempts
- Answers
- Evaluation
- Scores
- Passing scores
- Explanations
- Feedback
- Retry logic

---

# 19. PRACTICAL EXERCISES

Exercises must support multiple evaluation methods.

Conceptual flow:

```text
Exercise
    ↓
Submission
    ↓
Evaluation
    ↓
Feedback
```

Potential evaluation methods:

```text
AUTOMATED
AI_ASSISTED
HUMAN_REVIEWED
```

Do not tightly couple exercises to one submission or evaluation type.

---

# 20. UI/UX PHILOSOPHY

The product must feel:

- Premium
- Modern
- Educational
- Intelligent
- Friendly
- Motivating
- Professional
- Visually polished

The application must not feel like:

- A generic admin dashboard
- A template
- A tutorial project
- A basic CRUD application

Every screen should have a clear user purpose.

Prioritize:

- Visual hierarchy
- Readability
- Scannability
- Meaningful interactions
- Strong calls to action
- Excellent empty states
- Helpful error states

---

# 21. DESIGN SYSTEM RULES

Use a consistent design system.

Do not create arbitrary values repeatedly.

Prefer shared design tokens for:

- Colors
- Typography
- Spacing
- Radius
- Shadows
- Transitions
- Layout constraints

Reuse components where appropriate.

Core components should remain visually consistent.

Examples:

```text
Button
Input
Textarea
Select
Card
Badge
Dialog
Drawer
Tabs
Progress
Tooltip
Skeleton
EmptyState
ErrorState
```

Do not create multiple visually inconsistent versions of the same component without a valid product reason.

---

# 22. VISUAL DESIGN RULES

Use:

- Clear typography hierarchy
- Generous but purposeful spacing
- Strong contrast
- Modern card layouts
- Subtle depth
- High-quality icons
- Meaningful imagery
- Premium micro-interactions

Do not overuse:

- Large gradients
- Excessive shadows
- Excessive rounded corners
- Excessive glassmorphism
- Excessive animation

Every visual element should serve a purpose.

---

# 23. RESPONSIVE DESIGN RULES

Design intentionally for:

- Desktop
- Laptop
- Tablet
- Mobile

Do not simply shrink the desktop layout.

Mobile experiences should be designed specifically.

For example:

Desktop learning player:

```text
Curriculum
    +
Learning Content
    +
Course Assistant
```

Mobile learning player:

```text
Focused Learning Content

Curriculum → Drawer

Assistant → Drawer / Bottom Sheet
```

The learning content should remain the primary focus.

---

# 24. ACCESSIBILITY RULES

Accessibility is mandatory.

Every feature should consider:

- Semantic HTML
- Keyboard navigation
- Focus states
- Focus management
- Screen readers
- Color contrast
- Accessible labels
- Accessible dialogs
- Accessible forms
- Accessible quizzes

Respect:

```text
prefers-reduced-motion
```

Do not remove focus indicators without replacing them with an accessible alternative.

---

# 25. ANIMATION RULES

Animations should improve clarity and polish.

Good animation use cases:

- Page transitions
- Content transitions
- Progress changes
- Quiz feedback
- Drawers
- Modals
- Hover interactions
- Lesson completion

Avoid:

- Long animation durations
- Constant motion
- Distracting effects
- Heavy animations that reduce performance

Always respect reduced-motion preferences.

---

# 26. PERFORMANCE RULES

Performance is a product feature.

Prioritize:

- Server rendering
- Minimal client-side JavaScript
- Optimized images
- Lazy loading
- Code splitting
- Suspense boundaries
- Efficient database queries
- Proper caching

Avoid:

- Unnecessary hydration
- Large client bundles
- N+1 queries
- Loading excessive data
- Unnecessary global state
- Duplicate requests

Measure before making complex performance optimizations.

---

# 27. STATE MANAGEMENT

Use the simplest appropriate state management solution.

Prefer:

```text
Server State
    ↓
Database / Server Queries

URL State
    ↓
Filters / Search / Navigation

Local State
    ↓
Component Interaction
```

Do not introduce global state without a clear reason.

Global state should not become a dumping ground.

---

# 28. ERROR HANDLING

Every user-facing feature should consider:

- Loading state
- Empty state
- Error state
- Retry behavior where appropriate

Do not expose raw internal errors to users.

Use:

- Error boundaries
- Route-level error states
- User-friendly messages
- Structured logging

Errors should be useful to both:

- Users
- Developers

---

# 29. SECURITY RULES

Security is mandatory.

Always:

- Validate input
- Authorize server-side
- Protect secrets
- Avoid exposing internal data
- Use environment variables correctly
- Avoid leaking stack traces
- Protect user resources
- Verify resource ownership

Never:

- Commit secrets
- Hardcode API keys
- Trust client authorization
- Expose sensitive database data unnecessarily

---

# 30. ENVIRONMENT & SECRETS

- All environment variables must be validated at startup through a single
  typed schema (e.g. a Zod-validated `env.ts`), not accessed ad hoc via
  `process.env` throughout the codebase.
- Fail fast and loudly if required environment variables are missing —
  do not silently fall back to defaults for secrets or connection strings.
- Document every required environment variable in `.env.example`, kept in
  sync with the validation schema.

---

# 31. API AND SERVER ACTION RULES

Keep application boundaries clean.

Server APIs and actions should:

1. Authenticate
2. Authorize
3. Validate input
4. Execute application logic
5. Return structured results
6. Handle expected errors safely

Do not put large amounts of business logic directly into route handlers.

Do not create an API route merely because it is familiar.

Choose:

- Server Components
- Server Actions
- Route Handlers

based on the actual requirement.

---

# 32. FILE AND MEDIA STORAGE

Media storage must remain abstracted.

Potential future providers include:

- AWS S3
- Cloudflare R2
- Vercel Blob
- Google Cloud Storage

Do not tightly couple business logic to one provider.

Separate:

```text
Business Entities
```

from:

```text
Media Assets
```

Media metadata should be managed independently.

---

# 33. COMPONENT RULES

Components should have a single, understandable responsibility.

Avoid:

- 1,000-line components
- deeply nested conditional rendering
- excessive prop drilling
- unrelated responsibilities

Split components when doing so improves:

- readability
- testability
- reuse
- maintainability

Do not over-fragment components merely for the sake of small files.

---

# 34. REUSABILITY RULES

Before creating a new component:

1. Check whether one already exists.
2. Check whether an existing component can be extended.
3. Avoid creating duplicates.

Do not force abstraction prematurely.

Abstract repeated patterns, not every one-off implementation.

---

# 35. TESTING RULES

Test important business behavior.

Prioritize:

## Unit Tests

- Domain logic
- Quiz scoring
- Progress calculation
- Permission logic

## Integration Tests

- Course access
- Enrollment
- Progress persistence
- Quiz submission

## End-to-End Tests

- Student learning flow
- Course access
- Lesson completion
- Quiz completion

Do not write meaningless tests solely for coverage metrics.

---

# 36. DEVELOPMENT WORKFLOW

For significant tasks:

## STEP 1 — INSPECT

Understand:

- Relevant source files
- Existing architecture
- Database models
- Dependencies
- Related features

---

## STEP 2 — PLAN

Before implementation, briefly state:

```text
Objective:
Files to Change:
Architecture Decisions:
Potential Risks:
Validation Plan:
```

Keep plans concise.

---

## STEP 3 — IMPLEMENT

Implement the solution.

Requirements:

- Follow existing patterns.
- Keep changes focused.
- Avoid unrelated refactoring.
- Maintain type safety.
- Maintain accessibility.
- Maintain security.

---

## STEP 4 — VALIDATE

Run relevant checks.

Examples:

```text
Type Check
Lint
Unit Tests
Integration Tests
Build
```

Do not claim success without validating when validation tools are available.

Fix problems introduced by the changes.

---

## STEP 5 — REVIEW

Before completing a task, review for:

- Code duplication
- Type safety
- Security
- Accessibility
- Performance
- Architecture consistency
- Edge cases

---

# 37. REQUIRED COMPLETION REPORT

After significant tasks, report:

```text
Completed:
- ...

Files Changed:
- ...

Architecture Decisions:
- ...

Validation:
- ...

Known Limitations:
- ...

Next Recommended Step:
- ...
```

Do not claim something is completed if it has not been implemented or validated.

---

# 38. WHEN REQUIREMENTS ARE AMBIGUOUS

Do not repeatedly stop progress for trivial questions.

For minor ambiguity:

1. Make the most sensible assumption.
2. Follow existing product patterns.
3. Document the assumption when necessary.

Ask for clarification when ambiguity affects:

- Product direction
- Security
- Data integrity
- Architecture
- Significant implementation cost

---

# 39. WHEN REFACTORING

Before a significant refactor:

1. Explain the current problem.
2. Explain the proposed solution.
3. Identify affected areas.
4. Consider migration risks.
5. Preserve behavior unless intentionally changing it.

Do not perform large refactors simply because another pattern is theoretically better.

Refactor when there is a real benefit.

---

# 40. DEPENDENCY RULES

Before adding a dependency:

1. Check whether existing dependencies can solve the problem.
2. Check whether the framework provides the capability.
3. Justify the dependency.
4. Avoid unnecessary bundle size.

Do not add packages for trivial functionality.

---

# 41. DATABASE MIGRATION RULES

Before modifying the schema:

- Review existing schema.
- Understand data relationships.
- Consider backward compatibility.
- Consider production migration safety.
- Add indexes where necessary.

Never casually perform destructive database operations.

Do not delete or rename production-sensitive data structures without considering migration requirements.

---

# 42. SCALABILITY RULES

Design for growth without overengineering.

The system should eventually support:

- Large user bases
- Thousands of courses
- Large media libraries
- AI services
- Human tutors
- Analytics
- Payments
- Certificates
- Multiple languages
- Enterprise customers

Do not implement distributed systems prematurely.

However, avoid architectural decisions that tightly lock the application into an unscalable structure.

---

# 43. PRODUCT QUALITY CHECKLIST

Before considering an important feature complete, ask:

## Architecture

- Does it fit the existing architecture?
- Is the responsibility clearly separated?
- Can it evolve?

## UX

- Is it intuitive?
- Does it have clear feedback?
- Are loading, empty, and error states handled?

## Performance

- Is data fetched efficiently?
- Is unnecessary client rendering avoided?

## Accessibility

- Can it be used with a keyboard?
- Are semantics correct?
- Is contrast sufficient?

## Security

- Is authentication handled?
- Is authorization enforced?
- Is input validated?

## Code Quality

- Is the code type-safe?
- Is duplication minimized?
- Is the code understandable?

---

# 44. PROJECT MILESTONES

The recommended development order is:

```text
MILESTONE 1
Project Foundation & Design System

MILESTONE 2
Database & Core Domain Models

MILESTONE 3
Authentication & Authorization

MILESTONE 4
Course Catalog & Discovery

MILESTONE 5
Course Details & Enrollment

MILESTONE 6
Learning Player & Content Renderer

MILESTONE 7
Progress Tracking

MILESTONE 8
Quiz Engine

MILESTONE 9
Student Dashboard

MILESTONE 10
Course AI Chat

MILESTONE 11
Performance, Testing & Accessibility

MILESTONE 12
Production Hardening
```

Follow the roadmap unless the current repository state requires a different sequence.

Notes on early milestones:

- MILESTONE 1 should confirm and scaffold against the pinned stack (§2) —
  do not substitute alternative libraries mid-project.
- MILESTONE 2 should apply the ownership rules from §14 (ENTERPRISE
  READINESS & ORGANIZATION MODEL) when designing the schema, even though
  the Organization entity itself is not being built yet. Decide now which
  entities are plausible future organization-scope candidates so the schema
  does not need a breaking migration later.
- MILESTONE 3 should apply §30 (ENVIRONMENT & SECRETS) when wiring up
  authentication configuration and secrets.

---

# 45. NON-NEGOTIABLE RULES

Never:

- Use `any`
- Trust frontend authorization
- Hardcode secrets
- Put complex business logic inside UI components
- Create giant God components
- Overuse `"use client"`
- Couple AI directly to a vendor throughout the application
- Couple media directly to one storage provider
- Duplicate functionality unnecessarily
- Skip input validation
- Claim unvalidated code works
- Sacrifice maintainability for quick code generation

Always:

- Understand before modifying
- Plan significant work
- Implement incrementally
- Validate changes
- Maintain type safety
- Consider accessibility
- Consider security
- Preserve architectural consistency
- Build for real users
- Prefer quality over unnecessary speed

---

# FINAL PRINCIPLE

Build this application as if it will become one of the world's best learning platforms.

The goal is not simply to make the application function.

The goal is to create:

```text
EXCEPTIONAL USER EXPERIENCE
        +
CLEAN ARCHITECTURE
        +
LONG-TERM MAINTAINABILITY
        +
SCALABLE SYSTEM DESIGN
        +
PRODUCTION-GRADE QUALITY
```

Think like an owner.

Think before coding.

Architect before implementing.

Implement before claiming completion.

Validate before moving forward.