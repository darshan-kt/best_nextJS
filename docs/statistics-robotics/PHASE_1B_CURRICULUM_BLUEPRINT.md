# PHASE 1B — CURRICULUM BLUEPRINT
## Statistical Distributions with Robotics

> **STATUS: REVISION 3 — MAJOR SCOPE REDUCTION. APPROVED 2026-09-08.**
> All four outstanding decisions in §10 were approved as stated. STEP 2
> (the content rewrite) is authorised and in progress.
>
> **Revision 3, 2026-09-08.** Replaces the twelve-step signature loop with
> a fixed **4-part template** for every lesson. The course drops from
> **42 lessons to 7**. Revision 2's lesson-level specifications are
> superseded in full; its standing decisions on storage (§32), the
> hardware cross-reference obligations, and the `/cmd_vel` gap are
> retained below because they survive the reduction.
>
> The single largest consequence, stated up front because it reverses the
> document's biggest standing risk: **no lesson is blocked on physical
> data capture any more.** Not because the data was captured, but because
> the new template stops asking the question that needed it. See §5.

---

## 0. THE TEMPLATE

Every lesson, without exception, is these four parts in this order.

| Part | Name | What it is | Blocks |
| --- | --- | --- | --- |
| 1 | **CONCEPT** | One short question, answered in plain language. No formula. | `CALLOUT` INFO (the question) · `TEXT` (the answer) |
| 2 | **THEORY (small)** | Formula, parameters, mean and variance. Nothing else. | `TEXT` (+ `IMAGE` only where an annotated formula genuinely helps) |
| 3 | **SIMULATION** | The existing `DISTRIBUTION_SIM` component, reused unchanged. | `SIM` |
| 4 | **ROS 2 / ROBOT** | How to do this on the physical robot: the sensor, the topic, a short snippet, what to expect. | `TEXT` (sensor/topic) · `CODE` · `TEXT`/`CALLOUT` (what to expect) — plus `LAB` where hardware is actually handled |

Two further elements hang off the four parts, both approved 2026-09-08:
an `EXERCISE` attached to part 4 (one per lesson, practical — §8), and a
`QUIZ` of one to two questions (§6).

**Part 4 is a "here's how", not a "here's how to judge whether the model
fits."** That distinction is the whole of this revision and every cut below
follows from it.

### What the template removes, explicitly

These are out of scope wherever they appear. Listed so the STEP 2 rewrite
has an unambiguous checklist rather than a judgement call per lesson:

- CDF derivations, and reading values off a CDF
- Z-scores, standardisation, the 68–95–99.7 rule
- Q-Q plots, empirical CDFs, any goodness-of-fit reasoning
- Outlier detection and robustness comparisons
- Sampling-variability treatment beyond "more samples, steadier numbers"
- Model-defensibility argument as an assessed skill
- Derivations of any kind, including the uniform's mean and variance

Legend, unchanged from revision 2:

```
TEXT IMAGE CODE FILE CALLOUT QUIZ    existing block types
SIM   = DISTRIBUTION_SIM   (built, Phase 1D)
DATA  = DATASET_EXPLORER   (built, Phase 1E)
LAB   = LAB_PROTOCOL       (built, Phase 1F)
```

---

## 1. SIZING — 42 LESSONS BECOME 7

| # | Lesson | Replaces | Min |
| --- | --- | --- | --- |
| **Section 1 — Foundations** | | | |
| L1 | `why-statistics-matters` | M0.1–M0.3 | 10 |
| L2 | `random-variables-and-densities` | M1.1–M1.3 | 18 |
| L3 | `mean-variance-and-sampling` | M1.4–M1.7 | 18 |
| **Section 2 — The three distributions** | | | |
| L4 | `uniform-where` | M2.1–M2.7 | 22 |
| L5 | `gaussian-how` | M3.1–M3.12 | 25 |
| L6 | `exponential-when` | M4.1–M4.8 | 25 |
| **Section 3 — Putting it together** | | | |
| L7 | `three-ways-in-my-robot` | M5.1–M5.3, M6.1–M6.2 | 20 |
| | **Total** | **42 entries** | **~138 min** |

**Why seven and not some other number.**

The template is fundamentally *one lesson per distribution*. That is three.
Everything else is the minimum scaffolding those three need and the one
closing lesson that uses them together:

- **Three distribution lessons (L4–L6)** are the irreducible core. Each is
  a complete instance of the template.
- **Two foundations lessons (L2, L3)** exist because part 2 says "formula,
  parameters, mean/variance". A learner who does not know what a mean or a
  variance *is* cannot read part 2 of any distribution lesson. L2 covers
  the random variable and the density; L3 covers mean, variance and
  sample size. They are prerequisites for the template, not extras.
- **One opener (L1)** because the wall-that-moved hook is the reason a
  robotics engineer cares at all, and it is ten minutes.
- **One closer (L7)** because the three distributions are never used
  together anywhere else, and because it absorbs both M5 and M6 (§6).

**Six is the floor** if you want maximum compression: merge L2 and L3 into
a single `random-variables-mean-and-variance`. I do not recommend it —
random-variable-and-density and mean-and-variance are two distinct ideas
and one lesson carrying both plus a SIM plus a ROS 2 section is the one
place in this structure that would feel rushed. But it is a legitimate
choice and costs nothing structurally.

**Eight or more is not justifiable** under this template. Any additional
lesson would either re-split content the template deliberately fuses, or
re-introduce material from the removal list in §0.

---

## 2. THE SEVEN LESSONS

### L1 · `why-statistics-matters` — 10 min

**Objective.** State that repeated measurement of a fixed quantity varies,
and that the variation has a shape worth modelling.

| Part | Blocks |
| --- | --- |
| CONCEPT | `CALLOUT` INFO — the wall has not moved, so why have the numbers? · `TEXT` — because every measurement is the true value plus noise, and the noise has structure |
| THEORY | `TEXT` — three shapes cover most robot randomness: WHERE (uniform), HOW (Gaussian), WHEN (exponential). No formulas yet |
| SIMULATION | `SIM[static]` — the wall readings as a histogram. No fitted curve, no distribution named |
| ROS 2 | `TEXT` — `/scan` on a stationary robot · `CODE` — `ros2 topic echo /scan --field ranges[0]` · `TEXT` — expect the last two digits to move and the first two to hold |
| — | `CALLOUT` WARNING — **a simulation is never validation** (spec §63), stated once here and relied on for the rest of the course |

**Note.** That final callout is the one piece of the old course's
scientific-integrity apparatus I recommend keeping. The new course puts a
`SIM` of a Gaussian next to "here is how to collect LiDAR readings" in L5
and never argues that the model fits. Without one explicit sentence saying
the simulation is not evidence about your sensor, the juxtaposition
*implies* the claim the course no longer makes. One block, and it closes
the gap.

---

### L2 · `random-variables-and-densities` — 18 min

**Objective.** Express a sensor reading as a random variable; read a
density as "where the values pile up".

| Part | Blocks |
| --- | --- |
| CONCEPT | `CALLOUT` INFO — what is the "X" in all these formulas? · `TEXT` — X is the measurement before you take it; x is the number you got |
| THEORY | `TEXT` — a density says where values concentrate; total area is 1; a density value is not a probability. One sentence that a CDF is the running total, and no more |
| SIMULATION | `SIM` — Gaussian, σ locked, PDF view, sample-count slider: watch draws pile into the density |
| ROS 2 | `TEXT` — one topic, many readings · `CODE` — a ~15-line subscriber that collects N readings from `/scan` into a list · `TEXT` — expect a list of floats that are close but not equal |
| — | `QUIZ` ×1 |

**Cut from M1.1–M1.3.** The PMF/PDF distinction, the shaded-area figure,
the P(X = x) = 0 discussion, reading values off a CDF, and the linked
PDF/CDF cursor that revision 2 called "the single most valuable
interaction in M1". The `SIM` component still supports the CDF view; this
course simply stops using it.

---

### L3 · `mean-variance-and-sampling` — 18 min

**Objective.** Compute mean and standard deviation from a sample; state
why σ rather than σ² is quoted; state that more readings give steadier
numbers.

| Part | Blocks |
| --- | --- |
| CONCEPT | `CALLOUT` INFO — what two numbers summarise a pile of readings? · `TEXT` — where it sits, and how wide it is |
| THEORY | `TEXT` — x̄, s², σ = √s². Units: metres vs metres², which is why σ is the number on a datasheet. No derivation, no n−1 discussion beyond naming it |
| SIMULATION | `SIM` — Gaussian with a sample-count slider and summary stats; watch x̄ and σ̂ steady as n grows |
| ROS 2 | `TEXT` — from a list of readings to two numbers · `CODE` — `statistics.mean` / `statistics.stdev` over the L2 subscriber's output · `TEXT` — expect σ of a few millimetres on a good LiDAR at 2 m |
| — | `QUIZ` ×2 |

**Cut from M1.4–M1.7.** The balance-point metaphor, the squared-deviation
figure, the population-vs-sample formalism, the two-`SIM` sampling
treatment, and the 10-question checkpoint.

---

### L4 · `uniform-where` — 22 min

**Objective.** State the uniform's formula, parameters, mean and variance;
generate uniform targets on a robot.

| Part | Blocks |
| --- | --- |
| CONCEPT | `CALLOUT` INFO — a robot must explore a room it has no map of; where does it go next? · `TEXT` — every position in the workspace equally likely, by deliberate choice rather than by noise |
| THEORY | `TEXT` — f(x) = 1/(b−a) on [a, b]; parameters a and b; mean (a+b)/2; variance (b−a)²/12. Stated, not derived |
| SIMULATION | `SIM` — a, b and n sliders, histogram + density (the existing `uniform-explore` configuration, unchanged) |
| ROS 2 | `LAB` (reduced) — generate targets in a taped workspace and send goals · `CODE` — the existing target generator, trimmed · `DATA` — `uniform-targets-synthetic`: `TABLE_PREVIEW` + `HISTOGRAM` + `SUMMARY_STATS`, **no overlay** — "what 800 targets look like" · `TEXT` — expect coverage that looks patchy at 40 targets and even at 800 |
| — | `QUIZ` ×2 |

**Retained from M2.5 as a `CALLOUT` WARNING:** the target *generation* is
uniform; the robot's *motion* is not. This was a hard requirement of the
Phase 1 brief and survives the reduction — it is a scoping statement, not
a model-fit judgement.

---

### L5 · `gaussian-how` — 25 min

**Objective.** State the Gaussian's formula, parameters, mean and
variance; collect range readings from a real LiDAR and compute both.

| Part | Blocks |
| --- | --- |
| CONCEPT | `CALLOUT` INFO — why does a still sensor move? · `TEXT` — many small independent effects add up, and adding them up produces a bell. Mechanism in prose, no k-slider demonstration |
| THEORY | `TEXT` — the PDF with its normalising constant and exponent; parameters μ and σ; mean = μ; variance = σ². `IMAGE` — annotated formula |
| SIMULATION | `SIM` — μ, σ and n sliders (the existing `gaussian-explore` configuration, unchanged) |
| ROS 2 | `LAB` (reduced) — LiDAR on a stable mount, matte target at 2 m · `CODE` — the existing collector node, trimmed to the collection loop · `DATA` — 5,000 wall readings: `TABLE_PREVIEW` + `HISTOGRAM` + `SUMMARY_STATS`, **no overlay** · `TEXT` — expect a single hump a few centimetres wide, and a σ close to your sensor's quoted noise figure |
| — | `QUIZ` ×2 |

**Cut from M3 (twelve lessons to one).** The k-slider CLT demonstration,
the formula-free intuition lesson, the no-closed-form-CDF discussion,
z-scores and 68–95–99.7 entirely, the sampling-variability lesson, the
three analysis lessons (M3.9–M3.11), and the 12-question checkpoint.

---

### L6 · `exponential-when` — 25 min

**Objective.** State the exponential's formula, parameter, mean and
variance; log events from a robot topic and turn them into waiting times.

| Part | Blocks |
| --- | --- |
| CONCEPT | `CALLOUT` INFO — when will the next event happen? · `TEXT` — events happen at instants; the quantity worth modelling is the gap between them, not the instant |
| THEORY | `TEXT` — f(t) = λe^(−λt) for t ≥ 0; parameter λ (events per second); mean 1/λ; variance 1/λ². Stated, not derived |
| SIMULATION | `SIM` — λ and n sliders (the existing `exponential-explore` configuration, unchanged) |
| ROS 2 | `LAB` (reduced) — detect crossings on `/scan` · `CODE` — the timestamp→gap conversion, which is `np.diff` on a sorted array, carried over from the seeded M4.2 · `DATA` — `robot-event-timestamps-synthetic`: `TABLE_PREVIEW` + `HISTOGRAM` + `SUMMARY_STATS`, **no overlay** · `TEXT` — expect most gaps short, a few much longer, and a mean near 1/λ |
| — | `QUIZ` ×2 |

**Decision needed — memorylessness.** It is the exponential's defining
property and the reason the distribution is interesting, and it is *not*
formula/parameters/mean/variance, so §0's removal list excludes it. My
recommendation is **one sentence in CONCEPT** ("having waited already does
not change what comes next — which is a strong assumption and often false
on a real robot"), and no lesson, no `SIM`, no exercise. That keeps the
honest caveat at a cost of one sentence. Cutting it entirely is defensible
under a strict reading of the template; I would rather you decide than
have me pick. **Flagged, not silently resolved.**

**Cut from M4 (eight lessons to one).** The dedicated memorylessness
lesson, inverse-CDF sampling, the standalone log-conversion lesson, the
analysis lesson (M4.7), and `when-exponential-fails` — which revision 2
marked "**mandatory, not optional**" as the module's scientific-integrity
check. Under the new scope there is no fit claim for it to be a
counterweight to, so it goes; but it is worth naming as a deliberate
reversal of a previous decision rather than an oversight.

---

### L7 · `three-ways-in-my-robot` — 20 min

**Objective.** Given a robot quantity, name which of the three
distributions describes it and which topic it comes from.

| Part | Blocks |
| --- | --- |
| CONCEPT | `CALLOUT` INFO — you have three models; which one does this quantity need? · `TEXT` — ask what produced the number, not what the histogram looks like |
| THEORY | `TEXT` — one comparison table: support, parameters, mean, variance for all three side by side |
| SIMULATION | `SIM` ×3 — uniform, Gaussian, exponential on a **shared `xDomain`** (the existing `side-by-side` configuration, unchanged) |
| ROS 2 | `TEXT` + table — robot task → distribution → topic → what you would log. Six or so rows: exploration targets, LiDAR range noise, obstacle-crossing intervals, odometry drift, message inter-arrival times, battery-warning intervals · `CALLOUT` TIP — closing |
| — | `QUIZ` ×3 (course close) |

This lesson is the capstone. See §6.

---

## 3. THE 42 → 7 MAPPING

Every revision-2 entry is accounted for. "Absorbed" means its surviving
content appears inside the named lesson; "cut" means it does not appear at
all.

| Old | Slug | Fate |
| --- | --- | --- |
| M0.1 | `the-wall-that-moved` | Absorbed → **L1** (becomes L1's CONCEPT + SIM) |
| M0.2 | `seven-kinds-of-uncertainty` | **Cut.** Taxonomy of uncertainty sources is not formula/parameters/how-to |
| M0.3 | `how-this-course-works` | Absorbed → **L1** (only the "simulation is not validation" callout survives) |
| M1.1 | `random-variables` | Absorbed → **L2** CONCEPT |
| M1.2 | `discrete-and-continuous` | **Cut.** The quantization caveat existed to explain the Q-Q staircase, which is gone |
| M1.3 | `pdf-pmf-and-cdf` | Absorbed → **L2** THEORY, minus the CDF work |
| M1.4 | `expected-value-and-mean` | Absorbed → **L3** THEORY |
| M1.5 | `variance-and-standard-deviation` | Absorbed → **L3** THEORY |
| M1.6 | `samples-and-sampling` | Absorbed → **L3** SIMULATION (as "more samples, steadier numbers") |
| M1.7 | `foundations-checkpoint` | **Cut** as a lesson → L2/L3 `QUIZ` blocks |
| M2.1 | `where-can-a-value-occur` | Absorbed → **L4** CONCEPT |
| M2.2 | `uniform-theory` | Absorbed → **L4** THEORY |
| M2.3 | `uniform-mean-and-variance` | Absorbed → **L4** THEORY (result only, derivation cut) |
| M2.4 | `uniform-explore` | Absorbed → **L4** SIMULATION |
| M2.5 | `random-target-generation` | Absorbed → **L4** ROS 2 (incl. the scoping WARNING) |
| M2.6 | `uniform-lab` | Absorbed → **L4** ROS 2 (`LAB`, reduced) |
| M2.7 | `uniform-checkpoint` | **Cut** as a lesson → L4 `QUIZ` |
| M3.1 | `why-does-a-still-sensor-move` | Absorbed → **L5** CONCEPT |
| M3.2 | `gaussian-mechanism` | Absorbed → **L5** CONCEPT, as prose. The k-slider `SIM` is cut |
| M3.3 | `gaussian-intuition` | Absorbed → **L5** SIMULATION |
| M3.4 | `gaussian-theory` | Absorbed → **L5** THEORY, minus the CDF discussion |
| M3.5 | `standard-normal-and-z-scores` | **Cut.** Named on the removal list |
| M3.6 | `gaussian-explore` | Absorbed → **L5** SIMULATION |
| M3.7 | `sampling-variability` | **Cut.** Its one surviving idea is in L3 |
| M3.8 | `lidar-noise-lab` | Absorbed → **L5** ROS 2 (`LAB`, reduced) |
| M3.9 | `analyzing-real-lidar-data` | **Dissolved → L5 ROS 2.** See §5 |
| M3.10 | `outliers-and-robustness` | **Cut.** Named on the removal list |
| M3.11 | `is-gaussian-defensible` | **Cut.** Named on the removal list |
| M3.12 | `gaussian-checkpoint` | **Cut** as a lesson → L5 `QUIZ` |
| M4.1 | `when-will-the-next-event-happen` | Absorbed → **L6** CONCEPT |
| M4.2 | `waiting-times-from-event-logs` | **Dissolved → L6 ROS 2.** See §5 |
| M4.3 | `exponential-theory` | Absorbed → **L6** THEORY |
| M4.4 | `memorylessness` | **Cut** as a lesson; one sentence pending your decision (L6) |
| M4.5 | `exponential-explore` | Absorbed → **L6** SIMULATION |
| M4.6 | `event-timing-lab` | Absorbed → **L6** ROS 2 (`LAB`, reduced) |
| M4.7 | `analyzing-waiting-times` | **Dissolved → L6 ROS 2.** See §5 |
| M4.8 | `when-exponential-fails` | **Cut.** Reverses revision 2's "mandatory" marking — see L6 |
| M5.1 | `where-how-when` | Absorbed → **L7** CONCEPT + THEORY |
| M5.2 | `side-by-side` | Absorbed → **L7** SIMULATION |
| M5.3 | `choosing-a-model` | Absorbed → **L7** CONCEPT |
| M6.1 | `capstone-brief` | Absorbed → **L7** ROS 2. See §6 |
| M6.2 | `capstone-submission` | **Cut.** See §6 |

**Totals:** 24 absorbed, 15 cut, 3 dissolved into ROS 2 sections.

---

## 4. THE PHYSICAL-DATA RE-EVALUATION

This is the most consequential change in the revision, so it is stated per
lesson rather than in aggregate.

The question in each row is: *does this lesson, under the new template,
still require data captured from a real robot?*

| Lesson | Why it was blocked | Under the 4-part template | Still blocked? |
| --- | --- | --- | --- |
| **M3.9** `analyzing-real-lidar-data` | Needed `rplidar-wall-2m-5000` to compute μ̂/σ̂, build an eCDF and a Q-Q plot, and identify two deviations from Gaussian | The eCDF, the Q-Q plot and the deviation-hunting are all on §0's removal list. What survives is "point the LiDAR at a wall, collect readings, compute mean and σ" — which is **exactly L5's part 4**, and is a procedure, not an analysis | **NO** |
| **M3.10** `outliers-and-robustness` | Needed the real dataset with outliers highlighted | Outlier-robustness discussion is explicitly removed | **NO — lesson cut** |
| **M3.11** `is-gaussian-defensible` | Needed theory-vs-simulation-vs-reality side by side to argue defensibility | Goodness-of-fit judgement is explicitly removed. This was the old course's terminal objective | **NO — lesson cut** |
| **M4.7** `analyzing-waiting-times` | Needed `robot-event-timestamps` for histogram + eCDF + Q-Q against exponential quantiles | Same as M3.9, for the exponential. What survives is "log events, difference the timestamps, compute the mean gap" — **L6's part 4** | **NO** |
| **M4.2** `waiting-times-from-event-logs` | Was blocked; now seeded against synthetic data | The timestamps→Δt conversion *is* "how you get this data off a ROS 2 topic". It becomes L6's part 4 code snippet | **NO** |
| **M5.3** `choosing-a-model` | Was blocked; now seeded against synthetic data | Model selection reasoning collapses into L7's CONCEPT | **NO** |
| **M6.1** `capstone-brief` | Was blocked; now seeded against synthetic data | Becomes L7's part 4 mapping table | **NO** |

### The headline

**Zero lessons remain blocked on physical data capture.** Open item 1A-1
("recorded datasets do not exist"), which has gated this course since
Phase 1A and which revision 2 listed against seven lessons, is **closed —
not resolved.** The data still does not exist. The course no longer asks a
question that needs it.

The mechanism is simple and worth stating in one line so the decision is
visible rather than buried: *every lesson that needed real data needed it
in order to judge a model against reality, and the new template does not
judge models.*

### What that costs, stated plainly

The course no longer teaches how to tell whether a distribution actually
describes your data. That was the old course's distinguishing claim and
its terminal objective. A learner finishing the new course can name three
distributions, state their parameters and moments, drive the simulator,
and collect the corresponding numbers off a robot. They cannot assess
whether the Gaussian they were shown is the right model for the readings
they collected, and nothing in the course will tell them it might not be —
which is why I recommend keeping L1's "a simulation is never validation"
callout as the one surviving guardrail.

This is a trade, not a defect, and it is yours to make. I am recording it
so that "the course does not cover model validation" is a decision on the
record rather than something discovered later.

### Consequence for the synthetic datasets

The three datasets built last pass (`robot-event-timestamps-synthetic`,
`unlabelled-sample-alpha`, `lidar-wall-readings-synthetic`) were built to
unblock lessons that this revision cuts or dissolves. Under §2 I have kept
two of them in part 4 as **"what to expect" figures** — `TABLE_PREVIEW` +
`HISTOGRAM` + `SUMMARY_STATS`, no overlay, no fitted curve — which is
consistent with the template because showing a learner what 5,000 readings
look like is a "here's how", not a fit assessment.

`unlabelled-sample-alpha` has no remaining use: it existed for a
classification exercise that is now three sentences of L7's CONCEPT.
**Recommend retiring the row and the file.**

If you would rather part 4 carry no `DATA` blocks at all, that is a
defensible reading of the template and it retires **Phase 1E's
`DATASET_EXPLORER` from this course entirely** — the block type, the
loader, `verify:datasets`, `generate:datasets` and the CI workflow all
remain built and tested but unused by any content. Flagged, because that
is a large asset to strand and I do not think you would want it decided
silently.

---

## 5. CAPSTONE — RECOMMENDATION: MERGE, DO NOT KEEP SEPARATE

You offered "keep a light version" or "cut entirely". I recommend a third
option that I think is better than either: **merge the capstone into L7**,
which is what §2 specifies.

**Why not keep it as its own lesson.** Under the new scope, a light
capstone ("combine all three distributions, show how each maps to a robot
task") and M5's comparison lesson ("the three side by side") are close to
the same lesson. Keeping both produces two closing lessons that overlap
heavily, in a seven-lesson course. Merging them gives one closing lesson
that compares the three *and* maps each to a robot task, which is exactly
the light capstone you described, delivered without redundancy.

**Why not cut entirely.** The three distributions are never used together
anywhere else in the reduced course. Without L7 the course ends on the
exponential and never returns to the WHERE/HOW/WHEN frame that gives it
its shape. It is one lesson and it needs no new components and no data.

**What is cut regardless:** M6.2 `capstone-submission` and with it the
first planned use of `ExerciseSubmission`. The old capstone was a
seven-question statistical-justification exercise, human-reviewed. Under
the new scope there is nothing to justify, so the submission has no
content. This also removes the only thing in the course that was waiting
on the §32 storage gap — **that dependency is now moot.**

---

## 6. QUIZ — A CORRECTION, THEN A RECOMMENDATION

**The stated rationale does not hold.** Quizzes are not required for
progress tracking. I checked rather than assumed:

- `LessonProgress` is `(enrollmentId, lessonId, completedAt)` and contains
  no reference to a quiz or an attempt.
- Completion is recorded by `markLessonCompleteAction`, driven by the
  "Mark as complete" button, with no quiz involvement anywhere in
  `src/features/progress/`.
- `prisma/seed.ts` records the same thing from the other direction:
  passing a quiz does not affect lesson completion, deliberately.

So a lesson with no `QUIZ` block tracks progress perfectly well. Keeping
quizzes "because the engine expects them" would be keeping them for a
reason that is not true.

**Recommendation: keep 1–2 per lesson anyway, for a different reason.**
The reduced course has no exercises (§8), no checkpoints and no capstone
submission. If the quizzes also go, there is no point anywhere in the
course where a learner does something rather than reads something, and
retrieval practice is the cheapest possible remedy — roughly 12 questions
across 7 lessons, using the existing engine, needing no new work beyond
authoring.

If you would rather have a pure reference course with no interaction at
all, cutting them is coherent and I would not argue against it. It is a
one-line change to this document and removes about 12 questions of
authoring from STEP 2.

---

## 7. COMPONENT AND SCHEMA IMPACT

Confirmed by inspection, since you asked specifically about migration risk.

| Component | Impact | Migration? |
| --- | --- | --- |
| `DISTRIBUTION_SIM` | **None.** Reused as-is in all seven lessons, existing block configurations carried over unchanged | No |
| `LAB_PROTOCOL` | Field *usage* shrinks in L4–L6 | **No database migration.** See below |
| `DATASET_EXPLORER` | Reduced to `TABLE_PREVIEW`/`HISTOGRAM`/`SUMMARY_STATS`, no overlay. Retired entirely under the §4 alternative | No |
| Statistics core (`distributions.ts`, `sampling.ts`, `summary.ts`, `rng.ts`) | **None.** Unchanged | No |

**`LAB_PROTOCOL` in detail — no migration is required.** The payload lives
in `LessonContentBlock.data`, which is `Json?`. Nothing about the lab's
shape is expressed in the database schema, so no `ALTER TABLE` and no
Prisma migration can be triggered by changing what a lab contains.

There are two ways to shrink lab usage, and they differ:

1. **Write less in the fifteen fields, change nothing.** All fifteen stay
   required; a reduced lab has one-line `troubleshooting` entries and a
   two-line `interpretation`. **Zero code change.** This is what §2
   assumes.
2. **Make some fields optional** (`troubleshooting`, `crossReferences`,
   `challenge`, `expectedObservations`, parts of `reproducibility`) so a
   light protocol is not padded to satisfy Zod. This is a **Zod schema
   edit only** — still no database migration — and relaxing
   required→optional is backward-compatible, so the three already-seeded
   labs keep validating untouched.

I recommend (1) for STEP 2, because it is zero-risk and reversible, and
because "write less" is what the reduction actually asks for. If the
reduced labs end up visibly padded when they are written, (2) is available
later without a migration at any point. `safety` stays required in either
case — L4 and L5 still put a person next to moving hardware.

---

## 8. WHAT THIS ORPHANS

Surfaced rather than left to be discovered during STEP 2.

- **`EXERCISE` blocks — 18 of 25 cut, 7 kept.** *(Approved 2026-09-08.)*
  An earlier draft of this section recommended cutting all 25 and
  presented that as a consequence of the template. It is not: the four
  parts were never an exclusive list — the `QUIZ` decision in §6 already
  adds a fifth element — so nothing structural prevents an exercise
  hanging off part 4. The correct rule is the same content filter applied
  everywhere else in this document. **Cut** the 18 whose task is on §0's
  removal list: computing z-scores, building Q-Q plots or empirical CDFs,
  judging whether a model fits, arguing defensibility, or classifying an
  unlabelled dataset. **Keep** 7 — one per lesson, attached to the ROS 2
  section, of the "run this on your robot and report what you saw" kind,
  which is exactly part 4's register.
- **Python `*_explore.py` scripts and their `FILE` blocks** — the `SIM`
  covers exploration and part 4 is ROS 2 code. Orphaned. The two collector
  nodes (`lidar_noise_collector.py`, `event_timing_collector.py`) survive
  into L5/L6 part 4.
- **SVGs** — `uncertainty-taxonomy`, `three-levels-of-evidence`,
  `discrete-vs-continuous`, `random-variable-mapping`,
  `event-timeline-deltas`, `timestamps-to-gaps-arithmetic` lose their
  lessons. `where-how-when` survives into L7; the two lab geometry
  diagrams survive into L4–L6.
- **`unlabelled-sample-alpha`** — retire (§4).
- **`ExerciseSubmission` / §32 storage** — no longer on this course's
  critical path at all (§5).
- **Quiz banks** — roughly 42 authored questions across 4 checkpoint
  quizzes reduce to ~12.

---

## 9. WHAT SURVIVES FROM REVISION 2

Standing decisions that the reduction does not touch:

- **Cross-reference obligation (1A §21).** L5 and L6 still start from a
  working `/scan` and link `rplidar-a2-ubuntu-setup`,
  `rplidar-a2-ros2-integration` and `rplidar-a2-debugging` rather than
  re-teaching bring-up.
- **The `/cmd_vel` gap (1B-2), still open.** L4's ROS 2 part drives a base,
  and no course on this platform teaches `/cmd_vel` on physical hardware.
  It must either teach its own minimal grounding or lean on
  `ros2-fundamentals` Module 4 (turtlesim). Unresolved, and now scoped to
  one lesson instead of one lab.
- **Storage (§32).** No lab submits anything. With M6.2 cut, nothing in
  the course does.
- **Simulation-first fallback.** Every `LAB` keeps its
  `simulationFallbackLessonSlug`; under the new structure each points at
  its own lesson's SIMULATION part.

---

## 10. READINESS

**Approved 2026-09-08.** All four decisions below were approved as stated
and are what STEP 2 builds.

| # | Decision | My recommendation |
| --- | --- | --- |
| 1 | Lesson count | **7** (6 is the floor; 8+ is not justifiable) |
| 2 | Memorylessness in L6 | One sentence in CONCEPT, no lesson |
| 3 | `EXERCISE` blocks | **Cut 18, keep 7** — one practical exercise per lesson on the ROS 2 section (§8) |
| 4 | `DATA` blocks in part 4 | Keep, as "what to expect" figures; retire `unlabelled-sample-alpha` |

Two further items are recorded as accepted consequences rather than open
questions: the course no longer teaches model validation (§4), and
`when-exponential-fails` is cut despite revision 2 marking it mandatory
(§2, L6).

On approval, STEP 2 is a content rewrite of 38 seeded lessons into 7,
plus verification of a representative sample through the real route.
