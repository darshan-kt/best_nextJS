# PHASE 1B — CURRICULUM BLUEPRINT
## Statistical Distributions with Robotics

> **STATUS: DRAFT, awaiting review.** Depends on
> `PHASE_1A_ARCHITECTURE.md` (approved 2026-09-07).
>
> This document specifies **what each lesson teaches and which blocks it
> contains**. It is not lesson content — no prose, no quiz text and no
> Python source is written here. Content authoring begins at Phase 1G.

Legend for block sequences:

```
TEXT IMAGE CODE FILE CALLOUT EMBED QUIZ EXERCISE   existing block types
SIM   = DISTRIBUTION_SIM      (new, Phase 1D)
DATA  = DATASET_EXPLORER      (new, Phase 1E)
LAB   = LAB_PROTOCOL          (new, Phase 1F)
```

`SIM[static]` means `interactive: false` — an accurate programmatic figure
in place of a hand-drawn image (spec §54), with no controls.

---

## 0. SIZING

| Module | Lessons | Est. minutes | New-block load |
| --- | --- | --- | --- |
| M0 Why Statistics Matters | 3 | 35 | 1 SIM |
| M1 Random Variables & Probability | 7 | 105 | 5 SIM |
| M2 Uniform | 7 | 120 | 4 SIM, 1 DATA, 1 LAB |
| M3 Gaussian *(flagship)* | 11 | 220 | 6 SIM, 3 DATA, 1 LAB |
| M4 Exponential | 8 | 140 | 4 SIM, 2 DATA, 1 LAB |
| M5 Three Ways to Be Random | 3 | 45 | 3 SIM, 1 DATA |
| M6 Mini-Capstone | 2 | 90+ | 3 DATA |
| **Total** | **41** | **~755 min** | **26 SIM, 10 DATA, 3 LAB** |

Phase 1A estimated 38 lessons; the blueprint lands at **41** — M1 and M4
each gained a lesson during objective mapping, and M3 gained the
`gaussian-mechanism` lesson (see §M3). This is comparable in size to
`ros2-fundamentals` (7 modules). Flagged against risk 6.

**Reuse ratio:** of 41 lessons, **32 are authorable with existing block
types alone.** Only 9 lessons hard-require a new block type to be
meaningful — which is what makes 1C/1D/1E worth building before 1G rather
than after.

---

## M0 — WHY STATISTICS MATTERS IN ROBOTICS
`position: 0` · 3 lessons · ~35 min

**Module objective.** Name four distinct sources of robot uncertainty with
a sensor example of each, and explain why a repeated measurement of an
unchanged quantity varies.

**Cross-reference obligation (1A §21):** this module cites
`robotics-hardware-and-sensors` rather than re-teaching sensor hardware.

---

### M0.1 · `the-wall-that-moved` — 12 min

*A robot facing a wall that has not moved. The LiDAR disagrees with
itself.*

**Objectives** — Observe that repeated measurements of a fixed quantity
differ; articulate why that is surprising before it is explained; state
that the variation has structure rather than being arbitrary.

**Blocks**

| # | Type | Purpose |
| --- | --- | --- |
| 1 | `CALLOUT` INFO | The hook question: the wall has not moved, so why have the numbers? |
| 2 | `IMAGE` | Experimental geometry: stationary robot, wall at 2 m, beam annotated (SVG, `figures.py`) |
| 3 | `TEXT` | The reading sequence (2.01, 1.98, 2.03 …) and what a naive reader concludes |
| 4 | `SIM[static]` | The same readings as a histogram — shape appears without the word "Gaussian" being used |
| 5 | `TEXT` | Three candidate explanations (the wall moved / the sensor is broken / this is normal), only one of which survives |
| 6 | `CALLOUT` TIP | Where this goes: the variation is the subject, not an obstacle to it |

**Note.** Block 4 deliberately shows a histogram with **no fitted curve and
no distribution named.** Naming the Gaussian here would answer the question
the whole course exists to make the learner ask.

---

### M0.2 · `seven-kinds-of-uncertainty` — 13 min

**Objectives** — Name four distinct sources of robot uncertainty (sensor,
actuator, environmental, model) and give a sensor example of each;
distinguish uncertainty from error.

**Blocks**

| # | Type | Purpose |
| --- | --- | --- |
| 1 | `CALLOUT` INFO | **Cross-reference to `accuracy-precision-noise`** — the handoff (1A §21) |
| 2 | `TEXT` | Uncertainty vs error: an error is a mistake, uncertainty is a property |
| 3 | `IMAGE` | Taxonomy diagram: sensor / actuator / environmental / model uncertainty |
| 4 | `TEXT` | Sensor uncertainty — LiDAR range, camera pixel position |
| 5 | `TEXT` | Actuator uncertainty — commanded vs achieved motion |
| 6 | `TEXT` | Environmental and model uncertainty |
| 7 | `CALLOUT` WARNING | Precise but wrong: a biased sensor is consistent and useless. Reuses the hardware course's quadrant framing without re-deriving it |

---

### M0.3 · `how-this-course-works` — 10 min

**Objectives** — Distinguish the three levels of evidence (theory,
simulation, reality) and state why they are not interchangeable; locate the
simulation-first path.

**Blocks**

| # | Type | Purpose |
| --- | --- | --- |
| 1 | `TEXT` | The course loop: observe → question → model → test → interpret |
| 2 | `IMAGE` | Three levels of evidence diagram (theory / simulation / reality) |
| 3 | `CALLOUT` WARNING | **Never present simulation as validation** (spec §63) — stated once, early, and referenced later |
| 4 | `TEXT` | Prerequisites, with links to `ros2-fundamentals` and `robotics-hardware-and-sensors` |
| 5 | `CALLOUT` TIP | No robot? Every module has a full simulation path. Names the fallback lessons |

---

## M1 — RANDOM VARIABLES AND PROBABILITY
`position: 100` · 7 lessons · ~105 min

**Module objective.** Define a random variable over a sensor reading;
distinguish PMF from PDF and state why a PDF value is not a probability;
read a CDF; compute mean, variance and standard deviation from a sample;
distinguish sample from population statistics.

---

### M1.1 · `random-variables` — 14 min

**Objectives** — Define a random variable; express a sensor reading as one;
distinguish the variable from a single realization of it.

**Blocks** — `TEXT` (X = the LiDAR distance) · `IMAGE` (mapping outcomes to
numbers) · `TEXT` (realizations x₁, x₂, … vs the variable X) · `CALLOUT`
TIP (notation convention used for the rest of the course) · `TEXT`
(three more robot random variables) · `EXERCISE` INDEPENDENT (identify the
random variable in three scenarios).

---

### M1.2 · `discrete-and-continuous` — 15 min

**Objectives** — Classify a robot measurement as discrete or continuous;
state why a LiDAR reading is *modeled* as continuous despite being
quantized in practice.

**Blocks** — `TEXT` · `IMAGE` (discrete vs continuous number line) ·
`SIM[static]` (a PMF beside a PDF, same axes) · `TEXT` (the quantization
caveat) · `CALLOUT` WARNING (**a PDF value is not a probability** — spec
§63's named confusion, introduced here and returned to in M1.3) ·
`EXERCISE` INDEPENDENT.

**Note.** The quantization point matters and is usually skipped: a real
LiDAR reports discrete steps, and we model it as continuous anyway. Saying
so here prevents the M3 Q-Q plot's staircase from reading as a bug.

---

### M1.3 · `pdf-pmf-and-cdf` — 18 min

**Objectives** — Read a PDF as a density and a CDF as an accumulated
proportion; answer "what fraction of readings fall below x" from a CDF;
explain why the area under a PDF is 1.

**Blocks** — `TEXT` · `SIM` **first interactive simulation** (Gaussian,
σ locked, PDF + CDF views, linked cursor across both) · `TEXT` (area as
probability) · `IMAGE` (shaded-area figure) · `CALLOUT` INFO (why P(X = x)
= 0 for a continuous variable) · `EXERCISE` GUIDED (read three values off
the CDF).

**Note.** The linked cursor — moving x on the PDF highlights the same x on
the CDF — is the single most valuable interaction in M1 and is a `SIM`
feature requirement for Phase 1D.

---

### M1.4 · `expected-value-and-mean` — 13 min

**Objectives** — Distinguish E[X] (population) from x̄ (sample); compute a
sample mean; state what the mean of LiDAR readings physically estimates.

**Blocks** — `TEXT` · `IMAGE` (balance-point metaphor) · `SIM` (sample
count slider; watch x̄ approach μ) · `TEXT` (robotics interpretation) ·
`CALLOUT` WARNING (the mean is not the true distance — it is an estimate of
it) · `EXERCISE`.

---

### M1.5 · `variance-and-standard-deviation` — 15 min

**Objectives** — Compute variance and σ from a sample; state why σ, not
σ², is the number an engineer quotes; connect σ to a sensor tolerance.

**Blocks** — `TEXT` · `IMAGE` (squared-deviation figure) · `SIM` (σ slider;
spread responds) · `CALLOUT` WARNING (**never confuse variance with
standard deviation** — spec §63) · `TEXT` (units: metres vs metres²; this
is why σ is quoted) · `EXERCISE`.

---

### M1.6 · `samples-and-sampling` — 16 min

**Objectives** — Distinguish sample from population; predict how sample
size affects the stability of x̄ and σ̂; state why 30 readings and 5,000
readings support different claims.

**Blocks** — `TEXT` · `SIM` (resample button at fixed n; statistics jump
around) · `TEXT` (sampling variability named) · `SIM` (n slider; jumpiness
shrinks) · `CALLOUT` TIP (this is why M3's lab collects 5,000, not 100) ·
`EXERCISE`.

**Note.** Two `SIM` blocks in one lesson, deliberately: the first shows
instability at fixed n, the second shows it shrinking with n. One block
with both controls muddles the two observations.

---

### M1.7 · `foundations-checkpoint` — 14 min

**Blocks** — `QUIZ` (10 questions) · closing `CALLOUT`.

**Quiz composition** — 3 conceptual, 2 visual (read a PDF and a CDF),
**3 `NUMERIC`** (compute x̄, σ̂, and a proportion from a CDF), 2 robotics
interpretation. `passingScore: 70`, unlimited attempts, explanation
required on every question.

---

## M2 — UNIFORM DISTRIBUTION · *WHERE*
`position: 200` · 7 lessons · ~120 min

**Module objective.** State the continuous uniform PDF/CDF and derive its
mean and variance; generate uniform samples; explain "equally likely" over
an interval; distinguish a uniformly *generated* target from robot motion;
account for deviation between an empirical histogram and a flat density.

---

### M2.1 · `where-can-a-value-occur` — 12 min

**Objectives** — Frame the WHERE question; identify a robot process that is
deliberately randomized rather than incidentally noisy.

**Blocks** — `CALLOUT` INFO (hook: a robot must explore a room it has no
map of — where does it go next?) · `TEXT` · `IMAGE` (2D workspace with
scattered targets) · `TEXT` (deliberate randomness vs measurement noise —
the distinction that separates M2 from M3) · `CALLOUT` TIP (WHERE / HOW /
WHEN preview).

---

### M2.2 · `uniform-theory` — 18 min

**Objectives** — State the continuous uniform PDF and CDF; state the
discrete case; explain why the PDF is 1/(b−a) and not 1.

**Blocks** — `TEXT` (intuition first) · `SIM[static]` (PDF and CDF) ·
`TEXT` (the formula, after the shape) · `IMAGE` (discrete vs continuous
uniform) · `CALLOUT` INFO (why the density exceeds 1 when b−a < 1 — a
direct payoff of M1.2's "a density is not a probability") · `EXERCISE`.

---

### M2.3 · `uniform-mean-and-variance` — 16 min

**Objectives** — Derive (a+b)/2 and (b−a)²/12; predict how variance
responds to a widened interval.

**Blocks** — `TEXT` (derivation, shown not asserted) · `SIM` (a and b
sliders; mean and variance readouts update) · `TEXT` (why the 12) ·
`EXERCISE` · `CALLOUT` TIP.

---

### M2.4 · `uniform-explore` — 20 min

**Objectives** — Predict the effect of a, b and n on the histogram;
generate uniform samples in Python; explain why a finite sample's histogram
is not flat.

**Blocks** — `SIM` (full: a, b, n; histogram + PDF + CDF + summary stats) ·
`TEXT` (what to notice) · `CODE` python (NumPy generation) · `CODE` python
(histogram plotting) · `FILE` (`uniform_explore.py`) · `CALLOUT` WARNING
(**a finite sample is never perfectly flat** — the first theory-vs-reality
moment, on synthetic data where nothing else can be blamed) · `EXERCISE`.

**Note.** Introducing the theory-vs-reality gap on *synthetic* data is
deliberate. When the same gap appears on real LiDAR data in M3, the learner
already knows it is not the sensor's fault.

---

### M2.5 · `random-target-generation` — 18 min

**Objectives** — Generate 2D uniform targets; interpret a 2D scatter as two
independent uniforms; **state precisely what is and is not being modeled as
uniform.**

**Blocks** — `TEXT` · `SIM` (2D scatter, `SCATTER_2D` view, workspace
bounds) · `TEXT` (per-axis histograms) · **`CALLOUT` WARNING — the scoping
caveat**: the *target generation* is uniform; the robot's *motion* is not,
and nothing in this lab claims otherwise · `TEXT` (what would break
uniformity: a quantized grid, rejected out-of-bounds samples, an obstacle
mask) · `EXERCISE`.

**Note.** The scoping caveat is a hard requirement from the Phase 1 brief.
It is a `WARNING` callout in the lesson body, not a footnote.

---

### M2.6 · `uniform-lab` — 22 min

**Objectives** — Execute LAB 1; compare a generated target set against the
theoretical density; identify at least one mechanism that distorts it.

**Blocks** — `LAB` (LAB 1 — Random Robot Targets) · `CODE` python (target
generator) · `CODE` bash (ROS 2 goal dispatch, run **locally**) · `DATA`
(recorded target + odometry dataset: `TABLE_PREVIEW`, `SCATTER_2D`,
`HISTOGRAM`, `SUMMARY_STATS`; overlay `UNIFORM` / `FITTED_FROM_DATA`) ·
`TEXT` (interpretation) · `CALLOUT` WARNING (safety recap — this is the
only lab that moves the robot).

**Dependencies** — dataset `uniform-targets-workspace-2x2`; risk 1.
`simulationFallbackLessonSlug: "uniform-explore"`.

---

### M2.7 · `uniform-checkpoint` — 14 min

**Blocks** — `QUIZ` (10 questions) · `EXERCISE` INDEPENDENT (the module
challenge) · closing `CALLOUT` (reflection).

**Quiz composition** — 3 conceptual, 2 visual, 2 `NUMERIC` (mean and
variance from given bounds), 2 robotics interpretation, 1 model selection
("is uniform defensible for this described process?").

**Challenge** — Generate a target set, compare against theory, and state
one mechanism by which the realized targets could deviate from uniform.
Content-only, no submission (1A §15).

---

## M3 — NORMAL / GAUSSIAN DISTRIBUTION · *HOW*  ★ FLAGSHIP
`position: 700` · 11 lessons · ~220 min

**Module objective (terminal).** Argue with evidence whether a Gaussian is
a defensible model for a given LiDAR dataset — not whether it fits, but
whether the claim is warranted.

---

### M3.1 · `why-does-a-still-sensor-move` — 12 min

**Objectives** — Restate the M0 hook as a quantitative question; state what
would count as an answer.

**Blocks** — `CALLOUT` INFO (the hook, returned to with M1's vocabulary) ·
`TEXT` · `SIM[static]` (the M0.1 histogram again, now labelled with x̄ and
σ̂) · `TEXT` (what a good answer looks like) · `CALLOUT` TIP (module
roadmap).

---

### M3.2 · `gaussian-mechanism` — 16 min

**Objectives** — State *why* many small independent additive errors produce
a bell shape; identify when that mechanism does **not** apply.

**Blocks** — `TEXT` (the additive-error mechanism) · `SIM` (sum of k
uniform errors; k slider — the bell emerges) · `TEXT` (what the
demonstration does and does not prove) · `CALLOUT` WARNING (this is *not* a
proof of the CLT, which is module 14; it is a mechanism intuition) ·
`TEXT` (when the mechanism fails: one dominant error source, multiplicative
errors, bounded quantities).

**Note.** Added during blueprint (not in 1A's 10-lesson sketch). Without
it, "Gaussian" is a shape the learner recognizes rather than a mechanism
they can argue for or against — which makes the module's terminal objective
unreachable. This lesson is what makes `is-gaussian-defensible` an argument
rather than an opinion.

---

### M3.3 · `gaussian-intuition` — 14 min

**Objectives** — Interpret μ and σ visually before seeing the formula;
predict the shape change from a parameter change.

**Blocks** — `SIM` (μ and σ sliders; **no formula anywhere in the lesson**)
· `TEXT` (what μ does; what σ does) · `IMAGE` (three σ values overlaid) ·
`EXERCISE` GUIDED (predict-then-check with the slider).

---

### M3.4 · `gaussian-theory` — 20 min

**Objectives** — State the Gaussian PDF; identify each term's role; state
the CDF has no closed form and what follows from that.

**Blocks** — `TEXT` (the formula, now that the shape is familiar) ·
`IMAGE` (annotated formula: normalizing constant, exponent, μ, σ) ·
`SIM[static]` (PDF and CDF) · `TEXT` (no closed-form CDF; numerical
evaluation and why tables/`erf` exist) · `CALLOUT` INFO (units of the
density) · `EXERCISE`.

---

### M3.5 · `standard-normal-and-z-scores` — 20 min

**Objectives** — Compute a z-score; standardize a measurement; apply
68–95–99.7 to a tolerance question.

**Blocks** — `TEXT` · `SIM` (standardization: raw axis and z axis side by
side) · `TEXT` (68–95–99.7) · `IMAGE` (the three shaded bands) · `TEXT`
(robotics application: "is a 2.11 m reading against μ̂=2.00, σ̂=0.02
suspicious?") · `EXERCISE` GUIDED · `CALLOUT` WARNING (the rule assumes
Gaussian — using it to *test* Gaussianity is circular).

---

### M3.6 · `gaussian-explore` — 20 min

**Objectives** — Generate Gaussian samples in Python; compare a sampled
histogram against the theoretical PDF; quantify the mismatch at several n.

**Blocks** — `SIM` (full: μ, σ, n; histogram + PDF overlay + CDF + summary)
· `CODE` python (`np.random.default_rng().normal`, seeded) · `CODE` python
(histogram + PDF overlay via `statsrobotics.figures`) · `FILE`
(`gaussian_explore.py`) · `TEXT` (theoretical vs sampled statistics) ·
`EXERCISE`.

**Note.** The Python must be **seeded and reproducible** — the lesson
quotes specific numbers, and they must match on the learner's machine
(spec §47).

---

### M3.7 · `sampling-variability` — 18 min

**Objectives** — Distinguish theoretical from simulated distributions;
predict how σ̂'s stability scales with n; state what "the sample is too
small" means quantitatively.

**Blocks** — `TEXT` · `SIM` (resample at fixed n; μ̂ and σ̂ jump) · `SIM`
(n slider; jumpiness shrinks) · `TEXT` (standard error, informally — the
formal treatment is module 14) · `CALLOUT` TIP (why the lab collects 5,000)
· `EXERCISE`.

---

### M3.8 · `lidar-noise-lab` — 30 min  ★ FLAGSHIP LAB

**Objectives** — Execute LAB 2; collect ≥1,000 range readings of a static
target; record complete provenance.

**Blocks** — `CALLOUT` INFO (the experimental question, restated as
falsifiable) · `IMAGE` (setup geometry, dimensioned) · `CODE` python (the
`stats_robot_lab` collector node) · `LAB` (LAB 2 — all 15 sections) ·
`CALLOUT` WARNING (validation banner: `THEORETICALLY_DESIGNED`) · `FILE`
(collector node download) · `TEXT` (what to record before analysing).

**Cross-references (1A §21)** — bring-up, udev rules, baud rate and driver
debugging are **not re-taught**; the lab links to `rplidar-a2-ubuntu-setup`,
`rplidar-a2-ros2-integration` and `rplidar-a2-debugging`, and starts from a
working `/scan`.

**Dependencies** — risks 1 and 2 both.
`simulationFallbackLessonSlug: "gaussian-explore"`.

---

### M3.9 · `analyzing-real-lidar-data` — 26 min

**Objectives** — Compute μ̂ and σ̂ from real data; construct and read an
empirical CDF and a Q-Q plot; identify at least two specific deviations
from the Gaussian model.

**Blocks** — `DATA` (recorded LiDAR wall dataset — `HISTOGRAM`,
`SUMMARY_STATS`; overlay `GAUSSIAN` / `FITTED_FROM_DATA`) · `TEXT` (what
the histogram alone can and cannot tell you) · `DATA` (same dataset —
`ECDF`) · `TEXT` (reading an eCDF against a theoretical CDF) · `DATA` (same
dataset — `QQ_PLOT`) · `TEXT` (**reading the tails** — where the
information is) · `CALLOUT` WARNING (the quantization staircase is the
sensor's resolution, not a modelling failure — the payoff of M1.2) ·
`EXERCISE`.

**Note.** Three `DATA` blocks over **one** dataset row. This is exactly the
reuse the many-to-one `datasetId` FK exists for (1A §18.1).

**Dependencies** — dataset `rplidar-wall-2m-5000`; risk 1.

---

### M3.10 · `outliers-and-robustness` — 20 min

**Objectives** — Distinguish an outlier from noise; quantify the mean's
sensitivity versus the median's; state three physical mechanisms that
produce genuine outliers.

**Blocks** — `TEXT` · `SIM` (inject outliers; watch x̄ move and the median
hold) · `DATA` (the real dataset, outliers highlighted) · `TEXT`
(mechanisms: multipath, specular reflection, edge returns, dropped
packets) · **`CALLOUT` WARNING — an outlier is not automatically bad data**
(spec §26; it may be the most informative reading in the set) · `CODE`
python (robust statistics) · `EXERCISE`.

---

### M3.11 · `is-gaussian-defensible` — 22 min

**Objectives** — Assemble the evidence from M3.9 and M3.10 into an argued
position; state the assumptions the model requires; state what the model
does not explain.

**Blocks** — `TEXT` (the question restated: not "does it fit" but "is the
claim warranted") · `DATA` (`experiment-comparison` view: theory vs
simulation vs reality side by side, spec §59) · `TEXT` (assumptions:
additive, symmetric, stationary, independent) · `TEXT` (evidence for) ·
`TEXT` (evidence against) · `CALLOUT` INFO (a defensible answer names its
own limits) · `EXERCISE` INDEPENDENT (write the argument) · `CALLOUT` TIP
(reflection).

**Note.** This is the module's terminal lesson and the course's
intellectual centre. It must reach a **qualified** conclusion — neither
"yes, LiDAR noise is Gaussian" nor a refusal to conclude. Spec §63.

---

### M3.12 · `gaussian-checkpoint` — 16 min

**Blocks** — `QUIZ` (12 questions) · closing `CALLOUT`.

**Quiz composition** — 2 conceptual, 3 visual (read a histogram, an eCDF
and a Q-Q plot), **3 `NUMERIC`** (z-score, a 68–95–99.7 proportion, σ̂
from a small sample), 2 robotics interpretation, 1 model selection, 1
debugging ("several extreme readings appeared — what do you investigate?").

---

## M4 — EXPONENTIAL DISTRIBUTION · *WHEN*
`position: 800` · 8 lessons · ~140 min

**Module objective.** Convert an event log into inter-arrival times,
estimate λ̂, and evaluate whether the exponential model is defensible —
including recognizing when it is not.

---

### M4.1 · `when-will-the-next-event-happen` — 12 min

**Blocks** — `CALLOUT` INFO (hook) · `TEXT` (events vs measurements — the
M3/M4 distinction) · `IMAGE` (event timeline with Δt annotated) · `TEXT`
(robot examples) · `CALLOUT` TIP (WHERE / HOW / WHEN, third position).

---

### M4.2 · `waiting-times-from-event-logs` — 16 min

**Objectives** — Convert timestamps to inter-arrival times; explain why Δt,
not the timestamps, is the random variable of interest.

**Blocks** — `TEXT` · `IMAGE` (timestamps → differences) · `CODE` python
(the conversion) · `DATA` (event dataset, `TIME_SERIES` view) · `TEXT`
(what the series looks like before any model) · `EXERCISE`.

**Note.** Added during blueprint. In 1A this was folded into
`exponential-theory`; separating it keeps the *data transformation* (which
learners get wrong) distinct from the *model*.

---

### M4.3 · `exponential-theory` — 18 min

**Objectives** — State the exponential PDF and CDF; state E[T] = 1/λ;
explain why the density is highest at t = 0.

**Blocks** — `TEXT` (intuition) · `SIM[static]` (PDF and CDF) · `TEXT` (the
formula) · `CALLOUT` INFO (**the counter-intuitive part**: the most likely
waiting time is near zero, yet the mean is 1/λ) · `TEXT` (λ and E[T] as
reciprocal views) · `EXERCISE`.

---

### M4.4 · `memorylessness` — 18 min

**Objectives** — State the memoryless property; test it against intuition;
name a robot process that violates it.

**Blocks** — `TEXT` · `SIM` (conditional waiting time given elapsed time —
the distribution does not shift) · `CALLOUT` WARNING (this is a strong
assumption and is frequently false in robotics) · `TEXT` (violations: a
periodic sweep, a dead time after each detection, a battery that ages) ·
`EXERCISE`.

---

### M4.5 · `exponential-explore` — 18 min

**Blocks** — `SIM` (full: λ, n) · `CODE` python (inverse-CDF sampling, and
why it is the natural method here) · `CODE` python (histogram + PDF
overlay) · `FILE` (`exponential_explore.py`) · `TEXT` (λ̂ = 1/x̄ and why) ·
`EXERCISE`.

---

### M4.6 · `event-timing-lab` — 24 min

**Blocks** — `CALLOUT` INFO (the question) · `IMAGE` (setup) · `CODE`
python (event-detection collector) · `LAB` (LAB 3 — all 15 sections) ·
`CALLOUT` WARNING (validation banner) · `FILE`.

**Open design question** — the event source (1A §22, item 5). A patrolling
robot produces *periodic* encounters; the lab is designed around
externally-caused crossings. **If the assumption still fails, M4.7 is where
that becomes the lesson.**

`simulationFallbackLessonSlug: "exponential-explore"`.

---

### M4.7 · `analyzing-waiting-times` — 20 min

**Blocks** — `DATA` (Δt dataset — `HISTOGRAM`, `SUMMARY_STATS`; overlay
`EXPONENTIAL` / `FITTED_FROM_DATA`) · `TEXT` (λ̂ from the data) · `DATA`
(same dataset — `ECDF`) · `TEXT` (reading the fit) · `DATA` (same dataset —
`QQ_PLOT` against exponential quantiles) · `TEXT` (interpretation) ·
`EXERCISE`.

**Dependencies** — dataset `robot-event-timestamps`; risk 1.

---

### M4.8 · `when-exponential-fails` + checkpoint — 14 min

**Objectives** — Name three assumption violations and their visible
signatures; state what to model instead when the exponential fails.

**Blocks** — `TEXT` (independence, constant rate, memorylessness) ·
`IMAGE` (what a violated assumption looks like in a histogram) · `TEXT`
(bursty arrivals; periodic triggers; dead time) · `CALLOUT` INFO (a model
that fails honestly is a result, not a failed lesson) · `QUIZ` (10
questions) · `EXERCISE` INDEPENDENT (challenge) · closing `CALLOUT`.

**Quiz composition** — 3 conceptual, 2 visual, 2 `NUMERIC` (λ̂ from x̄;
P(T > t) from the CDF), 2 model selection, 1 debugging.

**Note.** This lesson is **mandatory, not optional.** It is the module's
scientific integrity check (spec §63) and the required counterweight to
three modules in which the models mostly worked.

---

## M5 — THREE WAYS TO BE RANDOM
`position: 850` · 3 lessons · ~45 min

---

### M5.1 · `where-how-when` — 14 min

**Blocks** — `TEXT` (the unifying frame) · `IMAGE` (the three-question
diagram) · `TEXT` (mechanism, not shape, selects the model) · `CALLOUT` TIP
(the comparison table from 1A §5, rendered) · `EXERCISE`.

---

### M5.2 · `side-by-side` — 16 min

**Blocks** — `SIM` ×3 (uniform, Gaussian, exponential — **shared `xDomain`,
one control bar**) · `TEXT` (what shared axes reveal that separate figures
hide) · `EXERCISE`.

**Note.** The shared `xDomain` is why that field exists on the block schema
(1A §18.2). Three independently auto-scaled figures would defeat the
lesson.

---

### M5.3 · `choosing-a-model` — 15 min

**Blocks** — `TEXT` (model selection as reasoning) · `DATA` (an
**unlabelled** dataset — the learner classifies before revealing) ·
`TEXT` (how to decide from mechanism) · `CALLOUT` WARNING (spec §57: no
decision tree determines the correct distribution automatically) ·
`EXERCISE` INDEPENDENT.

---

## M6 — MINI-CAPSTONE: THREE WAYS IN MY ROBOT
`position: 875` · 2 lessons · 90+ min

---

### M6.1 · `capstone-brief` — 20 min

**Blocks** — `TEXT` (the brief) · `DATA` ×3 (the three datasets, **all
unlabelled**, `TABLE_PREVIEW` only — no overlays, no fitted curves) ·
`TEXT` (the seven required questions) · `TEXT` (submission format and
rubric) · `CALLOUT` TIP (a defensible "this model does not fit" earns full
marks).

---

### M6.2 · `capstone-submission` — 70+ min

**Blocks** — `EXERCISE` (submission-backed; the first real use of
`ExerciseSubmission`) · `CALLOUT` INFO (what happens after submission).

**Submission shape (approved scope, 1A §15)** — structured text/JSON:
per-dataset classification, distribution choice with justification,
estimated parameters, evaluation notes, stated assumptions, stated
limitations, plus a link to the learner's own repository or notebook.
`evaluationMethod: HUMAN_REVIEWED`. **No file upload** — deferred with §32.

---

## SEQUENCING FOR IMPLEMENTATION

| Order | Build | Why here |
| --- | --- | --- |
| 1 | M2 (`uniform-*`) | Simplest mathematics; first full vertical slice; proves `SIM` + `DATA` + `LAB` end to end |
| 2 | M1 (`foundations`) | Written *after* M2 so its examples are drawn from a module that already exists rather than guessed at |
| 3 | M3 (`gaussian-*`) | Flagship; needs M1's vocabulary settled and risk 1 resolved |
| 4 | M4 (`exponential-*`) | Reuses M3's goodness-of-fit machinery |
| 5 | M0 | Written last: an introduction should promise what the course actually delivers |
| 6 | M5, M6 | Synthesis; requires all three modules to exist |

**M0 last is deliberate.** An introduction authored before its course
promises what the author intended rather than what was built.

---

## OPEN ITEMS CARRIED FROM PHASE 1A

| # | Item | Blocks in this blueprint |
| --- | --- | --- |
| 1 | Recorded datasets do not exist | M2.6, M3.9, M4.7, M6.1 |
| 2 | LiDAR model unconfirmed | M3.8, M4.6 |
| 5 | Lab 3 event source undecided | M4.6, M4.7 |

Every other lesson in this blueprint — **32 of 41** — is authorable with no
open item resolved.
