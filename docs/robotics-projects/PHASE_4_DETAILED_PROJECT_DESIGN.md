# PHASE 4 — DETAILED PROJECT DESIGN
## Hands-On Robotics Projects with ROS 2 Jazzy — Module 0 + Project 1

**Status of this document: PART 1 of 3.** Per the master file's own instruction to work in phases rather than producing a wall of untested detail in one shot, this covers **Module 0 (Lab Zero)** and **Project 1 (Obstacle Avoidance)** only. Projects 2–4 follow in subsequent parts once this is reviewed.

Everything in this document is **THEORETICALLY DESIGNED**, not **PHYSICALLY VALIDATED** — per the master file's Phase 6 rule, no claim of physical success is made anywhere below. Physical validation is a later phase.

### Correction carried forward from Phase 3

- D435i + Jazzy support is **confirmed** (librealsense 2.56.1 / realsense-ros 4.56.1 add Ubuntu 24.04/Jazzy support) — no longer flagged as unverified.
- The real, more specific risk is **D435i USB detection failing on Jetson Orin Nano + JetPack 6.0** — a kernel/USB issue, not a ROS issue. Module 0's camera checkpoint is therefore split into two independently-debuggable steps: hardware detection (`lsusb` / `realsense-viewer`) **before** touching ROS at all, then ROS driver bring-up as a separate checkpoint.
- The `libzstd` arm64 apt-conflict risk from Phase 3 §2 is carried forward unchanged.

---

## MODULE 0 — LAB ZERO

### 0.1 Purpose

Build the shared infrastructure (`robot_description`, `robot_bringup`) exactly once, verify every sensor and the base driver at both the hardware layer and the ROS layer, resolve the `use_ekf` configuration question from Phase 2 §3 as a concrete on-robot exercise, and produce one working `robot_bringup bringup.launch.py` that every later project builds on. Nothing project-specific happens here.

### 0.2 Workspace Creation

```
STEP 1: mkdir -p ~/robot_projects_ws/src
STEP 2: Place robot_description/ and robot_bringup/ (Phase 2 §2 file trees) into src/
STEP 3: cd ~/robot_projects_ws && colcon build --symlink-install
STEP 4: source install/setup.bash (and add to ~/.bashrc for persistence)
```

### 0.3 Environment Sanity Check (replaces Phase 1's full OS decision tree)

Per the user's clarification, the Jetson is assumed to already have ROS 2 Jazzy installed and working. Module 0 confirms this lightly rather than re-deriving it:

```
ros2 doctor                 → should report no critical issues
printenv ROS_DISTRO         → should print "jazzy"
ros2 topic list             → should run without error (empty list is fine, confirms daemon is alive)
```

**Named troubleshooting step — `libzstd` arm64 conflict (Phase 3 §2):** if any `apt install ros-jazzy-*` command run during this check fails with an unmet-dependency error mentioning `libzstd1`, this is the known Ubuntu 24.04 arm64 issue, not a broken package. Document and apply:

```bash
apt-cache policy libzstd1                              # read the actual conflicting versions
sudo apt-get install libzstd1=<version-ROS-requires>   # pin to what the error message reports
sudo apt-mark hold libzstd1                             # prevent a later upgrade from re-breaking it
sudo apt install ros-jazzy-ros-base                     # retry
```

If the Jazzy sanity check fails outright (not just this one package conflict), fall back to Phase 1 §2's original JetPack/Docker decision tree, kept as an appendix rather than the default path.

### 0.4 Hardware Bring-Up — Two-Step Checkpoint Per Sensor

Each sensor is verified at the **hardware layer** (no ROS involved) before the **ROS layer** (driver + topic), per the master file's Checkpoint 1 (Hardware) → Checkpoint 2 (ROS 2) split (§20). This isolates "is the sensor physically working" from "is the driver configured correctly" as two separately-debuggable questions — directly applying the Phase 4 correction on the D435i.

#### RPLIDAR S3

| Layer | Check | Pass condition |
|---|---|---|
| Hardware | `ls /dev/serial/by-id/` or `/dev/ttyUSB*`; confirm user is in `dialout` group | Device node exists and is readable/writable without `sudo` |
| Hardware | Confirm baudrate against the physical unit's datasheet (Phase 3 flag) | Matches `robot_bringup/config/rplidar_s3.yaml` |
| ROS 2 | `ros2 launch rplidar_ros rplidar_s3_launch.py` | Node starts, no error |
| ROS 2 | `ros2 topic hz /scan` and `ros2 topic echo /scan --once` | Steady publish rate; `ranges[]` contains real (non-zero, non-NaN) distances |

#### Intel RealSense D435i

| Layer | Check | Pass condition |
|---|---|---|
| Hardware | `lsusb` shows an Intel RealSense device | Device enumerates over USB |
| Hardware | `realsense-viewer` (or `rs-enumerate-devices`) shows live RGB, depth, **and** IMU streams | All three visible **before any ROS node runs** — isolates the JetPack 6.0 / Orin Nano USB-detection risk from ROS entirely |
| ROS 2 | `ros2 launch realsense2_camera rs_launch.py enable_gyro:=true enable_accel:=true` | Node starts, no error |
| ROS 2 | `ros2 topic hz /camera/color/image_raw` and `/camera/imu` | Steady publish rate on both; confirms `enable_gyro`/`enable_accel` actually produced IMU data (Phase 3 flagged this as a real gotcha, not automatic) |

#### Standalone IMU

Applies Phase 3 §3's decision framework concretely:

| Layer | Check | Pass condition |
|---|---|---|
| Hardware | Physically inspect unit for make/model label; `lsusb` / `dmesg \| tail` when plugged in | Model identified, device node appears |
| Decision | Apply Phase 3 §3(a)–(d) in order: official driver → community driver → already-riding-on-base-microcontroller → custom minimal publisher | Resolves to exactly one path, documented in `robot_bringup/config/standalone_imu.yaml` comments |
| ROS 2 | Launch whichever driver path was resolved; `ros2 topic echo /imu/data_raw --once` | `orientation`/`angular_velocity`/`linear_acceleration` fields are populated and **not all zero** (a common silent-failure mode for IMU drivers) |

#### Existing Base Driver

| Layer | Check | Pass condition |
|---|---|---|
| Hardware | Wheels spin freely off the ground; controller board powered | Visual confirmation |
| ROS 2 | `ros2 node list` | Base driver node is present |
| ROS 2 | `ros2 topic info /cmd_vel` | Shows ≥1 subscriber (the base driver) once something publishes to it |
| ROS 2 | `ros2 topic hz /odom` | Steady publish rate |
| **Safety** | Publish a nonzero `/cmd_vel` briefly (wheels lifted), then kill the publishing process/`Ctrl+C` **without** sending a zero-velocity message first | Robot must stop on its own — confirms the watchdog/timeout Phase 1 §10 required is actually present. **If it does not stop, this is a stop-ship safety finding for every later project and must be fixed before Project 1's floor tests.** |

### 0.5 `robot_description` and TF Bring-Up

```
STEP 1: colcon build --packages-select robot_description
STEP 2: ros2 launch robot_description display.launch.py     (desk test — no hardware)
STEP 3: Confirm in RViz: base_link, laser_link, camera_link + its optical/imu
        child frames, imu_link (standalone) all present and positioned sensibly
STEP 4: ros2 run tf2_tools view_frames → render frames.pdf, visually confirm no
        disconnected/orphan frames
```

### 0.6 Resolving `use_ekf` — Concrete Module 0 Exercise

This turns Phase 2 §3's Configuration A/B question into an actual on-robot test, not a design assumption:

```
STEP 1: ros2 launch robot_bringup bringup.launch.py use_ekf:=false
STEP 2: ros2 run tf2_ros tf2_echo odom base_link
STEP 3a: Output appears (transform published)
           → CONFIGURATION A confirmed: base driver owns odom→base_link.
           → Set use_ekf default to false for this rig. Document this fact
             in robot_bringup's README/config — it is now a settled property
             of this specific robot, not an open question.
STEP 3b: No output / error
           → CONFIGURATION B: nothing is broadcasting the transform.
           → ros2 launch robot_bringup bringup.launch.py use_ekf:=true
           → Re-run tf2_echo odom base_link → confirm output now appears,
             sourced from ekf_node.
           → Set use_ekf default to true for this rig; document likewise.
```

The resolved value is a **Module 0 deliverable fact**, not a theoretical branch — Projects 3 and 4's launch files hardcode the discovered default (while still exposing the argument for override/debugging).

### 0.7 Full `robot_bringup` Integration Test

```
ros2 launch robot_bringup bringup.launch.py use_ekf:=<resolved value>
```

Pass condition: `/scan`, `/camera/color/image_raw`, `/camera/imu`, `/imu/data_raw` (standalone), `/odom` all simultaneously live; full TF tree renders in RViz with no gaps; no node crashes or restarts over a sustained ~2 minute run.

### 0.8 Module 0 Success Criteria

```
✓ ros2 doctor / ROS_DISTRO / libzstd install path all clean (or workaround applied)
✓ Every sensor passes BOTH its hardware checkpoint and its ROS checkpoint
✓ /cmd_vel watchdog safety behavior confirmed (robot stops without a zero-velocity command)
✓ robot_description TF tree renders completely, with no orphan frames
✓ use_ekf resolved to a documented true/false default for this specific rig
✓ robot_bringup bringup.launch.py runs all of the above simultaneously without crashing
```

### 0.9 Module 0 Lab Safety Check

```
✓ Wheels lifted or robot on a stand for all motor-related tests in this module
✓ LiDAR/camera/IMU cables routed clear of wheels before any powered test
✓ Hand on power switch / process readily Ctrl+C-able during the watchdog test —
  the robot WILL move briefly and is expected to stop on its own; be ready to
  cut power manually if it does not
✓ A second person present specifically for the /cmd_vel watchdog test (§0.4),
  since this is the first time in the course the robot moves under command
✓ Battery sufficient for a full bring-up session (a brownout mid-test can look
  like a software bug and waste debugging time)
```

---

## PROJECT 1 — OBSTACLE AVOIDANCE (`obstacle_avoidance_bot`)

### 1. Objective

The robot drives forward on its own, continuously reading its LiDAR to watch a configurable cone directly ahead of it. When something enters that cone within a set safety distance, the robot compares how much open space exists to its left versus its right and turns toward whichever side is clearer, then resumes moving forward once the path ahead is clear again. This is the course's first demonstration that sensor data can drive a real-time decision that changes the robot's physical behavior, without any human in the loop.

### 2. Hardware Used

- **RPLIDAR S3** — required, this is the only sensor the decision logic reads.
- **Existing base driver** — required, consumes `/cmd_vel`.
- **NOT used:** RealSense D435i, standalone IMU. This should be stated explicitly to students so they understand a project's hardware scope is deliberate, not "use everything all the time." Even if Module 0 resolved `use_ekf:=true` (Configuration B), Project 1 does **not** need the EKF running — it never reads `/odom` or any fused pose, only raw `/scan` and raw `/cmd_vel`.

### 3. Software Architecture

**New node (authored in this project):**

| Node | Subscribes | Publishes | What it does |
|---|---|---|---|
| `obstacle_avoidance_node` | `/scan` (`sensor_msgs/msg/LaserScan`) | `/cmd_vel` (`geometry_msgs/msg/Twist`) | Filters the LiDAR's 360° scan down to the configured front FOV, finds the nearest point in that slice, compares it against `obstacle_distance`; if blocked, compares average clearance in a left-side and right-side slice outside the front FOV and picks the clearer direction; publishes a `Twist` encoding FORWARD / TURN_LEFT / TURN_RIGHT / STOP. Also enforces a `scan_timeout_sec` safety stop if `/scan` goes stale. |

**Inherited nodes (already running via `robot_bringup`, not authored here):**

| Node | Role in this project |
|---|---|
| `rplidar_ros` driver node | Publishes `/scan` |
| existing base driver | Subscribes `/cmd_vel`, publishes `/odom` (unused by this project) |
| `robot_state_publisher` | Publishes TF (unused by this project's logic, but running as part of `robot_bringup`) |

### 4. Full Data Flow

```
PHYSICAL ENVIRONMENT
   (obstacles in the room)
        ↓
RPLIDAR S3
   (spinning laser rangefinder)
        ↓
rplidar_ros driver node
        ↓
/scan  (sensor_msgs/msg/LaserScan)
        ↓
obstacle_avoidance_node
   ├── Front FOV Filter        (param: front_fov_degrees)
   ├── Nearest-Obstacle Distance in front slice
   ├── Left/Right Clearance Comparison  (param: side_clearance_fov_degrees)
   └── Decision: FORWARD / TURN_LEFT / TURN_RIGHT / STOP
        ↓
/cmd_vel  (geometry_msgs/msg/Twist)
        ↓
existing base driver node
        ↓
Motor commands → wheels
        ↓
ROBOT MOTION
        ↓
(motion changes the robot's position relative to obstacles → loop continues)
```

### 5. Topics Table

| Topic | Message Type | Publisher | Subscriber(s) |
|---|---|---|---|
| `/scan` | `sensor_msgs/msg/LaserScan` | `rplidar_ros` driver node | `obstacle_avoidance_node` |
| `/cmd_vel` | `geometry_msgs/msg/Twist` | `obstacle_avoidance_node` | existing base driver node |
| `/odom` | `nav_msgs/msg/Odometry` | existing base driver node | *(none in this project — listed because it is still running; students should notice it's unused here, not assume every topic matters to every project)* |

### 6. Parameters

| Parameter | Default | Controls |
|---|---|---|
| `front_fov_degrees` | `30.0` | Total width of the front detection cone, symmetric about the robot's forward axis (±15° at default), per the Phase 1/2 fixed convention |
| `obstacle_distance` | `0.5` m | Distance inside the front FOV at which an obstacle triggers avoidance |
| `stop_distance` | `0.2` m | Harder threshold, closer than `obstacle_distance`, at which the robot fully stops rather than merely turning |
| `side_clearance_fov_degrees` | `45.0` | Width of the left-side and right-side comparison slices used to choose turn direction |
| `linear_speed` | `0.12` m/s | Forward speed when the path is clear (within Phase 2 §9's 0.1–0.15 m/s conservative first-run range) |
| `angular_speed` | `0.4` rad/s | Turning speed during avoidance |
| `scan_timeout_sec` | `0.5` s | If no `/scan` message arrives within this window, publish a zero-velocity `Twist` and hold (sensor-loss safety stop) |

All values are ROS 2 parameters (`declare_parameter`), never hardcoded — per the master file's §9/§18 validation and configurability rules.

### 7. Step-by-Step Implementation Path (outline — code is Phase 5)

```
STEP 1  Create obstacle_avoidance_bot (ament_python) package; declare
        dependencies: rclpy, sensor_msgs, geometry_msgs.
STEP 2  Write a minimal node that only spins and logs "alive" at 1 Hz.
        Verify: ros2 run obstacle_avoidance_bot obstacle_avoidance_node
        actually starts and appears in ros2 node list.
STEP 3  Subscribe to /scan; log len(ranges) and angle_min/angle_max/
        angle_increment once. Verify real values arrive (not the default
        constructor's zeros).
STEP 4  Implement the front-FOV index-math filter (using angle_min/
        angle_increment, per Phase 2's rule against hardcoded array
        slicing); log only the minimum distance within that slice.
STEP 5  Add the obstacle_distance comparison; log OBSTACLE vs CLEAR
        (no publishing yet — this step is observation-only).
STEP 6  Add the left/right clearance comparison; log which direction
        WOULD be chosen, still without publishing.
STEP 7  Create the /cmd_vel publisher; wire the existing decision logic
        to actually publish Twist messages.
STEP 8  Convert every hardcoded number introduced in Steps 4-7 into a
        declared parameter (front_fov_degrees, obstacle_distance,
        stop_distance, side_clearance_fov_degrees, linear_speed,
        angular_speed).
STEP 9  Test with wheels lifted off the ground — confirm wheel rotation
        direction matches the intended decision before any floor test.
STEP 10 Add the scan_timeout_sec safety stop and verify it by physically
        disconnecting the LiDAR mid-run (wheels still lifted).
STEP 11 First floor test, low speed, supervised, in a controlled area.
STEP 12 Observe, tune thresholds, add hysteresis if oscillation is seen
        between LEFT/RIGHT decisions near the boundary.
```

### 8. Verification Checkpoints

```
CHECKPOINT 1 — HARDWARE
  Is the RPLIDAR S3 connected and spinning (lsusb / device node present)?

CHECKPOINT 2 — ROS 2
  Does `ros2 launch rplidar_ros rplidar_s3_launch.py` start cleanly, and
  does the driver node appear in `ros2 node list`?

CHECKPOINT 3 — DATA
  Does `ros2 topic hz /scan` show a steady rate, and does
  `ros2 topic echo /scan --once` show sane, non-zero range values?

CHECKPOINT 4 — ALGORITHM
  With the robot stationary and an object manually placed in front of it,
  does the node's log correctly report OBSTACLE within front_fov_degrees,
  and CLEAR when the object is removed? Does moving the object to one
  side change the reported turn direction correctly?

CHECKPOINT 5 — CONTROL
  With wheels lifted, does `ros2 topic echo /cmd_vel` show Twist values
  matching the decision (correct sign on angular.z for the chosen turn
  direction, zero linear.x when stopped)?

CHECKPOINT 6 — PHYSICAL ROBOT
  On the floor at low speed, does the robot repeatably stop or turn away
  from a real obstacle without collision, across multiple trials, only
  after Checkpoints 1-5 have all already passed?
```

### 9. Measurable Success Criteria

```
✓ /scan is active and visible in `ros2 topic list`, publishing at a steady rate
✓ Front obstacle within front_fov_degrees is detected at obstacle_distance
✓ Robot halts or diverts before reaching stop_distance in every trial
✓ Turn direction is chosen by the left/right clearance comparison, not a
  fixed default (verified by testing obstacles on both sides across trials)
✓ /cmd_vel messages are correctly signed and match observed wheel motion
✓ Robot completes 3 consecutive unsupervised low-speed trials with no collision
✓ scan_timeout_sec safety stop is confirmed by physically disconnecting the
  LiDAR mid-run and observing the robot stop
✓ Behavior is debuggable live via `ros2 topic echo /scan` and `/cmd_vel`
```

### 10. Lab Safety Check (Project 1-specific)

```
✓ Wheels lifted or robot on a stand for Steps 9-10 and Checkpoint 5 — do
  not test /cmd_vel output on the floor before control direction is verified
✓ LiDAR power/data cable routed clear of the wheels before any floor test
✓ linear_speed capped at ≤ 0.15 m/s for every floor test in this project —
  no exceptions, even after tuning
✓ Test area cleared of fragile/breakable objects; use a soft or disposable
  object as the "obstacle," not something that would be damaged by contact
✓ A person available to physically intervene (pick up the robot or cut
  power) throughout every floor test, per the master file's §9 standard
✓ scan_timeout_sec safety stop (Step 10) must be confirmed working BEFORE
  the first floor test with wheels down — this is a hard prerequisite,
  not an optional nice-to-have
✓ Battery charge sufficient for the full test session
```

---

---

## PROJECT 2 — VISUAL OBJECT TRACKING (`visual_tracking_bot`)

### Scoping check, per Project 1's discipline

**Does this project need `/odom` or either IMU?** No, and the reason is worth stating rather than assuming: color-tracking steering is a purely reactive image→centroid→turn control loop — the decision at every timestep depends only on where the target currently appears in the current frame, not on where the robot has been or its orientation history. There is no path-following, no drift correction, and no multi-step state to estimate. The only scenario where odometry/IMU data would matter is *combining* tracking with obstacle-aware navigation (the optional capstone in Phase 1 §11, Module 5) — that is explicitly out of scope for Project 2 itself. `use_ekf`'s resolved value from Module 0 is therefore irrelevant to this project, exactly as `/odom` was irrelevant to Project 1.

### 1. Objective

The robot visually locates a specific colored object using its camera, keeps that object centered in its field of view by turning toward it, and moves forward while the object stays roughly centered — functioning as a simple "follow me" behavior for a single, controlled-color target. If the object is lost from view, the robot does not guess: it stops rather than searching blindly.

### 2. Hardware Used

- **Intel RealSense D435i (RGB stream only)** — required. Depth is explicitly out of scope for the primary path (Phase 1's colored-object-first decision); using depth for distance-based following is an Advanced Challenge, not part of this build.
- **Existing base driver** — required, consumes `/cmd_vel`.
- **NOT used: RPLIDAR S3.** This project has **no obstacle sensing at all** — stated explicitly because it changes the safety profile (§10 below) more than any other scoping decision in the course so far.
- **NOT used:** standalone IMU, D435i's own IMU stream, `/odom`, `robot_localization`/EKF — per the scoping check above.

### 3. Software Architecture

**New node (authored in this project):**

| Node | Subscribes | Publishes | What it does |
|---|---|---|---|
| `color_tracker_node` | `/camera/color/image_raw` (`sensor_msgs/msg/Image`) | `/cmd_vel` (`geometry_msgs/msg/Twist`); optionally `/color_tracker/debug_image` (`sensor_msgs/msg/Image`) | Converts each incoming ROS image to an OpenCV BGR frame via `cv_bridge`, converts to HSV, applies a calibrated color-range mask, finds the largest contour above a minimum area, computes its centroid, compares the centroid's horizontal position to the image center within a dead-zone, and publishes a proportional steering `Twist`. Tracks time-since-last-valid-detection and publishes zero velocity once `target_lost_timeout_sec` is exceeded. |

The optional `/color_tracker/debug_image` publisher (the mask or annotated frame with the detected contour/centroid drawn on it) is included by design, not as scope creep — it is the mechanism the calibration procedure in §6 depends on, and directly supports the master file's §29 requirement for educational, non-decorative visualization.

**Inherited nodes (already running via `robot_bringup`, not authored here):**

| Node | Role in this project |
|---|---|
| `realsense2_camera_node` | Publishes `/camera/color/image_raw` (and depth/IMU topics, unused here) |
| existing base driver | Subscribes `/cmd_vel`, publishes `/odom` (unused by this project) |
| `robot_state_publisher` | Publishes TF (unused by this project's logic) |
| `rplidar_ros` driver node | Still running as part of `robot_bringup`, but its `/scan` output is **not subscribed to anywhere in this project** — stated explicitly per the scoping discipline established in Project 1 |

### 4. Full Data Flow

```
PHYSICAL ENVIRONMENT
   (colored target object moves within camera view)
        ↓
Intel RealSense D435i
   (RGB stream)
        ↓
realsense2_camera_node
        ↓
/camera/color/image_raw  (sensor_msgs/msg/Image)
        ↓
color_tracker_node
   ├── cv_bridge: ROS Image → OpenCV BGR frame
   ├── BGR → HSV conversion
   ├── Color Mask                (params: hsv_lower, hsv_upper — calibrated, §6)
   ├── Contour Detection → largest contour ≥ min_contour_area
   ├── Centroid Calculation (cx, cy)
   ├── Compare cx to image-center ± centroid_deadzone_px
   └── Decision: TURN_LEFT / TURN_RIGHT / FORWARD
       — or, if no valid detection for > target_lost_timeout_sec: STOP
        ↓
/cmd_vel  (geometry_msgs/msg/Twist)
        ↓
existing base driver node
        ↓
Motor commands → wheels
        ↓
ROBOT MOTION
        ↓
(motion re-centers the object in the camera's view → loop continues)
```

### 5. Topics Table

| Topic | Message Type | Publisher | Subscriber(s) |
|---|---|---|---|
| `/camera/color/image_raw` | `sensor_msgs/msg/Image` | `realsense2_camera_node` | `color_tracker_node` |
| `/cmd_vel` | `geometry_msgs/msg/Twist` | `color_tracker_node` | existing base driver node |
| `/color_tracker/debug_image` *(optional)* | `sensor_msgs/msg/Image` | `color_tracker_node` | `rqt_image_view` / RViz, for calibration and live debugging only — no other node consumes it |
| `/scan` | `sensor_msgs/msg/LaserScan` | `rplidar_ros` driver node | *(none in this project — still publishing via `robot_bringup`, deliberately unused)* |
| `/odom` | `nav_msgs/msg/Odometry` | existing base driver node | *(none in this project)* |

### 6. Parameters

| Parameter | Default | Controls |
|---|---|---|
| `hsv_lower` / `hsv_upper` | *(no fixed default — see calibration procedure below)* | HSV bounds defining the target color mask. Not hardcoded, because lab lighting varies day to day and window to window; shipping a fixed "magic number" default would work in one lighting condition and silently fail in another. |
| `min_contour_area` | `500` px² | Minimum contour size to count as a valid detection — filters small color-noise blobs from being mistaken for the target |
| `centroid_deadzone_px` | `40` px (about the image center) | Width of the zone where the object is considered "centered enough" — the robot goes straight rather than making small corrective twitches |
| `angular_gain` | `0.005` rad/s per pixel of offset | Proportional gain converting centroid horizontal offset into turn rate |
| `max_linear_speed` | `0.12` m/s | Forward speed cap — matches Project 1's conservative default |
| `max_angular_speed` | `0.4` rad/s | Turn rate cap, regardless of how far off-center the target is — prevents `angular_gain` from producing an unexpectedly fast turn on a large offset |
| `target_lost_timeout_sec` | `1.0` s | Grace period after the last valid detection before the robot publishes zero velocity and holds — see §10 for why this is STOP, not search |

**Calibration procedure (taught as a course step, not shipped as a fixed value):**

```
1. Place the actual target object in front of the camera under the lab's
   current lighting.
2. Run a small interactive OpenCV tool with H/S/V lower and upper trackbars,
   showing a live mask preview from the current camera frame.
3. Adjust all six sliders until the mask isolates ONLY the target object
   (solid white blob) with minimal noise elsewhere in frame.
4. Record the resulting hsv_lower/hsv_upper values into
   visual_tracking_bot/config/color_tracker.yaml.
5. Re-run this procedure any time the lab's lighting materially changes
   (e.g. daylight vs. overhead-only lighting) — this is a documented
   re-calibration trigger, not a one-time setup step.
```

### 7. Step-by-Step Implementation Path (outline — code is Phase 5)

```
STEP 1  Create visual_tracking_bot (ament_python) package; declare
        dependencies: rclpy, sensor_msgs, geometry_msgs, cv_bridge.
        Install OpenCV via `apt` (python3-opencv) only — never mix in
        `pip install opencv-python` alongside it (Phase 3's cv_bridge/
        OpenCV version-matching rule applies directly here, for the
        first time in the course).
STEP 2  Minimal node that only spins and logs "alive." Verify it runs
        via ros2 run and appears in ros2 node list.
STEP 3  Subscribe to /camera/color/image_raw; log the received image's
        height/width/encoding once. Verify real frames arrive.
STEP 4  Add cv_bridge conversion to an OpenCV BGR frame; log frame.shape.
        Verify conversion does not throw (this is Checkpoint 3, below).
STEP 5  Build and run the interactive HSV calibration tool (§6) under
        actual current lab lighting; record hsv_lower/hsv_upper into
        color_tracker.yaml.
STEP 6  Apply the calibrated mask inside the node; publish the mask (or
        annotated frame) to /color_tracker/debug_image and view it in
        rqt_image_view to visually confirm clean isolation before adding
        any motion logic.
STEP 7  Add contour detection filtered by min_contour_area; compute the
        centroid (cx, cy); log it. Still no /cmd_vel publishing.
STEP 8  Compare cx to image-center ± centroid_deadzone_px; log the
        intended decision (TURN_LEFT / TURN_RIGHT / FORWARD). Still no
        publishing.
STEP 9  Add lost-target tracking: time since the last valid detection;
        log TRACKING ↔ LOST state transitions using target_lost_timeout_sec.
STEP 10 Create the /cmd_vel publisher; wire the logged decisions into
        real Twist messages, capped at max_linear_speed/max_angular_speed;
        wire the LOST state to publish zero velocity.
STEP 11 Test with wheels lifted — move the object by hand across the
        camera's view; verify commanded turn direction and confirm the
        robot correctly zeroes /cmd_vel when the object is removed and
        target_lost_timeout_sec elapses.
STEP 12 First floor test: low speed, a completely cleared path (no
        LiDAR fallback exists in this project), supervised.
STEP 13 Improve: tune angular_gain/centroid_deadzone_px to reduce
        oscillation; re-run the calibration procedure if lighting changes.
```

### 8. Verification Checkpoints

```
CHECKPOINT 1 — HARDWARE
  Does `lsusb` / `realsense-viewer` show the D435i's RGB stream live,
  BEFORE any ROS node is started? (Reuses Module 0's two-step pattern —
  this isolates a camera/USB problem from a ROS/driver problem.)

CHECKPOINT 2 — ROS 2
  Does `realsense2_camera_node` start cleanly, and does
  /camera/color/image_raw appear in `ros2 topic list`?

CHECKPOINT 3 — DATA
  Does `ros2 topic hz /camera/color/image_raw` show a steady rate, and
  does the cv_bridge conversion in the node complete without throwing
  across a sustained run (not just once)?

CHECKPOINT 4 — ALGORITHM
  Under the lab's ACTUAL current lighting: does the calibrated HSV mask
  isolate the target with minimal noise (checked visually via
  /color_tracker/debug_image), and does the computed centroid stay
  stable — not jumping erratically frame-to-frame — when the object is
  held still?

CHECKPOINT 5 — CONTROL
  With wheels lifted, moving the object left/right by hand: does
  `ros2 topic echo /cmd_vel` show angular.z with the correct sign and a
  magnitude that respects max_angular_speed, and does it return to zero
  when the object sits inside centroid_deadzone_px?

CHECKPOINT 6 — PHYSICAL ROBOT
  On the floor at low speed, in a fully cleared area: does the robot
  smoothly follow a slowly-moved object without oscillating side to
  side, and does it correctly stop (not spin) within
  target_lost_timeout_sec when the object is removed or occluded?
```

### 9. Measurable Success Criteria

```
✓ /camera/color/image_raw is active, publishing at a steady rate
✓ cv_bridge conversion completes without error across a sustained (≥2 min) run
✓ HSV mask isolates the target under the lab's current lighting, per the
  calibration procedure — re-verified if lighting has changed since calibration
✓ Centroid is computed only from contours ≥ min_contour_area (noise-filtered)
✓ Robot turns toward the correct side to re-center the object, verified with
  the object presented on both the left and right in separate trials
✓ Robot's forward/turn speeds never exceed max_linear_speed/max_angular_speed
✓ Robot publishes zero velocity and holds within target_lost_timeout_sec of
  losing the target — verified by removing the object mid-run
✓ 3 consecutive unsupervised low-speed trials following a slowly-moved object
  with no collision and no runaway spinning
```

### 10. Lab Safety Check (Project 2-specific)

**What's different from Project 1, stated explicitly:** Project 1 had its own obstacle sensor providing a safety net independent of the primary task. Project 2 has **no obstacle sensing running at all** — the LiDAR is physically present and even publishing `/scan` via `robot_bringup`, but nothing in this project reads it. That means, unlike Project 1, there is no algorithmic fallback if the robot drifts toward something outside the camera's narrow field of view. This must be compensated for procedurally, not assumed away:

```
✓ The floor-test area must be COMPLETELY clear in all directions the
  robot could possibly turn toward — not just clear along the object's
  path — since this project cannot detect or react to any obstacle
  that isn't the tracked color.
✓ Lost-target behavior is a deliberate design decision, stated here
  explicitly: on losing the target, the robot STOPS after
  target_lost_timeout_sec. It does NOT spin or search. A blind spin-
  search would be a real collision risk specifically because this
  project has no obstacle sensing to catch a bad guess — this is a
  direct consequence of the hardware-scoping decision in §2, not an
  arbitrary choice.
✓ Wheels lifted for all of Steps 11 and Checkpoint 5 — do not verify
  turning direction on the floor first.
✓ linear_speed capped at ≤ 0.15 m/s for every floor test, same as
  Project 1, with the additional note that the proportional angular
  control here can produce continuously-varying turn rates (unlike
  Project 1's more discrete decisions) — watch for and cap overshoot
  via max_angular_speed rather than trusting angular_gain alone.
✓ Camera and any debug-viewing laptop/cable kept clear of the wheels.
✓ A person available to physically intervene throughout every floor
  test — for this project specifically, positioned to step into the
  robot's path if it turns toward an unexpected direction, since no
  sensor will catch that before it happens.
✓ Re-run the HSV calibration procedure if the test session's lighting
  differs from when hsv_lower/hsv_upper were last set — a stale
  calibration is a software-correctness issue that manifests as
  physically unpredictable turning, not just a vision-quality issue.
✓ Battery charge sufficient for the full test session.
```

---

---

## PROJECT 3 — ROBOT MAPPING USING SLAM (`robot_slam`)

### Scoping check, per the established discipline

**Does this project need `/odom`?** Yes — and this is worth contrasting explicitly with Projects 1 and 2, where skipping odometry cost nothing. `slam_toolbox` builds its map through pose-graph SLAM: each new LiDAR scan is matched against the existing map estimate, but scan-matching alone is ambiguous in open or repetitive spaces (a long corridor, a mostly-empty room) — the odometry reading between scans supplies a motion prior that disambiguates which match is physically plausible. Without it, scan-to-scan drift accumulates unchecked on a real (noisy, real-world) robot, and the map degrades — this is the first project in the course where that failure mode is real. Crucially, SLAM does not care *how* `odom → base_link` was produced: it consumes whatever transform Module 0's `use_ekf` resolution already established as this rig's fact (raw base-driver odometry in Configuration A, or the EKF-fused transform in Configuration B). This project makes no new odometry decision — it inherits Module 0's, exactly as designed.

**Does this project need the D435i camera?** No. This is 2D LiDAR-based SLAM (`slam_toolbox`), not visual SLAM — the algorithm being taught operates entirely on `/scan` and the TF chain. Adding the camera here would add Jetson compute load and a hardware dependency for zero benefit to the concept being demonstrated. Visual/RGB-D mapping is a distinct technique this course does not currently cover.

**Does this project need the standalone IMU directly?** No, and the reasoning matters: if `use_ekf:=true`, the IMU's data has already been fused into `/odometry/filtered` and is embedded in the `odom → base_link` transform SLAM consumes — subscribing to raw `/imu/data_raw` a second time inside this project would double-count the same information through a different path. If `use_ekf:=false`, the IMU simply isn't part of this rig's odometry story at all, and this project doesn't introduce it — a careful, slow, teleop-driven mapping run is treated as sufficient without it.

### 1. Objective

A person drives the robot slowly and deliberately around an unfamiliar room using keyboard teleoperation, while `slam_toolbox` fuses live LiDAR scans with the robot's odometry to build a 2D occupancy-grid map in real time. The student watches the map take shape in RViz, completes a loop that revisits the starting area to confirm the map doesn't drift, and saves the finished map to disk in a location and format Project 4 can load directly.

### 2. Hardware Used

- **RPLIDAR S3** — required, the sole sensor input to scan matching.
- **Odometry/TF chain from Module 0** (existing base driver, optionally combined with the standalone IMU via `robot_localization` per the already-resolved `use_ekf` value) — required, per the scoping check above.
- **Keyboard input device** (via `teleop_twist_keyboard`, confirmed maintained in Phase 3) — required for the manual-driving phase.
- **NOT used:** Intel RealSense D435i (RGB, depth, or its onboard IMU) — see scoping check.
- **NOT used directly by this project's own configuration:** the standalone IMU's raw topic — already accounted for upstream if fused, irrelevant if not.

### 3. Software Architecture

This project is primarily **configuration and orchestration, not new node authorship** — consistent with the master file's Path A/B/C model (§12) and Phase 2 §4.3's own framing: `slam_toolbox` is a ready-made, official package (Path A); the *project* is learning to drive, tune, and validate it, not to write a SLAM algorithm from scratch.

| Node | Subscribes | Publishes | What it does |
|---|---|---|---|
| `slam_toolbox` (`async_slam_toolbox_node`) | `/scan` (`sensor_msgs/msg/LaserScan`); TF (`odom → base_link`) | `/map` (`nav_msgs/msg/OccupancyGrid`); `/map_metadata` (`nav_msgs/msg/MapMetaData`); broadcasts `map → odom` TF | Matches incoming scans against the growing map estimate, uses the odometry-derived TF as a motion prior between scans, performs pose-graph optimization and loop-closure correction, and publishes/updates the occupancy grid. |
| `teleop_twist_keyboard` | keyboard input (terminal) | `/cmd_vel` (`geometry_msgs/msg/Twist`) | Converts keypresses to velocity commands under direct human control — no autonomous decision-making in this project's primary path. |

**Inherited nodes (already running via `robot_bringup`, not authored or reconfigured here):** `rplidar_ros` driver, existing base driver (± `ekf_node` per the resolved `use_ekf` value), `robot_state_publisher`.

**Mode decision — online asynchronous, not online synchronous:**

`slam_toolbox` ships both an online synchronous and an online asynchronous mode, and the choice matters for both real-time behavior and the student's mental model:

- **Online synchronous** processes every scan in strict order and will block if processing falls behind — this guarantees no scan is skipped, but on a real robot that means the map-building pipeline can lag behind the physical robot's actual motion if the Jetson is momentarily busy, which risks stale/delayed `map → odom` TF publication (visible as jittery or lagging map updates in RViz while driving live).
- **Online asynchronous** processes scans opportunistically and drops a scan under heavy load rather than blocking — this is the mode `slam_toolbox`'s own example launch files use as the default for live, on-robot mapping, and it is chosen here as the course default for exactly that reason: a momentary skipped scan during a slow teleop drive is a non-event, while a blocked/lagging TF broadcast during a live driving session is a real problem.
- Online synchronous mode is retained as an **Advanced Challenge**: replaying a recorded bag file through both modes and comparing map quality/timing is a good way to make the tradeoff concrete, but it is not part of the primary path.

### 4. Full Data Flow

```
PHYSICAL ENVIRONMENT
   (unmapped room)
        ↓
RPLIDAR S3 → rplidar_ros driver node → /scan (sensor_msgs/msg/LaserScan)
        ↓
        │        existing base driver (+ ekf_node if use_ekf:=true, per
        │        Module 0's resolved value) → /odom or /odometry/filtered
        │                    ↓
        │        odom → base_link TF (broadcast by whichever of the two
        │        owns it, per Module 0 §0.6)
        ↓                    ↓
     TF TREE:  base_link → laser_link  (static, from robot_description)
               odom → base_link        (dynamic, from base driver/EKF)
        ↓                    ↓
slam_toolbox (online asynchronous mode)
   ├── Scan matching against current map estimate
   ├── Odometry motion prior between scans
   ├── Pose-graph optimization + loop-closure correction
   └── Occupancy grid update
        ↓                                          ↑
map → odom TF (broadcast BY slam_toolbox) ─────────┘  (completes the
                                                        map→odom→base_link
                                                        →laser_link chain)
        ↓
/map (nav_msgs/msg/OccupancyGrid) + /map_metadata
        ↓
RViz — live map visualization

   [running concurrently, driven by a person, not by this pipeline:]
Student keypresses → teleop_twist_keyboard → /cmd_vel → existing base
driver → motors → ROBOT MOTION → new viewpoint → new /scan data →
(loop continues until the student has covered and closed a loop of the
test area)
        ↓
map_saver_cli → robot_slam/maps/<room_name>.yaml + <room_name>.pgm
```

### 5. Topics Table

| Topic | Message Type | Publisher | Subscriber(s) |
|---|---|---|---|
| `/scan` | `sensor_msgs/msg/LaserScan` | `rplidar_ros` driver node | `slam_toolbox` |
| `/odom` or `/odometry/filtered` | `nav_msgs/msg/Odometry` | existing base driver, or `ekf_node` (per resolved `use_ekf`) | `slam_toolbox` |
| `/tf`, `/tf_static` | `tf2_msgs/msg/TFMessage` | `robot_state_publisher` (static sensor frames); base driver/`ekf_node` (`odom→base_link`); `slam_toolbox` (`map→odom`) | `slam_toolbox`, RViz, and (in Project 4) Nav2 |
| `/map` | `nav_msgs/msg/OccupancyGrid` | `slam_toolbox` | RViz, `map_saver_cli`, and (in Project 4) `map_server` |
| `/map_metadata` | `nav_msgs/msg/MapMetaData` | `slam_toolbox` | RViz (optional) |
| `/cmd_vel` | `geometry_msgs/msg/Twist` | `teleop_twist_keyboard` (student input) | existing base driver node |

### 6. Parameters

`robot_slam/config/slam_toolbox_params.yaml`:

| Parameter | Default | Controls |
|---|---|---|
| `mode` | `mapping` | Runs `slam_toolbox` in map-building mode rather than its later localization-only mode (used differently in Project 4) |
| `resolution` | `0.05` m | Occupancy grid cell size — fine enough for indoor rooms/corridors without excessive compute on the Jetson |
| `max_laser_range` | *(set from the RPLIDAR S3 datasheet — verify, do not assume; course default placeholder `12.0` m pending that check)* | Caps how far a single scan point is trusted — should match the sensor's actual reliable range, not its theoretical maximum |
| `minimum_travel_distance` | `0.2` m | Minimum robot displacement before a new scan is folded into the graph — reduces redundant processing, keeping async mode responsive |
| `minimum_travel_heading` | `~0.17` rad (~10°) | Same idea, for rotation |
| `transform_publish_period` | `0.02` s (50 Hz) | How often `slam_toolbox` rebroadcasts `map → odom` — must be fast enough that downstream TF lookups (RViz, later Nav2) don't hit extrapolation errors |
| `map_update_interval` | `5.0` s | How often the `/map` topic itself is republished (separate from the TF rate) |
| `do_loop_closing` | `true` | Enables pose-graph loop-closure correction — the mechanism directly responsible for the "walls don't double" success criterion in §9 |

**Saving the map** (once a loop is complete, §7 Step 9):

```
ros2 run nav2_map_server map_saver_cli -f ~/robot_projects_ws/src/robot_slam/maps/<room_name>
```

produces `<room_name>.yaml` + `<room_name>.pgm` inside `robot_slam/maps/`. This exact location and naming convention is what Project 4 loads from — getting this right here is a direct dependency, not a nice-to-have.

### 7. Step-by-Step Implementation Path (teleop-first, per Phase 1 §9 — outline only)

```
STEP 1  Re-verify Module 0's TF chain specifically in this context: launch
        robot_bringup with the resolved use_ekf value; confirm `map` does
        NOT yet exist (slam_toolbox hasn't started) and that odom→base_link
        is broadcasting continuously.
STEP 2  Verify teleop_twist_keyboard alone, wheels lifted: confirm keypresses
        produce correctly-directioned /cmd_vel and correct wheel rotation —
        the same "verify a new command source before trusting it" discipline
        used for Project 1's decision logic.
STEP 3  Create robot_slam (config + launch only); write
        slam_toolbox_params.yaml with the §6 defaults.
STEP 4  Launch robot_bringup + slam_toolbox with the robot STATIONARY.
        Confirm /map appears in RViz as a small local patch from a single
        vantage point — before any driving happens.
STEP 5  First teleop-driven mapping pass in a small, simple space: drive
        slowly, watch the map build live, do not attempt a full loop yet.
STEP 6  Deliberately drive back over already-mapped territory (a small
        loop) and observe whether walls stay single/clean or start
        doubling — this is the loop-closure/drift check.
STEP 7  If doubling or visible drift appears, slow down further and/or
        tighten minimum_travel_distance/heading; re-attempt.
STEP 8  Complete a full loop of the intended test area, ensuring the end
        of the loop overlaps with the starting position.
STEP 9  Save the map via map_saver_cli into robot_slam/maps/<room_name>;
        confirm both the .yaml and .pgm files exist and are non-empty.
STEP 10 Reload the saved map (via map_server, independent of the live
        slam_toolbox session) purely to confirm the saved file is valid
        and visually matches what was built live — this is the "reuse"
        checkpoint Project 4 depends on.
STEP 11 (Advanced, optional) Replay a recorded bag through online
        synchronous mode and compare map quality/timing against the live
        asynchronous run.
```

### 8. Verification Checkpoints

```
CHECKPOINT 1 — HARDWARE
  RPLIDAR S3 connected and spinning (reuse Module 0's check); keyboard
  teleop device/terminal focus confirmed working.

CHECKPOINT 2 — ROS 2
  Does slam_toolbox start without error, appear in `ros2 node list`, and
  (it is a lifecycle node) reach and stay in the ACTIVE state?

CHECKPOINT 3 — DATA
  Is the FULL TF chain map→odom→base_link→laser_link complete and
  continuously updating (`ros2 run tf2_ros tf2_echo map laser_link`
  succeeds with fresh data) — checked BEFORE judging map quality at all?
  A broken TF chain invalidates any conclusion drawn from Checkpoint 4.

CHECKPOINT 4 — ALGORITHM
  During the deliberate loop-closure test (Step 6), does the map visibly
  snap back to a single clean wall line once the loop closes, rather
  than leaving two offset copies of the same wall?

CHECKPOINT 5 — CONTROL
  Does teleop_twist_keyboard's output move the robot in the expected
  direction immediately, with no lag that would cause overshoot around
  a corner while the student is watching the map instead of the robot?

CHECKPOINT 6 — PHYSICAL ROBOT
  After a full loop of the test area, does map_saver_cli produce a map
  that, when reloaded, visually matches the live-built map with no
  missing regions or corrupted cells?
```

### 9. Measurable Success Criteria

```
✓ /scan and /odom (or /odometry/filtered) are both active and consumed
  by slam_toolbox
✓ TF chain map→odom→base_link→laser_link is complete and continuously
  broadcasting throughout the session
✓ slam_toolbox reaches and remains in the ACTIVE lifecycle state for the
  full mapping run
✓ /map updates live and visibly in RViz as the robot is driven
✓ CONCRETE MAP-QUALITY CHECK: after completing a loop that revisits the
  starting area, walls in the overlapping region appear as single clean
  lines — not doubled or ghosted
✓ map_saver_cli produces a valid, non-empty .yaml + .pgm pair
✓ The saved map, when reloaded independently, visually matches the
  live-built map
✓ The mapping run was completed entirely via teleop — no autonomous
  motion was used to build this map, per Phase 1 §9's required ordering
```

### 10. Lab Safety Check (Project 3-specific)

**What's different from Projects 1 and 2:** a human is in direct control of every motion command for the entire primary path — there is no autonomous decision-making loop to fail in this project's default scope. This is a genuinely lower autonomy-risk profile than Projects 1–2. That does not mean no safety discipline applies:

```
✓ Cap teleop step speed (teleop_twist_keyboard's own linear/angular step
  size) to the same conservative range used elsewhere in the course —
  a human watching a laptop screen instead of the robot can still drive
  too fast into a wall.
✓ Clear the physical path for the planned mapping loop before driving —
  remove trip hazards and loose cables from the floor area to be mapped.
✓ The person driving must maintain direct line of sight to the physical
  robot, not rely on the RViz map view alone — RViz only shows what the
  LiDAR has already scanned, not obstacles at a height the 2D LiDAR
  can't see (e.g. a low object below the scan plane).
✓ The Module 0 /cmd_vel watchdog is still a blocking requirement here,
  not something teleop makes unnecessary — if the keyboard terminal
  loses focus or an SSH session drops mid-drive, the robot must stop
  rather than continue on its last received command indefinitely.
✓ Explicit flag for later: if the course ever adds autonomous frontier-
  exploration mapping as an Advanced Challenge, it must be held to the
  EXACT same speed-cap/watchdog/supervised-testing discipline as
  Projects 1 and 2 — it would reintroduce an autonomous decision loop
  and must not be treated as inherently safer just because the task is
  "only mapping." The primary path in this project avoids that question
  entirely by keeping a human in the loop throughout.
```

---

---

## PROJECT 4 — AUTONOMOUS NAVIGATION (`robot_navigation`)

### Scoping check, per the established discipline

**Does this project need the LiDAR?** Yes, in two distinct roles at once — worth distinguishing explicitly since they're easy to conflate: (1) `amcl` uses `/scan` for localization, matching live scans against the static map to estimate the robot's pose; (2) Nav2's **local costmap** independently uses the same `/scan` stream as its obstacle layer, to detect anything in the environment that wasn't present when Project 3's map was built. Same sensor, two separate consumers, two separate jobs.

**Does this project need `/odom`?** Yes — the same `odom → base_link` transform every prior project has consumed as Module 0's resolved fact. `controller_server` needs it to track the robot's short-term motion relative to the planned path, and AMCL's motion model uses it between scan updates, exactly as `slam_toolbox` did in Project 3. No new odometry decision is made here.

**Does this project need the D435i camera?** No, for the baseline stack built here. A standard 2D Nav2 configuration — AMCL localizing against a 2D map, costmaps built from `LaserScan` — has no dependency on RGB or depth data. This is stated as a deliberate scope boundary, consistent with how Project 3 kept the camera out of baseline SLAM: an RGB-D-sourced costmap obstacle layer (letting the camera see obstacles at heights the 2D LiDAR plane misses) is a genuine, real capability Nav2 supports, but it is flagged here as a **stretch extension**, not baseline scope, to keep this project focused on the localization/planning/control concepts it's meant to teach.

**Does this project need the standalone IMU directly?** No — same reasoning as Project 3. If `use_ekf:=true`, its contribution is already embedded in the `/odom`/`/odometry/filtered` transform this project consumes; subscribing to raw IMU data again would double-count it.

### 1. Objective

The robot loads the map saved in Project 3, localizes itself within that map using its LiDAR, accepts a destination the student sets in RViz, and autonomously plans and drives a collision-free path to that destination — including around obstacles that weren't present when the map was originally built. Once a goal is sent, no human steering input is given during the drive itself; supervision is present, but the robot is deciding its own motion for the first time in the course.

### 2. Hardware Used

- **RPLIDAR S3** — required, in both an AMCL-localization role and a Nav2 local-costmap-obstacle role (see scoping check).
- **Odometry/TF chain from Module 0** (base driver ± EKF, per the already-resolved `use_ekf` value) — required, consumed as-is.
- **Project 3's saved map** (`<room_name>.yaml` + `<room_name>.pgm`, produced by `map_saver_cli` into `robot_slam/maps/`) — required input artifact. This project references that exact file pair rather than assuming a generic path.
- **NOT used in baseline scope:** Intel RealSense D435i (RGB, depth, or its onboard IMU) — see scoping check. Flagged as a possible stretch extension (RGB-D costmap layer), not part of this project's core build.
- **NOT used directly:** the standalone IMU's raw topic — already accounted for upstream if fused.

### 3. Software Architecture

This is the first project in the course with a genuine multi-node, lifecycle-managed stack — six-plus nodes that must be brought up together in the correct order, which is precisely the scenario the master file's §18 "eventually combine using launch files" guidance is written for. Hand-sequencing six terminals the way Project 1 hand-verified a two-node system is not realistic or pedagogically useful here; this project leans fully on `nav2_bringup`'s existing launch composition, wrapped by this project's own launch file with its map argument and parameter overrides.

| Node | Role | Subscribes / Consumes | Publishes |
|---|---|---|---|
| `map_server` | Loads the static map file and serves it as a latched topic | Project 3's `<room_name>.yaml`/`.pgm` | `/map` (`nav_msgs/msg/OccupancyGrid`) |
| `amcl` | Monte Carlo localization — estimates the robot's pose within the static map | `/scan`, `/map`, TF, initial pose estimate (from RViz) | `/amcl_pose`, `/particle_cloud`; broadcasts `map → odom` TF (taking over the role `slam_toolbox` held in Project 3 — same TF slot, different producer) |
| `planner_server` (global costmap + planner plugin) | Computes a global path from the robot's current pose to the goal | Global costmap (static map layer + inflation layer) | Global path, consumed internally by `bt_navigator`/`controller_server` |
| `controller_server` (local costmap + controller plugin) | Tracks the global path while reacting to live, local obstacles in real time | `/plan`, local costmap (rolling window, `/scan`-based obstacle layer), `/odom` | `/cmd_vel` |
| `behavior_server` | Hosts recovery behaviors (spin, back up, wait, clear costmap) invoked when the primary plan/control loop gets stuck | Behavior tree triggers | `/cmd_vel` during a recovery, action feedback |
| `bt_navigator` | Orchestrates the whole system via a behavior tree; exposes the `NavigateToPose` action server | Action goals from the client (RViz's "Nav2 Goal" tool, or the student) | `NavigateToPose` feedback/result |
| `lifecycle_manager` | Brings the above nodes through `configure → activate` together at startup, in the correct dependency order | — | — |

**Inherited nodes (unchanged from Module 0):** `rplidar_ros` driver, existing base driver, `robot_state_publisher`.

### 4. Full Data Flow

```
PROJECT 3's SAVED MAP (<room_name>.yaml/.pgm)
        ↓
map_server → /map (nav_msgs/msg/OccupancyGrid, static reference)
        ↓
RPLIDAR S3 → rplidar_ros → /scan ──────────┬───────────────────┐
        ↓                                  ↓                   ↓
existing base driver (+ekf) → /odom → AMCL (scan + map        Local Costmap
        ↓                              matching + motion       (rolling window,
        └──────────────────────────→   prior)                  obstacle layer
                                          ↓                     from live /scan)
                                  /amcl_pose + map→odom TF
                                          ↓
                                  Global Costmap
                                  (static map layer + inflation layer)
                                          ↓
        [Student sends a goal via the NavigateToPose action, from RViz]
                                          ↓
                                  bt_navigator (behavior tree orchestration)
                                          ↓
                                  planner_server → global path
                                          ↓
                                  controller_server → local trajectory
                                     (tracks global path; deviates in
                                      real time around anything the
                                      LOCAL costmap sees that the
                                      original map didn't)
                                          ↓
                                  /cmd_vel (geometry_msgs/msg/Twist)
                                          ↓
                                  existing base driver → motors
                                          ↓
                                  ROBOT MOTION
                                          ↓
        (motion updates AMCL's pose belief and both costmaps → loop
        continues until bt_navigator reports SUCCEEDED, or a recovery
        behavior runs and either resolves the situation or the action
        is ultimately reported ABORTED)
```

### 5. Topics and Actions Table

| Topic / Action | Type | Publisher / Server | Subscriber(s) / Client |
|---|---|---|---|
| `/map` | `nav_msgs/msg/OccupancyGrid` | `map_server` | `amcl`, global costmap |
| `/scan` | `sensor_msgs/msg/LaserScan` | `rplidar_ros` driver | `amcl`, local costmap |
| `/odom` (or `/odometry/filtered`) | `nav_msgs/msg/Odometry` | base driver / `ekf_node` | `controller_server`, `amcl`'s motion model |
| `/amcl_pose` | `geometry_msgs/msg/PoseWithCovarianceStamped` | `amcl` | RViz, monitoring |
| `/particle_cloud` | Nav2 particle-cloud message | `amcl` | RViz (visual convergence check, §8) |
| `/global_costmap/costmap` | `nav_msgs/msg/OccupancyGrid` | `planner_server`'s costmap | RViz |
| `/local_costmap/costmap` | `nav_msgs/msg/OccupancyGrid` | `controller_server`'s costmap | RViz |
| `/plan` | `nav_msgs/msg/Path` | `planner_server` | `controller_server`, RViz |
| `/cmd_vel` | `geometry_msgs/msg/Twist` | `controller_server` (or `behavior_server` during a recovery) | existing base driver |
| `map → odom` TF | `tf2_msgs/msg/TFMessage` | `amcl` | everything downstream |
| **`NavigateToPose`** | `nav2_msgs/action/NavigateToPose` (**action**, not topic) | `bt_navigator` (server) | student / RViz "Nav2 Goal" tool (client) |

**Why this is the course's first action, not a topic:** every prior project's `/cmd_vel` publish was fire-and-forget — no response was needed, and nothing was "in progress." A navigation goal is fundamentally different: it can take anywhere from seconds to minutes, the student may need to **cancel** a bad goal mid-execution, and the client needs **continuous feedback** (distance remaining, current pose, recovery attempts so far) while it's running, plus a final **result** (succeeded/aborted/canceled) when it's done. A topic can't express "start this, stream me updates, let me cancel it, tell me the outcome" as one coherent exchange, and a service would block synchronously for the goal's entire duration, which is unworkable for a multi-minute drive. ROS 2 actions exist specifically for this shape of interaction, which is why this is the natural point in the course to introduce one.

### 6. Parameters

`robot_navigation/config/nav2_params.yaml`, by group:

| Group | Parameter | Default | Controls |
|---|---|---|---|
| AMCL | `min_particles` / `max_particles` | `500` / `2000` | Particle filter population bounds |
| AMCL | initial pose covariance | wide (set deliberately loose) | Reflects that the initial pose set via RViz is only approximate; narrows automatically as the filter converges |
| AMCL | `update_min_d` / `update_min_a` | `0.2` m / `~0.17` rad | Minimum robot movement before the particle filter updates — mirrors Project 3's `minimum_travel_distance/heading` reasoning |
| AMCL | `laser_max_range` | *(same verified value as Project 3's `max_laser_range` — reuse, don't re-derive)* | Matches the RPLIDAR S3's actual reliable range |
| Global costmap | `resolution` | `0.05` m | **Must match Project 3's `slam_toolbox` resolution**, or `map_server` will need to rescale, introducing avoidable error |
| Global/Local costmap | `robot_radius` (or full footprint polygon) | *(measured from the actual chassis — not a placeholder default)* | Direct callback to Phase 2 §4.4's footprint note — an inaccurate footprint is a correctness bug that manifests as unsafe planning near walls |
| Global/Local costmap | `inflation_radius` | `0.3` m | Must exceed the robot's physical radius plus a safety margin |
| Local costmap | `rolling_window` | `true` | Costmap follows the robot rather than staying fixed to the map frame |
| Local costmap | `width` / `height` | `3.0` m / `3.0` m | Local obstacle-detection window size |
| Controller | `max_vel_x` | `0.12` m/s | **Deliberately capped at Project 1's conservative default**, not Nav2's more aggressive stock default — stated explicitly as a course-wide consistency choice for all initial testing |
| Controller | `max_vel_theta` | `0.4` rad/s | Same reasoning as `max_vel_x` |
| Planner | (default global planner plugin, e.g. NavFn) | stock | No exotic tuning needed for a first pass |
| Behavior server | recovery timeouts (spin/back-up/wait) | stock defaults | Adjusted only if a specific recovery is observed misbehaving during testing |

### 7. Step-by-Step Implementation Path (outline only)

```
STEP 1  Confirm Project 3's saved map files exist and are valid at
        robot_slam/maps/<room_name>.yaml/.pgm; reference (not duplicate)
        them from robot_navigation's launch arguments.
STEP 2  Create robot_navigation (config + launch, no new authored node,
        same orchestration-only nature as Project 3); write
        nav2_params.yaml, MEASURING the real chassis footprint rather
        than using a placeholder.
STEP 3  Launch robot_bringup + map_server + amcl ONLY (not the full
        stack yet), robot stationary at a roughly known position in the
        mapped room.
STEP 4  In RViz, use "2D Pose Estimate" to set the initial pose matching
        the robot's actual physical position and orientation.
STEP 5  Observe /particle_cloud: particles should start scattered
        (reflecting the wide initial covariance) and progressively
        converge toward a single tight cluster — nudge the robot gently
        via teleop if needed to help disambiguate a symmetric space.
STEP 6  HARD GATE: do not proceed to autonomous motion until convergence
        is visually confirmed in RViz.
STEP 7  Launch the remaining stack (planner_server, controller_server,
        behavior_server, bt_navigator, lifecycle_manager) via the
        project's full navigation.launch.py.
STEP 8  Verify every lifecycle node reports ACTIVE (`ros2 lifecycle get
        <node>`) before sending any goal — this is Checkpoint 2, below,
        and it is a hard prerequisite, not a formality.
STEP 9  Send a SHORT, safe first goal (0.5–1 m, open space) via RViz's
        "Nav2 Goal" tool. Visually inspect the planned global path in
        RViz BEFORE allowing the robot to move.
STEP 10 Only after the plan looks geometrically sane, allow execution —
        supervise closely, hand near the kill switch.
STEP 11 Repeat with a physical obstacle placed in the path that was NOT
        present when the map was built — confirm the local costmap
        detects it and the controller deviates and replans around it.
STEP 12 Deliberately trigger a recovery behavior (e.g. lightly box the
        robot in) in a way that poses no hazard to people, and observe
        spin/back-up/wait execute, then resume.
STEP 13 Extend to longer, multi-meter goals across the mapped area only
        after multiple short-goal trials succeed repeatably.
```

### 8. Verification Checkpoints

```
CHECKPOINT 1 — HARDWARE
  RPLIDAR S3 connected and spinning (reuse Module 0's check); robot
  physically placed within the boundaries of the mapped area.

CHECKPOINT 2 — ROS 2 (Nav2-specific hard gate)
  Does `ros2 lifecycle get` report ACTIVE for EVERY node — map_server,
  amcl, planner_server, controller_server, behavior_server,
  bt_navigator — before anything else in this list is trusted? A node
  stuck in `inactive` or `unconfigured` invalidates every checkpoint
  below it.

CHECKPOINT 3 — DATA
  Is /map published with the correct resolution and origin matching
  Project 3's saved file? Are /scan and /odom actually flowing into
  AMCL and both costmaps (not just topics existing, but data arriving)?

CHECKPOINT 4 — ALGORITHM
  Does /particle_cloud actually CONVERGE — collapse to a tight cluster
  near the robot's true position — rather than merely running without
  crashing? Does the global costmap correctly reflect the static map's
  walls, and does the local costmap correctly show a live obstacle
  placed in front of the robot?

CHECKPOINT 5 — CONTROL
  Before any physical motion: does the planned global path, viewed in
  RViz, look geometrically sane (no path through walls, no wildly
  indirect route for a simple case)? During motion: does /cmd_vel stay
  within the configured max_vel_x/max_vel_theta caps at all times?

CHECKPOINT 6 — PHYSICAL ROBOT
  Does the robot reach the goal pose within the stated tolerance,
  fully autonomously, correctly avoiding both originally-mapped and
  newly-placed obstacles, across repeated trials?
```

### 9. Measurable Success Criteria

```
✓ All six Nav2 lifecycle nodes report ACTIVE before any goal is sent
✓ Loaded /map matches Project 3's saved map (resolution and origin correct)
✓ AMCL's particle cloud visibly collapses to a tight cluster near the
  robot's actual position after initial pose estimate + brief motion
  (qualitative localization-accuracy criterion)
✓ A sent goal produces a global path visualized in RViz BEFORE any
  physical motion occurs
✓ Robot successfully deviates from the global path to avoid a physically
  placed obstacle that was not present in the original map
✓ Robot reaches the goal pose within a stated tolerance (e.g. ±0.15 m
  position, ±10° heading — a conservative tolerance consistent with this
  course's precision framing, not an industrial-grade spec)
✓ At least one recovery behavior (spin / back-up / wait) is observed
  executing correctly when deliberately triggered
✓ 3 consecutive successful autonomous arrivals at a short-distance goal,
  BEFORE any longer multi-meter goal is attempted
```

### 10. Lab Safety Check — ESCALATED (highest-risk project in the course)

**Stated explicitly, not reused verbatim from Project 1:** this is the highest-autonomy, highest-risk project in the entire course. Project 1 made one reactive decision at a time at low speed with its own obstacle sensor. Project 2 was tightly scoped but had no obstacle sensing at all. Project 3 kept a human driving every single meter. **Project 4 is the first project where the robot commits to a multi-meter plan and executes it with no human steering input during the drive itself** — a bad plan or a bad recovery has materially more room to cause harm before a person could intervene than any prior project's single-step decisions. The safety discipline must escalate accordingly:

```
✓ A physical E-stop / kill switch must be within IMMEDIATE reach of a
  supervising person for the ENTIRE duration of every autonomous goal
  execution — non-negotiable, and stricter than any prior project's
  safety language.
✓ First goals must be SHORT (0.5-1 m) and run in a fully clear or
  fenced test area with no fragile objects nearby, before any longer
  or multi-meter goal is attempted.
✓ max_vel_x / max_vel_theta remain capped at Project 1's conservative
  defaults for ALL initial testing — do not raise Nav2's speed ceiling
  until multiple successful short-goal trials have been observed.
✓ NEVER send a goal and walk away. Continuous, attentive supervision is
  required for every single trial in this course — this project is
  explicitly not a "set it and forget it" capstone, despite being the
  most autonomous project taught.
✓ Visually verifying the planned global path in RViz BEFORE allowing
  physical execution (Step 9-10) is a MANDATORY gate, not an optional
  sanity check — precisely because a bad plan here has multiple meters
  of room to go wrong before a human would otherwise notice, unlike
  Project 1's one-step-at-a-time reactive behavior.
✓ When deliberately triggering recovery behaviors (Step 12) for testing,
  do so in a way that cannot bring a spin/back-up motion into contact
  with a person — recovery behaviors are not aware of humans any
  differently than they are aware of any other obstacle.
✓ The Module 0 /cmd_vel watchdog remains a blocking requirement,
  identical to every other project — if the Nav2 stack crashes or hangs
  mid-execution, the robot must stop, not coast on its last command.
✓ Re-verify AMCL convergence (Step 5-6) before EACH new goal in a
  session, rather than assuming localization remains valid indefinitely
  once confirmed at the start.
```

---

## PHASE 4 COMPLETE

Module 0 (Lab Zero) and all four projects — Obstacle Avoidance, Visual Object Tracking, SLAM Mapping, and Autonomous Navigation — are now fully designed to the level of detail required to begin Phase 5 (LMS content: theory pages, full implementation code, quizzes, videos). Nothing in this document has been physically validated — every checkpoint, success criterion, and safety check above remains **theoretically designed**, pending Phase 6's actual on-robot execution. Per the master file's phase-gating rule, Phase 5 should not begin until this complete Phase 4 deliverable is reviewed and approved.
