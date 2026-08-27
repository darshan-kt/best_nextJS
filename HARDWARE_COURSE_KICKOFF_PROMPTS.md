# ROBOTICS HARDWARE & SENSORS — CLAUDE CODE KICKOFF PROMPTS

Companion to `ROBOTICS_HARDWARE_AND_SENSORS_COURSE.md`. Run each stage in
order, in the same Claude Code session/project. Do not skip ahead until the
current stage is committed (engineering) or explicitly approved by you
(content strategy).

---

## LOCKED DECISIONS

These are settled. No stage may re-litigate them.

1. **ROS 2 Jazzy on Ubuntu 24.04.** One distro across the entire course. If a
   device's driver does not support Jazzy natively, the answer is a
   containerised bridge (see Stage 0), never a second distro in the course
   instructions.
2. **Real hardware assumed.** Learners are expected to own the devices. No
   simulation fallback track, no rosbag replay track. Practical work is
   physical.
3. **Orbbec Astra Pro stays as device 001**, legacy status and all. Its driver
   difficulty is treated as teaching material, not something to hide.
4. **Curated external video**, not original recordings — same as the ROS 2
   course.
5. **The LMS does not run ROS 2.** It teaches around the learner's own machine.
   If any plan drifts toward building hardware-in-the-loop infrastructure,
   stop and flag it.

---

## VERIFICATION RULE (applies to every stage)

Hardware documentation rots faster than ROS 2 concepts do. For this course:

- **Never write an install command from memory.** Fetch the actual upstream
  README/docs for the exact package version before writing any setup step.
- **Never embed a video URL without fetching it first** to confirm it resolves
  and the content matches the description.
- **Cite the source** (repo URL + commit/tag or doc URL + date checked) in a
  comment or metadata field for every setup instruction block, so future
  maintenance knows what to re-verify.
- If upstream docs contradict what you expect, trust upstream and flag the
  discrepancy rather than smoothing it over.

Known starting points, already verified as of this file's writing:

- **RPLIDAR A2** → `Slamtec/sllidar_ros2`, officially maintained, A2 named
  explicitly, supports Foxy through Rolling. Jazzy is low risk.
- **Orbbec Astra Pro** → `orbbec/ros2_astra_camera`. README targets Galactic,
  no releases, low activity since ~2023. Requires hand-built `libuvc` and
  OpenNI2. RGB arrives over UVC as a *separate* device from OpenNI2 depth
  (`use_uvc_camera` param). Known `/dev/shm` semaphore hang requiring
  `cleanup_shm_node`. **Jazzy support is unverified — that is Stage 0's job.**

> **Corrected by Stage 0** (`docs/hardware/JAZZY_DEVICE_VERIFICATION.md`,
> 2026-08-27) — kept above unedited as the record of what was assumed at
> kickoff, not deleted:
> - RPLIDAR A2's canonical package is **`Slamtec/rplidar_ros`, `ros2` branch**
>   (`apt install ros-jazzy-rplidar-ros`), not `sllidar_ros2` — that repo has
>   never been released through the ROS build farm for any distro.
>   `sllidar_ros2` is superseded; do not use it as the teaching reference.
> - Astra Pro's confirmed working path is the community fork
>   `yosefl20/ros2_astra_camera`, branch `jazzy`, not upstream `master` —
>   MEDIUM confidence, full setup sequence in §2.2a of the findings doc.

---

## STAGE 0 — Hardware build spike (do this before anything else)

No content design happens until we know what actually runs.

```
Before any course design work, run a hardware and driver verification spike
for the Robotics Hardware & Sensors course. This is investigation, not
implementation — the output is a written findings report, not LMS content.

Target platform: Ubuntu 24.04 + ROS 2 Jazzy. Real hardware is available:
Orbbec Astra Pro and RPLIDAR A2.

Scope:

1. RPLIDAR A2 — verify the current Slamtec/sllidar_ros2 package builds and
   runs on Jazzy. Confirm: udev/permissions setup, correct launch file for
   the A2, serial port detection, /scan topic publishing, message contents
   sane, RViz2 visualisation (including the QoS reliability setting RViz
   needs for sensor data). Record exact commands and exact expected output.

2. Orbbec Astra Pro — attempt orbbec/ros2_astra_camera on Jazzy/24.04. Fetch
   the upstream README first; do not rely on training data. Expect problems:
   the README targets Galactic, libuvc must be built from source, OpenNI2
   blobs may not link against 24.04's toolchain, and Jazzy changed
   image_transport. Document precisely where it succeeds or fails, with the
   actual error output.

3. If step 2 fails, evaluate fallbacks in this order and recommend one:
   a. Patch the build (document every patch needed).
   b. Run the driver in a Humble container publishing over DDS to the Jazzy
      host — verify topics actually cross the boundary and RViz2 on the host
      can subscribe. This is the preferred fallback if (a) is unreasonable.
   c. A maintained community OpenNI2 fork.
   Do not silently substitute a different camera model.

4. For whichever path works for the Astra Pro, capture the real topic list,
   message types, frame IDs, and the separate UVC-RGB vs OpenNI2-depth
   behaviour, since that split is central to the teaching content.

Deliverable: a findings document at docs/hardware/JAZZY_DEVICE_VERIFICATION.md
containing, per device — what worked, exact commands, exact expected output,
what failed, workarounds applied, and a confidence rating on whether a
beginner can reproduce it. Include terminal captures.

Do not write course content. Do not touch the LMS schema. Report back before
proceeding.
```

**Checkpoint:** if the Astra Pro path lands on the container fallback,
acknowledge that explicitly before Stage 2 — it becomes a real teaching topic
(and arguably a valuable one) rather than a footnote.

---

## STAGE 1 — Close the schema and block gaps (engineering)

```
Close the schema gaps between the existing LMS and
ROBOTICS_HARDWARE_AND_SENSORS_COURSE.md.

Follow §36 — plan first (Objective / Files to Change / Architecture
Decisions / Potential Risks / Validation Plan).

Context: the ROS 2 course's content blocks (TEXT, IMAGE, VIDEO, CODE, QUIZ,
EXERCISE, CALLOUT, FILE, EMBED) are built and working. Reuse them. This
stage adds only what the hardware course genuinely needs on top.

Scope:

1. HardwareDevice as a first-class model. §21 and §29 of the design doc
   require unlimited devices to be addable, and §20 requires cross-device
   comparison. Prose content blocks cannot support comparison queries.
   Design a Prisma model holding structured device metadata: name, category,
   manufacturer, interface, specifications (typed, comparable — range, FOV,
   resolution, scan rate, power, weight), driver package, ROS 2 distro
   compatibility, topics, message types, support status (actively
   maintained / legacy / deprecated), and a relation to the course
   Section that teaches it.

2. A SPEC_TABLE block renderer that pulls from HardwareDevice rather than
   duplicating specs as prose — so a spec correction updates everywhere.
   §7 requires every spec row to carry a "why it matters" explanation, so
   that field is part of the spec structure, not optional.

3. A DEVICE_CARD / quick-reference block per §26, and a comparison view per
   §20 that can put two or more HardwareDevice records side by side.

4. A support-status warning surface. The Astra Pro is legacy and the design
   doc's non-negotiables forbid presenting outdated drivers without warning.
   Legacy/deprecated status must render visibly to the learner, driven by
   the model field, not hand-written into each lesson.

5. Enforce the same §11/§12 authorization rules as every other course.

6. Do NOT build hardware-in-the-loop infrastructure, device telemetry, or
   any in-browser sensor simulation. Flag and stop if the plan drifts there.

Use Playwright to screenshot a SPEC_TABLE, a DEVICE_CARD, a two-device
comparison view, and a legacy-status warning.

Wait for my go-ahead on the plan before implementing.
```

---

## STAGE 2 — Phase 1: Research and course architecture (strategy only)

```
Follow ROBOTICS_HARDWARE_AND_SENSORS_COURSE.md. Execute PHASE 1 only —
Hardware Research and Course Architecture.

Ground every technical claim in the Stage 0 findings document
(docs/hardware/JAZZY_DEVICE_VERIFICATION.md) and in upstream documentation
you fetch during this stage. Where Stage 0 found a problem, the architecture
must account for it rather than assume the happy path.

Produce exactly the fourteen deliverables listed at the end of the design
doc: Executive Course Strategy, Hardware Course Architecture, Scalable
Device Learning Model, Initial Hardware Catalog, Research Strategy, Orbbec
Astra Pro Technical and Learning Profile, RPLIDAR A2 Technical and Learning
Profile, Ubuntu and ROS 2 Compatibility Strategy, Practical Lab Strategy,
High-Level Curriculum, Visual Asset Strategy, Video Resource Strategy, Quiz
and Assessment Strategy, Key Architecture Decisions.

Constraints:
- Jazzy / 24.04 only. Real hardware assumed.
- The Practical Lab Strategy must state the required bill of materials
  plainly, including cables, powered USB hub if needed, and approximate
  cost, so learners know what they're committing to before Module 0.
- The Visual Asset Strategy must address licensing: product photography is
  copyrighted. Specify which visuals are generated diagrams (SVG), which
  are our own photographs of our own hardware, and which need permission.
- The Astra Pro profile must be honest about legacy status and place that
  honesty inside the pedagogy — "how to evaluate hardware support before
  you buy" is a real robotics skill.

Output strategy and curriculum only. No lesson content, no LMS writes.
Wait for my approval before Stage 3.
```

---

## STAGE 3 — Foundation modules design (Modules 0–3)

```
Design Modules 0 through 3 from the approved architecture — Course
Onboarding, Robotics Hardware Fundamentals, Understanding Robotic Sensors,
and the Hardware-to-ROS-2 Data Pipeline.

These carry disproportionate weight: with only two devices at launch, the
foundation modules are most of the course. Design them to stand on their
own, and to be the layer that every future device module plugs into.

Per module produce: learning objectives, lesson breakdown, the content block
sequence per lesson, the visual/diagram list with a stated educational
purpose for each (§24), quiz items, and exercises.

Module 0 must cover hardware safety, the exact BOM, USB fundamentals
(including the power-delivery issues that cause half of all "device not
detected" problems), and how the hardware lab works.

Module 2's sensor concepts — accuracy, precision, resolution, range,
frequency, noise, latency, field of view — must be taught with concrete
numbers drawn from the two real devices, not in the abstract.

No LMS writes. Design output only. Wait for approval.
```

---

## STAGE 4 — Device research profile (repeat per device)

```
Produce a deep technical and learning profile for [DEVICE], per PHASE 3 of
the design doc.

Start from the Stage 0 verification findings. Then fetch and read: the
manufacturer's official product page and datasheet, the driver repo README
and open issues, and the ROS Index entry. Cite each source with a date
checked.

Deliver: full specifications with "why it matters" for each, working
principle at three depths (intuition / simplified technical / practical
consequence), physical component inventory, the complete verified setup
path for Jazzy, the ROS 2 integration surface (node, topics, message types,
frames, parameters, services, launch files — taken from the real running
system, not documentation guesses), the ten most likely failure modes with
their diagnostic signatures, and the learning opportunities this device
uniquely offers.

For the Astra Pro specifically: the UVC-RGB vs OpenNI2-depth split, the
/dev/shm semaphore issue, udev rules, RViz2 QoS reliability settings, and
whatever the Stage 0 spike revealed about Jazzy, all belong here.

No lesson content yet. Profile only.
```

---

## STAGE 5 — Device module design (repeat per device)

```
Design the full learning module for [DEVICE] from its approved profile,
following the Section A–L template in the design doc.

Requirements:
- Every specification carries its "why it matters" explanation.
- Every command block states the exact expected output and what a failure
  looks like — real captured output from Stage 0, not invented.
- The debugging section follows the diagnostic ladder in §18 (connection →
  power → OS detection → driver → node → topic → data → visualisation) and
  teaches the reasoning, not a symptom lookup table.
- At least one debugging exercise uses the progressive-hint format from the
  ROS 2 course — no immediate solution reveal.
- Quiz items must include the scenario/diagnostic type from §25, not just
  recall.

Video curation: find candidate external videos, then FETCH each URL to
confirm it resolves and matches its description before including it. For
each, record the metadata block from §23 (title, creator, channel, link,
duration, device, course location, version relevance, why selected, learning
outcome). Reject anything teaching ROS 1 or a different distro without
saying so explicitly. If no suitable video exists for a section, say so —
do not pad.

Visuals: list each with its educational purpose and its source (generated
SVG / our own photo / needs permission). Do not silently placeholder.

No LMS writes. Design output only. Wait for approval.
```

---

## STAGE 6 — Quality review (before implementing each module)

```
Quality-review the [MODULE] design against PHASE 6 of the design doc before
implementation.

Check:
- Every command verified against Jazzy/24.04, traceable to a fetched source
  or the Stage 0 spike.
- No ROS 1 syntax anywhere. No distro mixing.
- No specification presented without its "why it matters".
- Every external video URL still resolves.
- Legacy driver warnings present where required.
- A beginner with the stated prerequisites could actually reproduce every
  step — flag anything assuming knowledge Module 0-3 didn't teach.
- Quizzes test understanding and diagnosis, not command memorisation.
- Exercises test real practical ability.

Report issues found and fix them before marking the module ready.
```

---

## STAGE 7 — LMS implementation (repeat per module)

```
[MODULE] is designed and quality-reviewed. Implement it in the LMS.

Follow §36 — plan first.

Scope:
- Create the module and lessons in the database per the approved design.
- Populate HardwareDevice records for any device taught, and wire
  SPEC_TABLE / DEVICE_CARD blocks to those records rather than duplicating
  spec text.
- Add content blocks in the designed sequence using existing renderers.
- Wire in verified external videos with their attribution metadata.
- Wire exercises and quizzes into progress tracking the same way existing
  course content is.
- Flag any visual that needs generating or sourcing rather than silently
  placeholder-ing it.
- Enforce §11/§12 authorization — no special treatment for this course.

Validate end-to-end with Playwright: screenshot the module flow from first
lesson through quiz completion, plus the SPEC_TABLE and any legacy warning.

Wait for my go-ahead on the plan before implementing.
```

**Checkpoint:** review screenshots against the design. Commit once verified.

---

## AFTER BOTH DEVICES

Capstone (§27) — the dual-sensor perception system. Design and review it as
its own module through Stages 5–7. Then run a full-course Playwright
walkthrough: Module 0 through capstone, confirming the quick-reference cards
and study materials (§26) are in place and the device comparison view (§20)
works with two real records in it.

## ADDING DEVICE N+1 LATER

Stages 4 → 5 → 6 → 7 only. Architecture and schema stay untouched. If a new
device requires a schema change, that is a signal the Stage 1 model was too
narrow — fix the model, don't special-case the device.
