Connect with playwright MCP with claude

Step 1:
Read CLAUDE.md fully before doing anything — this governs the whole project.

Start Milestone 1 (Project Foundation & Design System) from §44.

Follow §36 Development Workflow: inspect the current repo state first (is this an empty folder or does something already exist?), then give me a short plan in this format before writing any code:

Objective:
Files to Change:
Architecture Decisions:
Potential Risks:
Validation Plan:

Scaffold using the pinned stack in §2 exactly — Next.js App Router, TypeScript strict, Tailwind, shadcn/ui, pnpm. Do not substitute any library.

For Milestone 1 specifically, that means:

Project scaffold with the pinned stack
Base folder structure per §6 (Feature-Oriented Organization)
Design tokens (colors, typography, spacing, radius) per §21
Core shared components from §21's list (Button, Input, Card, Badge, etc.) using shadcn/ui as the base
A simple placeholder home page that demonstrates the design tokens are wired up correctly

Once the scaffold and design tokens are in place, run the dev server and use Playwright to screenshot the homepage so I can see it before we go further.

Wait for my go-ahead on the plan before implementing anything.


Step2:
Milestone 1 is committed. Start Milestone 2 (Database & Core Domain Models) from §44.

Follow §36 Development Workflow — give me the plan (Objective / Files to Change / Architecture Decisions / Potential Risks / Validation Plan) before writing any code.

Scope for this milestone:

Set up Prisma with PostgreSQL per §2.
Design the core domain schema per §11 (LMS Domain Rules): Course → Section/Module → Lesson → LessonContentBlock[], with content block types (TEXT, IMAGE, VIDEO, QUIZ, EXERCISE, CODE, CALLOUT, FILE, EMBED).
Apply §14 (Enterprise Readiness & Organization Model) ownership rules now: decide which entities are plausible future organization-scope candidates (Course is the obvious one) and structure the schema so adding Organization/OrganizationMembership later doesn't require a breaking migration — but do NOT build the Organization model itself yet, per §14's explicit instruction not to implement it prematurely.
Add the User and Role models per §12 (Role System): student, instructor, tutor, moderator, admin.
Add Quiz and Exercise domain models per §18 and §19 — support multiple question types and multiple evaluation methods structurally, even though only basic types are implemented now.
Set up §30 (Environment & Secrets): a typed, Zod-validated env schema for DATABASE_URL and any other required vars, with a .env.example kept in sync.
Run the initial migration and verify the schema applies cleanly.

Follow §9 and §38 (Database Rules, Database Migration Rules) — consider indexes, relationships, and migration safety as you design this, not as an afterthought.

Wait for my go-ahead on the plan before implementing.


Step 3:
Milestone 2 is committed. Start Milestone 3 (Authentication & Authorization) from §44.

Follow §36 Development Workflow — give me the plan (Objective / Files to Change / Architecture Decisions / Potential Risks / Validation Plan) before writing any code.

Scope for this milestone:

Set up NextAuth (Auth.js) per §2, with the Prisma adapter — add the Account/Session/VerificationToken tables you flagged as pending, migrate cleanly.
Wire authentication into the env schema from §30 (NEXTAUTH_SECRET, NEXTAUTH_URL, any OAuth provider credentials) — validated, not accessed via raw process.env.
Implement the centralized permission/policy layer that §12 (Role System) calls for — a single place that resolves "can this user perform this action on this resource," not role checks scattered across routes or components. This is the piece that will get reused for every protected action from Milestone 4 onward, so make it a clean abstraction now.
Enforce §11 (Course Access and Authorization) at the server level for whatever routes/actions exist so far — every protected action must verify authentication, identity, role, and resource ownership/access, never relying on hidden UI alone.
Decide and implement the actual sign-in method(s) — tell me the trade-offs (e.g. credentials vs. OAuth vs. magic link) as part of your plan rather than assuming, since this affects onboarding UX.
Build minimal sign-in/sign-out UI using the design system components from Milestone 1 — this doesn't need to be polished, just functional and on-brand.
Use Playwright to verify: an unauthenticated user is blocked from a protected route, and a signed-in user reaches it.

Wait for my go-ahead on the plan before implementing — the sign-in method decision especially, since that's a product call, not just an implementation detail.