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


Step 6
Milestone 5 is committed. Start Milestone 6 (Learning Player & Content Renderer) from §44.

Follow §36 — plan first (Objective / Files to Change / Architecture Decisions / Potential Risks / Validation Plan).

Scope for this milestone:

Build the actual lesson player behind the /learn gate from Milestone 5 — this replaces the stub, not the gate itself, which stays as-is.
Render the content-block model from §10/§11: an ordered array of typed blocks (TEXT, IMAGE, VIDEO, QUIZ, EXERCISE, CODE, CALLOUT, FILE, EMBED). Build a renderer per block type — start with TEXT, IMAGE, VIDEO, and CODE as the working set; QUIZ and EXERCISE get real implementations in Milestones 7-8, so for now render them as a recognizable placeholder rather than skipping them entirely.
Lesson navigation: move between lessons within a section/course, respecting the curriculum order from §11.
Enforce authorization per §11/§12 at the server level for every lesson fetch — enrollment must be re-verified per lesson request, not just once at the /learn gate.
If you have Figma reference for this screen, pull design context via the Figma MCP before implementing; otherwise follow §21 tokens and component patterns already established in the UI enhancement pass.
Cover §26 states: loading, lesson not found, no access (defense in depth even though the gate should already prevent this).
Use Playwright to screenshot: the player mid-lesson with a TEXT block, a VIDEO block, and the navigation between two lessons.

Note: Progress tracking (marking a lesson complete) is explicitly Milestone 7 — don't build persistence for completion state here, just the player and navigation. Flag clearly in your plan which parts you're deferring so we don't blur the boundary the way M5/M6 was already correctly kept separate.

Wait for my go-ahead on the plan before implementing.


Step 7
Start Milestone 7 (Progress Tracking) from §44.

Follow §36 — plan first (Objective / Files to Change / Architecture Decisions / Potential Risks / Validation Plan).

Scope for this milestone:

Model progress tracking hanging off the Enrollment row, as anticipated in the Milestone 5 schema comments — confirm that shape still holds now that the lesson player and content-block structure from Milestone 6 are real, and adjust if reality diverged from the original plan.
Track lesson-level completion at minimum; decide in your plan whether block-level progress (e.g. partial completion within a lesson) is in scope for this milestone or deferred, and justify the call against §35 (don't overbuild ahead of real need).
Wire completion into the lesson player from Milestone 6: a way to mark a lesson complete (manual button, or auto-complete on scroll/view — pick one and justify it in the plan) and visually reflect completion state in lesson navigation.
Application-layer use case per §5: "Mark lesson complete" / "Get course progress" as discrete, testable operations.
Enforce authorization per §11/§12: only the enrolled student can mark or view their own progress — verify this isn't just implied by UI state.
Surface a course-level progress indicator (e.g. "3 of 12 lessons complete") somewhere sensible — course detail page and/or the lesson player itself.
Cover §26 states: no progress yet, partial progress, fully complete.
Use Playwright to screenshot: a course with 0% progress, partial progress, and 100% complete.

Wait for my go-ahead on the plan before implementing.


Step 8
Start Milestone 8 (Quiz Engine) from §44.

Follow §36 — plan first (Objective / Files to Change / Architecture Decisions / Potential Risks / Validation Plan).

Scope for this milestone:

Replace the QUIZ placeholder block from Milestone 6 with a real implementation, using the Quiz domain model from §18/§19 that was structurally scaffolded in Milestone 2.
Support multiple question types structurally (even if only 1-2 are fully implemented now) per §18 — tell me in your plan which types you're implementing this milestone vs. leaving structurally supported but unimplemented, and why.
Quiz-taking flow: present questions, collect answers, submit, score, show results. Decide and justify: is scoring synchronous (client submits, gets immediate result) or does it need server-side evaluation for certain question types? This affects the architecture.
Application-layer use case per §5: "Submit quiz attempt" / "Get quiz results" as discrete, testable operations — not scoring logic embedded in a route handler or component.
Enforce authorization per §11/§12: only enrolled students can attempt a quiz; verify server-side that submitted answers can't be tampered with client-side to fake a score.
Decide on quiz attempts: single attempt, multiple attempts, or retake policy — this is a product decision, state your assumption in the plan and flag it clearly so I can correct it if wrong.
Connect quiz completion to progress tracking from Milestone 7 — does passing a quiz count toward lesson/course completion? Make this explicit rather than implicit.
Cover §26 states: not started, in progress, submitted/scored, and a review state if you're supporting reviewing past answers.
Use Playwright to screenshot: quiz question screen, submission, and results screen.

§24 (Accessibility) applies here too — keyboard navigation through questions and clear focus states matter for a graded flow, don't let this one slip the way captions did in Milestone 6.

Wait for my go-ahead on the plan before implementing — especially the attempt-policy and client/server scoring split, since both are product decisions with real implications, not just implementation details.



----------------------

Module 6 design written and committed (43e9f3a, pushed). Five lessons, ~68 blocks, seven diagrams, six exercises, six-question quiz. Not implemented — this is the Stage 4 pass, for your review before Stage 5/6.

Files changed
- docs/course-design/module-6-design.md (new, 596 lines)
- docs/course-design/open-items.md — items 6 and 7 added, item 5 strengthened
- milestones_prompt.md — your pasted Module 5 report, committed as-is

Two flags that contradict the design document directly

§9's own example diagram for this module draws TOPIC as a box between publisher and subscribers. That box is the broker misconception §21 warns about, and it sets up a specific later failure — a learner who believes in a topic process looks for it when data stops, instead of checking the two endpoints, which is the only place the fault can be. Every diagram here puts the topic name on the arrows instead. Flagged rather than silently corrected.

ros2 interface show is listed under both Module 6 and Module 9. I drew the boundary: Module 6 reads a definition (two types, to answer "where did those six numbers come from"), Module 9 owns the .msg format, custom interfaces, and the standard-interface landscape. Lesson 2 says this to the learner so the shallow treatment reads as deliberate.

A curriculum gap this module surfaced but can't fix

The 10 in create_publisher(Twist, '/turtle1/cmd_vel', 10) is a QoS queue depth — the first line of ROS 2 code in this course whose meaning the course hasn't scoped. Module 6 handles it honestly in a sentence and a callout. But QoS is taught by no module in §9 — not Module 2 (explicitly excluded by its own depth ceiling), not 9, not 12. It's also the cause of one of the most common real ROS 2 failures, and Module 6 Lesson 2 actively trains the learner that name + type matching is sufficient. True for everything in this course; not true in general. Open item 7, with Module 9 as my recommended home.

Verified rather than recalled

The one-second command timeout that Lesson 1's whole payoff rests on came from turtle.cpp on the jazzy branch, not memory. And /turtle1/color_sensor samples a uniform background — so driving around changes nothing unless the turtle crosses its own trail. I'd written the Lesson 2 exercise asking what the values do when you drive; checking changed the question, and the design now forbids implementation from phrasing it as a promise that they'll move.

Video durations came from player metadata, not estimates: DigiKey at 2133s (35m33s, and C++) rejected, The Construct's topics episode rejected as Bouncy-era like its sibling in Module 5. One 4m02s candidate is review-gated, not accepted — §15 asks for a teaching-quality judgement I can't make from metadata, and its title foregrounds "DDS pipeline" against Module 2's stated ceiling. Lesson 1 is designed to work without it.

Known limitations

Two consecutive modules would ship without video. Worth treating as a strategy question if a third follows, rather than three independent rejections.

Next recommended step

Stage 5 quality review on this design before implementation — and the checkpoint at the end asks you three specific things: whether ~68 blocks is right or Lesson 2 should compress, whether two debugging exercises in one module is one too many, and the video gate, which needs four minutes of someone's attention to close either way.
