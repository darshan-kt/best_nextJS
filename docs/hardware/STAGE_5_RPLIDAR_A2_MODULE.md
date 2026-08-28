# Stage 5 — RPLIDAR A2: Full Module Design (Module 5)

Per `HARDWARE_COURSE_KICKOFF_PROMPTS.md` Stage 5, built from the approved
`docs/hardware/STAGE_4_RPLIDAR_A2_PROFILE.md`, following the Section A–L
template (`ROBOTICS_HARDWARE_AND_SENSORS_COURSE.md` §22, MODULE 5) and the
VISUAL STANDARD. Design output only — no LMS writes.

**Grounding.** Every specification, command, expected output, and failure
signature below traces directly to the RPLIDAR profile — nothing here is
re-derived or re-asserted from memory. Where the profile flagged something
forward for this stage (the troubleshooting flowchart's contents, the
"why it matters" cross-reference to Module 2), this document is where that
gets resolved.

**Format note.** One lesson per Section A–L, following the per-lesson
convention from `docs/course-design/module-*-design.md` and
`STAGE_3_MODULES_0_TO_3_DESIGN.md`: objective, concepts, content-block
sequence, visual requirements, video note, exercise, quiz.

---

## Module 5 Learning Objectives

By the end of this module, the learner can:

- Explain laser triangulation ranging at three depths and state why the
  RPLIDAR A2 uses it instead of time-of-flight.
- Identify their exact A2 sub-model and select the correct launch
  file/baud rate for it — recognizing the Baud Rate Trap on sight if it
  occurs.
- Complete the full verified Jazzy setup path from a fresh Ubuntu 24.04
  machine to a working RViz2 visualization.
- Use the `stop_motor`/`start_motor` services as a real, practical control
  surface, not just read about them.
- Walk the eight-rung diagnostic ladder for this device specifically,
  citing the exact logged signature at each rung rather than guessing.
- Complete a real obstacle-detection practical challenge using live
  `/scan` data.

---

## Section A — Introduction

**Objective:** Answer "what is LiDAR, and why does this specific course
teach it" before any setup content.

**Concepts covered:** LiDAR; 2D LiDAR; why robots use it; this device's
place in the course (device 002, actively maintained, HIGH confidence —
directly contrasted against Module 4's Astra Pro).

**Content block sequence:**
1. **TEXT** — hook: "A robot that can't see walls coming is a robot that
   crashes into them. LiDAR is one of the two ways this course teaches you
   to give a robot that sense — the other being the Astra Pro's depth
   camera."
2. **DEVICE_CARD** (`rplidar-a2`) — first concrete look at the device.
3. **TEXT** — what 2D LiDAR is at a high level: a spinning laser
   rangefinder that measures distance in every direction around itself,
   360° per rotation, many times a second.
4. **CALLOUT** (INFO) — cross-course callback to Module 2 Lesson 1: "You
   already know this device's real range (0.2–16 m depending on sub-model)
   and its 360° field of view — this module goes from those numbers to a
   working sensor on your desk."
5. **TEXT** — why this course leads with confidence framing, not just
   specs: this device is `ACTIVELY_MAINTAINED`, HIGH confidence, officially
   released for Jazzy — the "everything works as documented" case this
   course needed at least one of, in contrast to Module 4's legacy Astra
   Pro.

**Visual requirements:** None new — the `DEVICE_CARD` covers this section's
need; a dedicated introduction diagram isn't justified before any technical
content exists to diagram.

**Video:** See the **Video Curation** section at the end of this document
for the full research record. No video is embedded in Section A.

**Exercise:** None.

**Quiz:** None at section level (module quiz is Section K).

---

## Section B — How It Works

**Objective:** Explain laser triangulation ranging at three depths, sourced
directly from the profile.

**Concepts covered:** Laser triangulation; the RPVision3.0 range engine;
why triangulation trades some range for cost/power.

**Content block sequence:**
1. **TEXT** — intuition (profile §2, verbatim reasoning): imagine a laser
   pointer mounted next to a tiny camera, both spinning together. The laser
   marks a dot on nearby surfaces; the camera watches exactly where that
   dot lands, and simple geometry converts "where the dot landed" into "how
   far away."
2. **IMAGE** — working-principle diagram (see Visual requirements).
3. **TEXT** — simplified technical: this is **triangulation**, not
   time-of-flight — the device measures the *angle* a reflected laser spot
   lands on an internal sensor relative to the emitter's fixed position,
   not how long light takes to return. Quoted directly from Slamtec's own
   product page (fetched during the profile stage): *"RPLIDAR A2 adopts
   laser triangulation ranging principle, and with high-speed RPVision3.0
   range engine, it measures distance data 8000 times per second."*
4. **TEXT** — practical consequence: triangulation is why this device is
   affordable and low-power enough for a course BOM (§9 of the
   architecture doc), and why its published range-resolution tolerance
   *coarsens* at longer range (≤1% up to 12 m, ≤2% from 12–16 m) — the
   same triangulation geometry that makes this device cheap also makes
   fine angular differences harder to resolve at distance. **Cross-
   reference, not re-derivation:** the full accuracy discussion, including
   the ±10 cm/±30 cm worked calculation, already lives in Module 2 Lesson
   2 — this section only connects that already-taught number back to the
   working principle that causes it.
5. **CALLOUT** (TIP) — brushless motor note: the profile confirms (Slamtec's
   own product page) a brushless motor, not belt drive — "this is why the
   unit spins quietly and doesn't wear out the way a belt-driven scanner
   would."

**Visual requirements:**
- **Purpose:** make triangulation ranging visually intuitive, distinct
  from time-of-flight · **Concept:** laser emitter → object → reflected
  spot → angle-sensing receiver → distance via geometry · **Format:**
  simple side-view diagram: emitter and receiver as two fixed points a
  small distance apart, a laser line to a nearby object, a second line
  showing the same laser line to a farther object, and the reflected
  angle at the receiver visibly different between the two — the ge<br>ometry
  itself should be legible, not just labeled · **Status: not yet
  generated** — new SVG · **What the learner should understand:** distance
  is inferred from an *angle*, not a *time delay* — the actual mechanism,
  not a black box.

**Video:** See Video Curation section — none embedded here.

**Exercise:** None — Section I (Practical Demo) is where the learner
handles the real device.

**Quiz:** None at section level.

---

## Section C — Hardware Understanding

**Objective:** Identify the device's physical components and know which
label determines setup choices later.

**Concepts covered:** Rotating head assembly; base/motor housing; USB-
serial adapter board; model/serial label; cable.

**Content block sequence:**
1. **TEXT** — component walkthrough, directly from the profile's physical
   inventory (§3): rotating head (laser emitter + angle-sensing receiver,
   spins continuously — never force it or hold it stationary while
   powered); base/motor housing (brushless motor); USB-to-serial adapter
   board (the CP2102 bridge chip, what a learner actually holds); model/
   serial label (the single most setup-critical label on the device).
2. **IMAGE** — annotated hardware diagram (see Visual requirements).
3. **CALLOUT** (WARNING) — direct callback to Module 0 Lesson 2's laser
   safety content: Class 1, safe under normal operating conditions, but
   never force the rotating head.
4. **TEXT** — bridge to Section D: "Before connecting anything, know
   exactly which numbers apply to your unit — that starts with reading the
   label Section C just pointed at."

**Visual requirements:**
- **Purpose:** let a learner match this diagram against their physical
  unit before touching it · **Concept:** the five physical components from
  §3 of the profile · **Format:** labelled callout diagram over a device
  silhouette — rotating head, base/motor housing, USB adapter board,
  cable, model label location all pointed at directly · **Status: not yet
  generated** — new SVG (real product photography, once
  `PHOTOGRAPHY_CHECKLIST.md` is executed, is the better long-term source
  for this exact diagram's background image per the VISUAL STANDARD, but
  an SVG-only annotated version is the interim asset so this section isn't
  blocked on hardware acquisition) · **What the learner should understand:**
  every component named here is something they'll reference again in
  Sections F–J, not trivia.

**Video:** None — device-specific component identification, no external
video fits.

**Exercise:** None.

**Quiz:** None at section level.

---

## Section D — Specifications

**Objective:** Read the full spec table with every "why it matters"
already established, including the real accuracy tolerance.

**Concepts covered:** All specifications from the profile §1, per-SKU
where relevant.

**Content block sequence:**
1. **SPEC_TABLE** (`rplidar-a2`) — the full, real spec set: measuring
   range, sample rate, rotation speed, angular resolution, serial baud
   rate, system voltage/current, power consumption, weight/dimensions,
   angular range, laser safety class, scan field flatness, operating
   temperature — each already carrying its "why it matters" in the
   underlying `HardwareDeviceSpec` records (Stage 1's schema requires this
   field; Stage 4's profile is the source of truth for populating it when
   Stage 7 seeds these rows).
2. **CALLOUT** (INFO) — the range-resolution/accuracy row gets its own
   pointer rather than being silently one row among many: "This is the row
   Module 2 Lesson 2 uses as its direct worked accuracy example (≤1% of
   range up to 12 m; ≤2% from 12–16 m) — cross-referenced there in full,
   not re-derived here."
3. **TEXT** — the per-SKU differences, named explicitly once more before
   Section F/G need them operationally: A2M7 and A2M12 both use 256000 bps
   and 0.225° angular resolution; A2M8 uses 115200 bps and 0.45° — not a
   uniform "A2" configuration.

**Visual requirements:** None new — `SPEC_TABLE` is this section's entire
visual need, per its own design (Stage 1 decision 2: the block exists
precisely so spec content doesn't need a parallel diagram).

**Video:** None.

**Exercise:** None.

**Quiz:** None at section level.

---

## Section E — Real Applications

**Objective:** Connect the specs just read to real robotics use cases.

**Concepts covered:** Navigation; SLAM; mapping; obstacle detection;
localization.

**Content block sequence:**
1. **TEXT** — the standard 2D LiDAR application list (design doc §9),
   grounded in this device's own range: "A 0.2–16 m range and 360° coverage
   at 10 Hz is exactly the shape of data SLAM algorithms are built to
   consume — a fresh full-room sweep 10 times a second."
2. **TEXT** — one sentence each on navigation (avoid obstacles in real
   time), SLAM (build a map while localizing within it), mapping (build a
   static map for later use), localization (find the robot's own position
   in a known map) — deliberately not re-teaching SLAM/navigation in depth,
   since that's out of this course's scope per the design doc's own
   boundaries; naming where this device's data feeds into those systems.
3. **CALLOUT** (TIP) — "This module doesn't build a SLAM system — it gets
   you to clean `/scan` data. What you do with that data next is where a
   dedicated navigation/SLAM course would pick up."

**Visual requirements:** None new — this section is orientation, not a new
technical concept requiring its own diagram.

**Video:** See Video Curation — none embedded.

**Exercise:** None.

**Quiz:** None at section level.

---

## Section F — Physical Setup

**Objective:** Physically connect the device correctly, including
confirming the sub-model before anything else.

**Concepts covered:** Unboxing; identifying the sub-model; cable
connection; power (bus-powered via USB, no separate supply).

**Content block sequence:**
1. **TEXT** — direct callback to Module 0 Lesson 4's power-budget lesson:
   this device draws a continuous 450–600 mA (§1 of the profile) — plug
   into the powered USB hub from the course BOM, not a bare laptop port,
   especially if the Astra Pro will also be connected later for the
   capstone.
2. **CALLOUT** (WARNING) — **confirm the sub-model before connecting
   anything else.** This is Setup Step 1 in substance even though it's
   physical, not a command: read the label (A2M7 / A2M8 / A2M12) — Section
   G's exact commands depend on getting this right first.
3. **TEXT** — physical connection: adapter board to USB (hub), cable
   secured so the rotating head isn't obstructed, unit placed upright on a
   stable, flat surface (avoid steep tilts — the profile's ±1.5° scan-field
   flatness tolerance is a mechanical spec, not a big constraint, but a
   flat surface removes it as a variable entirely).

**Visual requirements:**
- **Purpose:** show the physical connection path end to end · **Concept:**
  unit → cable → USB adapter board → USB port (via powered hub) ·
  **Format:** simple left-to-right connection diagram · **Status: not yet
  generated** — new SVG, part of the VISUAL STANDARD's required "connection
  diagram" for this device.

**Video:** None.

**Exercise:** None — Section G is where verification commands start.

**Quiz:** None at section level.

---

## Section G — Ubuntu Setup

**Objective:** Install the package, install the udev rule, and confirm
detection — with every command's exact expected output stated, sourced
directly from the profile.

**Concepts covered:** apt install; udev rules; `dmesg`/device detection.

**Content block sequence:**
1. **TEXT** — why this device's install is the "easy" case in this course:
   officially released for Jazzy, no source build (directly contrasted
   against Module 4's Astra Pro, which needs one).
2. **CODE** (bash) —
   ```bash
   sudo apt install ros-jazzy-rplidar-ros
   ```
   **Expected output:** apt resolves and installs `ros-jazzy-rplidar-ros`
   from the official Jazzy package index — no compilation step, no error.
   **What failure looks like:** `E: Unable to locate package
   ros-jazzy-rplidar-ros` means the ROS 2 apt repository itself isn't
   configured on this machine — a Module-0-prerequisite problem (this
   course assumes ROS 2 Jazzy is already installed and working), not an
   RPLIDAR-specific one.
3. **CALLOUT** (INFO) — direct callback, not a re-explanation: "udev — the
   Linux subsystem that names and sets device permissions on plug-in —
   was already introduced in Module 4's Astra Pro setup (Section G). Same
   tool, same reason: without a rule, this device would get a shifting
   auto-assigned name like `/dev/ttyUSB0` instead of the stable
   `/dev/rplidar` the rule below creates."
4. **CODE** (bash) —
   ```bash
   echo 'KERNEL=="ttyUSB*", ATTRS{idVendor}=="10c4", ATTRS{idProduct}=="ea60", MODE:="0777", SYMLINK+="rplidar"' \
     | sudo tee /etc/udev/rules.d/rplidar.rules
   sudo udevadm control --reload-rules && sudo udevadm trigger
   ```
   **Expected output:** the `tee` command echoes the rule line back; the
   `udevadm` commands produce no output on success. **What failure looks
   like:** if the device was already plugged in before this step, the
   symlink may not appear until unplug/replug — the rule applies to new
   enumeration events, not retroactively to an already-enumerated device.
5. **CODE** (bash) —
   ```bash
   dmesg | grep -i "cp210\|ttyUSB"
   ```
   **Expected output:** a line mentioning `cp210x` (the Silicon Labs
   USB-UART bridge driver, kernel module) and a `ttyUSBn` assignment (e.g.
   `ttyUSB0`) with a recent timestamp. **What failure looks like:** no
   matching lines at all means the OS never saw the device — check the
   physical connection and USB power (Module 0 Lesson 4) before assuming a
   software problem; this is the "OS detection" rung of the diagnostic
   ladder, and a failure here means nothing past it can work yet.
6. **CODE** (bash) —
   ```bash
   ls -l /dev | grep rplidar
   ```
   **Expected output:** a symlink line, `rplidar -> ttyUSBn`. **What
   failure looks like:** `ttyUSBn` exists (confirmed in step 5) but no
   `rplidar` symlink — the udev rule (step 4) didn't apply; re-run
   `udevadm control --reload-rules && udevadm trigger`, or unplug/replug.

**Visual requirements:** None new — command blocks with real expected
output carry this section; no diagram improves on literal terminal output.

**Video:** None.

**Exercise:** None — Section G is verification, not yet a full exercise;
Section I's practical demo is where hands-on work is assessed.

**Quiz:** None at section level.

---

## Section H — ROS 2 Integration

**Objective:** Understand the full driver → node → topic → message → QoS
chain for this specific device, including the control-surface services
Module 3 didn't cover.

**Concepts covered:** Package/node/executable names; `/scan`; QoS; the
`stop_motor`/`start_motor` services; launch-file parameter overrides vs.
the node's own defaults.

**Content block sequence:**
1. **TEXT** — direct callback to Module 3 Lesson 2, which already traced
   this exact pipeline using `rplidar-a2-data-pipeline.svg` — this section
   doesn't re-teach the six-stage chain, it fills in what that lesson
   didn't need: the full parameter table and the services.
2. **IMAGE** — `rplidar-a2-data-pipeline.svg`, **reused as-is, confirmed
   sufficient by the profile (§8)** — no new pipeline diagram generated for
   this module.
3. **TEXT** — the parameter table, presented directly from the profile
   §5's most important finding: the node's own compiled-in default baud
   rate is **1,000,000 bps**, matching no A2 sub-model — the correct value
   only ever comes from whichever launch file is actually used. The
   `frame_id` default (`laser_frame`) similarly differs from what every A2
   launch file actually sets (`laser`).
4. **CODE** (bash) — the raw source line, shown as a real artifact, not
   paraphrased:
   ```cpp
   this->get_parameter_or<int>("serial_baudrate", serial_baudrate, 1000000/*256000*/);
   //ros run for A1 A2, change to 256000 if A3
   ```
   **CALLOUT** (WARNING) — "Read this literally: the comment says 'change
   to 256000 if A3' — implying 256000 is fine for A1/A2 by default. The
   actual default value beside it is `1000000`. The comment and the code
   disagree with each other. This is real, current, unfixed source — not
   a hypothetical example."
5. **TEXT** — the two motor-control services, genuinely new content this
   module adds beyond Module 3: `stop_motor` and `start_motor`, both
   `std_srvs/srv/Empty`. **A ROS 2 service is a different communication
   pattern than the topics Module 3 already covered** — instead of a
   continuous stream a node publishes and anyone can subscribe to (like
   `/scan`), a service is a direct, one-off request/response call: you
   call it, it does something (or answers something) once, and returns.
   These two exist precisely because "stop the motor" isn't a stream of
   data — it's a single command. Demonstrated live in Section I.
6. **CODE** (bash) —
   ```bash
   ros2 service list | grep motor
   ```
   **Expected output:** two lines, `/stop_motor` and `/start_motor` (once
   the node from Section I is running). **What failure looks like:** no
   output means the node isn't running yet, or crashed at startup — check
   Section J's ladder from the top.

**Visual requirements:** Covered by the reused pipeline SVG (item 2 above)
— no new asset for this section.

**Video:** None.

**Exercise:** None — Section I is where the learner runs this for real.

**Quiz:** None at section level.

---

## Section I — Practical Demo

**Objective:** Get real `/scan` data flowing and visualized, and use the
motor-control services live.

**Concepts covered:** End-to-end launch; RViz2 visualization; live service
calls; observing real scan changes.

**Content block sequence:**
1. **TEXT** — the full launch sequence, matching the profile's §4 exactly
   (already executed in Section G/H up through udev — this is the final
   step):
2. **CODE** (bash) —
   ```bash
   ros2 launch rplidar_ros view_rplidar_a2m8_launch.py
   ```
   (swap `a2m8` for `a2m7`/`a2m12` per Section F's confirmed sub-model)
   **Expected output:** terminal shows the node starting, RPLidar S/N and
   firmware version logged (`RPLidar S/N: ...`, `Firmware Ver: ...`,
   `RPLidar health status : OK.`), then RViz2 opens automatically with the
   bundled config and a live LaserScan display — **no manual QoS
   configuration needed**, since the publisher's RELIABLE default already
   matches RViz2's default subscription (profile §5). **What failure looks
   like:** covered in full in Section J — this step is the trigger point
   for most of that section's failure modes.
3. **TEXT** — guided observation: arrange 2–3 distinct objects (a box, a
   chair leg, a wall corner) at different distances — the exact scene
   `PHOTOGRAPHY_CHECKLIST.md` already specifies for this device's own
   product photography, reused here for live demonstration too.
4. **CODE** (bash) —
   ```bash
   ros2 topic echo /scan --once
   ```
   **Expected output:** one full `sensor_msgs/msg/LaserScan` message —
   `angle_min`, `angle_max`, `ranges[]` populated with real distance
   values matching the arranged scene. **What failure looks like:** an
   empty or hanging command means the topic isn't publishing — return to
   Section J.
5. **CODE** (bash) — live service demonstration:
   ```bash
   ros2 service call /stop_motor std_srvs/srv/Empty
   ```
   **Expected output:** the physical head visibly stops spinning within
   about a second; the service call returns immediately with an empty
   response. **What failure looks like:** the head doesn't stop — the
   service exists but something's wrong at the SDK/firmware level; a rare
   failure mode, worth noting as "if this happens, the driver's own state
   has diverged from what the physical hardware is doing," not a common
   beginner mistake.
6. **CODE** (bash) —
   ```bash
   ros2 service call /start_motor std_srvs/srv/Empty
   ```
   **Expected output:** the head resumes spinning; `/scan` data resumes
   publishing.
7. **CALLOUT** (TIP) — "You just controlled real hardware state (motor
   on/off) from the command line, independent of killing and restarting
   the whole node. This is what §17 of the design doc means by a
   'practical demonstration' — not just watching data, acting on the
   device."

**Visual requirements:** None new — this section's content is the live
system itself; existing diagrams (pipeline, connection) already cover the
concepts being demonstrated.

**Video:** None.

**Exercise:** None at section level — this section *is* the hands-on work;
Section L carries the assessed practical challenge.

**Quiz:** None at section level.

---

## Section J — Debugging

**Objective:** Walk the eight-rung diagnostic ladder for this device
specifically, with every rung grounded in a real, sourced signature —
teaching the reasoning, not a symptom-lookup table.

**Concepts covered:** The full diagnostic ladder (design doc §18):
connection → power → OS detection → driver → node → topic → data →
visualization, mapped onto this device's ten real failure modes from the
profile.

**Content block sequence:**
1. **TEXT** — framing: "Every failure mode below is real — sourced from
   this device's actual driver code, a real closed GitHub issue, or the
   official README's own text, not invented for this exercise. The ladder
   tells you *where* to look; the exact signature tells you *what you'll
   see* when you're looking in the right place."
2. **TEXT** — walking the ladder, rung by rung, each with its real
   signature:

   **Rung: Connection.** Is the cable seated, and is this the right unit
   for the launch file you're about to run? *Real failure:* an unlisted
   sub-model (A2M6) has no dedicated launch file at all — confirmed via a
   real closed issue (`Slamtec/rplidar_ros#168`, "Where can I download the
   ros2 A2M6-R4 driver?"). *Signature:* no error — just no matching launch
   file to run. Confirm your exact sub-model (Section F) before assuming
   coverage exists.

   **Rung: Power.** Is the port supplying enough current for a continuous
   450–600 mA draw? *Real failure:* insufficient USB power (Module 0
   Lesson 4's own worked example, now literally this device). *Signature:*
   logged `RCLCPP_WARN`, exact string: `"Failed to start motor: %08x"`.

   **Rung: OS detection.** Does `dmesg`/`ls /dev` show the device at all?
   *Real failure:* udev rule not installed/reloaded. *Signature:* `/dev/
   ttyUSB0` works directly but `/dev/rplidar` gives `No such file or
   directory` — the device exists, the *expected path* doesn't.

   **Rung: Driver (the richest rung for this device — three distinct real
   failures land here).**
   - *The Baud Rate Trap* — wrong SKU launch file, or bypassing the launch
     file entirely (relying on the node's own 1,000,000 bps default,
     Section H). *Signature:* `"Error, operation time out.
     SL_RESULT_OPERATION_TIMEOUT!"` — the device-info handshake fails
     because the bytes are framed at the wrong rate, **before any scan
     data would even begin.**
   - *`channel_type` accidentally non-`"serial"`* — a real risk given the
     same package supports TCP/UDP-connected models too. *Signature:*
     `"Error, cannot connect to the ip addr %s with the tcp port %s."`
   - *Serial port permission denied.* *Signature:* `"Error, cannot bind
     to the specified serial port %s."` — the README's own chmod 777
     workaround is documented as not always sufficient (real user report,
     `Slamtec/rplidar_ros#93`); this course's udev-rule path (Section G)
     is primary specifically because of that.

   **Rung: Node.** Did the node start, but reject something at
   initialization? *Real failures:* an internal device-side fault
   (`"Error, RPLidar internal error detected. Please reboot the device to
   retry."` — the fix is stated in the error itself); an invalid manual
   `scan_mode` override (`"scan mode '%s' is not supported by lidar,
   supported modes:"`, followed by the driver printing the actual valid
   list — a rare **self-diagnosing** error worth calling out as a model of
   what a good error message does).

   **Rung: Topic.** Does `/scan` exist? (`ros2 topic list`) If the node
   started (previous rungs clear) but no topic appears, something failed
   silently between node startup and the first publish — return to the
   Node rung's log output rather than assuming a topic-layer problem.

   **Rung: Data.** Does `ros2 topic echo /scan --once` return a real,
   populated message? *Real failure:* physical/cable disconnect
   mid-operation. *Signature:* `"lost connection"` logged, scan data
   stops — a live, zero-risk demonstrable failure (unplug the cable
   mid-scan, Section I).

   **Rung: Visualization.** Does RViz2 render the scan? For this device,
   per the profile, **this rung needs no special QoS handling** — RELIABLE
   matches RELIABLE by default (Section H). If data (previous rung)
   is confirmed good but RViz2 shows nothing, check the Displays panel's
   topic subscription and Fixed Frame — a configuration issue at the
   visualization layer itself, not upstream.

3. **CALLOUT** (INFO) — "One real failure doesn't fit cleanly on the live
   ladder at all: the official README's own setup instructions contain a
   typo — `cd src/rpldiar_ros/` instead of `rplidar_ros`. This is a
   *documentation* bug, not a system failure — if you followed the
   upstream README directly instead of this course's own sequence
   (Section G) and hit `No such file or directory` on that exact line,
   the problem is the README, not your environment."
4. **IMAGE** — troubleshooting flowchart (see Visual requirements).

**Visual requirements:**
- **Purpose:** give the learner a single, scannable flowchart of the
  ladder above, so the reasoning from step 2 has a visual reference to
  return to without re-reading prose · **Concept:** the eight-rung ladder,
  annotated with this device's specific real signatures at each rung ·
  **Format:** vertical flowchart, one box per rung, each box showing its
  real failure(s) and exact signature in small print, arrows flowing
  downward with a "clear, move to next rung" label on each arrow ·
  **Explicitly incorporating what the profile flagged for this asset,
  not the pipeline diagram:** (1) the `stop_motor`/`start_motor` services
  shown as a small side-branch off the Node rung — labeled "control
  surface, not on the data path" — so they're visually distinguished from
  the linear data ladder rather than awkwardly forced into it; (2) the
  Baud Rate Trap's box explicitly labeled at the sub-stage where it
  actually fails — "device-info handshake, before scan data begins" —
  rather than a generic "driver" label, matching the profile's own
  precision · **Status: not yet generated** — new SVG, the VISUAL
  STANDARD's required per-device troubleshooting flowchart · **What the
  learner should understand:** debugging this device is a sequence of
  checkable rungs with real, specific signatures, not a mystery.

**Video:** None.

**Exercise — the progressive-hint debugging exercise (kickoff Stage 5
requirement):**

**DEBUGGING** type, matching the ROS 2 course's established format (hints
revealed one at a time, solution and root cause only after):

- **Scenario:** "You've connected your RPLIDAR A2M8, installed the package
  and udev rule, and confirmed `dmesg` shows the device and `/dev/rplidar`
  exists. You run `ros2 launch rplidar_ros view_rplidar_a2m12_launch.py`
  (you grabbed the wrong launch file by mistake). RViz2 opens, but the
  terminal shows a repeating error instead of a clean startup, and no scan
  ever appears."
- **Hints** (revealed one at a time):
  1. "The device is detected by the OS and has the right permissions —
     Section G's rungs are all clear. The problem is further down the
     ladder. What's the next rung, and what command checks it?"
  2. "Look at the exact terminal text, not just 'it's broken.' Is there a
     specific error string repeating? What does it mention?"
  3. "`SL_RESULT_OPERATION_TIMEOUT` means the initial device-info handshake
     never got a valid reply — that happens when the bytes the driver
     reads don't parse as valid data. What single launch parameter
     controls how those bytes are framed?"
- **Solution:** The A2M12 launch file sets `serial_baudrate` to `256000`,
  but this is a real A2M8 unit, which communicates at `115200`. Re-launch
  with `view_rplidar_a2m8_launch.py` instead.
- **Root cause (shown alongside the solution):** The RPLIDAR A2 family is
  not one uniform configuration — A2M7 and A2M12 both default to 256000
  bps, while A2M8 defaults to 115200 bps (Section D/profile §1). The
  node's own internal default (1,000,000 bps) doesn't match any of them
  either — the correct value only ever comes from choosing the launch file
  that matches the physical label on the unit (Section F).

**Quiz:** None at section level (module quiz is Section K).

---

## Section K — Quiz

Scenario/diagnostic-weighted per §25, including two "spot what's actually
wrong here" items using real artifacts from the profile, per this stage's
own instructions.

1. *Scenario, single choice:* "`dmesg` shows the device, `/dev/rplidar`
   exists, and the launch command runs — but the terminal repeats `Error,
   operation time out. SL_RESULT_OPERATION_TIMEOUT!` and no `/scan` data
   ever appears. What's the most likely cause?" → **The launch file's
   `serial_baudrate` doesn't match this unit's actual sub-model.**
   *Explanation: this exact signature means the device-info handshake
   failed before scan data would even start — the Baud Rate Trap, Section
   J.*
2. **"Spot what's wrong" — single choice**, showing the real source line
   verbatim:
   ```cpp
   this->get_parameter_or<int>("serial_baudrate", serial_baudrate, 1000000/*256000*/);
   //ros run for A1 A2, change to 256000 if A3
   ```
   "What's actually wrong here?" → **The comment implies the default is
   fine for A1/A2 and only needs changing for A3 — but the literal default
   value is `1000000`, which matches none of the A1/A2/A3 baud rates. The
   comment and the code disagree.** *(Distractors: "Nothing — this is
   correct for A2M8" and "The syntax is invalid C++" — both wrong; the bug
   is a comment/value mismatch, not a syntax or A2M8-specific error.)*
   *Explanation: this is real, current source, confirmed by direct curl
   fetch, not a hypothetical teaching example — Section H.*
3. **"Spot what's wrong" — short answer**, showing the real README excerpt
   verbatim:
   ```bash
   cd src/rpldiar_ros/
   source scripts/create_udev_rules.sh
   ```
   "This is from the official README's own udev-rule setup step. What's
   wrong with it, specifically?" → **Accepted answers:** "typo in the
   folder name," "rpldiar_ros is misspelled, should be rplidar_ros,"
   "wrong directory name." *Explanation: a learner following the upstream
   README literally would get `No such file or directory` here — a
   documentation bug, not an environment problem (Section J's own callout).*
4. *Scenario, single choice:* "You call `ros2 service call /stop_motor
   std_srvs/srv/Empty` and the physical head keeps spinning. `/scan` is
   still publishing normally. What does this tell you?" → **The driver's
   software state has diverged from the physical hardware's actual
   state — a rare, SDK/firmware-level issue, not a typical setup
   mistake.** *Explanation: Section I's own framing — this isn't a common
   beginner failure, and treating it as one would send a learner down the
   wrong diagnostic path.*
5. *True/False:* "The RPLIDAR A2's publisher uses best-effort QoS, so
   RViz2 needs a manual QoS override to display `/scan` data." → **False.**
   *Explanation: confirmed directly from source — the publisher uses
   RELIABLE (`rclcpp::QoS(KeepLast(10))`, default reliability), matching
   RViz2's own default subscription. No override needed — Section H/
   Module 3 Lesson 2.*
6. *Single choice:* "Which ROS 2 services does this device's driver expose
   beyond the `/scan` topic?" → **`/stop_motor` and `/start_motor`
   (`std_srvs/srv/Empty`).** *(Distractor: "None — only the /scan topic
   exists" — wrong, and worth including since Module 3's own coarse-
   grained pipeline diagram doesn't show these, making this an easy
   assumption to make incorrectly.)*
7. *Scenario, single choice:* "A learner has an A2M6-labeled unit and
   can't find a matching launch file in the package. What should they
   conclude?" → **This is a real, known gap — no dedicated A2M6 launch
   file exists in the current package (confirmed via a real, still-
   unresolved GitHub issue), and they'll need to adapt an existing
   launch file's parameters by hand rather than assume full SKU coverage.**
   *Explanation: Section J's connection-rung failure mode — not a mistake
   the learner made, a real gap in the package's own coverage.*

**Recap:** The learner has moved from "what is LiDAR" through a fully
verified setup, real ROS 2 integration including two services Module 3
never covered, and a complete diagnostic ladder walk grounded entirely in
real, sourced signatures rather than invented symptoms.

**Connection to Section L:** "Every piece is in place — real hardware,
real data, a debugging method you've now practiced. Section L asks you to
use it for something a robot would actually need."

---

## Section L — Practical Challenge

**Objective:** Use live `/scan` data to solve a real, open-ended
obstacle-detection task, applying setup, ROS 2 inspection, and debugging
skills together without step-by-step instructions.

**Content block sequence:**
1. **TEXT** — the challenge, matching the design doc's own example
   directly: *"Detect obstacles around your robot using the LiDAR — write
   or run something that reports when an object comes within a chosen
   distance threshold in any direction, using real `/scan` data."*
2. **EXERCISE** (below).

**Exercise — INDEPENDENT:**

- **Goal:** Using the live `/scan` topic, detect when any object enters a
  chosen distance threshold (e.g. 1 meter) anywhere in the 360° scan, and
  report it (a printed message is sufficient — no robot motion required).
- **Success criteria:**
  - Correctly subscribes to `/scan` and reads the `ranges[]` array.
  - Correctly threshold-checks against a chosen distance, ignoring `inf`/
    out-of-range values rather than treating them as "very close."
  - Demonstrates the detection live by moving an object toward and away
    from the sensor and observing the report change accordingly.
  - Can explain, if asked, which `LaserScan` fields they used
    (`angle_min`, `angle_increment`, `ranges`) and why.
- **Hints available** (not shown until requested): pointing toward
  `ros2 interface show sensor_msgs/msg/LaserScan` to inspect the message
  shape directly rather than guessing field names; a reminder that
  `ranges[]` order corresponds to `angle_min` + `i * angle_increment`, not
  an arbitrary order.

**Visual requirements:** None new — this section is assessed application
of every prior asset; no new diagram is warranted.

**Video:** None.

**Quiz:** None — Section L is assessed via the exercise, not a quiz.

---

## Visual Asset Summary for This Module

| Visual | Status | Notes |
|---|---|---|
| Working-principle diagram (Section B) | Not yet generated — new SVG | Triangulation geometry, side-view |
| Annotated hardware diagram (Section C) | Not yet generated — new SVG | Interim SVG-only; real photography backdrop is a future upgrade once `PHOTOGRAPHY_CHECKLIST.md` executes |
| Connection diagram (Section F) | Not yet generated — new SVG | Simple linear connection path |
| Data-pipeline diagram (Section H) | **Already generated, reused as-is** | `rplidar-a2-data-pipeline.svg`, confirmed sufficient by the Stage 4 profile — no changes |
| Troubleshooting flowchart (Section J) | Not yet generated — new SVG | The one diagram this stage had to design from scratch content-wise; explicitly folds in the motor-control services (as a side-branch, not on the data path) and the Baud Rate Trap's precise sub-stage, per the profile's own flag |
| Product hero photography | **Not yet captured** | Still the Stage 1 placeholder; unchanged since Stage 3's check — `DEVICE_CARD` blocks in this module correctly continue to show it until `PHOTOGRAPHY_CHECKLIST.md` executes |

Four new SVGs, one reused SVG, zero new photography this stage — matches
the approved Visual Asset Strategy exactly (SVG-generated diagrams need no
new engineering; photography remains gated on physical unit acquisition).

---

## Video Curation

Per the VERIFICATION RULE (hardened after Stage 4): no URL is embedded
without being fetched first to confirm it resolves *and* matches its
description — resolving alone is not sufficient. This section records the
actual research done this stage, not a placeholder.

**Search terms used:** `"how 2D LiDAR triangulation ranging works
explained video"`, `"RPLIDAR A2 ROS2 tutorial setup video"`, targeted
`site:youtube.com` searches for both the working-principle and setup
angles.

**Candidates found and their disposition:**

1. **"Lidar Technologies 101"** (Hesai Technology,
   `youtube.com/watch?v=3EehCU3csJQ`) — **existence and title confirmed**
   via YouTube's oEmbed endpoint (real channel, real video). **Not
   included.** This tool environment cannot retrieve the video's actual
   description or transcript (YouTube's watch page is client-rendered;
   WebFetch returns only static footer content), so this course's specific,
   load-bearing technical claim — that the RPLIDAR A2 uses *triangulation*
   ranging, not time-of-flight — could not be confirmed as something this
   video actually covers in depth, versus a broad multi-technology overview
   (a real risk: Hesai's own commercial products are primarily
   time-of-flight/FMCW, not triangulation). Per the rule, existence is not
   the same as content match — flagged as a candidate for a human with
   direct video access to verify before Stage 7, not included on partial
   verification.
2. **"How to use SLAMTEC RPLidar in ROS2?"** and **"Install and Run Lidar
   In ROS2, Ubuntu, and Raspberry Pi - Complete Tutorial"** — **explicitly
   rejected, not silently skipped.** A follow-up search surfaced the exact
   commands both videos teach: `ros2 launch sllidar_ros2
   view_sllidar_a1_launch.py`. `sllidar_ros2` is the package this course's
   own research (Stage 0 §1.1, corrected in the kickoff file's own
   VERIFICATION RULE section) determined is superseded and has never been
   released through the ROS build farm for any distro — precisely the
   wrong package this course teaches learners *not* to use. Including
   either video would directly contradict Section H's own content.
3. A third candidate, explicitly Jazzy-titled ("Install and Run Lidar in
   Raspberry Pi 5 and ROS2 Jazzy Linux Ubuntu") from the same
   apparent author/series as candidate 2 — **not pursued further** given
   the strong pattern from its companion video; treated as unverified
   rather than assumed innocent, consistent with the rule placing the
   burden of proof on inclusion, not exclusion.

**Outcome: no video is embedded anywhere in Module 5.** Every section
above states "None" for video with this record as the reason. This is a
deliberate methodology outcome, not an oversight — Section B's working-
principle diagram (new SVG) and the profile's own quoted, source-verified
explanation already carry that section's teaching need without a citation
this stage couldn't fully stand behind.

---

Waiting for approval, then the Astra Pro module — which will also need an
explicit decision on the missing two-parallel-chains pipeline SVG before
its own design can finish.
