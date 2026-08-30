# IMPLEMENTATION PLAN — Hands-On Robotics Projects → LMS

Status: **PLAN ONLY. No LMS/database writes have been made.** Per §36 of the
master course-design file and the Stage 3→7 precedent set by ROS 2
Fundamentals and Robotics Hardware & Sensors, this plan is for review before
any `prisma/seed.ts` changes are written.

Source documents (moved to `docs/robotics-projects/` this session, matching
`docs/hardware/`'s convention):

```
docs/robotics-projects/
├── HANDS_ON_ROBOTICS_PROJECTS_COURSE.md         (master rules)
├── PHASE_1_LAB_ROBOT_PROJECT_ARCHITECTURE.md
├── PHASE_2_PROJECT_ARCHITECTURE.md
├── PHASE_3_REPOSITORY_AND_PACKAGE_RESEARCH.md
├── PHASE_4_DETAILED_PROJECT_DESIGN.md
├── PHASE_5_LMS_CONTENT_MODULE_0_AND_PROJECT_1.md
├── PHASE_5_LMS_CONTENT_PROJECT_2.md
├── PHASE_5_LMS_CONTENT_PROJECT_3.md
├── PHASE_5_LMS_CONTENT_PROJECT_4_AND_COURSE_CLOSEOUT.md
└── PHASE_6_PHYSICAL_VALIDATION_CHECKLIST.md
```

---

## 1. Objective

Populate one new course — **Hands-On Robotics Projects** — into the existing
`Course → Section → Lesson → LessonContentBlock` schema, using only content
already written and approved in the Phase 5 documents. No new block types,
no schema migration, no new quiz questions, no new code samples, no
fabricated media.

---

## 2. Grounding: what I checked before planning

Rather than assume conventions, I read the actual implementations:

- `prisma/schema.prisma` — `ContentBlockType` enum, `Course`/`Section`/
  `Lesson`/`LessonContentBlock` models, `HardwareDevice` model.
- `src/features/learning/schemas.ts` — exact Zod shapes for TEXT, IMAGE,
  VIDEO, CODE, EMBED, CALLOUT, FILE.
- `src/features/exercises/schemas.ts`, `src/features/quizzes/schemas.ts` —
  EXERCISE (GUIDED/INDEPENDENT/DEBUGGING) and QUIZ question-type shapes.
- `prisma/seed.ts` — the actual seeded `ros2-fundamentals` and
  `robotics-hardware-and-sensors` courses (~7,000 lines), to see real
  precedent, not guess at one.
- `docs/hardware/PHOTOGRAPHY_CHECKLIST.md` — the existing pattern for
  tracking pending real-world media separately from seeded content.

Three load-bearing facts came out of that, which shape everything below:

1. **`IMAGE`, `VIDEO`, and `EMBED` all require a real, resolvable `src`/
   `videoId`** (`mediaSrcSchema` rejects anything that isn't a genuine
   absolute URL or an existing root-relative `public/` path; `EMBED`'s
   `videoId` is regex-validated against real YouTube's 11-character
   format). **There is no schema-level concept of a "pending" media
   block.** `ros2-fundamentals` handles this by using a real, honestly-
   labeled stand-in (an MDN sample video, a well-known public YouTube id)
   titled `"Placeholder ... — real lesson video replaces this."`
   `robotics-hardware-and-sensors` instead uses **zero** VIDEO/EMBED
   blocks for content whose real video hasn't been researched yet (its
   own Stage 2 doc: *"no video URL is embedded or claimed-verified... that
   fetch-and-confirm step is explicitly Stage 5's job"*), and tracks the
   gap in `docs/hardware/PHOTOGRAPHY_CHECKLIST.md` instead.
2. **`QUIZ` questions are graded, typed, and exact-matched**
   (SINGLE_CHOICE/MULTIPLE_CHOICE/TRUE_FALSE/SHORT_ANSWER) — there is no
   open-ended/essay question type. Phase 5's quizzes are written as
   open prompts with a full paragraph "Answer:" — a real format
   mismatch, addressed in §5 below.
3. **`EXERCISE`'s `INDEPENDENT` type (`goal` + `successCriteria` +
   `hints`) is a near-exact structural match** for Phase 5's "Can You
   Build It Yourself?" practical assessments — no conversion problem here.

---

## 3. Section / Lesson Breakdown

Five sections, in strict dependency order (Module 0 first — every later
section assumes it):

```
Section 1 — Module 0: Lab Zero
Section 2 — Project 1: Obstacle Avoidance
Section 3 — Project 2: Visual Object Tracking
Section 4 — Project 3: Robot Mapping (SLAM)
Section 5 — Project 4: Autonomous Navigation (Nav2)
```

Lesson boundaries follow each Phase 5 document's own numbered top-level
sections (§1–§13) — that structure was already designed as a coherent
teaching sequence, so lessons map onto it directly rather than imposing a
new cut. Long Implementation sections are split across multiple lessons
for pacing consistency with `ros2-fundamentals`/`robotics-hardware-and-
sensors` (their lessons run roughly 8–15 minutes / 4–8 blocks each).

### Section 1 — Module 0: Lab Zero

| # | Lesson title | Source (Phase 5, Module 0 doc) | Primary blocks |
|---|---|---|---|
| 1 | Welcome, Prerequisites & What You'll Build | §1, §2 | TEXT, CALLOUT (validation banner) |
| 2 | Lab Safety Check | §3 | CALLOUT (checklist) |
| 3 | Project Architecture & Data Flow | §4 | TEXT, CODE (diagrams/tables) |
| 4 | Workspace & Environment Setup | §5 | CODE, TEXT, CALLOUT (libzstd) |
| 5 | Sensor Bring-Up: RPLIDAR S3 & D435i | §6 Steps 3–7 | CODE, TEXT |
| 6 | Sensor Bring-Up: Standalone IMU & the `/cmd_vel` Watchdog | §6 Steps 8–9 | CODE, TEXT, CALLOUT (stop-ship) |
| 7 | Building `robot_description` | §7 | CODE (per file), TEXT |
| 8 | Building `robot_bringup` | §8 | CODE (per file), TEXT |
| 9 | Resolving `use_ekf` | §9 | CODE, TEXT |
| 10 | How to Run, Expected Results & Verification Checkpoints | §10, §11, §12 | TEXT, CODE |
| 11 | Module 0 Quiz | §13 (4 categories) | 4× QUIZ |
| 12 | Can You Build It Yourself? | §13 (practical assessment) | EXERCISE (INDEPENDENT) |

### Section 2 — Project 1: Obstacle Avoidance

| # | Lesson title | Source | Primary blocks |
|---|---|---|---|
| 1 | Overview, Prerequisites & Lab Safety Check | §1–§3 | TEXT, CALLOUT |
| 2 | Project Architecture & Data Flow | §4 | TEXT, CODE |
| 3 | Building the Node: From Minimal to Front-FOV Filter | §5 Steps 1–6 | CODE (per step), TEXT |
| 4 | Publishing Commands, Parameters & the Safety Timer | §5 Step 7 onward, §6 | CODE, TEXT |
| 5 | How to Run, Expected Results & Verification Checkpoints | §7, §8, §9 | TEXT, CODE |
| 6 | Project 1 Quiz | §10 (4 categories) | 4× QUIZ |
| 7 | Can You Build It Yourself? | §10 (practical assessment) | EXERCISE (INDEPENDENT) |

### Section 3 — Project 2: Visual Object Tracking

| # | Lesson title | Source | Primary blocks |
|---|---|---|---|
| 1 | Overview, Prerequisites & Lab Safety Check | §1–§3 | TEXT, CALLOUT |
| 2 | Project Architecture & Data Flow | §4 | TEXT, CODE |
| 3 | The HSV Calibration Tool | §5 Steps 1–5 | CODE (per file), TEXT, CALLOUT (cv_bridge/OpenCV) |
| 4 | Building the Tracking Node | §5 Steps 6–10 | CODE (per step), TEXT |
| 5 | Testing, How to Run & Verification Checkpoints | §5 Steps 11–12, §7–§9 | TEXT, CODE |
| 6 | Project 2 Quiz | §10 (4 categories) | 4× QUIZ |
| 7 | Can You Build It Yourself? | §10 (practical assessment) | EXERCISE (INDEPENDENT) |

### Section 4 — Project 3: Robot Mapping (SLAM)

| # | Lesson title | Source | Primary blocks |
|---|---|---|---|
| 1 | Overview, Prerequisites & Lab Safety Check | §1–§3 | TEXT, CALLOUT |
| 2 | Project Architecture & Data Flow | §4 | TEXT, CODE |
| 3 | Configuring `slam_toolbox` & the Launch File | §5 Steps 1–6 | CODE (per file), TEXT |
| 4 | The TF Checkpoint & the Teleop Mapping Run | §5 Steps 7–11 | CODE, TEXT, CALLOUT (hard-gate) |
| 5 | How to Run, Expected Results & Verification Checkpoints | §6–§9 | TEXT, CODE |
| 6 | Project 3 Quiz | §10 (4 categories) | 4× QUIZ |
| 7 | Can You Build It Yourself? | §10 (practical assessment) | EXERCISE (INDEPENDENT) |

### Section 5 — Project 4: Autonomous Navigation (Nav2)

| # | Lesson title | Source | Primary blocks |
|---|---|---|---|
| 1 | Overview, Prerequisites & Lab Safety Check (Escalated) | §1–§3 | TEXT, CALLOUT (escalated safety) |
| 2 | Project Architecture & Data Flow | §4 | TEXT, CODE |
| 3 | Lifecycle Nodes, `nav2_params.yaml` & the Launch File | §5 (lifecycle intro, Steps 1–5) | CODE (per file), TEXT, CALLOUT (lifecycle hard-gate) |
| 4 | Initial Pose, `NavigateToPose`, and the Action-Client Script | §5 Steps 6–8 | CODE, TEXT |
| 5 | Progressive Goal Testing & Recovery Behaviors | §5 Steps 9–10, §6 | CODE, TEXT |
| 6 | How to Run, Expected Results & Verification Checkpoints | §7–§9 | TEXT, CODE |
| 7 | Project 4 Quiz | §10 (4 categories) | 4× QUIZ |
| 8 | Can You Build It Yourself? | §10 (practical assessment) | EXERCISE (INDEPENDENT) |
| 9 | Course Closeout | Course Closeout section of the same doc | TEXT, CALLOUT |

**Total: 5 sections, 44 lessons.**

---

## 4. Content-Block Mapping Conventions

Rules applied uniformly across all five sections, so the same kind of
source content always becomes the same kind of block:

- **Validation-status banners** → one `CALLOUT` (`variant: "WARNING"`) at
  the top of each section's first lesson, carrying the exact
  "THEORETICALLY DESIGNED, NOT PHYSICALLY VALIDATED" text verbatim. Not
  repeated in every lesson (avoids repetitive noise) — flagged in §5 as a
  call worth confirming.
- **Markdown tables** (topics tables, parameter tables, requirement
  matrices) → `CODE` blocks (no `language`, or `language: "text"`),
  exactly like the existing "Bill of Materials" precedent in
  `robotics-hardware-and-sensors` — `TEXT` cannot render a table (it's
  literal, unparsed text; a pipe-table would render as raw `| a | b |`).
- **Command triplets** ("what it does / what success looks like / what to
  do if it fails") → one `CODE` block for the command itself
  (`language: "bash"`), immediately followed by one `TEXT` block carrying
  the three-part explanation as plain paragraphs.
- **Named troubleshooting boxes** (`libzstd`, `cv_bridge`/OpenCV mismatch,
  etc.) → one `CALLOUT` (`variant: "WARNING"`) for the explanation, paired
  with one `CODE` block for the actual fix commands immediately after —
  keeps fix commands monospaced/copyable rather than flattened into
  callout prose.
- **Full code listings** (Python nodes, YAML configs, xacro/URDF, launch
  files, `package.xml`/`CMakeLists.txt`/`setup.py`) → one `CODE` block per
  file, `filename` set to the real path from the doc (e.g.
  `obstacle_avoidance_bot/obstacle_avoidance_bot/obstacle_avoidance_node.py`),
  `language` set correctly (`python`/`yaml`/`xml`/`bash`/`cmake`).
  Incremental steps stay incremental: Step 2's minimal node and Step 7's
  full node are two separate `CODE` blocks in sequence, matching the
  doc's own incremental-build pedagogy — never collapsed straight to the
  final version.
- **Lab Safety Checks** → one `CALLOUT` per checklist
  (`variant: "DANGER"` where the doc itself names something a stop-ship/
  non-negotiable item, e.g. Module 0's watchdog test and Project 4's
  entire safety section; `variant: "WARNING"` otherwise), body containing
  the checklist items verbatim.
- **Quizzes** → per §5 below (needs a decision).
- **Practical Assessments** → one `EXERCISE` block, `type: "INDEPENDENT"`,
  `goal.body` = the "CHALLENGE:" text, `successCriteria` = the ✓ items
  verbatim, `hints` = omitted (the source provides none — not invented).
- **`[IMAGE: ...]` / `[SCREENSHOT: ...]` / `[VIDEO: ...]` placeholders** →
  per §5 below (needs a decision).

---

## 5. Decisions Needing Your Sign-Off Before I Write Any Seed Code

### 5.1 Quiz question format — RESOLVED after re-checking `quizzes/schemas.ts`

**Correction to the original plan:** I re-opened `src/features/quizzes/schemas.ts`
directly rather than trusting my first pass, and confirmed `SINGLE_CHOICE` and
`MULTIPLE_CHOICE` both exist (`choiceDataSchema`: `options` + `correctOptionIds`),
alongside `TRUE_FALSE` and `SHORT_ANSWER`. This changes the recommendation:
**`SHORT_ANSWER` is now the fallback, not the default.**

**Rule applied:** a question converts to `SINGLE_CHOICE` or `TRUE_FALSE` only
when its correct answer *and every option* can be lifted directly from text
already in the source doc's question stem or answer — no wrong-answer option
is ever invented. Where the source poses an open recall question with no
enumerated option set, `SHORT_ANSWER` is unavoidable, and I've kept the
matchable-phrase approach for those, flagged individually below since
compressing an explanation into a short phrase is a real (if narrow)
synthesis step, not verbatim transcription.

**Full audit — every question in all 20 quiz sets, all 31 questions:**

| Section | Category | Q# | Assigned type | Note |
|---|---|---|---|---|
| Module 0 | Project Understanding | 1 | SHORT_ANSWER | Open recall, no option set in stem — phrase derived from source answer. |
| Module 0 | Project Understanding | 2 | SHORT_ANSWER | Open recall — derived phrase. |
| Module 0 | Concept | 1 | SHORT_ANSWER | Open recall — derived phrase. |
| Module 0 | Concept | 2 | SHORT_ANSWER | Open recall (Configuration A/B distinction exists, but no wrong option is stated in source to pair with it) — derived phrase. |
| Module 0 | Data Flow | 1 | SHORT_ANSWER | Open recall — derived phrase. |
| Module 0 | Debugging | 1 | SHORT_ANSWER | Open recall, no enumerated options in stem — derived phrase. |
| Project 1 | Project Understanding | 1 | SHORT_ANSWER | Open recall — derived phrase. |
| Project 1 | Concept | 1 | SHORT_ANSWER | Open recall — derived phrase. |
| Project 1 | Concept | 2 | SHORT_ANSWER | Open recall — derived phrase. |
| Project 1 | Data Flow | 1 | SHORT_ANSWER | Phrased as "which file(s)," not an enumerated set — derived phrase. |
| Project 1 | Debugging | 1 | SHORT_ANSWER | Open recall, no enumerated options — derived phrase. |
| Project 2 | Project Understanding | 1 | SHORT_ANSWER | Open recall — derived phrase. |
| Project 2 | Concept | 1 | SHORT_ANSWER | Open recall — derived phrase. |
| Project 2 | Concept | 2 | SHORT_ANSWER | Open recall — derived phrase. |
| Project 2 | Data Flow | 1 | **TRUE_FALSE** | Stem is already a yes/no question ("does the node's code need to change?"); source answer opens with "No." Options come from the stem's own phrasing — nothing invented. **Format-adapted from the plan's original SHORT_ANSWER assumption.** |
| Project 2 | Debugging | 1 | **SINGLE_CHOICE** | Stem names all three options verbatim ("image processing, centroid math, or the publisher"); source answer names the correct one ("check the publisher layer first") and explains why. All three options and the correct answer are lifted directly from the source — nothing invented. Clean fit: the stem already asks for a single first check, not a ranking. |
| Project 2 | Debugging | 2 | SHORT_ANSWER | Open recall, no enumerated options — derived phrase. |
| Project 3 | Project Understanding | 1 | SHORT_ANSWER | Open recall — derived phrase. |
| Project 3 | Concept | 1 | SHORT_ANSWER | Open recall — derived phrase. |
| Project 3 | Concept | 2 | SHORT_ANSWER | Open recall — derived phrase. |
| Project 3 | Data Flow | 1 | SHORT_ANSWER | "Which node" is open, not an enumerated A/B/C set in the stem — derived phrase. |
| Project 3 | Debugging | 1 | **SINGLE_CHOICE, adapted** | Stem names all three options verbatim ("the TF tree, the slam_toolbox parameters, or the LiDAR data itself"). Source answer gives a full ranking ("TF first, params second, LiDAR third") — the current schema has no ORDERING/ranking question type (confirmed still a "future addition" per `schema.prisma`'s own comment), so this is graded on **"what do you check first"** only (correct = TF tree), not the full order. The complete three-step ranking and reasoning is preserved verbatim in `explanation`, so no content is lost — only the *graded* portion is narrower than the source question asked. **Flagged as adapted, not a clean fit**, unlike Project 2's Debugging Q1. |
| Project 3 | Debugging | 2 | SHORT_ANSWER | Open recall — derived phrase. |
| Project 4 | Project Understanding | 1 | SHORT_ANSWER | Open recall — derived phrase. |
| Project 4 | Concept | 1 | SHORT_ANSWER | Open recall — derived phrase. |
| Project 4 | Concept | 2 | SHORT_ANSWER | Open recall — derived phrase. |
| Project 4 | Data Flow | 1 | SHORT_ANSWER | "Which node" open, not enumerated in stem — derived phrase. |
| Project 4 | Debugging | 1 | **SINGLE_CHOICE, adapted** | Same shape as Project 3's Debugging Q1: stem names all three options verbatim ("the lifecycle node states, the map, or the goal coordinates"); source gives a full ranking. Graded on **first check only** (correct = lifecycle node states); full ranking and reasoning preserved verbatim in `explanation`. **Flagged as adapted.** |
| Project 4 | Debugging | 2 | SHORT_ANSWER | Open recall — derived phrase. |

**Totals:** 24 `SHORT_ANSWER` (each individually flagged above as a derived,
not verbatim, matchable phrase), 3 `SINGLE_CHOICE` (2 clean fits with zero
adaptation beyond format, 2 of which — Project 3 & 4 Debugging Q1 — are
narrowed from a 3-step ranking to a first-check-only grade, flagged), 1
`TRUE_FALSE` (clean fit, zero adaptation). `MULTIPLE_CHOICE` ends up unused:
every discrete-option question in the source has exactly one correct answer,
which is what `SINGLE_CHOICE` is for — `MULTIPLE_CHOICE` would misrepresent
the source's own framing by implying more than one option is simultaneously
correct.

### 5.2 Pending images and videos (real schema constraint, not a style choice)

As established in §2, `IMAGE`/`VIDEO`/`EMBED` cannot represent "pending" —
the schema requires a real, resolvable source. Two different situations
in the Phase 5 docs need two different answers:

- **Architecture/data-flow diagrams explicitly marked as renderable
  without physical hardware** (e.g. "Architecture diagram — rendered
  directly, no physical capture needed") — I recommend **authoring real
  SVG diagrams** for these, the same way `robotics-hardware-and-sensors`
  did (`public/hardware/*.svg`, hand-authored from the same content
  already described in its docs). These would live under
  `public/robotics-projects/*.svg` and become real `IMAGE` blocks. This
  is new asset-authoring work, not new *design* content — every diagram
  already exists in ASCII form in the approved Phase 4/5 docs; this only
  changes its rendering. **Flag for approval since it's additional scope
  beyond "populate existing content" — say if you'd rather skip this and
  ship these sections as text-only diagrams for now.**
- **Photos, RViz screenshots, and terminal captures that genuinely
  require the physical robot** (hero images, TF tree renders, the SLAM
  loop-closure comparison, Nav2 particle-cloud convergence, etc.) — these
  get **no block at all** in the seeded lessons, matching
  `robotics-hardware-and-sensors`'s stricter precedent. I'll instead
  create `docs/robotics-projects/VISUAL_AND_VIDEO_CAPTURE_CHECKLIST.md`
  (mirroring `docs/hardware/PHOTOGRAPHY_CHECKLIST.md`), listing every
  pending item from the Phase 5 docs, cross-referenced to the exact
  Phase 6 validation step that would produce it. All 7 named video slots
  per module fall in this bucket too — zero `VIDEO`/`EMBED` blocks seeded,
  same reasoning as the Hardware course's own video strategy.

### 5.3 No new `HardwareDevice` records

Confirmed by grepping `prisma/seed.ts`: no existing RPLIDAR S3 or D435i
`HardwareDevice` rows. Per this course's own project-based (not
device-catalog-based) framing from Phase 2, and since every hardware fact
in Phase 5 already renders correctly as `CODE`/`TEXT` (matrices, specs),
**I recommend creating zero new `HardwareDevice` rows** and using no
`SPEC_TABLE`/`DEVICE_CARD` blocks for this course. If a future Hardware &
Sensors course expansion adds S3/D435i device profiles, this course could
retrofit `DEVICE_CARD` references then — not a blocker now.

### 5.4 `Course.status`

I recommend seeding this course with **`status: DRAFT`**, not
`PUBLISHED`. Every lesson's own validation banner already says
"theoretically designed, not physically validated" — publishing the
course live while every banner disclaims it would be an odd mixed signal
to a real learner. Flipping to `PUBLISHED` once Phase 6 substantially
passes is a one-line change, not a re-implementation. **Confirm or
redirect** (e.g. if a DRAFT course isn't visible anywhere useful for your
own review, PUBLISHED-but-clearly-bannered may be preferable).

---

## 6. Files to Change (once approved)

```
prisma/seed.ts
  — add SEED_COURSES["hands-on-robotics-projects"]: 5 sections, 44 lessons,
    per §3/§4 above. No schema.prisma changes (no new block types needed).

docs/robotics-projects/VISUAL_AND_VIDEO_CAPTURE_CHECKLIST.md   (new)
  — every pending image/screenshot/video, cross-referenced to Phase 6.

public/robotics-projects/*.svg   (new, only if §5.2's diagram option is approved)
  — one SVG per architecture/data-flow diagram identified as
    renderable-without-hardware.
```

No changes to `prisma/schema.prisma`, no new Zod schemas, no new
`ContentBlockType` values — everything maps onto what already exists.

---

## 7. Risks

- **Volume.** 44 lessons with full code across 5 sections is a large
  single seed addition. Mitigation: implement and validate per-section,
  Module 0 first, exactly as instructed — not one giant uncommitted diff.
- **Quiz conversion (§5.1) is a real interpretive step**, not pure
  transcription — reviewed explicitly before writing any seed code, not
  discovered after the fact.
- **`CALLOUT` has no verified multi-line/checklist rendering behavior**
  confirmed on my end (I read the schema, not the renderer component) —
  I'll check `CalloutBlock`'s actual renderer during implementation before
  assuming a long checklist body displays legibly, and adjust (e.g. one
  CALLOUT per item instead of one per checklist) if it doesn't.

---

## 8. Validation Plan

- After each section's seed data is written: run the project's type
  check (`tsc`) against `seed.ts` to catch any shape mismatch against the
  real Zod-inferred types immediately, per this repo's own comment in
  `seed.ts` about avoiding "typechecks against a stale local copy" drift.
- Run `prisma/seed.ts` against a local/dev database (not production) and
  spot-check rendered lessons for the highest-risk block types first:
  a `CODE` block with a full Python file (whitespace/indentation
  preserved correctly), a `CALLOUT` checklist (legible), a `SHORT_ANSWER`
  `QUIZ` block (grades against the intended accepted answers), and the
  `EXERCISE` INDEPENDENT block.
- Do not mark this implementation "done" the way Phase 5's own content
  wasn't marked "validated" — populating the LMS makes the content
  *live*, not *physically proven*; that distinction stays intact via the
  banners regardless of where the content is displayed.

---

## 9. Order of Implementation (once approved)

```
Module 0 (Section 1) first — every later section's lessons assume it exists.
        ↓
Project 1 (Section 2)
        ↓
Project 2 (Section 3)  and  Project 3 (Section 4) — either order, no
                              dependency between them
        ↓
Project 4 (Section 5) last — depends on Project 3's content existing
                              (references its map artifact by name)
```

Each section implemented and validated (§8) before moving to the next,
matching the Hardware course's own "foundation modules first" Stage 7
pattern.
