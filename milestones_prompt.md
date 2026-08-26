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


Step 4:
Rate limiting is committed. Start Milestone 4 (Course Catalog & Discovery) from §44.

Follow §36 — plan first (Objective / Files to Change / Architecture Decisions / Potential Risks / Validation Plan).

Scope for this milestone:

Build the course catalog/discovery UI: browsable list of courses, using the design system from Milestone 1.
This is the first real reuse of the can() permission layer from Milestone 3 — enforce course:view against real data, respecting the visibility model from §14 (Public vs Organization-private, even though Organization itself doesn't exist yet — just make sure Public-only visibility works correctly now).
Data fetching per §7 (Next.js Rules) — server-side by default, no client-side fetching waterfalls for the catalog list.
Cover the states §26 (Error Handling) requires: loading, empty (no courses yet), and error.
Basic search/filter if reasonable for this milestone — keep it simple, don't overbuild before real usage data exists (§35, §39).
Use Playwright to screenshot the catalog page in at least two states: populated and empty.

Wait for my go-ahead on the plan before implementing.

Step 5
Start Milestone 5 (Course Details & Enrollment) from §44.

Follow §36 — plan first (Objective / Files to Change / Architecture Decisions / Potential Risks / Validation Plan).

Scope for this milestone:

Build the course detail page at /courses/[slug] — this replaces the placeholder/disabled state from Milestone 4. Include course info, curriculum outline (sections/lessons from the §11 hierarchy), and an enroll action.
Model Enrollment properly now — you noted in Milestone 2 this was deferred; design it per §9/§38 (Database Rules, Migration Rules), considering the relationship to User, Course, and future Progress tracking (Milestone 7) so you're not setting up a schema that needs reshaping there.
Enforce authorization per §11/§12: enrolling requires authentication; viewing enrolled-only content (if any exists at this stage) must check enrollment server-side via the can() layer, not just hide UI.
Application-layer use case per §5: "Enroll student in course" as a discrete, testable operation — not enrollment logic scattered inside a route handler.
Cover §26 states: loading, already-enrolled, not-yet-enrolled, error (e.g. enrolling in a course that doesn't allow self-enrollment, if that's a case you're modeling).
Use Playwright to verify and screenshot: the detail page for a logged-out visitor, an authenticated non-enrolled user, and post-enrollment state.

Since you already have the one authorization test from Milestone 4, extend it (don't create a second parallel test setup) to cover: an enrolled user can access enrollment-gated content, a non-enrolled user cannot, per §11.

Wait for my go-ahead on the plan before implementing.