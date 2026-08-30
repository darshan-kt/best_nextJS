# PHASE 1 — LAB, ROBOT AND PROJECT ARCHITECTURE
## Hands-On Robotics Projects with ROS 2 Jazzy — Course Foundation Document

**Lab hardware (as confirmed):**
- Robot base: custom differential-drive mobile robot
- LiDAR: RPLIDAR S3 (2D)
- Camera: Intel RealSense D435i (depth + RGB + onboard IMU)
- IMU: onboard D435i IMU, plus a separate standalone IMU sensor also present on the robot
- Compute: NVIDIA Jetson (Orin family assumed — Nano/NX/AGX)
- Target middleware: ROS 2 Jazzy Jalisco

---

## 1. EXECUTIVE COURSE STRATEGY

The course teaches four progressively harder robot behaviors on **one consistent hardware platform**, so students never re-learn a new robot mid-course:

```
Reactive robot (LiDAR only)
        ↓
Perception-driven robot (camera + LiDAR)
        ↓
Mapping robot (SLAM)
        ↓
Autonomous robot (Nav2)
```

Because the base, LiDAR, and camera are constant across all four projects, the shared infrastructure (URDF, TF tree, `cmd_vel` interface, driver bring-up) is built **once**, in a preliminary "Lab Zero" module, and reused by every project. This is the single biggest lever for course quality: students stop fighting hardware bring-up by Project 2 and focus entirely on the new concept each project introduces.

The course explicitly separates **theoretically designed** content from **physically validated** content (per your non-negotiable rules). Every project ships with a "Validation Status" banner until it has actually been run, wheels-down, on your Jetson + RPLIDAR + D435 rig.

---

## 2. ROS 2 JAZZY ENVIRONMENT STRATEGY

This is the first real fork in the road, and it must be resolved with a terminal command on the actual robot before Module 0 is written — not assumed.

**The issue:** ROS 2 Jazzy is Tier-1 supported on Ubuntu 24.04 (Noble) only. Jetson's software stack (JetPack) historically lagged behind:
- JetPack 6.x → Ubuntu 22.04 → Jazzy does **not** install natively (only Humble does).
- JetPack 7.2 (released June 1, 2026) → Ubuntu 24.04 + kernel 6.8 → Jazzy installs natively — but only on Orin AGX/NX/Nano modules that support the 7.2 upgrade path. It does **not** apply to the original (pre-Orin) Jetson Nano, which is end-of-life on JetPack 4.x and cannot run Jazzy at all, natively or otherwise.

**Required first action for the course (Module 0, Step 0):**
```bash
cat /etc/nv_tegra_release      # confirms L4T / JetPack version
lsb_release -a                 # confirms Ubuntu version
```

**Decision tree the course teaches:**

| Result | Path |
|---|---|
| Ubuntu 24.04 confirmed (JetPack 7.2+) | **Path A (preferred):** native `apt install ros-jazzy-desktop` |
| Ubuntu 22.04 (JetPack 6.x) and re-flashing to 7.2 is possible for your module | **Path B:** flash to JetPack 7.2, then Path A |
| Ubuntu 22.04 and re-flashing is not an option (older Orin Nano dev kit, or original Jetson Nano) | **Path C:** run ROS 2 Jazzy inside a Docker container based on `ros:jazzy` with `--runtime nvidia` and the NVIDIA Container Toolkit for GPU passthrough (needed for the RealSense/vision project) |

The course must not silently pick one path — Module 0 has the student run the check and self-select, with worked instructions for all three. This is exactly the kind of "never assume hardware is already working" case your rules call out.

---

## 3. PHYSICAL ROBOT AND LAB ASSUMPTIONS

Confirmed:
- Differential-drive base, custom-built (not a commercial TurtleBot) → the base controller/motor driver is an unknown that must be documented in Module 0 (what microcontroller or driver board converts `/cmd_vel` → wheel PWM? Arduino + `micro-ROS`? A ROS 2-native driver board? Serial bridge node?). **This is the single largest open item** — every project's final stage depends on it, and it can't be assumed.
- RPLIDAR **S3** confirmed → `rplidar_ros` is officially documented for Jazzy and explicitly supports the S3, via `ros2 launch rplidar_ros view_rplidar_s3_launch.py` (viewer) / `rplidar_s3_launch.py` (driver only). Note the S3's serial baudrate differs from the older A-series (verify against the unit's datasheet before Module 0 bring-up — this is a common silent-failure point when a course example is copy-pasted from an A1/A2 tutorial).
- RealSense **D435i** confirmed → has an onboard IMU (accelerometer + gyro), so `enable_gyro:=true enable_accel:=true` on `realsense2_camera_node` gives IMU data through the *same* driver and topic namespace as the RGB/depth streams — no separate IMU integration needed for this sensor.
- **Separate standalone IMU also present on the robot**, in addition to the D435i's onboard IMU. This means there are two IMU data sources on the platform. Module 0 must resolve: (a) what this standalone IMU is (make/model, interface — I2C/SPI/serial, likely via the same microcontroller that drives the motors) and its ROS 2 driver, and (b) which IMU is authoritative for sensor fusion / TF (`imu_link` frame) if both are used — typically the base-mounted standalone IMU is preferred for odometry fusion (closer to `base_link`, not subject to camera vibration), while the D435i's IMU is more useful if it's ever fused specifically with the depth stream. This is a Phase 2 architecture decision, not a Phase 1 one — flagging it here so it isn't lost.
- Jetson exact module and JetPack version: unconfirmed, resolved in §2 above.

Assumptions the course will state explicitly and let students override:
- USB connections for both RPLIDAR S3 and D435i (typical for this class of hardware; D435i needs USB3 specifically for full-bandwidth depth+RGB+IMU).
- Differential-drive kinematics (two driven wheels, standard `cmd_vel` linear.x / angular.z control).
- LiDAR mounted level, forward-facing at 0 rad in the robot's base_link frame (flip/offset parameters taught explicitly rather than hardcoded).

---

## 4. PROJECT DEPENDENCY AND LEARNING PROGRESSION

```
MODULE 0 — Lab Zero (shared infra, all projects depend on this)
        ↓
PROJECT 1 — Obstacle Avoidance   (needs: LiDAR driver, base driver, TF)
        ↓
PROJECT 2 — Visual Tracking      (needs: everything in P1 + camera driver, cv_bridge)
        ↓
PROJECT 3 — SLAM                 (needs: everything in P1 + odometry/TF quality from base driver)
        ↓
PROJECT 4 — Navigation (Nav2)    (needs: a saved map from P3 + everything in P1)
```

Project 2 (vision) is architecturally independent of Projects 3–4 (mapping/nav) — both branch from Project 1. The course can let fast learners do P2 and P3 in parallel after finishing P1, which is worth calling out explicitly in the syllabus.

---

## 5. COMPLETE ARCHITECTURE FOR ALL FOUR PROJECTS

### Shared base layer (Module 0)
```
Jetson (ROS 2 Jazzy)
   ├── rplidar_ros driver node  → /scan (sensor_msgs/LaserScan)          [RPLIDAR S3]
   ├── realsense2_camera node   → /camera/color/image_raw,
   │                                /camera/depth/image_rect_raw,
   │                                /camera/imu (if enable_gyro/accel)   [D435i]
   ├── standalone IMU driver    → /imu/data_raw (sensor_msgs/Imu)        [driver TBD, §3]
   ├── robot_base_driver node   → subscribes /cmd_vel, drives motors
   │                              publishes /odom (nav_msgs/Odometry)
   └── robot_state_publisher    → TF tree from URDF
```

### Project 1 — Obstacle Avoidance
```
/scan → [Front FOV Filter] → [Obstacle Decision Node] → /cmd_vel → base driver → motors
```
Configurable parameter: `front_fov_degrees` (default 30 → interpreted as **−15° to +15° about the robot's forward x-axis**, i.e. symmetric split; this is stated explicitly rather than left ambiguous, and implemented against `LaserScan.angle_min/angle_max/angle_increment`, which follow REP-103/105 convention — counter-clockwise from the robot's forward axis).

### Project 2 — Visual Object Tracking
```
/camera/color/image_raw → cv_bridge → HSV threshold → centroid → [Steering Node] → /cmd_vel
```

### Project 3 — SLAM
```
/scan + /odom + TF → slam_toolbox → /map (nav_msgs/OccupancyGrid) → RViz → map_saver_cli
```

### Project 4 — Navigation
```
saved map + /scan + /odom → Nav2 stack (AMCL, planner_server, controller_server,
bt_navigator, costmaps) → /cmd_vel → base driver → motors
```

---

## 6. SHARED ROS 2 INFRASTRUCTURE

Built once in Module 0, reused everywhere:
- **`robot_description` package**: URDF/xacro defining `base_link`, `laser_frame`, `camera_link`, wheel joints — this is the backbone of the TF tree every later project reads.
- **`robot_bringup` package**: one launch file that starts LiDAR driver + camera driver + base driver + `robot_state_publisher` together, so every project (P1–P4) launches hardware identically and only adds its own node on top.
- **Base driver interface contract**: subscribes `/cmd_vel` (`geometry_msgs/Twist`), publishes `/odom`. This contract is documented in Module 0 regardless of what microcontroller/protocol sits underneath, so every later project only ever talks to this one topic pair.
- **Common workspace**: `~/robot_projects_ws/src/` holding all packages, one `colcon build` for the whole course.

---

## 7. HARDWARE AND SOFTWARE REQUIREMENT MATRIX

| Layer | Component | Package / Tool |
|---|---|---|
| OS | Ubuntu 24.04 (native or containerized per §2) | — |
| Middleware | ROS 2 Jazzy Jalisco | `ros-jazzy-desktop` |
| LiDAR driver | RPLIDAR S3 | `ros-jazzy-rplidar-ros` (official, Jazzy-documented; `view_rplidar_s3_launch.py`) |
| Camera + IMU driver | RealSense D435i | `realsense-ros` (`ros2-master` branch, Jazzy-supported) + `librealsense2`, launched with `enable_gyro:=true enable_accel:=true` |
| Standalone IMU driver | Separate onboard IMU (model TBD) | to be identified in Module 0 alongside the base controller — likely the same microcontroller/serial link |
| Vision | OpenCV + bridge | `python3-opencv`, `ros-jazzy-cv-bridge` |
| Mapping | SLAM | `ros-jazzy-slam-toolbox` |
| Navigation | Nav2 | `ros-jazzy-navigation2`, `ros-jazzy-nav2-bringup` |
| Visualization | RViz2 | ships with `ros-jazzy-desktop` |
| Base interface | Custom driver | to be identified in Module 0 (Arduino+micro-ROS / native ROS 2 board / serial bridge) |
| Build tools | colcon, rosdep | `python3-colcon-common-extensions`, `python3-rosdep` |

---

## 8. REPOSITORY AND PACKAGE RESEARCH STRATEGY

Verified for this course (per your §13 requirement — official/maintained/Jazzy-confirmed only):
- **`rplidar_ros`** (Slamtec, synced to the ROS build farm) — has a documented Jazzy release page and explicitly supports the S3 via `view_rplidar_s3_launch.py` / `rplidar_s3_launch.py`. Preferred over the community `sllidar_ros2` fork for the primary path, though `sllidar_ros2` also lists S3 launch files as a fallback if `rplidar_ros` ever has an issue on this specific unit.
- **`realsense-ros`** (`ros2-master` branch, now maintained under `realsenseai/realsense-ros`) — explicitly lists Jazzy as a supported `ROS_DISTRO` value in current docs, and natively supports the D435i's IMU stream via `enable_gyro`/`enable_accel` launch arguments — no separate IMU package needed for the camera's own IMU.
- **`slam_toolbox`** and **`navigation2`** — both are core, actively maintained ROS 2 packages with binary Jazzy releases; no repository vetting needed beyond standard `apt` install.

Open items for Module 0:
1. Research/identify the correct driver approach for the **custom base controller** — this is the component with no off-the-shelf answer, and needs to be resolved against your actual motor controller hardware before Path A/B/C bring-up instructions can be finalized.
2. Identify the **standalone IMU's** make/model and interface, so the correct ROS 2 driver package (or a custom micro-ROS publisher, if it's wired through the same microcontroller as the motors) can be selected.

---

## 9. PHYSICAL ROBOT TESTING STRATEGY

Every project follows: **desk test (no wheels driven) → tethered low-speed test → free-run test**, matching your Phase 6 requirement never to treat simulation as physical proof.
- P1/P2: cap `linear.x` at a conservative default (e.g. 0.1–0.15 m/s) for first live run, raised only after a supervised clean test.
- P3: teleop-driven mapping run first (student drives manually while `slam_toolbox` builds the map) before any autonomous motion is layered on.
- P4: first navigation goals set inside a fenced/clear area, `E-stop`/kill-switch reachable at all times.

---

## 10. SAFETY AND VALIDATION STRATEGY

Standard Lab Safety Check (per your §9) applied before every powered run, plus two additions specific to your rig:
- Confirm the custom base driver has a **software or hardware timeout** that stops motors if `/cmd_vel` stops publishing (common failure mode with custom controllers — must be verified, not assumed).
- RealSense USB bandwidth: verify cable/hub supports the required USB3 throughput before Project 2 — a common silent-failure point on Jetson USB hubs.

---

## 11. HIGH-LEVEL CURRICULUM

```
Module 0 — Lab Zero: workspace, URDF, driver bring-up, TF, cmd_vel contract
Module 1 — Project 1: Obstacle Avoidance
Module 2 — Project 2: Visual Object Tracking
Module 3 — Project 3: SLAM Mapping
Module 4 — Project 4: Nav2 Autonomous Navigation
Module 5 — Capstone: combine tracking + navigation (optional stretch project)
```

---

## 12. PROJECT IMPLEMENTATION MODEL

Every project ships all three paths from your §12:
- **Path A** (ready-made driver/package) for hardware bring-up layers (LiDAR, camera, SLAM, Nav2) — these are standard packages, not worth re-deriving.
- **Path B** (build step-by-step) for the actual project logic (obstacle decision node, color-tracking steering node) — this is where the learning happens, built incrementally per your §16.
- **Path C** (modify existing) as the end-of-project challenge — e.g. change `front_fov_degrees`, swap HSV thresholds for a different color, adjust Nav2 costmap inflation radius.

---

## 13. VISUAL ASSET STRATEGY

Per project: hero image of the rig mid-task, architecture diagram (as in §5 above), live RViz screenshot (LaserScan / camera feed / occupancy grid / costmap as relevant), ROS graph (`rqt_graph` output), TF tree diagram (`ros2 run tf2_tools view_frames`), hardware wiring diagram for that project's sensor. All captured from **your actual rig** once physically validated — not stock/generic robot photos, per your rule against decorative visuals without educational value.

---

## 14. VIDEO STRATEGY

Following your seven-video structure per project (overview, concept, setup, implementation, execution, debugging, final demo) — all must be filmed on your actual Jetson/RPLIDAR/D435 robot once each project is physically validated, not sourced externally, since a generic TurtleBot video would contradict your own hardware and confuse students about topic names/frames.

---

## 15. QUIZ AND ASSESSMENT STRATEGY

Each project: Project Understanding quiz (architecture), Concept quiz (e.g. LaserScan fields, HSV vs RGB, occupancy grids, costmaps), Data Flow quiz, Debugging quiz (scenario-based, e.g. "`/scan` is publishing but the robot won't turn — what do you check next?"), and the closing "Can You Build It Yourself?" challenge per your §32.

---

## 16. KEY TECHNICAL AND ARCHITECTURE DECISIONS

1. **`front_fov_degrees` = symmetric split around 0° (forward)** — 30° default means −15° to +15°, implemented via `LaserScan.angle_min/max/increment` index math, not hardcoded array slicing.
2. **ROS 2 Jazzy environment resolved per-device** via the Module 0 decision tree (§2) — not assumed to be native.
3. **`rplidar_ros`** as the primary LiDAR driver for the S3, based on confirmed Jazzy documentation and explicit S3 launch file support.
4. **`realsense-ros` `ros2-master` branch** for the D435i, confirmed Jazzy-supported, with `enable_gyro`/`enable_accel` on so the camera's IMU data comes through the same driver.
5. **Base driver contract fixed at `/cmd_vel` in, `/odom` out** — isolates all four projects from the specifics of your custom motor controller, which remains an item requiring on-site research before Module 0 can be finalized.
6. **Two IMU sources exist on the platform** (D435i onboard IMU + standalone IMU) — Phase 2 must decide which feeds sensor fusion / odometry (typically the base-mounted standalone unit, via `robot_localization` or similar, since it isn't subject to camera-mount vibration) versus which is simply available as an extra topic.
7. **Shared `robot_bringup` launch file** across all projects — no project re-derives hardware bring-up from scratch.

---

## OPEN ITEMS BEFORE MODULE 0 CAN BE FINALIZED

1. Run `cat /etc/nv_tegra_release && lsb_release -a` on the Jetson → confirms which environment path (A/B/C) Module 0 should lead with.
2. Identify the custom base controller's interface (microcontroller, protocol, existing ROS 2 driver or none) → this is the piece of the architecture with no ready-made answer and blocks §6/§9/§10 details.
3. Identify the standalone IMU's make/model and how it's wired (own USB/serial connection, or through the same microcontroller as the motors) → determines its driver package and whether it needs its own bring-up step or rides along with the base driver.

RPLIDAR model and RealSense variant are now confirmed (S3, D435i) and no longer open items. Once items 1–3 above are confirmed, Phase 2 (detailed Project Architecture) can proceed without placeholders.