# Stage 4 — RPLIDAR A2: Deep Technical and Learning Profile

Per `HARDWARE_COURSE_KICKOFF_PROMPTS.md` Stage 4 and PHASE 3 of
`ROBOTICS_HARDWARE_AND_SENSORS_COURSE.md`. Profile only — no lesson content,
no LMS writes.

**Grounding, stated plainly.** This profile starts from
`docs/hardware/JAZZY_DEVICE_VERIFICATION.md` §1 (Stage 0) and
`docs/hardware/STAGE_2_PHASE_1_RESEARCH_AND_ARCHITECTURE.md` §7 (Stage 2),
then goes deeper: every ROS 2 integration fact below (parameters, defaults,
QoS, services, log messages) is read from the actual source of
`Slamtec/rplidar_ros` at the current `ros2` branch head, fetched fresh this
session (2026-08-29) — not re-derived from Stage 0's summary of the same
repo, and not from documentation prose. Where this profile's own reading
differs from or sharpens Stage 0's framing, that's called out explicitly
rather than silently overwritten.

**A methodology note worth recording, not just a result.** Early in this
session, three different fetches of "the same fact" (the Jazzy release
version of `rplidar_ros`) produced three different numbers: `2.1.4`,
`2.0.3-1`, and `2.1.0-4` — from an AI-summarized read of the ROS Index page,
an AI-summarized read of the raw `distribution.yaml`, and Stage 0's original
finding, respectively. Re-fetching the raw YAML with `curl | grep` (no
summarization step) resolved this deterministically: the released version
is **`2.1.0-4`**, `status: developed`, unchanged since Stage 0 — matching
Stage 0 exactly, and the two summarized reads were simply wrong. Every
source-code fact in this profile (parameters, defaults, log strings, launch
file values) was verified the same way — `curl` the raw file, `grep`/read it
directly — precisely because this session already caught its own tool
producing two different wrong answers for one real fact. This is the same
"trust upstream, don't smooth over a discrepancy" standard Stage 0 set,
applied here to this session's own research process, not just to upstream
docs.

---

## 1. Full Specifications

Source: `https://www.slamtec.com/en/lidar/a2spec`, re-fetched and confirmed
unchanged since Stage 2 (checked 2026-08-29).

| Specification | A2M7 | A2M8 | A2M12 | Why it matters |
|---|---|---|---|---|
| Measuring range | 0.2 – 16 m | 0.2 – 12 m | 0.2 – 12 m | Sets the usable detection envelope; a robot's obstacle-avoidance planning distance must sit comfortably inside this, not at its edge. |
| **Range resolution (new this stage — not surfaced in Stage 2's fetch)** | ≤1% of range (≤12 m); ≤2% of range (12–16 m) | ≤1% of range (≤12 m); ≤2% of range (12–16 m) | ≤1% of range (≤12 m); ≤2% of range (12–16 m) | This is the closest thing to a published accuracy figure this device has — worth flagging explicitly, since Stage 3's Module 2 Lesson 2 noted that *neither* device publishes a separate numeric accuracy tolerance. That was true for the Astra Pro; **this row shows it is not fully true for the RPLIDAR** — a real correction this deeper pass caught by reading the full spec page rather than trusting an earlier summarized read of it. At 10 m, this means readings are accurate to roughly ±10 cm — precise enough to name a real number in Module 5, unlike the Astra Pro. |
| Sample rate | 16 K/s | 8 K/s | 16 K/s | More samples per second at the same rotation speed = finer angular resolution per sweep. |
| Rotation speed | 10 Hz (5–15 Hz adjustable) | 10 Hz (5–15 Hz adjustable) | 10 Hz (5–15 Hz adjustable) | Trade-off between scan freshness and points-per-revolution. |
| Angular resolution | 0.225° | 0.45° | 0.225° | Determines whether two close/thin obstacles resolve as distinct returns or merge into one. |
| **Serial baud rate** | 256000 bps | 115200 bps | 256000 bps | Not uniform within the A2 family — see the Baud Rate Trap in §6. |
| System voltage / current | 5 V / 450–600 mA | same | same | Continuous draw this size is a real cause of USB power-budget exhaustion (Module 0). |
| Power consumption | 2.25–3 W | same | same | Same. |
| Weight / dimensions | 190 g, H 41 mm × dia. 76 mm | same | same | Relevant for mounting, including the capstone's dual-sensor rig. |
| Angular range | 360°, all models | | | The device's headline contrast against the Astra Pro's fixed 60°×49.5° cone. |
| **Laser safety class** | Class 1, all models | | | Confirmed directly from the spec page — safe under normal operating conditions; grounds Module 0's safety lesson in a real, checkable rating rather than a vague "be careful" instruction. |
| Scan field flatness | ±1.5°, all models | | | Mechanical tolerance of the scan plane — relevant only if mounting the unit at a steep tilt, worth a one-line mention in the physical-setup section, not a full lesson. |
| Operating temperature | 0 °C – 40 °C | | | A real constraint for any outdoor or unheated-space capstone extension. |

---

## 2. Working Principle, at Three Depths

Source for the ranging method: `https://www.slamtec.com/en/lidar/a2`, fetched
this session (2026-08-29) — quoted, not paraphrased from memory: *"RPLIDAR
A2 adopts laser triangulation ranging principle, and with high-speed
RPVision3.0 range engine, it measures distance data 8000 times per
second."* The page also confirms a **brushless motor**, explicitly
contrasted against belt-drive designs, as the reason the unit spins quietly
and with low mechanical wear.

**Intuition.** Picture a laser pointer mounted next to a tiny camera, both
spinning together, very fast. The laser shines a dot on whatever is nearby;
the camera watches exactly where that dot lands. When something is close,
the dot appears at one spot in the camera's view; when something is far
away, the dot appears at a different spot. The device is constantly doing
simple geometry — "given where the dot landed, how far away must that
surface be?" — for every direction, 8,000 times a second, while spinning a
full circle roughly ten times a second.

**Simplified technical.** This is **laser triangulation**, not
time-of-flight: the device doesn't measure how *long* light takes to
return (which would require timing light-speed delays with extreme
precision), it measures the *angle* at which a reflected laser spot lands
on an internal sensor, relative to the laser emitter's fixed position. A
small emitter-to-sensor offset and simple trigonometry (hence
"triangulation") converts that angle into a distance. The brushless motor
spins the entire emitter/sensor assembly, so this angle measurement
repeats at every orientation across a full 360° sweep, producing one
complete `LaserScan` per rotation.

**Practical consequence.** Triangulation ranging trades some absolute
range (compared to time-of-flight LiDAR) for genuinely low cost and low
power draw appropriate to a course budget (§9 of the Stage 2 architecture
doc) — this is *why* a hobbyist-accessible LiDAR like this exists at all.
It also means range accuracy degrades somewhat with distance (finer
triangulation angles get harder to resolve precisely as the reflected spot
moves less per unit of distance far away) — directly consistent with §1's
range-resolution row above, which publishes a *coarser* tolerance
(≤2% instead of ≤1%) specifically beyond 12 m.

---

## 3. Physical Component Inventory

Grounded in the official dimensions/weight (§1) and
`docs/hardware/PHOTOGRAPHY_CHECKLIST.md`'s own shot list, which already
identifies the components worth a dedicated photograph:

- **Rotating head assembly** — contains the laser emitter and the
  angle-sensing receiver together; this is the part that physically spins.
  Must never be forced or held stationary while powered (Module 0 safety
  lesson).
- **Base/motor housing** — contains the brushless motor driving the head;
  this is what a mounting bracket or surface actually contacts.
- **USB-to-serial adapter board** — a small external PCB the unit's cable
  terminates in before reaching a standard USB port; carries the CP2102
  bridge chip the udev rule matches on (§5). This, not the sensor head
  itself, is what a learner actually holds and plugs in — already the
  photography checklist's own framing, confirmed consistent here.
- **Model/serial label** — physically printed on the unit, the only
  reliable way to confirm the exact sub-model (A2M7/A2M8/A2M12/other) before
  choosing a launch file — the single most safety-critical label on the
  device from a *setup* standpoint, even though nothing about it is an
  electrical safety concern.
- **Cable and connector** — fixed captive cable from the head/base assembly
  to the USB-serial adapter board.

No user-serviceable components beyond these — the design doc's §4 template
calls for "sensors, lenses, connectors" per device, and for a 2D LiDAR the
lens equivalent is the laser/receiver window integrated into the rotating
head, not a separable part.

---

## 4. Verified Jazzy Setup Path

**This section matches `JAZZY_DEVICE_VERIFICATION.md` §1.3a exactly — no
drift.** Re-verified this session against the current `ros2` branch head
(commit content fetched 2026-08-29; §1.3a was checked 2026-08-27) — nothing
has changed.

```bash
# 1. Install the officially released Jazzy package — no source build needed.
sudo apt install ros-jazzy-rplidar-ros

# 2. udev rule, so the device gets a stable /dev/rplidar symlink instead of
#    a shifting /dev/ttyUSBn. Do this once, not as a build step.
#    Vendor 10c4 / product ea60 = the CP2102 USB-UART bridge on the A-series
#    adapter cable — confirmed at scripts/rplidar.rules in the package source.
echo 'KERNEL=="ttyUSB*", ATTRS{idVendor}=="10c4", ATTRS{idProduct}=="ea60", MODE:="0777", SYMLINK+="rplidar"' \
  | sudo tee /etc/udev/rules.d/rplidar.rules
sudo udevadm control --reload-rules && sudo udevadm trigger

# 3. Confirm A2 sub-model before launching — this determines which launch
#    file and baud rate are correct. Check the label on the unit itself
#    (A2M7 / A2M8 / A2M12), or use dmesg after plugging in.
dmesg | grep -i "cp210\|ttyUSB"

# 4. Launch with RViz2, using the correct SKU (A2M8 shown; swap a2m8 for
#    a2m7 or a2m12 to match the actual unit):
ros2 launch rplidar_ros view_rplidar_a2m8_launch.py
```

Expected: `/scan` (`sensor_msgs/msg/LaserScan`) publishing at the driver's
scan rate; RViz2 opens with the bundled `rviz/rplidar_ros.rviz` config and
subscribes without any QoS changes (RELIABLE matches RELIABLE — §5).

**One addition this deeper pass surfaces, worth folding into Stage 5's
setup narrative even though it doesn't change the commands above:** the
README's own udev-rule step (fetched verbatim this session) contains a
real, verifiable typo:

> ```bash
> cd src/rpldiar_ros/
> source scripts/create_udev_rules.sh
> ```

`rpldiar_ros` is misspelled (should be `rplidar_ros`, the actual cloned
directory name from the README's own earlier `git clone` step). A learner
copy-pasting this exact line gets `No such file or directory` — this
course's setup instructions (§4 above, matching §1.3a) sidestep it by
running `create_udev_rules.sh`'s underlying commands directly rather than
relying on the shell script wrapper, so it does not affect this course's
own verified path, but it's worth a one-line callout in Module 5 ("if
you're reading the official README directly instead of this course, that
`cd` line has a typo") since a learner who goes to the source will hit it.

---

## 5. ROS 2 Integration Surface

Read directly from `Slamtec/rplidar_ros`, `ros2` branch head,
`src/rplidar_node.cpp` and the three A2 launch files, fetched and grepped
this session (2026-08-29) — not documentation guesses.

- **Package:** `rplidar_ros`. **Executable/node:** `rplidar_node`
  (class `RPlidarNode`).
- **Published topic:** name configurable via the `topic_name` parameter
  (default `"scan"`, i.e. `/scan`); message type
  `sensor_msgs/msg/LaserScan`.
- **Publisher QoS:** `rclcpp::QoS(rclcpp::KeepLast(10))` — default
  reliability, which is **RELIABLE**. Confirmed unchanged from Stage 0.
- **Services (not previously captured in Stage 0's findings — new this
  stage):** `stop_motor` and `start_motor`, both `std_srvs/srv/Empty`.
  Real, callable control surface distinct from the `/scan` data pipeline —
  a learner can halt/resume the spinning head from the CLI
  (`ros2 service call /stop_motor std_srvs/srv/Empty`) without killing the
  node, a genuinely useful practical-demo moment the design doc's §17
  "practical demonstrations" section doesn't currently name.
- **Full parameter set, with source-code defaults vs. what the A2 launch
  files actually override** (the gap between these two columns *is* the
  Baud Rate Trap's real mechanism — see §6):

  | Parameter | Node's own built-in default | A2M7/A2M12 launch value | A2M8 launch value |
  |---|---|---|---|
  | `channel_type` | `"serial"` | `"serial"` | `"serial"` |
  | `serial_port` | `"/dev/ttyUSB0"` | `"/dev/ttyUSB0"` | `"/dev/ttyUSB0"` |
  | `serial_baudrate` | **`1000000`** | `256000` | `115200` |
  | `frame_id` | `"laser_frame"` | `"laser"` | `"laser"` |
  | `inverted` | `false` | `false` | `false` |
  | `angle_compensate` | `false` | `true` | `true` |
  | `scan_mode` | `""` (empty — driver's own internal default) | `"Sensitivity"` | `"Sensitivity"` |
  | `scan_frequency` | `10.0` | (unset, uses node default) | (unset, uses node default) |
  | `topic_name` | `"scan"` | (unset) | (unset) |
  | `flip_x_axis`, `auto_standby` | `false` | (unset) | (unset) |

  **This table itself is the profile's most important finding.** The node's
  own compiled-in `serial_baudrate` default is **1,000,000 bps** — matching
  *none* of the A2 sub-models. Line 96 of the source even carries a stale
  inline comment describing old guidance that no longer matches the code
  next to it: `//ros run for A1 A2, change to 256000 if A3` — but the
  literal default value is `1000000`, not the `256000` the comment implies.
  This means the correct baud rate for *any* A2 unit is never a property of
  the node — it only ever comes from whichever launch file (or manually
  supplied parameter) the learner actually uses. Also worth noting:
  `frame_id`'s node-level default (`"laser_frame"`) differs from what every
  A2 launch file actually sets (`"laser"`) — a second, lower-stakes instance
  of the same pattern (the launch file's values, not the node's hardcoded
  defaults, are what a learner actually experiences).

- **Launch files** (full list confirmed from the README, fetched this
  session): per-model `view_*_launch.py` files exist for A1, A2M7, A2M8,
  A2M12, A3, S1 (plus a TCP variant), S2, S2E, S3, T1, and C1. **No
  `view_rplidar_a2m6_launch.py` exists** — see §6, failure mode 10.
- **Build dependencies** (`package.xml`, fetched this session):
  `rclcpp`, `sensor_msgs`, `std_srvs`, `rclcpp_components` — all standard
  ROS 2 packages, no unusual native library dependency, consistent with
  this device's HIGH confidence rating and low-friction official-apt
  install path.
- **Package version note:** `package.xml`'s own `<version>` field on the
  current `ros2` branch head reads `2.1.4` — newer than the `2.1.0-4`
  actually released to Jazzy's buildfarm (§ intro methodology note above,
  and Stage 0's original release-lag finding, `Slamtec/rplidar_ros#164`).
  This profile treats `2.1.0-4` as the authoritative *installed* version
  for this course (what `apt install ros-jazzy-rplidar-ros` actually
  delivers), and `2.1.4` as "what's in source but not yet released" — the
  precise shape of the release lag, not a new contradiction.

---

## 6. Ten Most Likely Failure Modes, with Diagnostic Signatures

Each grounded in a real source: the driver's own logged error strings
(`RCLCPP_ERROR`/`RCLCPP_WARN` calls, read directly from
`src/rplidar_node.cpp`), a real GitHub issue, or the README's own text —
not invented.

1. **The Baud Rate Trap** — wrong SKU launch file for the physical unit,
   *or* running the node directly/via a custom launch setup that never
   overrides `serial_baudrate` (§5's table — the node's own default,
   1,000,000 bps, matches no A2 sub-model). **Diagnostic signature:** the
   device appears in `lsusb`/`dmesg`, the udev symlink exists, but the node
   logs `"Error, operation time out. SL_RESULT_OPERATION_TIMEOUT!"` at
   startup — the initial device-info/health handshake fails because the
   bytes it reads are framed at the wrong rate. This is a sharper, more
   precise signature than "garbled scan data" — the failure surfaces as a
   **logged startup error**, before any scan data would even begin.
2. **`channel_type` accidentally left at a non-`"serial"` value** — a
   realistic mistake given the same package also supports TCP/UDP-connected
   models (S1's TCP variant, per the launch-file list in §5) — copying
   parameters from the wrong example. **Diagnostic signature:**
   `"Error, cannot connect to the ip addr %s with the tcp port %s."` — a
   real, exact logged string, immediately pointing at the actual
   misconfigured field.
3. **Serial port permission denied.** The README's own recommended
   workaround (`sudo chmod 777 /dev/ttyUSB0`) is documented as not
   universally sufficient — real user report in
   `Slamtec/rplidar_ros#93`, closed without the reporter confirming a fix
   worked. **Diagnostic signature:** `"Error, cannot bind to the specified
   serial port %s."` — the README's own text calls the udev-rule path (§4)
   "a better way" than the chmod workaround, which this course's setup
   sequence already uses as primary, not as a fallback.
4. **udev rule not installed or not reloaded.** The device is fully
   functional at `/dev/ttyUSB0`, but the expected `/dev/rplidar` symlink
   never appears. **Diagnostic signature:** any command referencing
   `/dev/rplidar` fails with a plain `No such file or directory`, while the
   same command against `/dev/ttyUSB0` directly may succeed — teaches the
   distinction between "the device exists" and "the path this course's
   instructions expect exists."
5. **The official README's own typo** (§4): `cd src/rpldiar_ros/` instead
   of `rplidar_ros` in its udev-rule setup step. A learner following the
   upstream README directly (not this course's own already-correct
   sequence) hits a `No such file or directory` from a documentation bug,
   not a real environment problem — a genuinely good "official docs aren't
   infallible, read the error before assuming you did something wrong"
   moment.
6. **Insufficient USB port power** (directly reusing Module 0's own cited
   fact — the motor's continuous 450–600 mA draw). **Diagnostic signature:**
   `"Failed to start motor: %08x"` — a real, distinct logged warning
   (`RCLCPP_WARN`), not a symptom the learner has to infer from silence.
7. **Device-side internal fault**, unrelated to any setup step —
   the SDK's own health-check reports an internal error. **Diagnostic
   signature:** `"Error, RPLidar internal error detected. Please reboot the
   device to retry."` — the fix (power-cycle) is explicit in the error
   text itself, worth teaching as "read the whole error message, sometimes
   it already tells you the fix."
8. **Physical/cable disconnect mid-operation.** A learner may assume a
   successful launch means the connection is stable indefinitely.
   **Diagnostic signature:** `"lost connection"` logged, scan data stops —
   a real, live-demonstrable failure mode (unplug the cable mid-scan) with
   zero risk to the hardware.
9. **Invalid custom `scan_mode` override.** If a learner manually sets
   `scan_mode` to something the specific unit doesn't support.
   **Diagnostic signature — self-diagnosing:**
   `"scan mode '%s' is not supported by lidar, supported modes:"` followed
   by the driver printing the actual valid list — a rare case where the
   error message itself is the complete answer, worth calling out as a
   model of what a *good* error message does.
10. **An unlisted/older sub-model (e.g. A2M6).** No `view_rplidar_a2m6_*`
    launch file exists in the current package (§5's launch-file list, and a
    real user hit exactly this — `Slamtec/rplidar_ros#168`, "Where can I
    download the ros2 A2M6-R4 driver?", closed without an official
    resolution visible in the listing). **Diagnostic signature:** no error
    at all — just no matching launch file to run. This course does not
    have verified confirmation of the A2M6's exact baud rate and states
    that honestly rather than guessing; a learner with this specific
    sub-model needs to adapt an existing launch file's parameters by hand,
    starting from the closest documented variant and confirming with
    `dmesg`/serial testing rather than assuming coverage exists.

---

## 7. Unique Learning Opportunities

- **A real, no-fault-required debugging exercise** (failure mode 1): the
  Baud Rate Trap requires no broken hardware to construct — just the wrong
  launch file — and produces a precise, logged, source-verified symptom
  (`SL_RESULT_OPERATION_TIMEOUT`) rather than a vague "nothing works."
- **"The driver's defaults aren't the manufacturer's defaults" as a
  transferable lesson.** §5's parameter table shows the node's own
  hardcoded defaults (1,000,000 bps, `frame_id: laser_frame`) diverge from
  what every actual launch file sets. This generalizes directly to any
  future ROS 2 driver: never trust a package's internal default without
  checking what the launch file you're actually using overrides.
- **A genuinely self-diagnosing error message** (failure mode 9) —
  contrasted directly against several failure modes whose messages require
  real diagnostic reasoning (failure modes 1, 3, 6), giving Module 5 a
  natural before/after pair for "what makes an error message actually
  useful."
- **A real published accuracy proxy** (§1's range-resolution row) — unlike
  the Astra Pro (Stage 3's Module 2 Lesson 2), this device *does* publish a
  distance-tolerance figure, letting Module 5 teach accuracy with an actual
  number (≤1%/≤2% of range) instead of only the qualitative reasoning
  Module 2 had to fall back on.
- **Reading official documentation critically.** Two real, verified,
  low-stakes documentation issues exist in this single package: a stale
  source-code comment (§5) and a README typo (§4/§6). Both are safe,
  concrete evidence for the course's own standing message — verify against
  source, don't take any single document (including a manufacturer's own)
  as automatically correct.
- **A live, harmless "break it on purpose" demo** (failure mode 8):
  physically unplugging the cable mid-scan is a zero-risk way to show a
  learner exactly what a real disconnect looks like in the logs, RViz2, and
  `ros2 topic echo` simultaneously.

---

## 8. Does `rplidar-a2-data-pipeline.svg` Still Cover This Profile's Needs?

**Checked directly against the diagram's actual content** (its text nodes,
inspected this session): six stages — Hardware (RPLIDAR A2) → Driver
(`rplidar_ros`) → ROS 2 Node (`rplidar_node`) → Topic (`/scan`, RELIABLE
QoS) → Message (`sensor_msgs/msg/LaserScan`) → Visualization (RViz2, no
QoS override needed).

**Verdict: it remains fully accurate and does not need changes — but this
deeper profile does surface two things it was never meant to show, both
better suited to new Stage 5 assets than to editing this one:**

1. **The two motor-control services (`stop_motor`/`start_motor`) are
   entirely outside this diagram's scope**, correctly so — they're a
   control-plane surface, not part of the `/scan` data pipeline the
   diagram depicts. Module 5 will want its own small callout or a second,
   simple diagram for the "ROS 2 integration surface" as a whole (topics
   *and* services together), matching how the design doc's §21 catalog
   entry lists "Topics" and a services/actions line as siblings, not one
   folded into the other.
2. **The exact sub-stage where the Baud Rate Trap actually fails** — the
   device-info/health handshake inside driver startup, before scan data
   ever begins flowing — is a level of granularity the six-stage diagram's
   "Driver" box was never meant to expose, and Module 3's own design intent
   (a device-agnostic, coarse-grained model) is correct to leave it out.
   This belongs in Module 5's own **troubleshooting flowchart** — already a
   required visual per the VISUAL STANDARD's per-device list — as new
   content for that asset, not a request to modify the existing pipeline
   SVG.

No change to the existing asset is recommended. Both gaps are inputs for
Stage 5's own new visuals, flagged forward rather than acted on here.

---

Waiting for approval, then the Orbbec Astra Pro profile follows the same
process before Stage 5.
