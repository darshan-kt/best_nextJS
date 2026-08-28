# Stage 2 — Phase 1: Hardware Research & Course Architecture

Per `ROBOTICS_HARDWARE_AND_SENSORS_COURSE.md` §28 PHASE 1 and the Stage 2
kickoff prompt in `HARDWARE_COURSE_KICKOFF_PROMPTS.md`. Strategy and
curriculum only — no lesson content, no LMS writes, no schema changes.

**Grounding, stated plainly.** Every technical claim about the two devices
below traces to one of two places: `docs/hardware/JAZZY_DEVICE_VERIFICATION.md`
(Stage 0's findings, **as corrected** — this document uses `Slamtec/rplidar_ros`
and `yosefl20/ros2_astra_camera` throughout, never the kickoff file's original,
since-superseded starting points), or upstream sources fetched fresh during
this session, each cited with a URL and the date checked (2026-08-28). Where
sources disagree, that disagreement is stated rather than silently resolved.
Nothing here claims to have been run on physical hardware — that remains
Stage 4/5's job once the devices are in hand and `docs/hardware/PHOTOGRAPHY_CHECKLIST.md`
is executed.

---

## Table of Contents

1. [Executive Course Strategy](#1-executive-course-strategy)
2. [Hardware Course Architecture](#2-hardware-course-architecture)
3. [Scalable Device Learning Model](#3-scalable-device-learning-model)
4. [Initial Hardware Catalog](#4-initial-hardware-catalog)
5. [Research Strategy](#5-research-strategy)
6. [Orbbec Astra Pro — Technical and Learning Profile](#6-orbbec-astra-pro--technical-and-learning-profile)
7. [RPLIDAR A2 — Technical and Learning Profile](#7-rplidar-a2--technical-and-learning-profile)
8. [Ubuntu and ROS 2 Compatibility Strategy](#8-ubuntu-and-ros-2-compatibility-strategy)
9. [Practical Lab Strategy](#9-practical-lab-strategy)
10. [High-Level Curriculum](#10-high-level-curriculum)
11. [Visual Asset Strategy](#11-visual-asset-strategy)
12. [Video Resource Strategy](#12-video-resource-strategy)
13. [Quiz and Assessment Strategy](#13-quiz-and-assessment-strategy)
14. [Key Architecture Decisions](#14-key-architecture-decisions)

---

## 1. Executive Course Strategy

This course teaches learners to **evaluate, set up, integrate, and debug
real robotics hardware** on one fixed platform — ROS 2 Jazzy, Ubuntu 24.04 —
using devices they physically own. It is not a sensor-theory course wearing
a ROS 2 costume: every claim, command, and expected output must trace to a
real upstream source or a real run, per the VERIFICATION RULE, the same
evidentiary bar the ROS 2 Fundamentals course set.

Two facts shape the whole strategy:

- **The catalog starts at two devices.** Until device 3 exists, Modules 0–3
  (hardware fundamentals, sensor concepts, the hardware→ROS 2 pipeline) carry
  disproportionate instructional weight — they are not a preamble to the
  "real" content, they *are* most of the course at launch, and Stage 3 must
  design them to stand on their own merit, not as filler before Module 4.
- **One of the two launch devices is legacy, and that is the point.** The
  Astra Pro's only working Jazzy path is a small, unmerged community fork
  (`yosefl20/ros2_astra_camera`, MEDIUM confidence per
  `JAZZY_DEVICE_VERIFICATION.md` §2.6). The design doc's non-negotiables
  forbid hiding that. This course treats "how do you evaluate whether a
  piece of hardware is worth buying, given its driver's actual maintenance
  state" as a real, first-class robotics-engineering skill, not a caveat to
  apologize for. Module 4 teaches the Astra Pro *and* teaches the evaluation
  method Stage 0 used to reach that MEDIUM rating (rosdistro cross-check,
  issue-thread corroboration, commit-recency check) as a transferable skill
  the learner can apply to hardware this course has never seen.

The course succeeds if a learner who has never touched either device can,
using only this course and their own machine, get real sensor data flowing
into RViz2, understand why each setup step exists, and diagnose a failure
without being handed a symptom-lookup table.

---

## 2. Hardware Course Architecture

```text
FOUNDATION LAYER (Modules 0–3)
        — device-agnostic, built once, referenced by every device module —
        ↓
DEVICE MODULES (Module 4: Astra Pro, Module 5: RPLIDAR A2, ... N)
        — each follows the Section A–L template (design doc §22),
          each backed by one HardwareDevice catalog record —
        ↓
CAPSTONE (dual-sensor perception system, design doc §27)
        — composes two already-taught devices, adds nothing new to learn
          about either device individually —
```

The architectural backbone connecting content to data is what Stage 1
already shipped and this stage does not re-litigate:

- `HardwareDevice` / `HardwareDeviceSpec` / `HardwareDeviceTopic` — one
  record per device, specs and topics as structured rows rather than prose,
  so a correction updates every surface that shows it (`SPEC_TABLE` blocks,
  `DEVICE_CARD` blocks, the `/hardware/compare` view) at once.
- `HardwareSupportStatus` driving `<HardwareSupportBanner>` automatically —
  legacy/deprecated status is a model field, not something an author has to
  remember to write into prose.
- The `/hardware` catalog and `/hardware/compare` routes — the "scalable
  library" the design doc's §3/§21 ask for, browsable independent of any one
  lesson.

This stage's job is to decide **what goes into those records** for the two
launch devices and **how the modules are sequenced around them** — not to
touch the schema itself, which Stage 1 already closed the gaps on.

**Device-addition pipeline (standing, from Stage 2 onward):** every device
after the first two follows Stages 4 → 5 → 6 → 7 only, per the kickoff
file's own closing rule. If a future device needs a schema change, that is a
signal the Stage 1 model was too narrow, not a reason to special-case the
device. This stage's catalog and profiles are the first real exercise of
that pipeline's Phase-1-equivalent step, and should read as a template for
every device that follows.

---

## 3. Scalable Device Learning Model

The repeatable per-device journey is the design doc's §6 chain, unchanged:

```text
WHAT IS IT → WHY USE IT → HOW IT WORKS → SPECIFICATIONS → WHERE USED →
PHYSICAL SETUP → UBUNTU SETUP → ROS 2 INTEGRATION → VISUALIZATION →
TESTING → DEBUGGING → PRACTICAL USE
```

Mapped onto what actually exists in the database today:

| Learning-journey stage | Backing data |
|---|---|
| What is it / Why use it | `HardwareDevice.summary` |
| Specifications | `HardwareDeviceSpec[]` (`key`, `label`, `value`, `unit`, `whyItMatters` — required, not optional) |
| ROS 2 integration | `HardwareDeviceTopic[]` (`topicName`, `messageType`, `description`) |
| Support/legacy status | `HardwareDevice.supportStatus` + `supportStatusNote`, rendered via `<HardwareSupportBanner>` |
| Everything else (how it works, physical setup, debugging, quiz, practical challenge) | Ordinary `LessonContentBlock` sequence in the device's `homeSection`, using existing block types plus the device's own `SPEC_TABLE`/`DEVICE_CARD` blocks |

**Category scaling is deliberately unfinished, on purpose.** `HardwareCategory`
today has exactly two values — `RGB_D_CAMERA`, `LIDAR_2D` — because those are
the only two the catalog needs right now. Adding an IMU, a motor driver, or a
robotic arm later means adding an enum value, a cheap additive migration, not
a redesign. This mirrors Stage 1's own risk note about `HardwareDeviceSpec.key`
scoping and is intentional: §34 says don't build for a requirement that
doesn't exist yet.

**Confidence rating is a content convention, not a schema field, and that's
a deliberate choice for this stage.** Stage 0 rated each device HIGH/MEDIUM
based on a real, repeatable method (official buildfarm release + source
verification = HIGH; real user corroboration without an official release =
MEDIUM; single unverified source = LOW, not used by either launch device).
That rating belongs in `HardwareDevice.supportStatusNote` (already required
by a Zod refinement whenever status is `LEGACY`/`DEPRECATED`, per Stage 1
decision 4) and in the Module 4/5 content itself — not as a new column. A
dedicated column would be premature: two devices don't establish a pattern
worth a schema commitment yet. Revisit if device 3 also needs a rating and a
prose note stops being sufficient (§34 again).

---

## 4. Initial Hardware Catalog

| | Orbbec Astra Pro | RPLIDAR A2 |
|---|---|---|
| `HardwareCategory` | `RGB_D_CAMERA` | `LIDAR_2D` |
| Manufacturer | Orbbec | Slamtec |
| `driverPackage` | `astra_camera` (fork: `yosefl20/ros2_astra_camera`, branch `jazzy`) | `rplidar_ros` (`Slamtec/rplidar_ros`, branch `ros2`) |
| `rosDistroCompat` | `["jazzy"]` (via fork only) | `["jazzy"]` (official buildfarm release) |
| `supportStatus` | `LEGACY` | `ACTIVELY_MAINTAINED` |
| Confidence (Stage 0 method) | **MEDIUM** | **HIGH** |
| Install path | Source build from a community fork | `sudo apt install ros-jazzy-rplidar-ros` |
| `homeSection` (planned) | Module 4 | Module 5 |
| Primary teaching hook | Dual-USB-identity split; evaluating a legacy driver before buying | SKU-specific baud rate; official-vs-superseded package naming |
| Fallback if primary path fails | Humble container bridging DDS to the Jazzy host | `rplidar_driver` (`frozenreboot/rplidar_driver`), also Jazzy-released |

Both devices map cleanly to today's two-value `HardwareCategory` enum — no
schema pressure from this catalog.

---

## 5. Research Strategy

The method this course uses for every device, present and future, is the one
Stage 0 already validated by catching the `sllidar_ros2` → `rplidar_ros`
discrepancy — repeated here explicitly so Stage 4 (and whoever adds device 3)
inherits it as a named procedure, not tribal knowledge:

1. **Never trust a package name from memory or from a course-design
   document.** Cross-check `ros/rosdistro`'s raw `jazzy/distribution.yaml`
   (and the previous LTS distro's, for contrast) directly — this is what
   `apt install` actually resolves, and it can differ from what a repo's own
   README implies.
2. **Fetch the driver repo's actual source**, not just its README, for
   anything that determines a beginner's first-run experience: default
   parameters, QoS settings, launch-file names, udev rules. Stage 0's most
   load-bearing findings (the A2/A3 baud-rate default, the LaserScan QoS
   reliability setting) came from reading `.cpp` and `.launch.py` files, not
   prose.
3. **Fetch the manufacturer's own product/datasheet page** for physical
   specifications, tolerances, and pricing — none of which the driver repo
   carries and none of which Stage 0 needed to answer "does it build."
4. **Search the driver repo's issues for the exact distro/OS combination**
   before assuming a README's supported-distro list is current. Real user
   build logs and real maintainer responses (as in
   `Slamtec/rplidar_ros#164` and `orbbec/ros2_astra_camera#15`) are stronger
   evidence than a README's badge row.
5. **Assign a confidence rating** using Stage 0's rubric: HIGH requires an
   official buildfarm release; MEDIUM requires a working non-official path
   with independent real-user corroboration; LOW is a single unverified
   source and should not ship as a course's primary path without saying so.
6. **Cite every source** — URL plus date checked — in the profile itself, so
   a future re-verification pass knows exactly what to re-check and when it
   was last true.

**This stage applied that method to fetch fresh product/pricing data neither
Stage 0 needed nor gathered** (`JAZZY_DEVICE_VERIFICATION.md` §5 explicitly
scoped that out). Sources fetched this session, all checked 2026-08-28:

- `https://www.slamtec.com/en/lidar/a2spec` — official RPLIDAR A2 spec table
  (A2M7/A2M8/A2M12 broken out).
- `https://astra-wiki.readthedocs.io/en/latest/about.html` — Astra Pro
  physical/optical specifications (community-maintained wiki; see §6 for the
  honesty note on why this isn't a manufacturer-first-party source).
- `https://www.orbbec.com/product-astra-pro/2824/` — **404, confirmed live**.
  Orbbec's own current site no longer hosts a product page for the plain
  Astra Pro. Treated as corroborating evidence for the `LEGACY` status
  determination already made in Stage 0, not as a new independent finding.
- General web search for current reseller pricing on both devices (§9), used
  only for approximate cost ranges, explicitly not treated as an
  authoritative spec source.

---

## 6. Orbbec Astra Pro — Technical and Learning Profile

### Identity

RGB-D camera, structured-light depth sensing, one physical housing exposing
**two independent USB device identities** — this split is the device's
single most important teaching fact and is confirmed from two independent
sources in `JAZZY_DEVICE_VERIFICATION.md` §2.3 (the driver's udev rules file
and the fork's launch-file defaults, both agreeing on vendor `2bc5`, products
`0403`/`0501`).

### Specifications (source: `astra-wiki.readthedocs.io`, checked 2026-08-28)

| Specification | Value | Why it matters |
|---|---|---|
| Depth range | 0.6 m – 8.0 m (optimal 0.6 m – 5.0 m) | Beyond the optimal band, depth noise rises sharply — a robot relying on this sensor for obstacle avoidance needs its stopping/planning distance inside the optimal range, not the outer limit. |
| Depth resolution | VGA (640×480), QVGA (320×240), or QQVGA (160×120), all up to 30 FPS | Lower resolution trades detail for lower CPU/bandwidth cost — relevant when this camera runs alongside the RPLIDAR on the same USB bus and host CPU in the capstone. |
| RGB resolution | Up to 1280×960 (lower FPS modes) or 640×480 @ 30 FPS | The fork's `astra_pro.launch.xml` defaults to 640×480 MJPEG @ 30 FPS (confirmed from source, `JAZZY_DEVICE_VERIFICATION.md` §2.3) — that default, not the sensor's technical ceiling, is what a learner actually sees on first launch. |
| Field of view | 60° horizontal × 49.5° vertical (73° diagonal) | Determines how much of a scene the camera covers without panning — directly comparable to the RPLIDAR's full 360°, a natural point-of-contrast in Module 2's field-of-view lesson. |
| Interface | USB 2.0 | Caps real-world throughput; the two-identity split (below) means RGB and depth share this one bus budget. |
| Dimensions | ~165 × 30 × 40 mm | Relevant for the capstone's physical mounting alongside the RPLIDAR. |
| Weight | ~0.3 kg | Same. |

**Honesty about this table's sourcing.** Orbbec's own product page for the
plain Astra Pro now returns 404 (§5) — there is no first-party datasheet PDF
to fetch for this specific model, unlike the RPLIDAR (§7). The figures above
come from a community-maintained device wiki, cross-checked against the
driver source's own defaults where the two overlap (RGB default format/FPS).
A general web search independently surfaced a differing depth-range figure
(0.443–8 m) from an aggregator site of unclear provenance; that number is
**not used here** because it isn't traceable to a specific, named source.
Stage 4's deeper profile should treat re-locating an authoritative
first-party datasheet (or measuring the real unit once acquired) as
worthwhile, not assume this table is final.

### Driver: `yosefl20/ros2_astra_camera`, branch `jazzy` — the primary path, MEDIUM confidence

This is stated exactly as `JAZZY_DEVICE_VERIFICATION.md` §2.2–§2.6 found it,
carried forward without softening:

- The actively-developed, officially-Jazzy-released Orbbec driver
  (`OrbbecSDK_ROS2`) **does not support this device** — its supported-device
  table lists Astra 2, Astra+, Astra Pro Plus, and others, but not plain
  "Astra Pro." The name collision with "Astra Pro Plus" is a real, documented
  trap (§2.1).
- The legacy-line repo the kickoff prompt originally named
  (`orbbec/ros2_astra_camera`, `master`) fails to build on Jazzy/24.04 with a
  confirmed real error (`cv_bridge.h`/`pinhole_camera_model.h` not found,
  from a real user's build log in issue #15).
- The working fix is a **community fork**, single maintainer, 3 stars, last
  commit March 2025, **not merged upstream**. Confidence is MEDIUM, not HIGH,
  precisely because of that fragility — real risk that it silently stops
  tracking future Jazzy point-releases. This is stated to learners directly,
  not smoothed into "should work fine."

### Setup — three gotchas, sequenced as numbered curriculum steps, not troubleshooting

Per the kickoff prompt's explicit instruction for this stage, the three
gotchas confirmed in `JAZZY_DEVICE_VERIFICATION.md` §2.2a are load-bearing
setup steps in Module 4's Section G/I, not an appendix. Stage 5 must lift
this sequence directly:

```text
STEP 1  Clone the FORK, jazzy BRANCH specifically.
        (Gotcha #1 — the upstream master branch is the unfixed original
        and will not build. This is the first thing a learner does, so
        it is the first thing that can go wrong.)

STEP 2  Install native dependencies (libuvc, OpenNI2 build deps).

STEP 3  rosdep install + colcon build.
        (The fork's package.xml correctly declares cv_bridge/image_geometry
        — the fix for §2.2's build failure.)

STEP 4  Apply udev rules for BOTH USB identities.

STEP 5  Confirm both USB identities enumerate — `lsusb | grep 2bc5` must
        show TWO lines (2bc5:0403 depth, 2bc5:0501 RGB) before proceeding.
        One line means a cable/hub problem, not a driver problem.

STEP 6  Grant rtprio to the user BEFORE first launch.
        (Gotcha #2 — stock Ubuntu 24.04 blocks real-time priority for
        non-root users; the launch fails without this, confirmed by a
        real user's run. Log out/in or reboot for it to take effect —
        placed here, before launch, so the learner isn't debugging a
        failure whose cause happened two steps earlier.)

STEP 7  Clear any stale /dev/shm semaphore if this isn't the first launch
        attempt (`ros2 run astra_camera clean_shm_node` — corrected by
        Stage 4, `STAGE_4_ASTRA_PRO_PROFILE.md`: the registered executable
        is `clean_shm_node`, not `cleanup_shm_node`).

STEP 8  Launch `astra_pro.launch.xml` — not `astra_pro_plus.launch.xml`.

STEP 9  Set RViz2's Fixed Frame to `camera_link` MANUALLY.
        (Gotcha #3 — it does not default there. A learner who skips this
        sees a blank RViz2 window with no error message explaining why —
        exactly the "everything looks fine, nothing errors, it just shows
        nothing" symptom this course's debugging-exercise format exists
        to teach.)
```

### ROS 2 integration surface

- Node: `astra_camera_node`, namespace `/camera`.
- Independent enable toggles: `enable_color`, `enable_depth`, `enable_ir`
  (default `true`).
- Registered point cloud on `<camera_name>/depth_registered/points` when
  `enable_point_cloud` is set.
- Full topic/parameter enumeration with real captured values is Stage 4's
  job (per PHASE 3 of the design doc — "taken from the real running system,
  not documentation guesses"); this profile records what Stage 0's static
  source read already confirmed, not a substitute for it.

### Known likely failure modes (non-exhaustive — Stage 4 owns the full ten)

1. Cloned `master` instead of `jazzy` branch → build fails on missing
   `cv_bridge`/`image_geometry` headers.
2. `rtprio` not granted before first launch → launch fails silently or
   with a permissions error, depending on kernel config.
3. Only one USB identity visible in `lsusb` → cable/hub power problem, not
   a software problem — the two-identity split makes this a distinctive,
   teachable symptom rather than generic "device not detected."
4. RViz2 Fixed Frame left on default → blank display, no error.
5. Relaunching after an unclean kill without running `clean_shm_node`
   (corrected by Stage 4; see STEP 7 above) → silent hang, no error output.
6. Launching `astra_pro_plus.launch.xml` against a plain Astra Pro unit →
   wrong parameter defaults, likely no data or wrong topic names.

### Unique learning opportunities

- **Evaluating driver support before buying** — the exact skill the design
  doc and this stage's instructions ask to be taught honestly, using this
  device's real rosdistro-cross-check/issue-thread-corroboration story as
  the worked example.
- Correcting the "one device, one USB connection" misconception via a real,
  citable dual-identity split.
- A concrete, low-stakes introduction to Linux real-time scheduling
  (`rtprio`) and shared-memory IPC (`/dev/shm` semaphores) — concepts most
  beginner ROS 2 material never touches, arising naturally from a real
  driver's real constraints rather than being taught in the abstract.

---

## 7. RPLIDAR A2 — Technical and Learning Profile

### Identity

2D triangulation LiDAR, 360° rotating scan head. Actively maintained,
officially released for Jazzy. **The canonical package is `Slamtec/rplidar_ros`,
branch `ros2` (`apt install ros-jazzy-rplidar-ros`). This profile does not
use, name, or teach `sllidar_ros2` at any point** — that repository has never
been released through the ROS build farm for any distribution and is
superseded; `JAZZY_DEVICE_VERIFICATION.md` §1.1 documents exactly why the
kickoff prompt's original naming was wrong.

### Specifications (source: `slamtec.com/en/lidar/a2spec`, checked 2026-08-28)

| Specification | A2M7 | A2M8 | A2M12 | Why it matters |
|---|---|---|---|---|
| Measuring range | 0.2 – 16 m | 0.2 – 12 m | 0.2 – 12 m | Determines usable detection distance for navigation/mapping; a learner comparing this to the Astra Pro's ~5–8 m optimal depth range sees directly why LiDAR is the long-range sensor of the pair. |
| Sample rate | 16 K/s | 8 K/s | 16 K/s | Higher sample rate at the same rotation speed means finer angular resolution per scan — more points describing the same 360°. |
| Rotation speed | 10 Hz (5–15 Hz adjustable) | 10 Hz (5–15 Hz adjustable) | 10 Hz (5–15 Hz adjustable) | Trade-off: faster rotation means a fresher scan sooner, at the cost of fewer samples per revolution. |
| Angular resolution | 0.225° | 0.45° | 0.225° | Smaller angular resolution resolves thinner/closer obstacles distinctly instead of merging them into one return. |
| **Output interface (baud rate)** | **UART, 256000 bps** | **UART, 115200 bps** | **UART, 256000 bps** | See "The Baud Rate Trap" below — this is not uniform even within the A2 family. |
| System voltage / current | 5 V / 450–600 mA | 5 V / 450–600 mA | 5 V / 450–600 mA | Directly informs the Practical Lab Strategy's powered-hub recommendation (§9) — continuous draw this size is a real "device not detected" cause on an underpowered bus-powered port. |
| Power consumption | 2.25–3 W | 2.25–3 W | 2.25–3 W | Same. |
| Weight / dimensions | 190 g, 41 mm (H) × 76 mm (dia.) | same | same | Relevant for the capstone's physical mounting. |
| Angular range | 360°, all models | | | The RPLIDAR's headline contrast against the Astra Pro's 60°×49.5° fixed cone. |

### Teaching Point: The Baud Rate Trap

This gets its own named subsection because it is one of the richest,
most concrete debugging teaching moments either device offers, and the
official spec table above makes it *sharper* than the kickoff prompt
originally assumed:

> The kickoff file's original framing treated baud rate as an A2-vs-A3
> distinction. The real picture, confirmed against Slamtec's own spec table
> **and** the driver's own launch-file source (`JAZZY_DEVICE_VERIFICATION.md`
> §1.3), is finer-grained than that: **A2M8 defaults to 115200 bps while
> A2M7 and A2M12 default to 256000 bps — a mismatch that exists inside the
> A2 family itself**, before even considering the A3's 256000 bps default.
> A learner who doesn't check their unit's exact sub-model label and launch
> with the wrong SKU's launch file gets a specific, recognizable symptom:
> the device still shows up in `lsusb`, the serial port still opens, but
> scan data is garbled or absent. This is the course's first
> real "everything *looks* connected, but the data is wrong" debugging
> exercise, and it costs nothing to set up — it's a config mismatch, not a
> hardware fault.

This is exactly why §1.3a of the findings doc puts "confirm A2 sub-model
before launching" as its own numbered step, and why the setup sequence below
keeps it there.

### Setup sequence (lift directly from `JAZZY_DEVICE_VERIFICATION.md` §1.3a)

```text
STEP 1  sudo apt install ros-jazzy-rplidar-ros
        (Official buildfarm release — no source build needed.)

STEP 2  Install the udev rule (vendor 10c4 / product ea60 — the CP2102
        USB-UART bridge on the A-series adapter cable) so the device gets
        a stable /dev/rplidar symlink instead of a shifting /dev/ttyUSBn.

STEP 3  Confirm the exact A2 sub-model (A2M7 / A2M8 / A2M12) from the
        physical label before launching — this determines both the
        correct launch file AND the correct baud rate (see above).

STEP 4  ros2 launch rplidar_ros view_rplidar_a2m8_launch.py
        (swap a2m8 for a2m7/a2m12 to match the confirmed unit)
```

Expected: `/scan` publishing `sensor_msgs/msg/LaserScan`; RViz2 opens with
the bundled config and subscribes **with no QoS override needed** — the
driver's own publisher already uses `RELIABLE` (`rclcpp::QoS(KeepLast(10))`),
matching RViz2's default subscription reliability. This is a specific,
source-verified claim, not a general assumption about "sensor QoS defaults
to best-effort" — worth its own callout since it contradicts a pattern some
learners will have seen in other sensor drivers.

### Known caveats

- The released package version (`2.1.0-4`) trails the `ros2` branch head by
  roughly two years — a real Slamtec-maintainer-confirmed release lag
  (`Slamtec/rplidar_ros#164`). Worth one sentence in Module 5: no `apt
  upgrade` path exists yet for a bug fixed only on the unreleased head.
- Community alternative `rplidar_driver` (`frozenreboot/rplidar_driver`) is
  also Jazzy-released — a live fallback footnote, not the primary path.

### Confidence: HIGH

Grounded in an actual Jazzy buildfarm release, not inference. A beginner
following the official install command plus the correct SKU/baud match
should reproduce this without a source build.

### Known likely failure modes

1. Wrong SKU launch file for the physical unit → garbled/absent scan data
   despite the device appearing connected (the Baud Rate Trap).
2. udev rule not installed/reloaded → device visible in `lsusb` but no
   stable `/dev/rplidar` symlink, learner's launch command references a
   path that doesn't exist or shifts between reboots.
3. Insufficient port power (see §9) → device enumerates intermittently or
   the motor fails to spin up reliably.
4. `sllidar_ros2` installed/followed from an outdated tutorial instead of
   `rplidar_ros` → source build friction the official path doesn't have,
   and a stale `colcon_cd rplidar_ros2` reference in that repo's own udev
   script (a good "read the script before running it as root" moment).

### Unique learning opportunities

- Distinguishing an "official, buildfarm-released" package from a
  "source-only, superseded" one that shares a maintainer and a similar
  name — directly transferable to evaluating any future device's driver
  ecosystem.
- A real, low-cost, high-signal debugging exercise (baud mismatch) that
  requires no hardware fault to construct.
- QoS reliability as a concrete, driver-source-verified fact rather than a
  rule of thumb.

---

## 8. Ubuntu and ROS 2 Compatibility Strategy

Per the LOCKED DECISIONS: **one distro, ROS 2 Jazzy on Ubuntu 24.04, for the
entire course.** A device that doesn't support Jazzy natively gets a
containerized bridge, never a second distro in the course's own
instructions.

| Device | Jazzy support | Path |
|---|---|---|
| RPLIDAR A2 | Native, official buildfarm release | `apt install ros-jazzy-rplidar-ros` |
| Astra Pro | Native only via a community fork | Source build, `yosefl20/ros2_astra_camera`, branch `jazzy` |

**Standing verification method for every future device (§5 restated as
policy):** cross-check `ros/rosdistro`'s raw `jazzy/distribution.yaml`
before trusting any repo's README claim of distro support. This single
technique is what caught both of Stage 0's corrections (`rplidar_ros` vs
`sllidar_ros2`; `OrbbecSDK_ROS2`'s Jazzy support existing but not covering
this specific product).

**Standing fallback pattern:** when a device's only working Jazzy path is
fragile or nonexistent, the documented fallback is a container running the
distro the driver *does* support (e.g. Humble), bridging topics to the Jazzy
host over DDS — never switching the course itself to a second distro. This
is already the Astra Pro's reserve option (not needed as primary, since the
fork has real corroborated evidence behind it) and should be treated as the
general answer for any future device that lands in the same position, per
LOCKED DECISION #1. Kept in reserve, but note per the kickoff file's own
checkpoint: if a *future* device actually lands on this path as primary, that
becomes real teaching content in its own right (cross-distro DDS bridging),
not pure workaround noise — worth flagging explicitly to whoever runs that
device's Stage 4.

**VM vs. bare metal:** both devices are USB (serial-over-USB for the LiDAR,
two UVC/proprietary-protocol identities for the camera). USB passthrough
into a VM is a known source of flaky, hard-to-diagnose failures unrelated to
the actual driver. Recommend native Ubuntu 24.04 (bare metal or dual-boot)
as the supported configuration; a VM is usable but explicitly unsupported
and out of scope for this course's own debugging content, to be stated
plainly in Module 0 rather than discovered mid-course.

---

## 9. Practical Lab Strategy

Stated plainly, per the kickoff prompt's explicit instruction, so Module 0
sets expectations honestly before a learner commits.

### Bill of materials

| Item | Why it's needed | Approx. cost |
|---|---|---|
| RPLIDAR A2 (any of A2M7/A2M8/A2M12) | Core device #2 | **$150–$320**, depending on sub-model and reseller; the A2M12 (~$270–$310 new) and A2M8 (open-box/refurb listings from ~$100–$190) span a wide range — confirm the exact SKU before buying, since §7's Baud Rate Trap means the SKU determines the correct setup, not just the price. |
| Orbbec Astra Pro | Core device #1 | **$100–$200**, secondhand/reseller market only. Orbbec's own current site no longer sells or lists the plain Astra Pro (§5/§6) — this is a real acquisition risk, not a hypothetical one, and belongs in Module 0's honest framing, not discovered by a learner mid-purchase. |
| Powered USB hub | Two reasons, both cited: (1) the Astra Pro enumerates as **two** independent USB identities from one housing (§6) — simultaneous RGB+depth streaming draws more than many laptops' bus-powered ports reliably deliver; (2) the RPLIDAR's motor alone draws a continuous 450–600 mA (§7's spec table) — combined with the camera on the same unpowered bus, port power is a real, specifically-citable cause of "device not detected," which Module 0 must name as a leading cause per the design doc §10/§11. | ~$15–$25 |
| USB cables / the units' own captive cables | RPLIDAR ships with its own adapter-board cable; Astra Pro ships with a captive USB cable. No extra purchase needed unless the learner's machine lacks a free full-size USB-A port, in which case a USB-C hub with full-size USB-A downstream ports is required (most laptops with only USB-C ports need this regardless of the powered-hub line above — the two may be the same physical item). | Included with devices; hub above may cover this |
| A native Ubuntu 24.04 machine | Per §8 — bare metal or dual-boot, not a VM | (assumed already owned) |
| A small test-scene kit: 2–3 visually distinct objects (a box, a chair, a wall corner) at varying distances | Needed for both devices' own demonstrations (design doc §17) and reused directly for `PHOTOGRAPHY_CHECKLIST.md`'s RViz2 capture shots — one physical setup serves both purposes | Negligible / already-owned items |

**Approximate total: $265–$545**, dominated by the two devices themselves
and skewed toward the high end if the Astra Pro can only be sourced
secondhand at a premium. This range, and the Astra Pro's acquisition
difficulty specifically, must be stated in Module 0 before any setup
instructions — not softened, since the design doc explicitly treats
evaluating hardware availability as part of the skill this course teaches.

**Not required and explicitly out of scope for this stage's BOM:** any
robot chassis, motor controller, or mounting rig beyond what's needed to
hold each sensor steady for its own demos — the design doc's §27 capstone
composes sensor *data*, not a physical robot platform, and nothing in the
LOCKED DECISIONS calls for building one.

---

## 10. High-Level Curriculum

Detailed lesson-level design is Stage 3 (Modules 0–3) and Stage 5 (device
modules) work, not this stage's. This is the module map those stages will
expand.

```text
MODULE 0 — Course Onboarding
  Hardware safety, the exact BOM (§9), USB fundamentals including the
  power-delivery failure mode named in §9, how the hardware lab works.

MODULE 1 — Robotics Hardware Fundamentals
  Sensors / actuators / controllers / computers / communication / power,
  and how hardware connects to ROS 2 in general.

MODULE 2 — Understanding Robotic Sensors
  Accuracy, precision, resolution, range, frequency, noise, latency, FOV —
  taught with concrete numbers from §6/§7's real spec tables (e.g. the
  Astra Pro's 60°×49.5° FOV vs. the RPLIDAR's 360°; 0.225°–0.45° angular
  resolution vs. 640×480 pixel resolution), per the kickoff prompt's
  explicit requirement — not taught in the abstract.

MODULE 3 — Hardware-to-ROS 2 Data Pipeline
  Physical world → sensor → signal → digital data → driver → node → topic
  → application, as the shared mental model both device modules plug into.

MODULE 4 — Orbbec Astra Pro (Section A–L template, design doc §22)
  Sections F–I inherit §6's numbered setup sequence directly.

MODULE 5 — RPLIDAR A2 (Section A–L template)
  Sections F–I inherit §7's numbered setup sequence directly.

CAPSTONE — Dual-Sensor Perception System (design doc §27)
  Composes Modules 4 and 5's already-taught devices; introduces basic
  sensor-fusion concepts and system-level debugging across two drivers
  at once. Designed and reviewed through its own Stages 5–7 pass after
  both devices ship.
```

---

## 11. Visual Asset Strategy

This builds directly on what Stage 1 actually shipped, not a restatement of
the design doc's abstract §24 list.

### What's generated (SVG) vs. what's real, per the VISUAL STANDARD

The kickoff file's VISUAL STANDARD section (already binding from Stage 5
onward) and Stage 1's `STAGE_1_SCHEMA_PLAN.md` decision 7 already drew this
line; this stage confirms it applies unchanged to both launch devices:

| Visual type | Source | Per-device count (this catalog) |
|---|---|---|
| Annotated hardware diagram | **Generated SVG** (HTML+SVG, Playwright-captured — same technique as the ROS 2 Fundamentals course's fan-out/timeline/contract diagrams) | 1 per device |
| Working-principle diagram | Generated SVG | 1 per device (light→sensor→depth for Astra Pro; laser→object→reflection→distance for RPLIDAR — design doc §7's own examples) |
| Connection diagram | Generated SVG | 1 per device |
| Data-pipeline diagram | Generated SVG | 1 per device |
| Troubleshooting flowchart | Generated SVG | 1 per device |
| Product hero + close-up photography | **Real photography of our own units — never generated** | Per the shot list already written in `docs/hardware/PHOTOGRAPHY_CHECKLIST.md` (5 shots for RPLIDAR, 6 for Astra Pro) |
| RViz2 / terminal data captures | **Real screenshots of live output — never generated, never faked** | Per the same checklist (3 RPLIDAR captures, 5 Astra Pro captures) |

`docs/hardware/PHOTOGRAPHY_CHECKLIST.md` is treated here as the concrete,
already-decided shot list — this strategy does not restate its contents,
only confirms it's the right and sufficient list for both launch devices and
flags it as the next concrete action once physical units are in hand.

**Foundation-module diagrams (Modules 0–3)** are additional generated SVGs
not covered by the checklist — e.g. the design doc §22's `ROBOT` component
decomposition and the §6 learning-journey chain — Stage 3's job to enumerate
with its own per-diagram educational purpose, per §24.

### Current state — an open item, not a silent gap

Stage 1's own Playwright validation shipped both devices with a labelled
placeholder hero image (a generic category icon, explicitly not presented as
the real product) and empty RViz2/data-capture slots. Per the VISUAL
STANDARD's own rule, this is correctly *not* a permanent placeholder shipped
silently as final — it is tracked, and `PHOTOGRAPHY_CHECKLIST.md`'s own
"After capture" section already specifies exactly how it gets replaced
(update `heroImageSrc`/`heroImageAlt` in `prisma/seed.ts`, re-seed, confirm
the placeholder string is gone). This stage adds nothing new here — just
confirms the plan is real and sufficient, and that it depends on physical
units being acquired (§9) before it can be executed.

### Licensing

Because the plan is to photograph **our own purchased units**, not
manufacturer stock imagery, there is no third-party licensing question for
the primary path — this resolves the open question Stage 1 flagged
("licensing... not resolvable from this session — no physical units, no
license search done"). Manufacturer imagery should be used only as a
last-resort stopgap if a specific angle proves impractical to shoot
ourselves, and only after an explicit permission/license check — never as a
default, and never presented without attribution.

### Engineering note

SVG rendering support (`next.config.ts`'s `dangerouslyAllowSVG` +
`contentSecurityPolicy`) was already added in Stage 1. No further engineering
work is needed for this stage's visual plan to execute.

---

## 12. Video Resource Strategy

Per the VERIFICATION RULE: **no video URL is embedded or claimed-verified in
this document.** That fetch-and-confirm step is explicitly Stage 5's job,
per device, once each module's actual lesson sections exist to place videos
into. This stage only sets the search strategy and acceptance criteria Stage
5 must apply.

### Candidate search terms (starting points, not a final list)

- RPLIDAR A2: `"rplidar_ros ros2 jazzy setup"`, `"RPLIDAR A2 ROS2 tutorial"`,
  `"ros2 LaserScan sensor_msgs tutorial"`, `"2D LiDAR SLAM ROS2 explained"`,
  `"triangulation lidar working principle"`.
- Astra Pro: `"ros2_astra_camera jazzy setup"`, `"Orbbec Astra Pro ROS2"`,
  `"structured light depth camera explained"`, `"RGB-D camera ROS2
  point cloud tutorial"`, `"OpenNI2 depth camera ROS2"`.
- Foundation modules: `"ROS2 sensor fundamentals"`, `"robot perception
  sensors explained"`, `"USB device detection Linux explained"`.

### Acceptance criteria (design doc §23, applied literally)

A candidate must be fetched and confirmed before inclusion, and must pass
all of:

1. **Technical accuracy** — matches what this document and Stage 0's
   findings establish as true (e.g. must not claim `sllidar_ros2` is
   current, must not show the Astra Pro's `master`-branch driver as
   working on Jazzy).
2. **Hardware relevance** — the exact device/SKU, not a lookalike
   (`Astra Pro` vs. `Astra Pro Plus` confusion applies here exactly as it
   does to the driver documentation, §6).
3. **Distro/version relevance** — Jazzy preferred; Humble/Iron acceptable
   only for distro-agnostic conceptual content (e.g. "how triangulation
   LiDAR works" doesn't change per distro). **ROS 1 content is rejected
   outright, no exception**, per the design doc's non-negotiables.
4. **Teaching and production quality** — clear explanation, visible
   terminal/RViz2 output, no significant factual errors observed on watch.

If no suitable video exists for a given lesson section, Stage 5 must say so
explicitly rather than pad the section with a marginal match — same standard
the ROS 2 Fundamentals course held itself to.

Each accepted video records the full metadata block from design doc §23
(title, creator, channel, link, duration, device, course location, version
relevance, why selected, learning outcome) at the point of inclusion, not
before.

---

## 13. Quiz and Assessment Strategy

Per design doc §25 and the kickoff prompt's Stage 5/6 requirements (scenario
and diagnostic items, not just recall).

### Question types, one set per device module plus the foundation modules

1. **Basic understanding** — "what is this device / what problem does it
   solve" — recall-level, used sparingly, mainly in Section A/B of each
   module.
2. **Specification understanding** — must test the *why it matters*, not
   just the value. Example, grounded in this stage's own real numbers:
   *"The Astra Pro's optimal depth range is 0.6–5 m even though its maximum
   range is 8 m. Why would a robot's obstacle-avoidance logic be tuned to
   the optimal range rather than the maximum?"*
3. **Working-principle questions** — test the causal chain (light→sensor→
   depth image; laser→object→reflection→distance), not memorized diagram
   labels.
4. **ROS 2 mechanics** — topics, message types, QoS. Example, grounded in
   §7's actual source-verified fact: *"The RPLIDAR driver publishes
   `/scan` with RELIABLE QoS rather than best-effort. What would you expect
   to happen in RViz2 if it used best-effort instead, given RViz2's default
   subscription settings?"*
5. **Debugging/diagnostic scenarios** — the design doc's own example,
   reused directly: *"Your RPLIDAR is visible in `lsusb`, but the ROS 2
   driver cannot open the serial device. What should you investigate
   next?"* Plus a second, grounded in this device's own real fact:
   *"`lsusb | grep 2bc5` shows only one line after plugging in the Astra
   Pro. What does that tell you, and what do you check first?"*
6. **Practical decision-making** — e.g. *"You're choosing between the
   Astra Pro and the RPLIDAR for a robot that needs to detect a person
   walking across a room from 6 meters away, indoors. Which sensor's
   specifications make it the better primary choice, and why?"*

Every explanation teaches the diagnostic reasoning behind the correct
answer, per §25 — never just "correct/incorrect."

### Structural fit with what's already shipped

`Quiz`/`Exercise` remain unchanged, reused exactly as Stage 1 decided (1:1
relational children of a `LessonContentBlock`, same pattern as the ROS 2
course) — this stage introduces no new quiz mechanics, only new content
sourced from real, verified device facts instead of generic examples.

### Debugging exercises

At least one per device module uses the ROS 2 course's progressive-hint
format (hint 1 → hint 2 → hint 3 → solution, no immediate reveal), per the
kickoff prompt's Stage 5 requirement. §6/§7's failure-mode lists above are
the raw material Stage 5 turns into these — e.g. the Baud Rate Trap and the
`/dev/shm` semaphore hang are both strong candidates precisely because they
produce a real, specific, non-obvious symptom rather than an outright error.

---

## 14. Key Architecture Decisions

1. **Canonical driver names are locked from this stage forward.** RPLIDAR
   A2 → `Slamtec/rplidar_ros`, branch `ros2` (never `sllidar_ros2`). Astra
   Pro → `yosefl20/ros2_astra_camera`, branch `jazzy` (never upstream
   `master`). Stage 4/5 must cite `JAZZY_DEVICE_VERIFICATION.md` rather than
   re-deriving this.
2. **Confidence ratings (HIGH / MEDIUM) are first-class pedagogy, not hedge
   language.** Both ratings are surfaced to learners directly, using the
   real evaluation method that produced them, per §1/§3/§6. This treats
   `HardwareDevice.supportStatus`/`supportStatusNote` as content, not just
   a UI warning banner.
3. **No schema changes this stage.** Everything in §4/§6/§7 fits the
   `HardwareDevice`/`HardwareDeviceSpec`/`HardwareDeviceTopic` model Stage 1
   already shipped. The two-value `HardwareCategory` enum is sufficient for
   this catalog; extending it for a future device (IMU, motor, arm) is an
   additive migration when that device actually arrives, not a redesign —
   confirms Stage 1's own risk note rather than contradicting it.
4. **The Astra Pro's acquisition difficulty is treated as a real launch
   risk, not just a driver-support footnote.** §9's BOM states plainly that
   Orbbec no longer sells the plain Astra Pro new. This may eventually
   warrant a sourcing-guidance note or an alternative-acquisition path in a
   later stage; not solved here, flagged so it isn't lost.
5. **Visual pipeline requires no new engineering.** SVG generation and
   rendering are fully reusable from Stage 1/the ROS 2 course. Photography
   and RViz2 screenshots remain the one genuinely open item, gated on
   physical unit acquisition (§9) and tracked concretely via
   `PHOTOGRAPHY_CHECKLIST.md` — not invented or restated here.
6. **Zero video URLs embedded at this stage**, per the VERIFICATION RULE —
   search strategy and acceptance criteria only (§12); fetch-and-confirm is
   Stage 5's job, per device, once lesson sections exist to place videos
   into.
7. **The Humble-container-bridging-DDS fallback is the standing answer** for
   any future device whose only Jazzy path is fragile or nonexistent — kept
   in reserve for the Astra Pro (not needed as primary) and generalized as
   course policy, consistent with LOCKED DECISION #1's ban on a second
   course distro.

---

Waiting for approval before Stage 3 (Modules 0–3 design).
