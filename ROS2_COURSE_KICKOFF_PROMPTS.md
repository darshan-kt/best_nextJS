# ROS2_COURSE_KICKOFF_PROMPTS.md

Sequenced, copy-paste prompts for building the ROS 2 Fundamentals course inside
this LMS, following `ROS2_COURSE_DESIGN.md`'s own phase process (§24) and this
project's existing `CLAUDE.md` workflow (§36 plan-first, §37 completion
reports).

**How to use this file:** run each prompt in order, in the same Claude Code
session/project. Do not skip ahead to a later prompt until the current one is
committed (for engineering work) or explicitly approved by you (for content
strategy work). Two decisions are already locked in across this whole file —
don't let any phase re-litigate them:

- **Practical work is Turtlesim-centered**, taught through rich diagrams,
  screenshots, and animations as course content — not an in-browser
  simulator. The LMS does not run ROS 2 or Turtlesim itself; the learner does,
  on their own machine.
- **Video strategy is curated external YouTube videos** for now, not
  original recordings.

---

## STAGE 0 — Close the content-block gaps (engineering)

Run this first. Content design in later stages assumes these block types
actually work.

```
Before starting ROS 2 course content, close three content-block gaps
identified against ROS2_COURSE_DESIGN.md.

Follow §36 — plan first (Objective / Files to Change / Architecture
Decisions / Potential Risks / Validation Plan).

Scope:

1. Build a real EXERCISE block renderer (currently a placeholder). Support
   three exercise types per §11 of ROS2_COURSE_DESIGN.md: guided
   (step-by-step), independent (goal-only), and debugging (broken-system
   scenario with progressive hints, not an immediate solution reveal).
   Structure should allow inline visual content (diagrams, animations)
   within an exercise, not just text steps.

2. Decide the vehicle for external videos and build it. The course will use
   curated YouTube videos (§14 of the design doc), not self-hosted
   recordings, at least initially. Decide whether EMBED or VIDEO is the
   right block type for this and justify the choice in the plan. Build/
   confirm the renderer, including basic attribution fields (title,
   creator, why selected) so the video's context is visible to the
   learner, not just a bare iframe.

3. Confirm or build CALLOUT and FILE renderers. CALLOUT for warnings/tips/
   notes; FILE for downloadable cheat sheets, source code, and exercise
   files (§17 of the design doc).

4. Explicit scope boundary — do not build an in-browser ROS 2 or Turtlesim
   simulator. All practical/debugging exercises assume the learner runs
   Turtlesim on their own local ROS 2 install. The LMS's job is rich
   instructional content around that, not a live simulation environment.
   If anything in the plan drifts toward building simulation
   infrastructure, stop and flag it rather than proceeding.

5. Enforce §11/§12 authorization on these new block types the same as
   existing ones — no new gap there.

Use Playwright to screenshot one example of each new/fixed block type: an
EXERCISE (debugging type), an embedded external video, a CALLOUT, and a
FILE download block.

Wait for my go-ahead on the plan before implementing.
```

**Checkpoint:** review the plan, especially how EXERCISE is structured — this
becomes the shape every hands-on lesson in the course depends on. Commit once
built and verified.

---

## STAGE 1 — Phase 1: Research and Course Architecture (content strategy)

Content strategy work — no code. Can be run in Claude Code or reviewed here
in chat before feeding back into the project.

```
Follow ROS2_COURSE_DESIGN.md. Start PHASE 1 — RESEARCH AND COURSE
ARCHITECTURE exactly as specified in its "CURRENT DEVELOPMENT COMMAND"
section.

Practical/exercise strategy is Turtlesim-centered (rich diagrams,
screenshots, animations as content, not a live simulator), and video
strategy is curated external YouTube videos, not original recordings —
factor both into the relevant sections below rather than re-deciding them.

Your output should contain only the 10 items PHASE 1 specifies:
1. Executive Course Strategy
2. Benchmark Analysis
3. Course Version Strategy (pin the ROS 2 distribution, Ubuntu version,
   Python version — don't leave this vague)
4. Proposed Curriculum
5. Learning Journey
6. Knowledge Dependency Map
7. Practical Learning Strategy
8. High-Level Visual Strategy
9. High-Level Video Strategy
10. Key Architecture and Curriculum Decisions

Do not generate detailed lesson content yet — that's Phase 5, after this
architecture is reviewed and approved.
```

**Checkpoint:** this is the single most important review point in the whole
file. Read all 10 sections closely, especially the Course Version Strategy
(a wrong ROS 2 distribution pin here propagates through every module) and the
Proposed Curriculum (this is the module list you'll be committing to for
weeks of content work). Explicitly approve or request changes before Stage 2.

---

## STAGE 2 — Phase 2 & 3: Course Strategy and Curriculum (content strategy)

Only run after Stage 1 is approved.

```
PHASE 1 architecture is approved. Proceed to PHASE 2 — COURSE STRATEGY and
PHASE 3 — CURRICULUM per ROS2_COURSE_DESIGN.md §24.

Produce:
- Target learner profile
- Learning philosophy (per §5 of the design doc: WHY → WHAT → HOW → SEE IT
  → DO IT → BREAK IT → FIX IT → REFLECT → RECAP)
- Learning outcomes (refine the 32 outcomes in §4 of the design doc if the
  approved Phase 1 curriculum suggests changes — flag any changes clearly)
- Version strategy (carry forward exactly what was approved in Phase 1,
  don't redecide it)
- Teaching strategy
- Full module list with, for every module: title, purpose, lessons,
  learning objectives, estimated duration, practical work, quiz,
  assessment (per §23 item 4 of the design doc)

Do not generate lesson-level content blocks yet — that's Phase 5.
```

**Checkpoint:** confirm the module list and per-module scope look buildable
— roughly 12-16 modules per §9 of the design doc. Approve before Stage 3.

---

## STAGE 3 — Phase 4: Knowledge Architecture (content strategy)

```
PHASE 2/3 are approved. Proceed to PHASE 4 — KNOWLEDGE ARCHITECTURE per
ROS2_COURSE_DESIGN.md §24.

Produce:
- Concept dependency graph (§20 of the design doc)
- Prerequisite map
- Spaced repetition strategy — identify which concepts return in later
  modules and where (§13 of the design doc)
- Common misconceptions to address, and where in the curriculum each one
  gets corrected (§21 of the design doc)
```

**Checkpoint:** lighter review — mainly confirm the spaced-repetition plan
actually revisits the concepts that matter (nodes, topics, services, actions)
rather than treating each module as isolated.

---

## STAGE 4 — Phase 5: Module Design (content strategy, repeat per module)

Run once per module, in curriculum order. This is the template — copy it for
each module and fill in the module name/number.

```
Design Module [N] — [Module Title] in full, per PHASE 5 of
ROS2_COURSE_DESIGN.md §24 and the Core Instructional Model in §6.

For every lesson in this module, provide:
- Objective
- Concepts covered
- Content block sequence (§19 of the design doc — TEXT, IMAGE, VIDEO,
  QUIZ, EXERCISE, CODE, CALLOUT, FILE, EMBED — select based on the
  concept, don't force a uniform structure)
- Visual requirements (§16 of the design doc: purpose, concept, format,
  what should be shown, what the learner should understand — for every
  major visual)
- Video requirements — if an external video is warranted, provide the full
  research entry per §15 of the design doc (title, creator, link,
  duration, module, lesson, ROS 2 version relevance, why selected, what
  the learner gains). Verify the video actually exists and is accurate —
  do not fabricate a plausible-sounding video.
- Practical exercise — guided, independent, or debugging type per §11,
  Turtlesim-based, matching the EXERCISE block structure built in Stage 0
- Quiz — per §12 of the design doc, with explanation-first grading
- Recap, and explicit connection to the next lesson/module

Flag anything that doesn't fit the approved curriculum from Stage 2 rather
than silently adjusting it.
```

**Checkpoint:** review each module before moving to the next one, not all at
once at the end — catching a structural problem in Module 2 is cheap;
catching it after all 14 modules are designed is not.

---

## STAGE 5 — Phase 6: Quality Review (content strategy, repeat per module)

Run after each module design, before implementation.

```
Run PHASE 6 — QUALITY REVIEW on Module [N] per ROS2_COURSE_DESIGN.md §24
and the Quality Gate in §25.

Check explicitly:
- Curriculum: does this lesson belong in this sequence? Are prerequisites
  satisfied? Is progression appropriate?
- Content: is the technical content accurate for the pinned ROS 2
  version? Any version-mixing errors?
- Learning: enough practice? Enough visual explanation? Are misconceptions
  from Stage 3 addressed here if relevant?
- UX: is the content scannable? Are any lessons too long? Are interactions
  meaningful, not decorative?
- Assessment: does the quiz test understanding, not memorization? Does the
  exercise test real practical ability?

Report issues found and fix them before marking this module ready for
implementation.
```

---

## STAGE 6 — Phase 7: LMS Implementation (engineering, repeat per module)

Only implement a module after it has passed Stage 5's quality review.

```
Module [N] — [Module Title] is designed and quality-reviewed. Implement it
in the LMS per PHASE 7 of ROS2_COURSE_DESIGN.md §24.

Follow §36 — plan first (Objective / Files to Change / Architecture
Decisions / Potential Risks / Validation Plan).

Scope:
- Create the module and its lessons in the database per the approved
  design.
- Add content blocks in the specified sequence for each lesson, using the
  block renderers from Stage 0 (EXERCISE, embedded video, CALLOUT, FILE)
  alongside the existing TEXT/IMAGE/VIDEO/CODE/QUIZ blocks.
- Wire in visuals — flag any that need to be generated or sourced rather
  than silently placeholder-ing them.
- Wire in the verified external videos from Stage 4.
- Wire in exercises and quizzes, connected to progress tracking (§7 from
  the main CLAUDE.md) the same way existing course content is.
- Validate the learner experience end-to-end for this module using
  Playwright: screenshot the module's lesson flow from start to quiz
  completion.

Enforce the same authorization rules (§11/§12) as every other course —
this course gets no special treatment in the access model.

Wait for my go-ahead on the plan before implementing.
```

**Checkpoint:** review the screenshots against the module design from Stage
4 — this is where content-strategy intent either survives contact with the
real renderer or doesn't. Commit once verified.

---

## Repeat Stages 4-6 for every module

Work module by module, not all-at-once. This keeps review cheap and catches
drift (curriculum, technical accuracy, or scope) before it compounds across
14 modules of content.

## After the last module

Run a final full-course pass: Playwright walkthrough of the complete
learner journey (Module 0 onboarding through the capstone project, §22-23
of the design doc), confirm the spaced-recap concepts from Stage 3 actually
appear where planned, and confirm the cheat sheet and study materials
(§17 of the design doc) are in place before considering the course launched.
