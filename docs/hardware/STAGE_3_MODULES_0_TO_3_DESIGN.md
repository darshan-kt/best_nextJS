# Stage 3 — Foundation Modules Design (Modules 0–3)

Per `HARDWARE_COURSE_KICKOFF_PROMPTS.md` Stage 3, built from the approved
`docs/hardware/STAGE_2_PHASE_1_RESEARCH_AND_ARCHITECTURE.md`. Design output
only — no LMS writes.

**Why these four modules matter more than their module number suggests.**
With only two devices in the launch catalog, Modules 0–3 are not a preamble
— they are most of the course's actual instructional content at launch, and
every future device module (5, 6, 7...) plugs into the mental models built
here rather than re-teaching them. Module 3 in particular is written to be
device-agnostic enough that device 3's arrival requires zero rewriting —
only a new worked example.

**Format note.** This follows the per-lesson design convention already
established in `docs/course-design/module-1-design.md` /
`module-2-design.md` for the ROS 2 Fundamentals course: objective, concepts,
numbered content-block sequence, visual requirements, video note, exercise,
quiz (module-level, placed at the end of the module's final lesson), recap,
connection to next. `SPEC_TABLE`/`DEVICE_CARD` blocks are used wherever a
lesson references a specific device record, reusing Stage 1's schema rather
than restating spec text as prose.

**Visual-asset status check, done before writing this doc.** `public/hardware/`
currently contains exactly one generated asset:
`rplidar-a2-data-pipeline.svg` (a six-stage Hardware→Driver→Node→Topic→
Message→Visualization diagram, already wired into the Stage 1 schema-
validation fixture lesson at `robotics-hardware-and-sensors` /
`rplidar-a2-overview`). No product or RViz2 photography has landed —
`docs/hardware/PHOTOGRAPHY_CHECKLIST.md` is still unexecuted. Every visual
entry below states its status against this actual, checked state, not an
assumption.

---

## Table of Contents

- [Module 0 — Course Onboarding](#module-0--course-onboarding)
- [Module 1 — Robotics Hardware Fundamentals](#module-1--robotics-hardware-fundamentals)
- [Module 2 — Understanding Robotic Sensors](#module-2--understanding-robotic-sensors)
- [Module 3 — Hardware-to-ROS-2 Data Pipeline](#module-3--hardware-to-ros-2-data-pipeline)
- [Cross-Module Notes](#cross-module-notes)

---

# MODULE 0 — Course Onboarding

## Learning objectives

By the end of this module, the learner can:

- State what this course does and does not cover (real hardware only, no
  simulation fallback, two devices at launch).
- Confirm their machine meets the prerequisite (Ubuntu 24.04 + ROS 2 Jazzy
  already installed).
- Recite the hardware safety rules specific to a spinning laser scanner and
  a structured-light camera.
- List the exact BOM and its approximate cost, including the Astra Pro's
  real acquisition difficulty.
- Explain, in their own words, why a USB port's power budget — not just its
  data connection — is a real cause of "device not detected," using both
  launch devices' actual current-draw facts.
- Describe how this course's debugging-exercise and quiz format works
  before encountering it for real.

## Lesson breakdown

### Lesson 1 — Welcome, Prerequisites & What You'll Build

**Objective:** Understand the course's scope and confirm the one hard
prerequisite before investing in hardware.

**Concepts covered:** Course purpose; real-hardware-only policy; ROS 2
Jazzy / Ubuntu 24.04 as the fixed platform; the capstone preview.

**Content block sequence:**
1. **TEXT** — course framing: this course teaches evaluating, setting up,
   integrating, and debugging *real* robotics hardware — not a simulation
   or theory course.
2. **CALLOUT** (WARNING) — hard prerequisite, stated before anything else:
   "This course assumes Ubuntu 24.04 with ROS 2 Jazzy already installed and
   working (e.g. from the ROS 2 Fundamentals course's Module 3). Nothing
   here re-teaches that installation — if `ros2 topic list` doesn't run on
   your machine right now, stop and complete that first."
3. **TEXT** — the two launch devices, one line each, honestly framed: an
   actively-maintained LiDAR and a legacy-but-teachable depth camera — "you
   will learn to evaluate hardware support, not just follow steps for
   hardware that already works perfectly."
4. **IMAGE** — capstone preview diagram (see Visual requirements).
5. **TEXT** — roadmap: Modules 0–3 build the mental models; Modules 4–5
   apply them to two real devices; the capstone combines both.

**Visual requirements:**
- **Purpose:** show the learner where the course is headed before asking
  for any commitment · **Concept:** the dual-sensor capstone from the
  approved architecture doc §2/§10 · **Format:** simple two-branch flow
  diagram (Astra Pro → RGB+Depth; RPLIDAR → LaserScan; both → Perception) ·
  **Status: not yet generated** — new SVG, same technique as
  `rplidar-a2-data-pipeline.svg` · **What the learner should understand:**
  both devices ultimately feed one combined perception picture, which is
  why the course teaches them together.

**Video:** None. Course-orientation content is course-specific; no external
video can substitute for stating this course's own scope and prerequisite.

**Exercise:** None — orientation only, nothing to practice yet.

**Quiz:** None at the lesson level (module quiz lands at the end of
Lesson 5).

---

### Lesson 2 — Hardware Safety

**Objective:** Understand the real, specific safety considerations for
these two devices — not generic "be careful with electronics" advice.

**Concepts covered:** Laser safety classification; ESD (electrostatic
discharge) basics; safe handling of exposed connectors and lenses; power
sequencing.

**Content block sequence:**
1. **TEXT** — the RPLIDAR's laser is **Class 1** per its own datasheet
   (`STAGE_2_PHASE_1_RESEARCH_AND_ARCHITECTURE.md` §7 spec table) —
   explain concretely what Class 1 means (safe under normal operating
   conditions, including direct viewing) so the learner isn't left
   guessing whether this is a hazard, while still not treating "Class 1"
   as a license for carelessness (don't stare into any laser source at
   close range as a matter of general practice).
2. **CALLOUT** (WARNING) — ESD: both devices have exposed circuit boards
   near their connectors; discharge static (touch a grounded metal object)
   before handling either unit, especially in dry conditions.
3. **TEXT** — safe handling specifics: the RPLIDAR's rotating head should
   never be forced or held stationary while powered; the Astra Pro's
   depth-sensing emitter and lenses should not be touched directly —
   fingerprints/dust degrade the structured-light pattern this course
   later teaches the learner to reason about.
4. **CALLOUT** (DANGER) — power sequencing: never hot-plug/unplug USB
   while `colcon build` or a driver process is actively writing to the
   device — matches the general USB safety practice, called out here
   because Module 0 is the only place it fits before any setup work
   begins.
5. **TEXT** — bridge: "None of this is exotic — these are consumer-grade
   devices — but robotics hardware safety habits should start now, not
   after the first mistake."

**Visual requirements:**
- **Purpose:** make the laser-safety classification concrete, not abstract
  · **Concept:** Class 1 laser safety · **Format:** small annotated icon/
  label diagram (laser class symbol + "safe under normal operating
  conditions" caption) · **Status: not yet generated** · **What the
  learner should understand:** "Class 1" is a real, checkable safety
  rating, not a marketing claim.

**Video:** None — safety content specific to these two exact devices; a
generic "laser safety" video would drift from the Class-1-specific claim
being taught.

**Exercise:** None — safety content is read-and-retain, not practiced.

**Quiz:** None at lesson level.

---

### Lesson 3 — The Bill of Materials: What This Course Costs You

**Objective:** Know the exact BOM and the real cost range before buying
anything, including the Astra Pro's acquisition risk.

**Concepts covered:** BOM; approximate total cost; the Astra Pro's
discontinued-on-official-channels status as a real purchasing constraint.

**Content block sequence:**
1. **TEXT** — direct statement, no hedging: "This course requires two real
   devices, a powered USB hub, and a native Ubuntu 24.04 machine. Approximate
   total: **$265–$545**." (Sourced directly from the approved Practical Lab
   Strategy, §9 of the architecture doc.)
2. **TABLE-equivalent TEXT** (rendered as a markdown table inside a TEXT
   block, matching how other courses present reference tables) — the full
   BOM: RPLIDAR A2 ($150–$320, confirm exact sub-model before buying),
   Orbbec Astra Pro ($100–$200, secondhand only), powered USB hub
   ($15–$25), cables (included with devices, or a USB-C hub if the
   learner's machine lacks full-size USB-A ports).
3. **CALLOUT** (WARNING) — the Astra Pro specifically: "Orbbec no longer
   sells this exact model new — its own product page returns a 404 as of
   this course's own research. You will be buying secondhand or from a
   reseller's remaining stock. Budget extra time for sourcing, not just
   extra money."
4. **TEXT** — what's deliberately *not* required: no robot chassis, no
   motor controller — this course teaches sensor data, not building a
   physical robot platform.
5. **DEVICE_CARD** ×2 (`rplidar-a2`, `orbbec-astra-pro`) — the two devices'
   quick-reference cards, giving the learner a first concrete look at what
   they're buying, reusing Stage 1's shipped block type rather than
   describing them in prose here.

**Visual requirements:**
- No new diagram needed — the `DEVICE_CARD` blocks and the BOM table serve
  this lesson's visual need. Product hero photography (real, not generated,
  per the VISUAL STANDARD) belongs to each device's own `DEVICE_CARD` once
  `PHOTOGRAPHY_CHECKLIST.md` is executed — currently still the Stage 1
  placeholder icon, which is correctly *not* hidden or faked here.

**Video:** None — purchasing guidance is course-specific and time-sensitive
(prices/availability change); a video would go stale faster than this text.

**Exercise:** **GUIDED** — "Build Your Own Sourcing Checklist." Goal: before
buying, the learner records (a) which RPLIDAR A2 sub-model they're
targeting and why, (b) at least one Astra Pro source they've identified and
its listed condition (new/refurb/used), (c) confirmation their machine has
enough free USB ports or a plan to use the hub. Steps guide them through
each of the three checks explicitly. This is a real, low-stakes exercise
that doesn't require owning hardware yet — it's the actual first practical
step of the course.

**Quiz:** None at lesson level.

---

### Lesson 4 — USB Fundamentals: Power Budgets and the "Device Not Detected" Failure Mode

**Objective:** Understand that a USB port carries both data and power, that
power delivery has a real budget, and be able to explain — using this
course's own two devices' real current-draw facts — why exceeding that
budget is a leading, specific cause of "device not detected," not a vague
catch-all excuse.

**Concepts covered:** USB as a combined data+power interface; bus power
budgets; the specific power facts behind both launch devices; why a powered
hub is part of the BOM, not an optional extra.

**Content block sequence:**
1. **TEXT** — USB carries power and data over the same connector; every
   port has a real power budget (often ~500 mA–900 mA per port on a
   standard laptop USB port, shared further if downstream of an unpowered
   hub), and every plugged-in device draws against it.
2. **TEXT**, grounded in real numbers — "Neither of this course's two
   devices is power-trivial." The RPLIDAR A2's motor alone draws a
   **continuous 450–600 mA** (`STAGE_2_PHASE_1_RESEARCH_AND_ARCHITECTURE.md`
   §7 spec table, sourced from Slamtec's own datasheet). The Astra Pro
   draws power across **two simultaneous USB identities** from one
   housing — the depth engine and the RGB camera enumerate and power up
   independently (§6, confirmed from two independent sources in the Stage 0
   findings). Running both devices on unpowered ports at once is a real,
   specific way to exceed a laptop's power budget, not a hypothetical.
3. **IMAGE** — power-budget diagram (see Visual requirements).
4. **TEXT** — the diagnostic signature to recognize: a device that
   enumerates *intermittently*, drops out only when a second device is also
   plugged in, or a camera stream that stutters/drops while a LiDAR spins
   nearby — these are power symptoms, not driver bugs, and this course
   teaches the learner to check power *before* touching software (this is
   the first rung of the diagnostic ladder Module 3/every device module
   reuses — see §18 of the design doc).
5. **CALLOUT** (TIP) — this is exactly why the BOM (Lesson 3) includes a
   powered USB hub, not as a nice-to-have: it supplies its own power
   source, not just the host's limited budget.
6. **TEXT** — bridge to Lesson 5: now that the learner knows what to watch
   for physically, the last piece is how this course's own debugging and
   assessment format works.

**Visual requirements:**
- **Purpose:** make "the port has a power budget, and it can run out" a
  concrete, checkable idea rather than folklore · **Concept:** USB power
  budget vs. two real devices' draw · **Format:** a simple budget-bar
  diagram — one bar representing a typical unpowered port's budget, with
  the RPLIDAR's ~450–600 mA and the Astra Pro's two-identity draw stacked
  against it, visually approaching or exceeding the bar · **Status: not
  yet generated** — new SVG · **What the learner should understand:**
  this isn't abstract — these two specific devices, together, are a
  realistic way to hit a real limit.

**Video:** None — the diagram plus the two devices' own cited numbers carry
this lesson; a generic "USB explained" video wouldn't connect to this
course's specific devices.

**Exercise:** **GUIDED** — "Read Your Own USB Bus." Goal: on the learner's
own machine, right now, before either device is owned: run `lsusb` and
`dmesg | tail` after plugging in *any* USB device already on hand (a mouse,
a flash drive), and identify its vendor:product ID pair in the output. This
doesn't require the course's own hardware — it's a real, immediately
practicable skill (reading `lsusb`/`dmesg` output) that both Module 3 and
every future device module reuse directly, so building the habit here costs
nothing and pays off repeatedly.

**Quiz:** None at lesson level (module quiz is Lesson 5).

---

### Lesson 5 — How the Hardware Lab Works

**Objective:** Know what to expect from this course's practical and
assessment format before hitting it for real.

**Concepts covered:** Real-hardware-only policy (no simulation fallback);
the progressive-hint debugging-exercise format; how quizzes are structured
(scenario/diagnostic, not pure recall).

**Content block sequence:**
1. **TEXT** — restated plainly: this course has no simulation or rosbag-
   replay fallback track. Every hands-on exercise from Module 4 onward
   assumes the learner has the real device in hand.
2. **TEXT** — the debugging-exercise format: a broken scenario is
   presented, hints are revealed one at a time on request, and the full
   solution (plus, often, a deeper root-cause explanation) only appears
   after — never immediately. This is the same format used throughout the
   ROS 2 Fundamentals course.
3. **TEXT** — the quiz format: questions test diagnosis and decision-
   making using this course's own real devices and numbers, not abstract
   recall — "expect questions shaped like 'given this real symptom, what do
   you check next,' not 'define resolution.'"
4. **CALLOUT** (INFO) — "You already did a real diagnostic exercise in
   Lesson 4 without realizing it — reading `lsusb`/`dmesg` output is
   exactly the skill this format is built around."
5. **QUIZ** — the module's quiz (below).

**Visual requirements:** None needed — this lesson is process explanation,
not a new concept requiring a diagram.

**Video:** None.

**Exercise:** None at lesson level — Lesson 4 already carried this
module's practical exercise.

**Module 0 Quiz** (scenario/diagnostic-weighted, per §25):

1. *Scenario, single choice:* "You've found an Astra Pro listed by a
   reseller for $90, with no manufacturer support page. Before buying, what
   should you check first?" → **Whether a working Jazzy driver path exists
   and its confidence level (this course's own findings rate it MEDIUM via
   a community fork) — not just the price.** *Explanation: evaluating
   driver support before buying is a real robotics-engineering skill this
   course teaches directly, not an afterthought.*
2. *Multiple choice:* "Which of these are part of this course's exact BOM?
   Select all that apply." → **RPLIDAR A2; Orbbec Astra Pro; powered USB
   hub.** *(Distractor: "a robot chassis" — explicitly out of scope, per
   the architecture doc's own note that this course teaches sensor data,
   not a physical robot platform.)*
3. *Scenario, single choice:* "You plug both devices into your laptop's
   built-in ports with no hub, and the Astra Pro's depth stream keeps
   cutting out whenever the RPLIDAR is also running. What's the most likely
   cause?" → **Combined power draw exceeding the port/bus power budget.**
   *Explanation: the RPLIDAR's continuous 450–600 mA motor draw plus the
   Astra Pro's two simultaneous USB identities is a realistic way to exceed
   an unpowered port's budget — exactly why the BOM includes a powered
   hub.*
4. *True/False:* "The Orbbec Astra Pro can currently be purchased new,
   directly from Orbbec's own store." → **False.** *Explanation: Orbbec's
   own product page for this exact model returns a 404 — confirmed
   directly during this course's own research, not assumed.*

**Recap:** The learner now knows what this course requires (hardware,
budget, safety), why USB power specifically is a real failure mode for
*these* devices, and how the course's own teaching format works.

**Connection to Module 1:** "You know what the two devices cost and how to
handle them safely. Module 1 zooms out: where do these two devices — and
every future one — actually fit inside a robot's overall hardware
architecture?"

---

# MODULE 1 — Robotics Hardware Fundamentals

## Learning objectives

By the end of this module, the learner can:

- Decompose any robot into its five core hardware concerns: sensors,
  actuators, computation, communication, power.
- Correctly classify a given piece of hardware (including both launch
  devices) into the concern(s) it belongs to.
- Explain, at a high level, how physical hardware connects to ROS 2 —
  setting up Module 3's detailed pipeline.

## Lesson breakdown

### Lesson 1 — What Makes Up a Robot?

**Objective:** Internalize the five-part decomposition (sensors,
actuators, computation, communication, power) as the lens for every device
this course — and any future one — will be examined through.

**Concepts covered:** Sensors; actuators; controllers; computers;
communication; power systems.

**Content block sequence:**
1. **TEXT** — hook: "Before looking at any specific sensor, it helps to see
   the whole robot it plugs into."
2. **IMAGE** — the ROBOT decomposition tree (see Visual requirements).
3. **TEXT** — walk each branch with one concrete, general example each
   (not yet this course's own devices — that's the next lesson):
   sensors = "anything that measures the world"; actuators = "anything
   that acts on the world"; computation = "where decisions get made";
   communication = "how the pieces talk to each other"; power = "what
   keeps everything running."
4. **CALLOUT** (INFO) — cross-course callback: "If you've taken the ROS 2
   Fundamentals course, 'communication' here is the same concept as 'the
   graph' — nodes are how software pieces talk; this module is about the
   *hardware* underneath that."
5. **TEXT** — bridge to Lesson 2: "Where do this course's own two devices
   fit? Both are sensors — but that single word hides real differences
   worth naming precisely."

**Visual requirements:**
- **Purpose:** establish the five-branch decomposition as the course's
  standing mental model · **Concept:** ROBOT → sensors/actuators/
  computation/communication/power (design doc §22) · **Format:** radial/
  tree diagram, one robot icon at center, five labeled branches ·
  **Status: not yet generated** — new SVG, same technique as the ROS 2
  course's own diagrams · **What the learner should understand:** every
  piece of hardware this course ever covers fits into one (or more) of
  exactly these five categories — a durable classification tool, not
  trivia.

**Video:** None — general robotics-architecture orientation, not yet
device- or ROS-2-specific enough to warrant curated video research at this
stage (per the Video Resource Strategy's own scoping in the architecture
doc §12, which targets device- and pipeline-specific searches).

**Exercise:** None — Lesson 3 carries this module's exercise, after both
launch devices have been introduced as classification examples.

**Quiz:** None at lesson level (module quiz lands at the end of Lesson 3).

---

### Lesson 2 — Sensors and Actuators: Reading the World vs. Acting on It

**Objective:** Distinguish sensors from actuators precisely, and place both
of this course's launch devices correctly (both are sensors — but of
different kinds).

**Concepts covered:** Sensors vs. actuators; the fact that a "device" can
combine multiple sensing modalities in one housing.

**Content block sequence:**
1. **TEXT** — the core distinction: a sensor turns the physical world into
   data; an actuator turns data (a decision) into physical motion or
   action. Neither this course's RPLIDAR nor its Astra Pro is an actuator
   — both are sensors, which already tells the learner something about
   this course's own scope.
2. **TEXT** — naming the two launch devices as sensor *types*, not yet
   their specs: the RPLIDAR is a **ranging** sensor (measures distance); the
   Astra Pro is a **combined imaging + ranging** sensor (color video *and*
   depth, from two genuinely separate sensing paths in one housing — a fact
   Module 2/3 will ground in real numbers).
3. **DEVICE_CARD** ×2 — first real look at both devices in this module,
   reusing the shipped block rather than re-describing them.
4. **TEXT** — one concrete actuator counter-example (a drive motor) purely
   for contrast, since this course teaches no actuators directly — "you
   won't set up a motor in this course, but recognizing the difference
   matters when you read about a robot that has both."
5. **CALLOUT** (TIP) — "A single physical device can straddle categories —
   the Astra Pro alone produces two different kinds of sensor data. Don't
   assume 'one housing' means 'one sensor.'" (Direct forward-reference to
   the dual-USB-identity fact Module 2 grounds concretely.)

**Visual requirements:** None new — the `DEVICE_CARD` blocks serve this
lesson's visual need; a dedicated sensor-vs-actuator diagram isn't
justified for a distinction this lesson's text already makes concrete with
real devices.

**Video:** None — same scoping reasoning as Lesson 1.

**Exercise:** None — Lesson 3 carries the module's exercise once
computation/communication/power are also introduced.

**Quiz:** None at lesson level.

---

### Lesson 3 — Computation, Communication & Power: The Systems Around the Sensors

**Objective:** Understand where the learner's own Ubuntu/ROS 2 machine,
USB, and power all fit in the five-branch model, tying directly back to
Module 0's power lesson.

**Concepts covered:** Computation (the ROS 2 host machine); communication
(USB/serial as the physical communication layer, distinct from ROS 2's own
node-to-node communication); power (recap, now placed in the full model).

**Content block sequence:**
1. **TEXT** — the learner's own Ubuntu 24.04 machine running ROS 2 Jazzy
   *is* the "computation" branch for this course — nothing exotic, but
   worth naming explicitly.
2. **TEXT** — communication has two layers this course cares about: the
   physical layer (USB/serial, moving raw bytes between a device and the
   host — Module 0's subject) and the ROS 2 layer (nodes publishing/
   subscribing to topics — Module 3's subject). Naming both now prevents
   conflating them later.
3. **IMAGE** — the same ROBOT decomposition diagram from Lesson 1, now with
   this course's own concrete instances filled into each branch (sensors:
   RPLIDAR + Astra Pro; computation: the learner's Ubuntu/ROS 2 machine;
   communication: USB + ROS 2 topics; power: the port budget from Module
   0).
4. **TEXT** — power, recapped in context: "Module 0 showed you *why* power
   matters with real numbers. Here's *where* it sits in the whole picture —
   it isn't a side concern, it's one of the five branches every robot
   needs."
5. **TEXT** — closing bridge: "You now have the full five-branch picture,
   with this course's own two devices already placed inside it. Module 2
   goes deeper into what makes a sensor good or bad at its job."
6. **QUIZ** — the module's quiz (below).

**Visual requirements:**
- **Purpose:** show the abstract five-branch model populated with this
  course's own real, concrete instances · **Concept:** same as Lesson 1's
  diagram, filled in · **Format:** the Lesson 1 diagram, reused with
  device-specific labels added to each branch (not a new diagram — an
  annotated variant) · **Status: not yet generated**, but explicitly noted
  as a *variant* of Lesson 1's diagram rather than a wholly separate asset,
  to keep the visual vocabulary consistent across the module.

**Video:** None.

**Exercise:** **INDEPENDENT** — "Classify the Hardware." Goal: given a short
list of hardware (RPLIDAR A2, Astra Pro, a drive motor, the learner's own
Ubuntu PC, a USB cable, a battery pack), classify each into one or more of
the five branches, with a one-sentence justification each. Success
criteria: correctly places both launch devices as sensors (not actuators);
correctly identifies the drive motor as an actuator; correctly places the
Ubuntu PC as computation and the USB cable as communication. Hints
available since some items (e.g. "is a USB cable communication or power?" —
it's genuinely both) are intentionally a little ambiguous, rewarding
reasoning over memorization.

**Module 1 Quiz** (scenario-weighted, per §25):

1. *Single choice:* "A robot's onboard computer, running Ubuntu and ROS 2,
   belongs to which branch of the five-part model?" → **Computation.**
2. *Scenario, single choice:* "The RPLIDAR's motor draws power continuously
   even while the robot itself is standing still. Which two branches does
   this single fact connect?" → **Sensors and Power.** *Explanation: a
   sensor's own operation has a real power cost, independent of whatever
   the robot's actuators are doing — exactly the fact Module 0 grounded
   with real current-draw numbers.*
3. *Multiple choice:* "Which of the following are sensors, not actuators?
   Select all that apply." → **RPLIDAR A2; Orbbec Astra Pro.**
   *(Distractor: a drive motor — an actuator, included as contrast.)*
4. *Scenario, single choice:* "A learner says: 'The Astra Pro is one
   sensor, so it belongs entirely in one place in this model.' What's the
   issue with that claim?" → **A single device can straddle categories —
   the Astra Pro produces two genuinely separate kinds of sensor data from
   one housing, a fact Module 2 examines concretely.** *Explanation: "one
   housing" does not mean "one sensing path," previewed here and grounded
   with real specs next module.*

**Recap:** The learner can now place any piece of robot hardware — including
both of this course's own devices — into the five-branch model, and knows
where power (Module 0) and ROS 2's own communication layer (Module 3) sit
inside it.

**Connection to Module 2:** "You know *what kind* of hardware each device
is. Module 2 asks the harder question: for a sensor specifically, what
makes one *better* than another for a given job — using this course's own
two devices' real specifications, not the abstract idea of 'better.'"

---

# MODULE 2 — Understanding Robotic Sensors

## Learning objectives

By the end of this module, the learner can:

- Define and correctly distinguish accuracy, precision, resolution, range,
  frequency, noise, latency, and field of view.
- Apply each concept using this course's own two devices' real, cited
  specifications — including reasoning through the A2M8/A2M7/A2M12 baud
  distinction and the Astra Pro's dual-stream split as worked examples.
- Recognize when a spec claim is *missing* from a datasheet, and treat that
  absence itself as evaluable information, not a gap to paper over.

## Lesson breakdown

### Lesson 1 — Range, Resolution, and Field of View

**Objective:** Ground range, resolution, and field of view in both
devices' real numbers, and use them to make a first real comparative
judgment.

**Concepts covered:** Measurement range; angular/spatial resolution; field
of view.

**Content block sequence:**
1. **TEXT** — range, defined then grounded immediately: "the RPLIDAR A2's
   measuring range is 0.2–16 m (A2M7) or 0.2–12 m (A2M8/A2M12); the Astra
   Pro's depth range is 0.6–8.0 m, with only 0.6–5.0 m rated as *optimal*."
   Explicit callout: range and *optimal* range are not the same claim, and
   a device's datasheet distinguishing them is itself informative.
2. **SPEC_TABLE** (`rplidar-a2`, filtered to range-related keys if the
   block's optional `specKeys` placement option is used) — the real,
   already-seeded spec rows, not restated prose.
3. **TEXT** — resolution, grounded: the RPLIDAR's angular resolution is
   0.225° (A2M7/A2M12) or 0.45° (A2M8) — smaller means finer detail per
   360° sweep; the Astra Pro's depth resolution is up to VGA (640×480).
   These are different *kinds* of resolution (angular vs. spatial) — worth
   naming explicitly since both devices use the same word for genuinely
   different measurements.
4. **TEXT** — field of view, grounded and directly contrasted: the RPLIDAR
   sees the full 360° around itself every sweep; the Astra Pro sees a fixed
   60° horizontal × 49.5° vertical cone. This is the sharpest, most visual
   contrast between the two devices' fundamental design.
5. **IMAGE** — FOV contrast diagram (see Visual requirements).
6. **CALLOUT** (TIP) — "Neither 'more range' nor 'wider FOV' is
   unconditionally better — Lesson 4 asks you to actually choose between
   these two devices for a specific job."

**Visual requirements:**
- **Purpose:** make the 360°-vs-60° field-of-view contrast immediately
  visible, not just stated as numbers · **Concept:** RPLIDAR's full-circle
  FOV vs. Astra Pro's fixed cone · **Format:** top-down diagram, one full
  circle around a RPLIDAR icon, one 60° wedge in front of an Astra Pro icon
  drawn at the same scale · **Status: not yet generated** — new SVG ·
  **What the learner should understand:** these aren't just different
  numbers, they're different *shapes* of sensing coverage, with different
  robot-design consequences.

**Video:** None — this lesson's numbers are specific to this course's own
two devices; a generic "what is field of view" video wouldn't carry the
comparative weight this lesson needs.

**Exercise:** None — Lesson 4 carries this module's applied exercise, after
all the relevant concepts (including noise/accuracy and frequency) are
introduced.

**Quiz:** None at lesson level (module quiz lands at the end of Lesson 4).

---

### Lesson 2 — Accuracy, Precision, and Noise

> **Corrected by Stage 4** (`docs/hardware/STAGE_4_RPLIDAR_A2_PROFILE.md`
> §1, 2026-08-29) — kept below with the correction inline, not silently
> rewritten, the same way the kickoff file's own "Known starting points"
> section was handled: this lesson was originally built on "neither
> device publishes a numeric accuracy/precision tolerance," using only the
> Astra Pro's optimal-vs-max range gap as indirect evidence for both
> devices. **That premise was half wrong.** Stage 4's deeper source pass on
> the RPLIDAR A2 — re-fetching Slamtec's own spec page in full rather than
> trusting an earlier summarized read of it — surfaced a row Stage 2's
> original fetch never surfaced: a real, published **range-resolution
> tolerance** (≤1% of range up to 12 m; ≤2% of range from 12–16 m). The
> RPLIDAR *does* publish a real accuracy proxy. The Astra Pro genuinely
> does not — nothing found for it changes. The lesson below now uses the
> RPLIDAR's real tolerance as its primary, direct worked example, and
> keeps the Astra Pro's range-delta strictly as the *indirect* case, for a
> device that genuinely has no better spec to reach for — which is also a
> more honest demonstration of the lesson's own point than using indirect
> reasoning for both devices when a direct figure was available for one of
> them all along.

**Objective:** Distinguish accuracy from precision, and apply a real
published tolerance to a concrete range calculation — then contrast that
against a device whose datasheet genuinely doesn't publish one, and reason
honestly about what that absence does and doesn't tell you.

**Concepts covered:** Accuracy; precision; noise; reading a published
tolerance spec correctly; the difference between a published spec and an
*absent* one.

**Content block sequence:**
1. **TEXT** — definitions, kept precise: accuracy = how close a reading is
   to the true value; precision = how consistent repeated readings are with
   *each other*, whether or not they're accurate. A sensor can be precise
   but inaccurate (consistently wrong by the same amount) — a genuinely
   common real-world case worth naming explicitly, since the two words are
   often used interchangeably in casual speech.
2. **SPEC_TABLE** (`rplidar-a2`, filtered to the range-resolution key) —
   the RPLIDAR's real, published tolerance: **≤1% of range up to 12 m;
   ≤2% of range from 12–16 m.** This is a genuine accuracy spec, not an
   inferred one — the direct worked example this lesson is now built
   around.
3. **TEXT** — turn the tolerance into a concrete number, the way a
   robotics engineer actually would: at 10 m, ≤1% means readings are
   accurate to roughly **±10 cm**; at 15 m (inside the coarser ≤2% band),
   that widens to roughly **±30 cm**. The tolerance isn't a single flat
   number across the whole range — it gets coarser exactly where Module 2
   Lesson 1's own range table shows the sensor operating furthest from its
   strongest signal return, a real, published confirmation of the general
   "accuracy degrades with distance" intuition, not just an assumption.
4. **CALLOUT** (INFO) — the honest contrast, stated directly: the Astra
   Pro's specification data gathered for this course (§6 of the approved
   architecture doc) does **not** include a separately published accuracy
   or precision tolerance — common for consumer-grade depth cameras, whose
   datasheets often report only range and resolution. "A missing spec is
   itself something to notice when evaluating hardware — and the RPLIDAR
   example above shows the difference: when a real tolerance exists, use
   it directly; don't reach for an indirect proxy out of habit."
5. **TEXT** — the Astra Pro's *indirect* evidence, kept, now correctly
   scoped to a device that actually needs it: its datasheet rates 0.6–8.0 m
   as its range but only 0.6–5.0 m as *optimal* — a real, if qualitative,
   signal that accuracy/noise characteristics degrade before the sensor's
   absolute range limit is reached, used here only because a direct figure
   genuinely isn't available.
6. **TEXT** — noise, connected to both examples: noise is what causes that
   degradation — small random variations in a reading that grow larger as
   a sensor operates closer to its physical limits (longer range, dimmer/
   farther light return, weaker reflection). The RPLIDAR's widening
   tolerance band *is* published evidence of exactly this; the Astra Pro's
   optimal-range cutoff is the same phenomenon without a number attached.
7. **CALLOUT** (TIP) — the evaluation heuristic, sharpened: "always look
   for a direct tolerance figure first (like the RPLIDAR's range
   resolution). Only fall back to an indirect signal (like an 'optimal'
   range cutoff) when a datasheet genuinely doesn't publish one — and
   recognize that fallback for what it is, not a substitute of equal
   strength."

**Visual requirements:**
- **Purpose:** make the accuracy-vs-precision distinction visually
  memorable (a genuinely hard pair of concepts to keep straight from text
  alone) · **Concept:** the classic four-quadrant target diagram (accurate+
  precise / precise-not-accurate / accurate-not-precise / neither) ·
  **Format:** four small target/dartboard icons, one per quadrant, labeled
  · **Status: not yet generated** — new SVG · **What the learner should
  understand:** these are two independent properties, not two words for
  the same idea.

**Video:** None — a generic accuracy/precision explainer exists in
abundance, but this lesson's actual teaching point (reasoning from a
datasheet's *gaps*, using this course's own real device) is specific enough
that a general video wouldn't reinforce it; not worth padding the lesson
with a tangential citation.

**Exercise:** None — Lesson 4 carries the module's exercise.

**Quiz:** None at lesson level.

---

### Lesson 3 — Frequency, Latency, and Data Rate

**Objective:** Ground frequency/scan rate, latency, and data throughput in
real numbers from both devices, using the RPLIDAR's baud-rate family as the
named, worked "throughput" teaching example.

**Concepts covered:** Scan/update frequency; latency; data rate/throughput;
serial baud rate as a concrete instance of data rate.

**Content block sequence:**
1. **TEXT** — frequency, grounded: the RPLIDAR's rotation speed is 10 Hz
   by default, adjustable 5–15 Hz; the Astra Pro streams RGB and depth up
   to 30 FPS each. Higher frequency means fresher data sooner, at a real
   cost (more data to process per second).
2. **TEXT** — latency, distinguished from frequency explicitly (a common
   confusion): frequency is *how often* new data arrives; latency is *how
   long* any single reading takes to become available after the physical
   event it measures. A sensor can be high-frequency and still have
   meaningful latency.
3. **TEXT** — data rate, introduced via the RPLIDAR's sample rate: 8,000
   samples/sec (A2M8) or 16,000 samples/sec (A2M7/A2M12) — more samples per
   second at the same rotation speed means finer angular resolution per
   sweep (tying directly back to Lesson 1).
4. **CALLOUT** (WARNING) — **Teaching Point: The Baud Rate Trap**, carried
   directly from the approved architecture doc §7, named exactly the same
   way so the learner recognizes it again in Module 3/5: the RPLIDAR's
   *serial* output interface has its own throughput number, separate from
   its scan rate — and it is not uniform even within the A2 family.
   **A2M8 defaults to 115200 bps; A2M7 and A2M12 default to 256000 bps**
   (confirmed directly from Slamtec's own official spec table). Using the
   wrong SKU's launch file produces a specific, real symptom: the device
   still shows up in `lsusb`, the port still opens, but scan data is
   garbled or absent.
5. **TEXT** — why this belongs in a *sensor concepts* module, not just a
   setup guide: baud rate is a concrete instance of "data rate" that a
   learner can now recognize the *general shape* of — a communication
   channel has its own throughput limit and configuration, separate from
   whatever the sensor itself is physically capable of. This same shape
   recurs for any future serial or bus-connected device.
6. **IMAGE** — the sample-rate/baud-rate table as a small comparison
   graphic (see Visual requirements).

**Visual requirements:**
- **Purpose:** make the A2M7/A2M8/A2M12 baud-rate distinction visually
  scannable, since it's easy to misread as uniform across "the A2" · **
  Concept:** per-SKU baud rate and sample rate · **Format:** small three-
  column comparison card (one column per sub-model), baud rate and sample
  rate as the two highlighted rows · **Status: not yet generated** — new
  SVG, but deliberately small/reusable so Module 5's RPLIDAR module can
  embed the same asset rather than a redrawn variant · **What the learner
  should understand:** "the A2" is not one configuration — the exact
  sub-model label on the physical unit determines two real, different
  numbers.

**Video:** None — this exact per-SKU distinction is unlikely to be covered
correctly by a general external video (Stage 0's own research found this by
reading source code and the official spec table directly, not from a
tutorial); citing a video here risks contradicting this lesson's own,
more-precise finding.

**Exercise:** None — Lesson 4 carries the module's applied exercise.

**Quiz:** None at lesson level.

---

### Lesson 4 — Multi-Stream Sensors and the Field-of-View/Range Tradeoff

**Objective:** Apply everything from Lessons 1–3 to a real comparative
decision, using the Astra Pro's dual-stream design as the worked "one
physical sensor, multiple independent specs" example.

**Concepts covered:** Multi-stream sensors; applying range/resolution/FOV/
frequency together to a real decision; the dual-USB-identity fact as a
sensor-concepts example, not just a setup detail.

**Content block sequence:**
1. **TEXT** — recap-and-reframe: the Astra Pro isn't "one sensor with a lot
   of specs" — it's two independent sensing paths (UVC RGB camera; OpenNI2
   structured-light depth engine) sharing one housing, confirmed by two
   independent sources agreeing on distinct USB identities (`2bc5:0403`
   depth, `2bc5:0501` RGB). Each path has its own resolution, its own frame
   rate, and — per Lesson 2 — potentially its own noise characteristics.
2. **DEVICE_CARD** (`orbbec-astra-pro`) — reused here as the concrete
   anchor for the dual-stream discussion, not re-described from scratch.
3. **TEXT** — the applied comparison, using real numbers from all three
   prior lessons at once: for a task like "detect a person walking 6 meters
   away, indoors," the Astra Pro's *optimal* depth range (0.6–5 m) already
   excludes that distance, while the RPLIDAR's 0.2–12/16 m range comfortably
   includes it — even though the Astra Pro is the "richer" sensor by data
   type (color + depth vs. distance-only).
4. **CALLOUT** (TIP) — the general lesson underneath the specific example:
   "richer data" and "better fit for this job" are different questions —
   evaluate range/FOV/frequency against the actual task, not against which
   sensor sounds more capable.
5. **TEXT** — bridge to Module 3: "You can now read a sensor's
   specifications and reason about fitness for a task. Module 3 shows what
   happens *after* the sensor measures something — how that measurement
   actually becomes a ROS 2 message a robot can use."

**Visual requirements:** None new — the applied reasoning in this lesson is
carried by text and the reused `DEVICE_CARD`; a new diagram isn't justified
for a lesson whose job is synthesis, not introducing a new visual concept.

**Video:** None.

**Exercise:** **INDEPENDENT** — "Choose the Right Sensor." Goal: given three
short task scenarios (e.g. "detect a person 6 m away indoors"; "build a
detailed 3D model of a small object 1 m away"; "map a room's walls for
navigation"), choose RPLIDAR, Astra Pro, or "both," and justify the choice
using at least one concrete spec from Lessons 1–3 (range, FOV, resolution,
or frequency) per answer. Success criteria: each justification cites a real
number, not a vague "it's better at that." Hints available, pointing back
to the specific lesson/spec relevant to each scenario without stating the
answer outright.

**Module 2 Quiz** (scenario/diagnostic-weighted, per §25):

1. *Scenario, single choice:* "You're choosing a primary sensor to detect a
   person 6 meters away, indoors. The Astra Pro's optimal depth range is
   0.6–5 m; the RPLIDAR A2M8's range is 0.2–12 m. Which should be primary,
   and why?" → **The RPLIDAR — 6 m falls outside the Astra Pro's optimal
   range but well inside the RPLIDAR's.** *Explanation: this is the exact
   reasoning Lesson 4 walked through — range and FOV should be matched to
   the task, not assumed from which sensor "sounds" more capable.*
2. *Scenario, single choice:* "An A2M8 unit is connected, powered, and
   spinning. `lsusb` shows the device, and the udev symlink `/dev/rplidar`
   exists. But the ROS 2 driver reports garbled range values instead of
   clean scan data. What should be checked next?" → **Whether the launch
   file matches the unit's actual baud rate (A2M8 defaults to 115200 bps;
   using an A2M7/A2M12 launch file would apply the wrong 256000 bps
   default).** *Explanation: this is the Baud Rate Trap from Lesson 3 —
   the device "looks" fully connected, but the serial configuration doesn't
   match the physical unit.*
3. *True/False:* "The Astra Pro's RGB image and depth image must have
   identical resolution and frame rate, since they come from the same
   physical unit." → **False.** *Explanation: they're two independent
   sensing paths (confirmed by two separate USB identities) — each with its
   own resolution/frame-rate defaults, not a shared spec.*
4. *Scenario, single choice:* "The RPLIDAR A2's range resolution is
   published as ≤1% of range up to 12 m. At a true distance of 10 m,
   roughly what reading error should you expect?" → **Roughly ±10 cm.**
   *Explanation: this is a direct application of a real published
   tolerance (Lesson 2), not an estimate — 1% of 10 m is 0.1 m.*
5. *Single choice:* "A sensor's datasheet lists a maximum range but no
   separately published accuracy or precision figure — like the Astra
   Pro. What's the most reasonable conclusion?" → **This is common for
   consumer-grade sensors; look for indirect signals like a stated
   'optimal' range, and don't assume the sensor is accurate right up to
   its maximum range.** *Explanation: exactly the reasoning Lesson 2
   modeled — but as the *fallback* case, used only because the Astra Pro
   genuinely has no direct tolerance figure, unlike the RPLIDAR.*
6. *Multiple choice:* "Which of the following correctly pairs a concept
   with this course's own real example? Select all that apply." →
   **"Angular resolution — RPLIDAR's 0.225°/0.45° per-SKU difference";
   "Field of view — RPLIDAR's 360° vs. Astra Pro's 60°×49.5° cone.";
   "Accuracy — RPLIDAR's published ≤1%/≤2% of range tolerance."**
   *(Distractor: "Accuracy — a published numeric tolerance for the Astra
   Pro" — still false; no such figure was found for that device, unlike
   the RPLIDAR.)*

**Recap:** The learner can now read and apply range, resolution, FOV,
accuracy, precision, noise, frequency, and latency using this course's own
two real devices — including two named, reusable teaching examples (the
Baud Rate Trap; the Astra Pro's dual-stream split) that Module 5 will
reference again rather than re-derive.

**Connection to Module 3:** "You now understand a sensor's measurements in
isolation. Module 3 follows one of those measurements on its actual journey
— from the physical world, through the driver, into a ROS 2 topic a robot
can use."

---

# MODULE 3 — Hardware-to-ROS-2 Data Pipeline

**Design note, addressing the kickoff prompt's explicit requirement
directly:** Lesson 1 below establishes the driver → node → topic → message
→ QoS mental model **generically** — no device names, no device-specific
numbers — so that device 3 (an IMU, a motor, anything) plugs into this
lesson's model without requiring a rewrite. Lessons 2–3 then ground that
same generic model in the two launch devices' **real, already-seeded**
`HardwareDeviceTopic`/spec data (not re-derived — pulled directly from
`HARDWARE_DEVICES` in `prisma/seed.ts`, which itself traces to the Stage 0
findings). Lesson 4 generalizes the QoS lesson from the RPLIDAR's specific
case back out to a device-agnostic principle, closing the loop.

## Learning objectives

By the end of this module, the learner can:

- State the generic pipeline (physical world → sensor → signal → digital
  data → driver → ROS 2 node → topic → message → QoS → application) from
  memory, without reference to any specific device.
- Trace that exact pipeline through both launch devices using their real,
  seeded topic and QoS data.
- Explain why QoS reliability settings can silently break a subscription
  even when every earlier pipeline stage is working correctly.

## Lesson breakdown

### Lesson 1 — The Generic Pipeline: From Physical World to ROS 2 Topic

**Objective:** Learn the pipeline as a device-agnostic mental model first,
before any specific device grounds it.

**Concepts covered:** Physical world → sensor → signal → digital data →
driver → ROS 2 node → topic → message → QoS → application (design doc §13/
§16 combined into one chain).

**Content block sequence:**
1. **TEXT** — the chain, stated once, plainly, with no device attached yet:
   a physical event happens in the world; a sensor turns it into a signal;
   the signal becomes digital data; a **driver** turns that data into
   something a computer program understands; a **ROS 2 node** wraps that
   into a **topic**, publishing a stream of typed **messages**; **QoS**
   settings govern how reliably those messages are delivered; finally, an
   application (RViz2, or a robot's own decision-making) consumes them.
2. **IMAGE** — the generic pipeline diagram (see Visual requirements) —
   deliberately unlabeled with any specific device name.
3. **TEXT** — why each stage exists, one sentence each, focused on the
   *job* each stage does rather than any implementation detail: the driver
   exists because raw hardware signals aren't yet software-shaped; the node
   exists because ROS 2 needs a consistent way to expose that data to the
   rest of the system; the topic/message pair exists so any number of other
   programs can consume the same data without coordinating with the driver
   directly; QoS exists because "delivered" can mean different things
   depending on what the data is for.
4. **CALLOUT** (INFO) — explicit design note, shown to the learner rather
   than hidden: "This exact chain applies to any sensor this course ever
   adds — a LiDAR, a camera, an IMU, anything. The next two lessons ground
   it in this course's own two real devices; a future device's lesson will
   ground it the same way, not replace this model."
5. **TEXT** — bridge: "Now watch this exact chain happen for real, starting
   with the RPLIDAR."

**Visual requirements:**
- **Purpose:** establish the ten-stage generic pipeline as a durable,
  reusable mental model · **Concept:** physical world → sensor → signal →
  digital data → driver → node → topic → message → QoS → application ·
  **Format:** horizontal multi-stage flow diagram, generic icons only (no
  device branding) · **Status: not yet generated** — new SVG, deliberately
  distinct from the existing `rplidar-a2-data-pipeline.svg`, which is
  device-specific and reused (not duplicated) in Lesson 2 below · **What
  the learner should understand:** this is the shape of *every* device
  pipeline this course will ever show, before any specific device fills it
  in.

**Video:** None — the generic model is this course's own synthesis of the
design doc's §13/§16 chains; no external video teaches this exact
formulation.

**Exercise:** None — Lessons 2–3 ground the model concretely before asking
the learner to apply it.

**Quiz:** None at lesson level (module quiz lands at the end of Lesson 4).

---

### Lesson 2 — Grounding the Pipeline: RPLIDAR's `/scan`, From Motor to Message

**Objective:** Trace the generic pipeline through the RPLIDAR's real,
seeded topic and QoS data end to end.

**Concepts covered:** The RPLIDAR's specific instantiation of every generic
pipeline stage; `/scan`; `sensor_msgs/msg/LaserScan`; RELIABLE QoS as a
concrete, source-verified fact.

**Content block sequence:**
1. **TEXT** — walk the generic chain from Lesson 1, now filled in stage by
   stage for the RPLIDAR: physical world (an object in the room) → sensor
   (the spinning laser head) → signal (reflected light, timed) → digital
   data (a distance value per angle) → driver (`rplidar_ros`) → ROS 2 node
   (`rplidar_node`) → topic (`/scan`) → message
   (`sensor_msgs/msg/LaserScan`) → QoS (RELIABLE) → application (RViz2).
2. **IMAGE** — `rplidar-a2-data-pipeline.svg`, **already generated and
   already wired into the Stage 1 schema-validation lesson** — this lesson
   reuses that existing asset directly rather than generating a duplicate;
   its six stages (Hardware → Driver → ROS 2 Node → Topic → Message →
   Visualization) already match this lesson's exact need, RELIABLE-QoS
   callout included.
3. **SPEC_TABLE** (`rplidar-a2`) — the real seeded spec rows (serial baud
   rate, USB-serial bridge chip, publisher QoS reliability), pulled
   directly rather than restated.
4. **TEXT** — the QoS fact, stated with its own weight rather than buried
   in the table: the driver's own source publishes `/scan` with
   `rclcpp::QoS(KeepLast(10))`, whose default reliability is **RELIABLE**
   — confirmed by reading the driver's source, not assumed from a general
   "sensors use best-effort" rule of thumb. RViz2's default LaserScan
   subscription is also RELIABLE, so no override is needed — a specific,
   falsifiable claim, not folklore.
5. **CALLOUT** (INFO) — connects back to Module 2 Lesson 3's Baud Rate
   Trap by name: "notice this pipeline includes a *serial* stage (the
   driver reading raw UART data at a specific baud rate) before any ROS 2
   concept even appears — this is exactly the stage the Baud Rate Trap
   breaks."

**Visual requirements:** The reused `rplidar-a2-data-pipeline.svg` (status:
**already generated and shipped**) fully covers this lesson's visual need —
no new asset required.

**Video:** None — device-specific pipeline tracing is this course's own
synthesis of Stage 0's source-verified findings; no external video traces
this exact chain with this exact level of verification.

**Exercise:** None — Lesson 4 carries the module's exercise, after both
devices' pipelines are established.

**Quiz:** None at lesson level.

---

### Lesson 3 — Grounding the Pipeline: The Astra Pro's Two Parallel Pipelines

**Objective:** Trace the generic pipeline through the Astra Pro, and
recognize that one physical device can run **two simultaneous pipeline
instances** rather than one.

**Concepts covered:** Parallel pipelines from one device; the Astra Pro's
real, seeded topics; why `camera_info` appears twice.

**Content block sequence:**
1. **TEXT** — direct callback to Module 2 Lesson 4: the Astra Pro isn't one
   pipeline, it's two, running in parallel from one housing — the RGB/UVC
   path and the OpenNI2 depth path — each independently instantiating the
   Lesson 1 generic chain.
2. **DEVICE_CARD** + **SPEC_TABLE** (`orbbec-astra-pro`) — the real seeded
   spec rows (both USB identities, default color format) and quick
   reference, anchoring the two-pipeline claim in already-verified data
   rather than restating it as new prose.
3. **TEXT** — walking both chains explicitly, side by side: RGB path —
   UVC sensor → USB identity `2bc5:0501` → `astra_camera_node` → topic
   `/camera/color/camera_info` (`sensor_msgs/msg/CameraInfo`); depth path —
   OpenNI2 sensor → USB identity `2bc5:0403` → the same node →
   `/camera/depth/camera_info` (also `sensor_msgs/msg/CameraInfo`) plus
   `/camera/depth_registered/points` (`sensor_msgs/msg/PointCloud2`).
4. **CALLOUT** (INFO) — the specific "why two `camera_info` topics"
   question answered directly, since it's a natural point of confusion:
   each sensing path has its own physical camera intrinsics (focal length,
   distortion) — a single combined topic would incorrectly imply the RGB
   and depth sensors share one set of intrinsics, which they don't.
5. **TEXT** — one node, two independent pipelines converging into it: worth
   naming explicitly that "one ROS 2 node" doesn't imply "one pipeline" any
   more than "one housing" implied "one sensor" back in Module 2.
6. **IMAGE** — Astra Pro pipeline diagram (see Visual requirements).

**Visual requirements:**
- **Purpose:** show two parallel pipelines converging into one node, in
  contrast to the RPLIDAR's single linear chain from Lesson 2 · **Concept:**
  the RGB/UVC and OpenNI2/depth pipelines, side by side, both feeding
  `astra_camera_node` · **Format:** two horizontal chains stacked
  vertically, sharing a single "ROS 2 Node" box where they meet, then
  diverging again into their respective topics · **Status: not yet
  generated** — new SVG, the direct Astra Pro counterpart to
  `rplidar-a2-data-pipeline.svg` (which does not yet exist for this device)
  · **What the learner should understand:** parallelism, not just
  linearity, is a real pipeline shape this course's own hardware
  demonstrates.

**Video:** None — same reasoning as Lesson 2.

**Exercise:** None — Lesson 4 carries the module's exercise.

**Quiz:** None at lesson level.

---

### Lesson 4 — QoS: Why Reliability Settings Matter

**Objective:** Generalize the RELIABLE-QoS fact from Lesson 2 into a
device-agnostic principle, and apply the generic diagnostic ladder (design
doc §18) to a pipeline-stage reasoning exercise.

**Concepts covered:** QoS reliability (RELIABLE vs. BEST_EFFORT);
subscriber/publisher QoS compatibility; the diagnostic ladder as a
device-agnostic reasoning tool.

**Content block sequence:**
1. **TEXT** — generalize Lesson 2's specific fact: QoS reliability is a
   real compatibility contract, not a cosmetic setting. A **RELIABLE**
   subscriber (like RViz2's default) cannot receive data from a
   **BEST_EFFORT** publisher — the subscription simply never connects, with
   no error message pointing at QoS as the cause.
2. **TEXT** — why this matters *especially* for future devices: the
   RPLIDAR happens to publish RELIABLE, matching RViz2's default, so a
   learner who never hits a mismatch here might assume QoS "just works."
   A future sensor driver using `SensorDataQoS()` (BEST_EFFORT, common for
   high-rate sensor data) would silently fail to display in a
   default-configured RViz2 — worth knowing *before* hitting it for the
   first time on an unfamiliar device.
3. **IMAGE** — QoS compatibility diagram (see Visual requirements).
4. **TEXT** — reintroduce the diagnostic ladder from the design doc §18,
   explicitly as a *device-agnostic* tool this module hands off complete:
   connection → power → OS detection → driver → node → topic → data →
   visualization. Every later device module (4, 5, and any future one)
   reuses this exact ladder rather than inventing a new one.
5. **CALLOUT** (TIP) — "QoS mismatches live at the 'topic → data' rung —
   everything below it (connection, power, driver, node, topic existing)
   can be completely healthy while QoS alone blocks the data from ever
   reaching an application. This is precisely why the ladder has more than
   one rung after 'topic.'"
6. **QUIZ** — the module's quiz (below).

**Visual requirements:**
- **Purpose:** make QoS incompatibility visually obvious as a *connection*
  failure, not a data-content failure · **Concept:** RELIABLE subscriber +
  BEST_EFFORT publisher = no connection; RELIABLE + RELIABLE = connects
  (the RPLIDAR's real case) · **Format:** two small side-by-side diagrams,
  each showing a publisher/subscriber pair with a connecting line (solid,
  connected) or a broken line (blocked) · **Status: not yet generated** —
  new SVG · **What the learner should understand:** this failure mode looks
  identical to "nothing is happening," but has a specific, checkable cause.

**Video:** None — QoS-compatibility explainer videos exist generally, but
this lesson's specific device-grounded framing (contrasting the RPLIDAR's
real, verified case against a hypothetical future mismatch) is this
course's own synthesis; a generic video risks introducing terminology or
emphasis that doesn't match this course's own diagnostic-ladder framing.

**Exercise:** **DEBUGGING** — "Diagnose Without the Device." Deliberately
device-agnostic, reusable framing (matching this module's own design
principle): scenario — "A sensor's ROS 2 node is confirmed running
(`ros2 node list` shows it), but `ros2 topic echo` on its expected topic
shows nothing." Hints walk the diagnostic ladder from the top down without
naming a specific device: (1) confirm the topic actually exists
(`ros2 topic list`) — a node running doesn't guarantee it's publishing yet;
(2) if the topic exists but `echo` still shows nothing, suspect QoS
incompatibility before suspecting the driver; (3) check both the
publisher's and your subscriber's QoS reliability settings
(`ros2 topic info <topic> --verbose`). Solution: walks through confirming a
QoS mismatch as the actual cause in this scenario. Root cause (optional,
shown alongside solution): explains *why* this symptom is so easy to
misdiagnose as "the driver isn't working" when the driver is, in fact,
running correctly.

**Module 3 Quiz** (scenario/diagnostic-weighted, per §25):

1. *Single choice:* "In the driver → node → topic → message chain, what is
   the driver's specific job?" → **Turning raw hardware signal/data into a
   form the ROS 2 node can work with.** *(Distractor: "publishing the ROS 2
   topic" — that's the node's job, using data the driver has already
   produced.)*
2. *Scenario, single choice:* "The RPLIDAR's `/scan` topic publishes with
   RELIABLE QoS. Suppose a different, future sensor's driver instead used
   BEST_EFFORT QoS, and RViz2 subscribes with its default RELIABLE setting.
   What would you expect?" → **RViz2 would not receive any data — a
   RELIABLE subscriber cannot connect to a BEST_EFFORT publisher.**
   *Explanation: this is a real QoS compatibility rule, not a rare edge
   case — and it's exactly why the RPLIDAR's own RELIABLE default (Lesson
   2) was worth confirming from source rather than assuming.*
3. *Single choice:* "For the Astra Pro, why are `/camera/color/camera_info`
   and `/camera/depth/camera_info` two separate topics instead of one?" →
   **The RGB and depth sensors are two independent sensing paths, each
   with its own physical camera intrinsics.** *Explanation: combining them
   into one topic would incorrectly imply shared intrinsics.*
4. *True/False:* "A device's ROS 2 message type (e.g.
   `sensor_msgs/msg/LaserScan`) is fixed by ROS 2 itself and cannot vary
   between drivers for similar devices." → **False.** *Explanation: the
   driver's author chooses which standard (or custom) message type best
   fits the data — ROS 2 provides common types like `LaserScan` and
   `PointCloud2` as a shared vocabulary, but doesn't mandate which driver
   uses which.*
5. *Scenario, single choice:* "`ros2 node list` shows a sensor's node
   running, but `ros2 topic echo` on its expected topic shows nothing, and
   the topic does appear in `ros2 topic list`. Per the diagnostic ladder,
   what should be checked next?" → **QoS compatibility between the
   publisher and your subscriber (`ros2 topic info <topic> --verbose`).**
   *Explanation: exactly the reasoning built in this module's own
   debugging exercise — a topic existing doesn't guarantee your subscriber
   can actually receive from it.*

**Recap:** The learner has traced one generic, reusable pipeline model
through two real devices with genuinely different shapes (RPLIDAR's single
linear chain; Astra Pro's two parallel chains converging into one node),
and holds a device-agnostic diagnostic ladder ready for any future device.

**Connection to Module 4/5:** "Everything from Modules 0–3 — safety, BOM,
USB power, the five-branch hardware model, sensor concepts grounded in real
specs, and the generic pipeline plus diagnostic ladder — now applies
directly. Module 4 (Astra Pro) and Module 5 (RPLIDAR) don't re-teach any of
this; they apply it to full physical setup, first-run, and real debugging."

---

# Cross-Module Notes

## Reused assets across modules (avoiding duplicate diagrams)

| Asset | First introduced | Reused in |
|---|---|---|
| `rplidar-a2-data-pipeline.svg` (already generated) | Module 3, Lesson 2 | Candidate for direct reuse in Module 5's own pipeline section — flagging forward so Stage 5 doesn't regenerate it |
| ROBOT five-branch decomposition diagram | Module 1, Lesson 1 | Reused (annotated variant, not a new asset) in Module 1, Lesson 3 |
| RPLIDAR per-SKU baud/sample-rate comparison card | Module 2, Lesson 3 | Candidate for direct reuse in Module 5's Baud Rate Trap debugging exercise — flagging forward for the same reason |

## Visual asset summary for this stage

Of the diagrams named across Modules 0–3, **one already exists**
(`rplidar-a2-data-pipeline.svg`); **eight are new, not-yet-generated SVGs**,
all following the same HTML+SVG+Playwright technique already validated in
Stage 1 and used throughout the ROS 2 Fundamentals course — no new
engineering work required to produce them, per the approved Visual Asset
Strategy. **No new photography is required for Modules 0–3** — the two
`DEVICE_CARD` reuses (Module 0 Lesson 3, Module 1 Lesson 2/Lesson 3, Module
2 Lesson 4, Module 3 Lesson 2/3) correctly continue to render Stage 1's
labelled placeholder hero image until `PHOTOGRAPHY_CHECKLIST.md` is
executed — that remains Module 4/5's dependency, not this stage's.

## Exercise-type distribution (for variety, not by rule)

Module 0: GUIDED ×2. Module 1: INDEPENDENT ×1. Module 2: INDEPENDENT ×1.
Module 3: DEBUGGING ×1 (device-agnostic, deliberately reusable framing).
No exercise in these four modules requires owning either device yet — every
one is either a paper/reasoning exercise or practicable on any USB device
the learner already has, consistent with Module 0's own "real-hardware-only,
but not before Module 4" scope.

## Quiz-item count and type distribution

19 quiz items across four module-level quizzes (4, 4, 6, 5 — Module 2 grew
by one item in the Stage 4 correction above, adding a direct RPLIDAR
tolerance-calculation question alongside the original Astra Pro indirect-
evidence one rather than replacing it). Item types: single choice (13, of
which 9 are explicitly scenario-framed), multiple choice (3), true/false
(3). No pure recall-only item appears without at least a "why" in its
explanation, per §25's own requirement that explanations teach diagnostic
reasoning.

---

Waiting for approval before Stage 4 (per-device deep research profiles).
