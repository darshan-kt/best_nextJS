# PHASE 1A — COURSE ARCHITECTURE
## Statistical Distributions with Robotics

> **STATUS: APPROVED 2026-09-07.** Decisions 3 (NUMERIC quiz type) and 4
> (capstone text/JSON + links scope) approved. Decisions 1 (LiDAR model)
> and 2 (recorded datasets) remain **OPEN** — see §19. Phases 1B and 1C
> are authorized to proceed, as neither depends on those answers.

Governing documents, in precedence order:

1. `CLAUDE.md` — permanent engineering constitution. Nothing here overrides it.
2. `STATISTICAL_DISTRIBUTIONS_WITH_ROBOTICS_COURSE.md` — the course spec.
   Section references written as "spec §N" refer to that file; bare "§N"
   refers to `CLAUDE.md`.

The spec describes the **full 18-module course** (spec §8: Bernoulli
through Sensor Fusion). Phase 1 implements **three distributions only** —
Uniform, Gaussian, Exponential. The governing constraint of this document
is therefore:

> Phase 1 must be built as a proper *subset* of the full curriculum, not
> as a standalone course that later gets retrofitted.

---

## 0. GROUNDING — WHAT THE REPOSITORY ALREADY PROVIDES

Established by inspection before any design work, not assumed:

* **All twelve milestones (§44) are complete and merged** (`f85741d`
  Milestone 11, `a8d8ca2` Milestone 12). The repository is in
  course-authoring mode with three DRAFT robotics courses.
* The learning hierarchy is `Course → Section → Lesson →
  LessonContentBlock` exactly as §11 requires, with **eleven** block types
  (§11's original nine plus `SPEC_TABLE` and `DEVICE_CARD`).
* Two established block-extension patterns, documented on
  `LessonContentBlock` itself:
  * **Lightweight** — payload in `data Json?`, validated by Zod at the read
    boundary. Used by TEXT, IMAGE, VIDEO, CODE, EMBED, CALLOUT, FILE.
  * **Relational** — FK to a real model that owns history. `@unique` (1:1)
    for QUIZ/EXERCISE; plain many-to-one for `hardwareDeviceId`, because
    one device legitimately backs blocks in several lessons.
* The **quiz engine is real and reusable**: four question types, per-type
  data/value Zod schema pairs, server-side scoring, integration-tested.
* **`ExerciseSubmission` / `ExerciseEvaluation` exist but have zero
  callers.** Every existing exercise is content-only.
* **No media storage (§32)**, no file upload, no charting library, no
  datasets. `mediaSrcSchema` accepts an absolute URL or a root-relative
  `public/` path; that is how every course asset in this repo is served.
* `LessonProgress` is **lesson-level only**, by explicit design decision
  recorded in the schema.

### 0.1 Adding a block type touches four files, not three

`src/features/learning/schemas.ts`, `src/features/learning/queries.ts`,
`src/features/learning/components/block-renderer.tsx`, and — easy to miss —
**`src/features/chat/context.ts`**'s grounding-text switch. The renderer's
own doc comment flags this second switch site. Mitigated by an
exhaustiveness test (§19, risk 8).

---

## 1. COURSE INFORMATION ARCHITECTURE

One `Course` row:

```
slug:       statistical-distributions-with-robotics
title:      Statistical Distributions with Robotics
subtitle:   From Probability and Uncertainty to Real-World Robot Data
status:     DRAFT
visibility: PUBLIC
```

Spec §50 proposes a navigation tree (Introduction / Concepts / Simulations
/ Robot Labs / Data Analysis / Quizzes / Challenges / Capstone).

**That is not a second hierarchy.** The LMS has one spine —
`Section → Lesson` — and duplicating structure would place the same lesson
in two places with two completion states.

**Decision: the `Section`/`Lesson` spine is the only source of truth.**
Spec §50's categories become **derived facets** on the course overview
page, computed from the block types each lesson actually contains:

| Facet | Derived from |
| --- | --- |
| Concepts | lessons with `TEXT`/`IMAGE` and no lab or sim |
| Simulations | lessons containing `DISTRIBUTION_SIM` |
| Robot Labs | lessons containing `LAB_PROTOCOL` |
| Data Analysis | lessons containing `DATASET_EXPLORER` |
| Quizzes / Challenges | lessons containing `QUIZ` / `EXERCISE` |
| Capstone | the capstone section |

One query; `@@index([type])` on `LessonContentBlock` already exists to
support it; zero duplicated state; facets stay correct automatically as
content is authored.

Route surfaces — all existing except the last:

```
/courses/statistical-distributions-with-robotics          overview + facets
/courses/.../learn/[lessonSlug]                            player
/courses/.../learn/[lessonSlug]#block-<id>                 facet deep links
/datasets/[slug]                                           NEW, phase 1E
```

---

## 2. MODULE HIERARCHY AND DEPENDENCY GRAPH

Phase 1 ships seven modules (`Section` rows). The load-bearing decision is
**numbering**, because spec §8 inserts four future modules *between*
Uniform and Gaussian.

**Decision: lesson and section slugs carry no module numbers, and
`Section.position` uses gaps of 100, mapped to spec §8's full ordering
now.** Future modules slot in as a data change — no renumbering, no URL
breakage, no migration. `Section.position` has no unique constraint (the
schema comment says so deliberately), so gaps are free.

| spec §8 module | `position` | Phase 1 |
| --- | --- | --- |
| 0 · Why Statistics Matters in Robotics | 0 | YES |
| 1 · Random Variables and Probability | 100 | YES |
| 2 · **Uniform Distribution** | 200 | YES |
| 3 · Bernoulli | 300 | reserved |
| 4 · Binomial | 400 | reserved |
| 5 · Geometric | 500 | reserved |
| 6 · Poisson | 600 | reserved |
| 7 · **Normal / Gaussian Distribution** | 700 | YES |
| 8 · **Exponential Distribution** | 800 | YES |
| — · Three Ways to Be Random *(Phase 1 synthesis)* | 850 | YES |
| — · Mini-Capstone *(Phase 1 synthesis)* | 875 | YES |
| 9 · Log-Normal | 900 | reserved |
| 10 · Gamma | 1000 | reserved |
| 11 · Beta | 1100 | reserved |
| 12 · Multivariate Gaussian | 1200 | reserved |
| 13 · Covariance and Correlation | 1300 | reserved |
| 14 · Central Limit Theorem | 1400 | reserved |
| 15 · Modeling Sensor Uncertainty | 1500 | reserved |
| 16 · Statistical Thinking for Robotics Decisions | 1600 | reserved |
| 17 · Sensor Fusion Foundations | 1700 | reserved |
| 18 · Capstone "How Certain Is My Robot?" | 1800 | reserved |

The two Phase 1 synthesis modules sit at 850/875 — adjacent to the content
they synthesize, and clear of every future module.

### Dependency graph

```
        M0 Why Statistics Matters
                   |
        M1 Random Variables & Probability
       (RV - PMF/PDF/CDF - E[X] - Var - sampling)
                   |
        +----------+------------------+
        |          |                  |
   M2 UNIFORM  M3 GAUSSIAN  <---- M4 EXPONENTIAL
    (WHERE)      (HOW)              (WHEN)
        |          |                  |
        +----------+------------------+
                   |
        M5 Three Ways to Be Random
                   |
        M6 Mini-Capstone
```

M2, M3 and M4 are **independent given M1** — deliberately, so that a
learner without a robot can complete M2 (pure simulation) while waiting on
hardware, and so future modules attach to M1 rather than to each other.

The one soft edge is M4 → M3: waiting-time analysis reuses the
goodness-of-fit machinery introduced in M3. Sequencing follows spec §8,
which places Gaussian before Exponential regardless.

---

## 3. LESSON HIERARCHY

The module template (course spec §11, and the A–M template in the Phase 1
scoping brief) is **a sequence of blocks distributed across a module's
lessons — not thirteen lessons per module.** That mapping is the
structural core of this course:

| Template step | Where it lives | Block types |
| --- | --- | --- |
| A Hook · B Intuition | lesson 1 of the module | `CALLOUT`, `TEXT`, `IMAGE` |
| C Mathematical foundation | lessons 2–3 | `TEXT`, `IMAGE`, `CALLOUT` |
| D Visual explanation | inline throughout | `IMAGE` (programmatic SVG), `DISTRIBUTION_SIM` |
| E Interactive simulation | dedicated "explore" lesson | `DISTRIBUTION_SIM` |
| F Python simulation | same lesson as E | `CODE`, `FILE` |
| G Robot dataset · H Analysis | dedicated "analysis" lesson | `DATASET_EXPLORER`, `TEXT` |
| I Robotics interpretation | block inside H | `TEXT`, `CALLOUT` |
| J Physical lab | dedicated "lab" lesson | `LAB_PROTOCOL`, `CODE` |
| K Quiz | checkpoint lesson | `QUIZ` |
| L Challenge · M Reflection | challenge lesson | `EXERCISE` (INDEPENDENT), closing `CALLOUT` |

**38 lessons across seven modules.** Depth lives in blocks per lesson, not
in lesson count (spec §51: complexity determines depth; do not make every
lesson identical in length).

```
M0 - Why Statistics Matters in Robotics                      (pos 0)
  the-wall-that-moved              Hook: static wall, moving numbers
  seven-kinds-of-uncertainty       Sensor/actuator/env/model uncertainty
  how-this-course-works            The loop; three levels of evidence

M1 - Random Variables and Probability                        (pos 100)
  random-variables                 X = LiDAR distance
  discrete-and-continuous          PMF vs PDF; the #1 confusion (spec §63)
  pdf-pmf-and-cdf                  First DISTRIBUTION_SIM (read-only mode)
  expected-value-and-mean          Population vs sample
  variance-and-standard-deviation  Why sigma, not sigma^2, is the engineering number
  samples-and-sampling             Sampling variability, shown live
  foundations-checkpoint           QUIZ

M2 - Uniform Distribution - WHERE                            (pos 200)
  where-can-a-value-occur          Hook: random exploration targets
  uniform-theory                   Discrete + continuous, min/max, PDF/CDF
  uniform-mean-and-variance        (a+b)/2, (b-a)^2/12 - derived, not asserted
  uniform-explore                  DISTRIBUTION_SIM + Python simulation
  random-target-generation         2D workspace; the scoping caveat, loudly
  uniform-lab                      LAB 1 + DATASET_EXPLORER
  uniform-checkpoint               QUIZ + CHALLENGE + reflection

M3 - Normal / Gaussian Distribution - HOW       *flagship*   (pos 700)
  why-does-a-still-sensor-move     Hook
  gaussian-intuition               Shape and mechanism before formula
  gaussian-theory                  mu, sigma^2, sigma, PDF, CDF
  standard-normal-and-z-scores     Standardization, 68-95-99.7
  gaussian-explore                 DISTRIBUTION_SIM + Python simulation
  sampling-variability             Theoretical vs simulated, same axes
  lidar-noise-lab                  LAB 2 - the flagship experiment
  analyzing-real-lidar-data        Histogram + overlay + eCDF + Q-Q
  outliers-and-robustness          Mean vs median; "not automatically bad data"
  is-gaussian-defensible           Fit evaluation, assumptions, limitations
  gaussian-checkpoint              QUIZ + CHALLENGE + reflection

M4 - Exponential Distribution - WHEN                         (pos 800)
  when-will-the-next-event-happen  Hook
  exponential-theory               lambda, PDF, CDF, E[T] = 1/lambda
  memorylessness                   And why robots routinely violate it
  exponential-explore              DISTRIBUTION_SIM + Python simulation
  event-timing-lab                 LAB 3
  analyzing-waiting-times          DATASET_EXPLORER
  when-exponential-fails           Assumption violation - required, not optional
  exponential-checkpoint           QUIZ + CHALLENGE + reflection

M5 - Three Ways to Be Random                                 (pos 850)
  where-how-when                   The unifying frame
  side-by-side                     Three sims, shared axes, one control bar
  choosing-a-model                 Model selection as reasoning, not lookup

M6 - Mini-Capstone: Three Ways in My Robot                   (pos 875)
  capstone-brief                   Three datasets, seven questions
  capstone-submission              Submission-backed EXERCISE
```

Detailed per-lesson objectives and block sequences are Phase 1B's
deliverable (`PHASE_1B_CURRICULUM_BLUEPRINT.md`).

---

## 4. LEARNING OBJECTIVES

Measurable, per module. These become Phase 1B's acceptance criteria.

**M0** — Name four distinct sources of robot uncertainty and give a sensor
example of each; explain why a repeated measurement of an unchanged
quantity varies.

**M1** — Define a random variable over a sensor reading; distinguish PMF
from PDF and state why a PDF value is not a probability (spec §63); read a
CDF to answer "what fraction of readings fall below x"; compute mean,
variance and standard deviation from a sample; distinguish sample from
population statistics.

**M2** — State the continuous uniform PDF/CDF and derive its mean and
variance; generate uniform samples in Python; explain what "equally
likely" means over an interval; distinguish a uniformly *generated* target
from robot motion, which is not uniform; compare an empirical histogram to
the theoretical flat density and account for the deviation.

**M3** — State the Gaussian PDF and interpret mu and sigma physically;
compute and interpret a z-score; apply 68–95–99.7 to a sensor tolerance
question; estimate mu-hat and sigma-hat from real LiDAR data; construct and
read a Q-Q plot and an empirical CDF; identify outliers and explain the
mean/median sensitivity difference; **argue with evidence whether Gaussian
is a defensible model for a given dataset** — the module's terminal
objective.

**M4** — State the exponential PDF/CDF and the lambda ↔ E[T] relationship;
convert an event log into inter-arrival times; estimate lambda-hat; state
the memoryless property and name a robot process that violates it;
evaluate whether the exponential model is defensible for a real event
stream.

**M5** — Given an unlabeled dataset, identify which of WHERE/HOW/WHEN it
answers; justify a distribution choice from mechanism, not shape alone;
name what would falsify that choice.

**M6** — Independently execute the full loop (observe → model → estimate →
evaluate → interpret → state limitations) across three datasets, and
articulate what the model does *not* explain.

---

## 5. THREE-DISTRIBUTION COMPARISON

|  | **Uniform** | **Gaussian** | **Exponential** |
| --- | --- | --- | --- |
| Question | **WHERE** can it occur? | **HOW** does it vary? | **WHEN** is the next event? |
| Mechanism | bounded, no preference | many small additive errors | constant-hazard random arrivals |
| Parameters | a, b | mu, sigma | lambda |
| Support | [a, b] | (-inf, inf) | [0, inf) |
| Mean | (a+b)/2 | mu | 1/lambda |
| Variance | (b-a)^2/12 | sigma^2 | 1/lambda^2 |
| Shape | flat | symmetric bell | monotone decreasing |
| Robotics use | random target generation | sensor measurement noise | event waiting times |
| Key assumption | true bounds known, no bias | errors additive, symmetric, stationary | events independent, constant rate |
| How it fails on a robot | quantized actuator grid; rejected samples reshape the density | quantization, multipath, drift, heavy tails | bursty events; periodic scanning |

This table is not merely content. It is the shape of the
`DistributionSpec` registry (§12), and it is what makes adding Poisson a
data change rather than a redesign.

---

## 6. ROBOTICS EXPERIMENT MAPPING

|  | **LAB 1 — Random Robot Targets** | **LAB 2 — Does My LiDAR Have Gaussian Noise?** *(flagship)* | **LAB 3 — When Will the Next Event Happen?** |
| --- | --- | --- | --- |
| Distribution | Uniform | Gaussian | Exponential |
| Sensor / actuator | base motion (`/cmd_vel`, `/odom`) | LiDAR (`/scan`) | LiDAR (`/scan`) as event trigger |
| Measured quantity | commanded target (x, y) | `ranges[i]` at a fixed bearing | timestamp of each threshold crossing |
| Derived quantity | empirical 2D density, per-axis histograms | mu-hat, sigma-hat, eCDF, Q-Q | inter-arrival series, lambda-hat |
| What is modeled | **the generation process**, never the motion | range noise at one fixed distance | waiting time between crossings |
| Falsifiers to teach | quantized workspace grid; rejected out-of-bounds samples reshaping the density | bimodality from multipath; discretization steps; drift over the run; heavy tails | events driven by a periodic sweep rather than a random process; dead time after a crossing |
| Robot motion required | **yes** — the only lab that moves the robot | no — robot stationary | optional; an externally caused event is cleaner |
| Simulation-first path | full | full | full |
| Recorded-data path | targets + achieved odometry | 5,000 wall readings | timestamped crossing log |

**Lab 3 carries a design risk.** A robot patrolling a fixed loop produces
*periodic*, not exponential, encounters; designing the lab so it "comes
out exponential" would violate spec §63. The defensible version uses an
externally caused event (a person or object crossing the field at
unscheduled times). If the assumption still fails, **that becomes the
lesson** (`when-exponential-fails`) rather than a fudged result.

---

## 7. HARDWARE UTILIZATION MATRIX

| Sensor | ROS 2 topic | Phase 1 use | Future (spec §8) | Repository status |
| --- | --- | --- | --- | --- |
| **LiDAR** | `/scan` `sensor_msgs/LaserScan` | M3 flagship lab; M4 event trigger | Poisson, log-normal, sensor fusion | **CONFLICT** — catalog seeds RPLIDAR A2; `docs/robotics-projects/` describes RPLIDAR S3. Neither validated. No noise profile documented anywhere. |
| **Base / odometry** | `/cmd_vel`, `/odom` | M2 lab (target execution only) | CLT, covariance, localization | Referenced in project docs; absent from the hardware catalog; not validated |
| **Ultrasonic** | — | **none** | Bernoulli, Binomial, Geometric | **ABSENT** from every repository document. Existence unconfirmed. |
| **Camera** | `/camera/image_raw` | **none** | detection probability, pixel uncertainty | **CONFLICT** — catalog: Orbbec Astra Pro; project docs: RealSense D435i |
| **Encoders** | via `/odom` | **none** | odometry uncertainty, correlation | Mentioned once in project docs; no driver or topic documented |

**Phase 1 depends on exactly one sensor being real and characterized: the
LiDAR.** That is a deliberate scope property. The ultrasonic, camera and
encoder ambiguities block *future* modules, not this one — but it also
means Phase 1's central hardware risk is concentrated in a single
unresolved question (§19, risk 2).

---

## 8. ROS 2 DATA FLOW

**Decision: offline batch export. No `rosbridge_suite`, no browser-to-robot
WebSocket, no browser-initiated robot motion.**

Four structural reasons:

1. **Reachability.** The robot is on the student's LAN. A page served from
   this application's origin cannot reach it.
2. **CSP.** Milestone 12 shipped a deliberately narrow Content Security
   Policy. A live bridge requires `connect-src ws://*` across arbitrary
   LAN addresses, reversing a hardening decision already made.
3. **Authorization.** `rosbridge_server` is unauthenticated. §12 requires
   server-side authentication, identity, role and ownership checks on every
   protected action; §29 forbids trusting client authorization. A physical
   machine is the worst possible resource to make an exception for.
4. **Actuation.** Lab 1 moves the robot. A web page commanding motion has
   no emergency stop in the loop and no supervision model. The student runs
   that script **locally, with hands on the robot.**

```
PHYSICAL SENSOR
      |
ROS 2 DRIVER (rplidar_ros)              existing package, not rebuilt
      |
ROS 2 TOPIC (/scan)
      |
stats_robot_lab COLLECTOR NODE          ONE reusable node, all three labs
   ros2 run stats_robot_lab collect \
     --topic /scan --field ranges[540] \
     --duration 300 --rate 10 --out wall_2m.csv
      |
CSV + provenance sidecar (.meta.json)   ROS distro, driver version, rate,
      |                                 sample count, environment, timestamp
PYTHON ANALYSIS (NumPy / SciPy / Matplotlib)
      |
STATISTICAL MODEL -> VISUALIZATION -> INTERPRETATION
      |
[author path only] committed as a Dataset + static file -> DATASET_EXPLORER
```

One node, three labs, parameterized by topic/field/duration. This
satisfies the spec's "do not create one-off infrastructure for each
module" and extends to future sensors by argument rather than new code. It
ships as course content (a fixture module plus `FILE` downloads), exactly
as `robotics-projects` already ships node source.

**Accepted cost, stated plainly:** no live-streaming lesson where a student
watches their own robot's histogram fill in real time. That is the more
compelling demonstration, and it is not being proposed, because it works
only for a student on the same subnet as the server and requires
unauthenticated network access to a physical machine.

---

## 9. PYTHON DATA FLOW

Python serves **two** purposes. The second is what makes the mathematics
trustworthy.

```
stats_robot_lab/            ROS 2 package - collection
    collect.py              parameterized collector node
    replay.py               replay a recorded CSV as if live

statsrobotics/              pure-Python analysis package - NO ROS dependency
    load.py                 CSV + provenance loader, schema-validated
    describe.py             mean, variance, sd, median, quantiles, outlier flags
    fit.py                  parameter estimation per distribution
    diagnose.py             histogram, eCDF, Q-Q, residuals
    figures.py              generates the COURSE'S OWN static figures
    notebooks/              one per lab - the student's working surface
```

`figures.py` is the important one. Spec §54 requires mathematical graphs to
be generated programmatically and forbids AI-generated images wherever
numerical accuracy matters. **The same code a student runs on their own
data generates the static figures embedded in the lessons.** A course
figure is therefore reproducible, regenerable and verifiable — and it
cannot silently disagree with the interactive simulation, because both are
checked against the same closed-form values in tests (§19, risk 3).

Separating `statsrobotics` from the ROS 2 package means every analysis
lesson runs with `pip install numpy scipy matplotlib pandas` and no ROS 2
at all. That is what makes the simulation-first path real rather than
nominal.

---

## 10. DATASET STRATEGY

| Level | Generated by | Stored where | Retrieved how | DB row |
| --- | --- | --- | --- | --- |
| **1 · Synthetic** | seeded PRNG, in-browser | nowhere | computed on render | no |
| **2 · Recorded** | author, on the real robot | `public/datasets/statistics-robotics/<slug>.{csv,json}`, version-controlled | `fetch` from own origin, Zod-validated client-side | **yes** — `Dataset` |
| **3 · Student** | the student, on their robot | the student's own machine | never uploaded in M0–M5; the capstone submits a bounded summary | no |

**Why the payload is a static file rather than a `Json` column:** 5,000
float64 samples is roughly 40–80 KB. In Postgres that risks being dragged
along by every `Dataset` query, cannot be CDN-cached, and turns the
database into a numeric-array file server. In `public/` it matches how
every other course asset in this repository is already served
(`mediaSrcSchema` exists precisely because there is no storage provider),
it is immutable and cacheable, and the database keeps only what is
genuinely relational — provenance, the `HardwareDevice` link, and which
blocks reference it.

`checksumSha256` and `sampleCount` on the row make file/row drift
**detectable rather than silent**. `scripts/verify-datasets.ts` enforces it
in CI, following the precedent `scripts/verify-ros2-terminal-output.ts`
already set.

Three datasets are required for Phase 1 (targets + odometry, LiDAR wall
readings, event timestamps). **None exist** (§19, risk 1).

---

## 11. VISUALIZATION ARCHITECTURE

**Decision: no charting library. `d3-scale` + `d3-shape` (~12 KB combined,
tree-shakeable) rendering to SVG; `<canvas>` for the one high-cardinality
view.**

The requirement "thousands of samples, redrawn on slider input" conceals
the distinction that settles the choice — *thousands of samples is not
thousands of DOM nodes*:

| View | What actually renders | Node count |
| --- | --- | --- |
| PDF / CDF curve | one `<path>`, ~200 sampled points | **1** |
| Histogram of 5,000 samples | one `<rect>` per bin, <= 60 bins | **<= 60** |
| Theoretical overlay | one more `<path>` | **1** |
| Q-Q plot | one `<path>` plus a reference line | **2** |
| 2D uniform scatter, 5,000 points | 5,000 marks | **canvas** |

Exactly one view in the course needs canvas. Everything else stays under
roughly 70 SVG nodes and redraws well inside a frame budget with no
virtualization.

**Rejected alternatives:**

* **Recharts** — ~100 KB; its animation layer fights slider-driven updates;
  poor fit for arbitrary analytic curves and Q-Q plots. Fails §26 and §40.
* **Full `d3`** — ~250 KB and imperative DOM ownership that conflicts with
  React. We need scales and path generators, not a DOM framework.
* **visx** — the closest competitor and a defensible pick, but it wraps the
  same `d3-*` primitives. Taking them directly costs a few dozen lines of
  axis code and avoids a second component vocabulary beside shadcn/ui
  (§2, §21).
* **Plotly / Chart.js** — canvas-first, heavy, and neither is
  theme-token-aware nor accessible by default.

**Against §26 specifically:** `"use client"` lands on the simulator and
explorer components only — surrounding theory, code, callouts and the quiz
shell stay server-rendered (§7). Sampling is memoized per
`(params, seed, n)` and binning per `(samples, binCount)`, so dragging the
bin slider does not regenerate samples. `useDeferredValue` on slider input
drops intermediate frames rather than queueing them. If profiling ever
shows sample generation on the critical path, the answer is a Web Worker,
not a heavier library.

**Against §24:** SVG charts carry `role="img"` with an `aria-label`
generated from the **actual computed statistics**, and every chart is
accompanied by `StatisticalSummary` as real text. The canvas scatter gets a
text alternative describing bounds and the sampling process. A chart that
cannot be read by a screen reader teaches nothing.

Spec §48's semantic colours (theory / simulation / robot lab / insight /
safety) map onto existing design tokens as a small semantic layer — **not**
five new hardcoded hex values (§21).

---

## 12. INTERACTIVE SIMULATION ARCHITECTURE

Everything is driven by one registry, which is the extensibility mechanism
for the entire course.

```ts
// src/features/statistics/distributions.ts
export interface DistributionSpec<P extends DistributionParams> {
  kind: DistributionKind;                 // UNIFORM | GAUSSIAN | EXPONENTIAL
  label: string;
  variety: "CONTINUOUS" | "DISCRETE";     // DISCRETE reserved; drives PMF vs PDF
  parameters: ParameterSpec[];            // key, label, min, max, step, default, unit
  validate(p: P): string | null;          // params are validated, never assumed
  support(p: P): [number, number];        // MATHEMATICAL support; may be infinite
  plotDomain(p: P): [number, number];     // finite domain worth drawing
  pdf(x: number, p: P): number;
  cdf(x: number, p: P): number;
  quantile(q: number, p: P): number;      // powers Q-Q plots
  sample(rng: () => number, p: P): number;
  mean(p: P): number;
  variance(p: P): number;
  fit(samples: readonly number[]): P;     // parameter estimation
  framing: {                              // WHERE / HOW / WHEN, plus assumptions
    question: string;
    mechanism: string;
    assumptions: string[];
  };
}
```

Adding Poisson later is **one registry entry plus one content module**. No
component, renderer, block type or schema changes. That is the concrete
answer to "design the architecture so they can be added later."

**Two refinements made during Phase 1C implementation, recorded here so
this document stays true to the code:**

1. **`support` and `plotDomain` are separate.** The 1A draft had one
   function serving both. They are not the same value: the Gaussian's
   support is the whole real line and an axis cannot be, while the
   exponential's support *starting at zero* is a teaching point M4.3 turns
   on. Collapsing them would have made one of the two wrong.
2. **The Gaussian CDF uses Hart's rational approximation, not an `erf`
   series.** The first implementation used Abramowitz & Stegun 7.1.26
   (1.5e-7 absolute error) and its own test caught it as the weakest link
   in the numerics. Hart reaches ~1e-13 relative inside |z| < 7.07, and
   `quantile` adds one Halley refinement step so that it is a true inverse
   of `cdf` rather than an approximate one. This matters specifically for
   the flagship module's Q-Q plot, whose reference line spans several
   orders of magnitude of tail probability — an approximation whose own
   error is visible there would put a bend in the line that a learner
   would read as a property of their data (risk 3).

**Sampling algorithms:** uniform and exponential by inverse-CDF transform,
Gaussian by Box–Muller. All driven by a **seeded PRNG (mulberry32, roughly
ten lines, no dependency)**. Reproducibility is a hard course requirement —
spec §47 demands reproducible experiments, and a lesson that says "you
should see roughly 2.00 +/- 0.02" must be true on the reader's screen.
`Math.random` cannot promise that.

`DISTRIBUTION_SIM` is **one** block type covering `DistributionGraph`,
`HistogramViewer`, `CDFViewer`, `ParameterControl`, `StatisticalSummary`
and `DistributionSimulator` from spec §70. Those are components *inside* a
block, not six block types.

---

## 13. PHYSICAL LAB ARCHITECTURE

`LAB_PROTOCOL`, with the fifteen required lab sections as **required schema
fields**, not optional prose. Required rather than optional because spec
§44 and §63 make them non-negotiable, and an optional safety field is one
an author eventually forgets. This mirrors the reasoning by which
`HardwareDeviceSpec.whyItMatters` is already a required `String`.

Deliberately **not** reused from `EXERCISE:GUIDED` — that schema is
`{goal, steps[]}` with no structural notion of safety, reproducibility or
validation state.

`validationStatus` inherits the discipline already in force in this
repository (`docs/robotics-projects/PHASE_6_PHYSICAL_VALIDATION_CHECKLIST.md`'s
banner rule): every lab ships as `THEORETICALLY_DESIGNED` and is promoted
only after a real run, with a note naming the run that validates it.

**Simulation-first (spec's SIMULATION-FIRST SAFETY section) is enforced
structurally:** every lab lesson is preceded, in the same module, by a
fully working simulation lesson, so a learner with no robot completes the
statistical content regardless.

The full Zod schema is in §18.3.

---

## 14. QUIZ ARCHITECTURE

The six required question categories map onto the existing engine plus one
addition:

| Category | Question type | New? |
| --- | --- | --- |
| Conceptual ("what does sigma represent?") | `SINGLE_CHOICE`, `TRUE_FALSE` | existing |
| Visual ("what does this histogram tell you?") | `SINGLE_CHOICE` with an image in the prompt | needs prompt-level image support |
| Mathematical ("compute sigma-hat") | **`NUMERIC`** — value + tolerance + unit | **new type, APPROVED** |
| Robotics interpretation | `SINGLE_CHOICE`, `SHORT_ANSWER` | existing |
| Scientific reasoning ("is this justified?") | `MULTIPLE_CHOICE` (select all violated assumptions) | existing |
| Debugging ("what should you investigate?") | `MULTIPLE_CHOICE` | existing |

**`NUMERIC` is genuinely required.** As `SHORT_ANSWER` with exact string
matching, "compute the sample standard deviation" marks `0.0203` wrong
against `0.02` — unusable for a statistics course. It is additive: one
schema pair in `features/quizzes/schemas.ts`, one case in `scoring.ts`, one
renderer, one `QuestionType` enum value. Scheduled for Phase 1K.

Visual questions need an optional image on `QuizQuestion.data` — additive
within the existing JSON payload, no migration.

**Structure:** one checkpoint quiz per module (seven total), 8–12 questions
each, `passingScore: 70`, unlimited attempts, an explanation required on
every question (the field exists and is optional; required here by
authoring convention).

---

## 15. CAPSTONE ARCHITECTURE

Three provided datasets, unlabeled, one per random phenomenon. Seven
required answers per dataset (spec §33's list, scoped to Phase 1's three
distributions): classify the phenomenon, choose the distribution, estimate
parameters, interpret physically, compare to theory, state assumptions,
state limitations.

**This is the first real use of `ExerciseSubmission` / `ExerciseEvaluation`**
— a larger lift than the spec implies, since those models have zero callers
today.

**Scope decision (APPROVED):** Phase 1's capstone accepts a **structured
text/JSON submission** — per-dataset classification, estimated parameters,
evaluation notes, limitations, plus a link to the student's own repository
or notebook — evaluated `HUMAN_REVIEWED`, with `AI_ASSISTED` available
later through the existing provider abstraction (§15).

**File upload is deferred**, because §32's storage abstraction does not
exist and building it (provider interface, signed URLs, quotas, type
policy, authorization) is a project in its own right that would dominate
Phase 1. Spec §61's "video or physical demonstration" deliverable becomes a
link rather than an upload.

---

## 16. REUSABLE FRONTEND COMPONENTS

Split by genuine reusability, following the precedent the hardware course
set (`features/hardware/` for queries and schemas, `components/hardware/`
for shared UI):

```
src/components/charts/            domain-agnostic: knows scales and pixels,
    plot-frame                    not statistics
    axis
    line-series
    bar-series
    scatter-canvas
    legend

src/features/statistics/          distribution math; course-agnostic
    distributions.ts   rng.ts   summary.ts   fit.ts   schemas.ts
    components/
      distribution-plot   histogram   cdf-plot   qq-plot
      parameter-control   statistical-summary   distribution-simulator
      distribution-comparison        (spec §56 - Phase 1 shows 3, registry-driven)

src/features/datasets/
    queries.ts   schemas.ts   loader.ts
    components/ dataset-explorer   theory-vs-reality   experiment-comparison

src/features/labs/
    components/ lab-protocol   lab-checklist   safety-panel   validation-banner

src/features/learning/components/blocks/
    distribution-sim-block   dataset-explorer-block   lab-protocol-block
                                                      (thin adapters)

src/features/courses/content/statistics-robotics/
    *-fixtures.ts (Python / ROS 2 source shown in lessons)
    dataset manifests
```

**Not** `features/courses/statistics-robotics/` for the components. The
distribution mathematics and plotting are course-agnostic by design — that
is the entire point of the extensibility requirement — and burying them
under one course's folder is what §34 warns against from the other
direction. Only course-specific *content* goes under
`content/statistics-robotics/`, matching how `ros2/` and
`robotics-projects/` already work.

**Deferred past Phase 1:** spec §57's distribution decision tree (a
three-node tree is not a tree) and spec §58's sensor data explorer (it
needs sensors that do not exist yet).

---

## 17. REUSABLE BACKEND / DATA COMPONENTS

| Component | Responsibility | Layer (§5) |
| --- | --- | --- |
| `features/statistics/distributions.ts` | the `DistributionSpec` registry — pure, no I/O, no React | Domain |
| `features/statistics/{rng,summary,fit}.ts` | sampling, descriptive statistics, parameter estimation | Domain |
| `features/datasets/queries.ts` | `getDataset`, `getDatasetsForLesson` — one query, no N+1 | Application |
| `features/datasets/loader.ts` | fetch, parse and **Zod-validate** a dataset file at the boundary (§9) | Infrastructure |
| `features/datasets/schemas.ts` | dataset manifest, column and provenance schemas | Domain |
| `features/learning/schemas.ts` | three block payload schemas, registered in `lightweightBlockSchemas` | Domain |
| `features/learning/queries.ts` | three `RenderableBlock` variants and parse cases | Application |
| `features/quizzes/{schemas,scoring}.ts` | the `NUMERIC` pair and its scoring case | Domain |
| `scripts/verify-datasets.ts` | CI checksum / row-drift verification | Tooling |
| `prisma/seed.ts` + content fixtures | course authoring, following the existing convention | Tooling |

---

## 18. DATABASE / CONTENT MODEL IMPLICATIONS

**Every change below is additive. No breaking change to any existing
course, lesson, block or query.**

### 18.1 Schema changes

```prisma
enum ContentBlockType {
  // ... existing eleven ...
  DISTRIBUTION_SIM        // lightweight - JSON data + Zod
  DATASET_EXPLORER        // relational-shared - FK to Dataset
  LAB_PROTOCOL            // lightweight - JSON data + Zod
}

/// Phase 1 only. Additive later (ALTER TYPE ... ADD VALUE), exactly as
/// CourseVisibility's own comment anticipates for ORGANIZATION.
enum DistributionKind { UNIFORM  GAUSSIAN  EXPONENTIAL }

enum DatasetLevel  { SYNTHETIC  RECORDED  PHYSICAL }
enum DatasetFormat { CSV  JSON }

model Dataset {
  id      String @id @default(cuid())
  slug    String @unique          // /datasets/<slug>, and the seed's upsert key
  title   String
  summary String
  level   DatasetLevel

  /// The numeric payload is a versioned static file, not a column - see
  /// PHASE_1A section 10. Same absolute-or-root-relative shape as
  /// mediaSrcSchema, validated by Zod at the write boundary.
  sourceUri      String
  format         DatasetFormat
  sampleCount    Int
  /// Makes file/row drift detectable rather than silent. Verified in CI.
  checksumSha256 String
  /// [{key,label,unit,kind}] - Zod-validated, not free-form.
  columns        Json
  /// Spec section 47. Required in practice for RECORDED and PHYSICAL,
  /// enforced by a Zod refinement at the write boundary - the same place
  /// HardwareDevice.supportStatusNote's own requirement lives.
  provenance     Json?

  /// Optional link into the existing hardware catalog. Restrict, not
  /// Cascade: deleting a device a published dataset cites should fail
  /// loudly (section 41).
  hardwareDeviceId String?
  hardwareDevice   HardwareDevice? @relation(fields: [hardwareDeviceId], references: [id], onDelete: Restrict)

  contentBlocks LessonContentBlock[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([level])
  @@index([hardwareDeviceId])
}

model LessonContentBlock {
  // ... existing ...
  /// Plain many-to-one, NOT @unique - one dataset is legitimately
  /// referenced by several blocks across several lessons (its own analysis
  /// lesson, the comparison module, the capstone). Same shape and same
  /// reasoning as hardwareDeviceId; the opposite of quiz/exercise's 1:1.
  datasetId String?
  dataset   Dataset? @relation(fields: [datasetId], references: [id], onDelete: Restrict)

  @@index([datasetId])
}
```

### 18.2 Lightweight block schemas (Zod)

Both live in `src/features/statistics/schemas.ts` and
`src/features/labs/schemas.ts` respectively, and are registered in
`lightweightBlockSchemas` in `features/learning/schemas.ts`.

```ts
// ---------------------------------------------------------------- shared --

/** One parameter the learner can move. */
export const parameterControlSchema = z.object({
  /** Matches a ParameterSpec key in the distribution registry, plus the
   *  universal "n" (sample count). Validated against the registry by a
   *  superRefine on the block schema below, so an author cannot ship a
   *  control for a parameter the distribution does not have. */
  key: z.string().min(1),
  label: z.string().min(1),
  min: z.number(),
  max: z.number(),
  step: z.number().positive(),
  default: z.number(),
  unit: z.string().optional(),
  /** Rendered read-only. Exists so a lesson can vary sigma alone while mu
   *  stays pinned - teaching one idea at a time rather than handing over
   *  every slider at once. */
  locked: z.boolean().default(false),
}).refine((c) => c.min < c.max, {
  message: "min must be less than max",
  path: ["max"],
}).refine((c) => c.default >= c.min && c.default <= c.max, {
  message: "default must lie within [min, max]",
  path: ["default"],
});

export const distributionViewSchema = z.enum([
  "PDF",
  "CDF",
  "HISTOGRAM",
  "SCATTER_2D",
  "SUMMARY_STATS",
  "THEORETICAL_OVERLAY",
]);

// ------------------------------------------------- DISTRIBUTION_SIM block --

export const distributionSimBlockSchema = z.object({
  distribution: z.enum(["UNIFORM", "GAUSSIAN", "EXPONENTIAL"]),
  title: z.string().min(1),
  /** What the learner should notice. Required, not optional: a slider with
   *  no question attached is a toy, and spec section 38 forbids visuals
   *  that do not teach. */
  prompt: z.string().min(1),
  controls: z.array(parameterControlSchema).min(1),
  views: z.array(distributionViewSchema).min(1),
  /** Deterministic sampling. Lesson prose and static figures must match
   *  what the learner actually sees, and spec section 47 requires
   *  reproducibility; Math.random cannot promise either. */
  seed: z.int().nonnegative().default(42),
  maxSamples: z.int().positive().max(50_000).default(5_000),
  binCount: z.int().min(5).max(120).default(40),
  /** Pins the x-axis across several sims so a comparison lesson shows
   *  three distributions on genuinely shared axes rather than three
   *  independently auto-scaled ones. */
  xDomain: z.tuple([z.number(), z.number()]).optional(),
  /** Read-only mode: renders the curve with no controls, for a theory
   *  lesson that needs an accurate figure rather than an interaction.
   *  Replaces what would otherwise be a hand-drawn IMAGE (spec section 54). */
  interactive: z.boolean().default(true),
})
  .refine((b) => b.xDomain === undefined || b.xDomain[0] < b.xDomain[1], {
    message: "xDomain must be [min, max] with min < max",
    path: ["xDomain"],
  })
  .refine(
    (b) => b.views.includes("SCATTER_2D") === (b.distribution === "UNIFORM"),
    {
      message:
        "SCATTER_2D is the 2D workspace view and is only meaningful for UNIFORM",
      path: ["views"],
    }
  )
  .superRefine((b, ctx) => {
    // An author cannot expose a control for a parameter this distribution
    // does not have, nor omit one it requires. The registry is the single
    // source of truth for what parameters exist (section 12); this check is
    // what keeps block data from drifting away from it.
    const spec = DISTRIBUTIONS[b.distribution];
    const allowed = new Set([...spec.parameters.map((p) => p.key), "n"]);
    for (const control of b.controls) {
      if (!allowed.has(control.key)) {
        ctx.addIssue({
          code: "custom",
          message: `"${control.key}" is not a parameter of ${b.distribution}`,
          path: ["controls"],
        });
      }
    }
    for (const required of spec.parameters) {
      if (!b.controls.some((c) => c.key === required.key)) {
        ctx.addIssue({
          code: "custom",
          message: `${b.distribution} requires a control for "${required.key}"`,
          path: ["controls"],
        });
      }
    }
  });

export type DistributionSimBlockData = z.infer<typeof distributionSimBlockSchema>;
```

```ts
// ----------------------------------------------------- LAB_PROTOCOL block --

/** A step with a verifiable stop-and-check. `checkpoint` is what makes
 *  "the student should not have to guess any missing step" enforceable:
 *  a step whose success is unobservable IS a guess. */
const labStepSchema = z.object({
  title: z.string().min(1),
  /** Reuses richTextSchema from features/exercises/schemas.ts rather than
   *  inventing a parallel rich-text model - a diagram inside a lab step
   *  and one inside an exercise step have identical shapes (section 34). */
  content: richTextSchema,
  checkpoint: z.string().optional(),
});

const troubleshootingEntrySchema = z.object({
  symptom: z.string().min(1),
  likelyCause: z.string().min(1),
  whatToCheck: z.string().min(1),
});

export const labProtocolBlockSchema = z.object({
  title: z.string().min(1),

  //  1. Objective
  objective: z.string().min(1),

  //  2. Required hardware - slugs into the existing HardwareDevice catalog
  //     where the device is catalogued, free text only where it is not.
  requiredHardware: z.array(z.object({
    deviceSlug: z.string().optional(),
    label: z.string().min(1),
    note: z.string().optional(),
  })).min(1),

  //  3. Required software - version REQUIRED, not optional (spec section 47).
  requiredSoftware: z.array(z.object({
    name: z.string().min(1),
    version: z.string().min(1),
  })).min(1),

  //  4. Workspace / environment setup
  workspaceSetup: z.array(labStepSchema).min(1),
  //  5. Robot preparation
  robotPreparation: z.array(labStepSchema).min(1),
  //  6. ROS 2 commands (topic verification, driver bring-up)
  ros2Commands: z.array(labStepSchema).min(1),
  //  7. Experiment procedure
  procedure: z.array(labStepSchema).min(1),
  //  8. Data collection
  dataCollection: z.array(labStepSchema).min(1),
  //  9. Python analysis
  pythonAnalysis: z.array(labStepSchema).min(1),
  // 10. Expected observations - what a correct run looks like, so a
  //     student can tell "unexpected result" from "broken setup".
  expectedObservations: z.array(z.string().min(1)).min(1),
  // 11. Interpretation
  interpretation: richTextSchema,
  // 12. Troubleshooting
  troubleshooting: z.array(troubleshootingEntrySchema).min(1),

  // 13. Safety. All four sub-fields required - spec section 44 and the
  //     non-negotiables make these structural, not editorial.
  safety: z.object({
    preflight: z.array(z.string().min(1)).min(1),
    emergencyStop: z.string().min(1),
    supervision: z.string().min(1),
    speedLimits: z.string().optional(),   // only labs that move the robot
  }),

  // 14. Cleanup
  cleanup: z.array(z.string().min(1)).min(1),
  // 15. Challenge
  challenge: richTextSchema.optional(),

  /** Spec section 47 - reproducibility. Every field required; this is the
   *  block that makes "the experiment should be reproducible" checkable
   *  rather than aspirational. */
  reproducibility: z.object({
    ros2Distro: z.string().min(1),
    pythonVersion: z.string().min(1),
    packages: z.array(z.object({
      name: z.string().min(1),
      version: z.string().min(1),
    })).min(1),
    samplingRate: z.string().min(1),
    sampleCount: z.string().min(1),
    duration: z.string().min(1),
    environment: z.string().min(1),
  }),

  /** Mirrors the banner rule already in force in
   *  docs/robotics-projects/PHASE_6_PHYSICAL_VALIDATION_CHECKLIST.md.
   *  Every lab ships THEORETICALLY_DESIGNED and is promoted only after a
   *  real run. */
  validationStatus: z.enum(["THEORETICALLY_DESIGNED", "PHYSICALLY_VALIDATED"]),
  validationNote: z.string().optional(),

  /** The simulation-first escape hatch (spec: SIMULATION-FIRST SAFETY).
   *  Names the lesson a learner without a robot should do instead. Required
   *  so that "provide a simulation path whenever practical" is structural
   *  rather than a thing an author remembers. */
  simulationFallbackLessonSlug: z.string().min(1),
})
  .refine(
    (l) => l.validationStatus !== "PHYSICALLY_VALIDATED" || !!l.validationNote,
    {
      message: "A validated lab must record which run validates it",
      path: ["validationNote"],
    }
  );

export type LabProtocolBlockData = z.infer<typeof labProtocolBlockSchema>;
```

### 18.3 Relational-shared block schema (Zod)

`DATASET_EXPLORER` splits across two schemas, mirroring how `SPEC_TABLE`
already works: the **block** payload carries only view configuration, and
the **dataset** row carries the data and its provenance. That split is what
lets three lessons show the same dataset three different ways without
copying a single number.

```ts
// src/features/datasets/schemas.ts

/** Describes one column of a dataset file. */
export const datasetColumnSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  unit: z.string().optional(),
  kind: z.enum(["NUMERIC", "TIMESTAMP", "CATEGORICAL"]),
});

/** Spec section 47. Required for RECORDED and PHYSICAL datasets - a
 *  recorded dataset with no provenance is an unreproducible number, which
 *  is exactly what the course teaches students not to trust. */
export const datasetProvenanceSchema = z.object({
  collectedAt: z.iso.date(),
  robotConfiguration: z.string().min(1),
  sensor: z.string().min(1),
  sensorConfiguration: z.string().min(1),
  environment: z.string().min(1),
  samplingRateHz: z.number().positive(),
  durationSeconds: z.number().positive(),
  ros2Distro: z.string().min(1),
  pythonVersion: z.string().min(1),
  packages: z.array(z.object({
    name: z.string().min(1),
    version: z.string().min(1),
  })).min(1),
  /** What could be wrong with this data. Required: every recorded dataset
   *  in this course carries its own caveats, per spec section 45. */
  knownLimitations: z.array(z.string().min(1)).min(1),
});

/** The Dataset row, validated at the write boundary (seed) and again on
 *  read, since `columns` and `provenance` are Json columns and therefore
 *  external input the moment they leave the database (section 9). */
export const datasetSchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().min(1),
  level: z.enum(["SYNTHETIC", "RECORDED", "PHYSICAL"]),
  sourceUri: mediaSrcSchema,          // reused, not reinvented
  format: z.enum(["CSV", "JSON"]),
  sampleCount: z.int().positive(),
  checksumSha256: z.string().regex(/^[0-9a-f]{64}$/),
  columns: z.array(datasetColumnSchema).min(1),
  provenance: datasetProvenanceSchema.optional(),
}).refine(
  (d) => d.level === "SYNTHETIC" || d.provenance !== undefined,
  {
    message: "RECORDED and PHYSICAL datasets require provenance",
    path: ["provenance"],
  }
);

// ------------------------------------------------ DATASET_EXPLORER block --

export const datasetViewSchema = z.enum([
  "TABLE_PREVIEW",
  "HISTOGRAM",
  "ECDF",
  "QQ_PLOT",
  "SUMMARY_STATS",
  "TIME_SERIES",
  "SCATTER_2D",
]);

export const datasetExplorerBlockSchema = z.object({
  title: z.string().min(1),
  prompt: z.string().min(1),
  /** Which column this block analyses. Checked against the referenced
   *  Dataset's own `columns` at read time in queries.ts - a block naming a
   *  column the dataset does not have degrades to INVALID rather than
   *  rendering an empty chart. */
  valueColumn: z.string().min(1),
  /** For SCATTER_2D (the uniform 2D workspace view). */
  secondaryColumn: z.string().optional(),
  views: z.array(datasetViewSchema).min(1),
  binCount: z.int().min(5).max(120).default(40),
  /** THEORY vs SIMULATION vs REALITY on shared axes. A fitted overlay is a
   *  HYPOTHESIS UNDER TEST, never an assertion - the renderer labels it as
   *  one, and spec section 63 forbids anything else. */
  overlay: z.object({
    distribution: z.enum(["UNIFORM", "GAUSSIAN", "EXPONENTIAL"]),
    parameterSource: z.enum(["FITTED_FROM_DATA", "AUTHOR_SPECIFIED"]),
    parameters: z.record(z.string(), z.number()).optional(),
    /** Shown beside the overlay. Required for AUTHOR_SPECIFIED: if an
     *  author pins parameters by hand rather than fitting them, the
     *  learner is owed the reason. */
    note: z.string().optional(),
  }).optional(),
})
  .refine(
    (b) => !b.views.includes("SCATTER_2D") || !!b.secondaryColumn,
    {
      message: "SCATTER_2D requires secondaryColumn",
      path: ["secondaryColumn"],
    }
  )
  .refine(
    (b) =>
      b.overlay?.parameterSource !== "AUTHOR_SPECIFIED" ||
      (b.overlay.parameters !== undefined && b.overlay.note !== undefined),
    {
      message:
        "An AUTHOR_SPECIFIED overlay requires explicit parameters and a note explaining why they were not fitted",
      path: ["overlay"],
    }
  );

export type DatasetExplorerBlockData = z.infer<typeof datasetExplorerBlockSchema>;
```

### 18.4 `RenderableBlock` additions

```ts
| { id: string; position: number; kind: "DISTRIBUTION_SIM";
    data: DistributionSimBlockData }
| { id: string; position: number; kind: "DATASET_EXPLORER";
    dataset: DatasetDetail; data: DatasetExplorerBlockData }
| { id: string; position: number; kind: "LAB_PROTOCOL";
    data: LabProtocolBlockData }
```

Each degrades to `kind: "INVALID"` on parse failure — malformed JSON, a
missing `Dataset` row, or a `valueColumn` the dataset does not declare —
exactly as `SPEC_TABLE` already does when its device is missing (§28).

### 18.5 Deferred model changes — scheduled, not skipped

* **`QuizQuestion` + `NUMERIC`** — no schema change at all (the payload is
  already `Json`); one `QuestionType` enum value. **Phase 1K.** Approved.
* **Sub-lesson progress (spec §49).** `LessonProgress` is lesson-level by
  explicit design. The activity checklist
  (`THEORY ✓ / SIMULATION ✓ / ROBOT DATA ○ …`) needs granularity that does
  not exist. Recommendation: a generic additive
  `LessonActivityProgress(enrollmentId, lessonId, activityKey)` in
  **Phase 1K**, with the checklist rendering derived-only (from
  `LessonProgress` plus `QuizAttempt`) until then. Deriving alone cannot
  cover "ran the simulation" or "completed the lab", so the table is
  genuinely needed — but not before the content exists to justify its keys.

---

## 19. TECHNICAL RISKS

| # | Risk | Severity | Mitigation |
| --- | --- | --- | --- |
| 1 | **No recorded datasets exist.** Level 2 is the backbone of M3 and M4 — it is what every student without a robot uses, and what the lesson prose, fitted overlays, Q-Q discussion and quiz answers are written against. | **BLOCKING — OPEN** | Someone must run three collection sessions on real hardware. Phases 1B, 1C, 1D and 1G proceed on synthetic data; **1H and 1I analysis lessons cannot be written truthfully without this.** |
| 2 | **Hardware record is contradictory and unvalidated** (A2 vs S3 vs generic "LiDAR"; ultrasonic absent everywhere; nothing physically validated). | **BLOCKING for labs — OPEN** | Resolve before Phase 1F. Phase 1 needs only the LiDAR confirmed; the other ambiguities block future modules. |
| 3 | **Mathematical incorrectness.** A wrong PDF constant or an off-by-one in binning is invisible and catastrophic for credibility (spec §62, §63). | High | Unit-test every `pdf`, `cdf` and `quantile` against closed-form values at known points; cross-check the TypeScript implementations against SciPy in CI; assert the interactive simulation and `figures.py` agree within float tolerance. **This is the mathematical rigor strategy.** |
| 4 | **Overclaiming from data** — the worst failure mode the spec names (§63): presenting simulation as validation, or asserting real data is Gaussian. | High | `validationStatus` is a required schema field, not prose. Overlays are labelled `FITTED_FROM_DATA` and rendered as hypotheses under test. Q-Q and residual views are required, not optional, in every analysis lesson. **This is the physical robot validation strategy**, inheriting the existing PHASE_6 banner rule. |
| 5 | **Capstone uses a submission path that has never run**, plus storage that does not exist. | Medium | Text/JSON submission in Phase 1 (approved); file upload deferred with §32. Recorded as a deliberate scope reduction, not hidden. |
| 6 | **Scope.** 38 lessons at this depth is comparable to the entire ROS 2 Fundamentals course. | Medium | Phase 1B sizes it honestly before 1G starts. M3 is the flagship and takes disproportionate depth by design. |
| 7 | **Lab 3's event process may not be exponential.** A patrolling robot produces periodic encounters. | Medium | Design around externally caused events; if the assumption still fails, that becomes the lesson (`when-exponential-fails`) rather than a fudged result. |
| 8 | Four switch/registry sync points per block type (§0.1). | Low | Exhaustiveness test asserting every `ContentBlockType` is handled in both `block-renderer.tsx` and `chat/context.ts`. |
| 9 | Dataset file/row drift. | Low | `checksumSha256` plus `scripts/verify-datasets.ts` in CI. |
| 10 | Slider redraw performance. | Low | Binning caps node counts; measure before optimizing (§26). |

---

## 20. IMPLEMENTATION SEQUENCE

| Phase | Deliverable | Depends on | Gate |
| --- | --- | --- | --- |
| **1A** | This document | — | **APPROVED 2026-09-07** |
| **1B** | Curriculum blueprint: 38 lessons, objectives, block sequences, quiz and challenge specifications | 1A | approval before content authoring |
| **1C** | Visualization system — `components/charts/`, `features/statistics/` math and registry | 1B | unit tests vs closed form + SciPy cross-check |
| **1D** | `DISTRIBUTION_SIM` block: schema, renderer, seeded PRNG, all three distributions | 1C | typecheck, lint, build; a11y pass; block-type exhaustiveness test |
| **1E** | `Dataset` model and migration, loader, `DATASET_EXPLORER` block, `verify-datasets.ts` | 1D | integration tests including `INVALID` degradation |
| **1F** | `stats_robot_lab` ROS 2 package, `statsrobotics` analysis package, `LAB_PROTOCOL` block | 1E, **risk 2 resolved** | Python tests; labs ship `THEORETICALLY_DESIGNED` |
| **1G** | **Uniform module** (7 lessons) — first full vertical slice | 1F | end-to-end learner walkthrough |
| **1H** | **Gaussian module** (10 lessons) — flagship | 1G, **risk 1 resolved** | analysis lessons blocked without real data |
| **1I** | **Exponential module** (7 lessons) | 1H, risk 1 | assumption-violation lesson mandatory |
| **1J** | Mini-capstone; first `ExerciseSubmission` use | 1I | submission-to-evaluation integration test |
| **1K** | Assessment: `NUMERIC` question type, 7 checkpoint quizzes, `LessonActivityProgress` | 1J | scoring unit tests; progress integration tests |
| **1L** | UX polish: spec §48 semantic colours, transitions, responsive lab and simulation layouts, reduced motion | 1K | Lighthouse and axe; mobile lab layout |
| **1M** | Validation: mathematical, educational, technical, physical | 1L | full suite; lab banner promotion on real runs |

**Critical path:** 1A → 1B → 1C → 1D → 1E → 1F → 1G.

Risks 1 and 2 sit on the critical path at 1F and 1H and are **human tasks,
not code tasks.** They should be started now, in parallel with 1B, rather
than being discovered as blockers six phases from now.

---

## 21. RELATIONSHIP TO THE ROBOTICS HARDWARE & SENSORS COURSE

`robotics-hardware-and-sensors` (seeded, DRAFT) already teaches the sensor
hardware this course would otherwise re-explain. Verified against
`prisma/seed.ts`, not assumed:

| That course already teaches | Lesson slug |
| --- | --- |
| What a robot is made of; sensors vs actuators | `what-makes-up-a-robot`, `sensors-and-actuators` |
| Range, resolution, field of view | `range-resolution-field-of-view` |
| **Accuracy, precision and noise** | `accuracy-precision-noise` |
| Frequency, latency, data rate | `frequency-latency-data-rate` |
| The generic hardware-to-ROS-2 pipeline | `the-generic-pipeline`, `grounding-the-pipeline-rplidar` |
| QoS and reliability settings | `qos-why-reliability-settings-matter` |
| RPLIDAR A2: how it works, specs, setup, ROS 2 integration, debugging | the whole `RPLIDAR A2` module (12 lessons) |
| Orbbec Astra Pro: the same, for an RGB-D camera | the whole `Orbbec Astra Pro` module (12 lessons) |

**`accuracy-precision-noise` is the exact handoff point.** It defines
accuracy versus precision, shows the four-quadrant target diagram, and
defines noise qualitatively as "small random variations in a reading that
grow larger as a sensor operates closer to its physical limits" — then
stops. It never quantifies the variation, never names a distribution, and
never asks whether the variation has a shape.

That is precisely where this course begins.

**Decision:** this course **cross-references rather than re-teaches.**

* **M0 `seven-kinds-of-uncertainty`** opens by citing
  `accuracy-precision-noise` and picking up its unanswered question:
  *"That lesson told you noise exists and gets worse with range. It did not
  tell you what shape it has, or how to measure it. That is this course."*
* **M3 `lidar-noise-lab`** does not re-teach RPLIDAR bring-up, udev rules,
  baud rates or driver debugging. It links to
  `rplidar-a2-ubuntu-setup`, `rplidar-a2-ros2-integration` and
  `rplidar-a2-debugging`, and starts from a working `/scan`.
* The hardware course is listed as a **recommended prerequisite** on the
  course overview, alongside `ros2-fundamentals`.
* Cross-references are authored as `TEXT`/`CALLOUT` blocks containing
  root-relative links (`/courses/robotics-hardware-and-sensors/learn/...`)
  — no new block type, no new relation. A formal course-prerequisite
  relation is not worth a schema change for two links.

**Ultrasonic sensors and wheel encoders are taught in neither course.**
They are not needed for Phase 1 (§7), but they are a genuine content gap
for the future Bernoulli, Binomial, Geometric and Covariance modules.

---

## 22. OPEN QUESTIONS

| # | Question | Status | Blocks |
| --- | --- | --- | --- |
| 1 | Which LiDAR is on the physical robot — RPLIDAR A2, S3, or another model? Phase 1 needs only this one sensor confirmed. | **OPEN** | 1F, 1H |
| 2 | Who is producing the three recorded datasets, and when? | **OPEN** | 1H, 1I |
| 3 | Add `NUMERIC` as a fifth question type to the shipped quiz engine? | **APPROVED 2026-09-07** | — |
| 4 | Capstone scope: text/JSON plus links for Phase 1, file upload deferred until §32 storage exists? | **APPROVED 2026-09-07** | — |
| 5 | Which event source does Lab 3 use, given that a patrolling robot produces periodic rather than exponential encounters? | Open, not blocking | 1I |
| 6 | Does the ultrasonic sensor named in spec §10 physically exist on the robot? | Open, not blocking Phase 1 | future modules |

Items 1 and 2 do not block Phases 1B or 1C: the curriculum blueprint and
the visualization and mathematics layer are entirely synthetic-data work
and never touch the robot.
