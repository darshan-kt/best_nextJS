# PHASE 2 — PROJECT ARCHITECTURE
## Hands-On Robotics Projects with ROS 2 Jazzy — Detailed Project & Infrastructure Design

This document is the Phase 2 deliverable required by the master course-design file (`HANDS_ON_ROBOTICS_PROJECTS_COURSE.md`, §35). It builds directly on Phase 1's decisions and does not re-derive them. Per the master file's phase-gating rule, this is presented for review — no LMS content (theory, code walkthroughs, quizzes, videos) is produced until this architecture is approved.

---

## 0. INPUTS CONFIRMED SINCE PHASE 1

Phase 1 flagged three open items blocking a clean Module 0. The user has resolved them as follows — these are now **decisions**, not open questions:

| Phase 1 open item | Resolution | Effect on architecture |
|---|---|---|
| JetPack / Ubuntu version | **Assume the Jetson already has ROS 2 Jazzy installed and working.** No environment decision tree needed. | Phase 1 §2's Path A/B/C decision tree is **dropped from Module 0's critical path**. Module 0 opens with a lightweight environment sanity check (`ros2 doctor`, `printenv ROS_DISTRO`) instead of a JetPack/Docker fork. If that sanity check fails on the day, the course still documents the §2 decision tree as a fallback appendix — but it is no longer the first thing a student does. |
| Custom base controller interface | **Assume it is already built and running**: the robot's base software already exposes `/cmd_vel` in, `/odom` out, "by default." The course does not build this layer — it treats it as existing infrastructure and builds on top of it. | This removes an entire package (a custom base driver) from the course's scope. `robot_bringup` only needs to **verify and launch/depend on** the existing base driver, not implement one. Exact package name and TF-broadcasting behavior are still unconfirmed — see §6. |
| Standalone IMU wiring | **Own dedicated USB/serial connection** (not routed through the base microcontroller). | The IMU gets its **own driver node and its own package dependency**, independent of the base driver. Exact make/model is still unconfirmed — driver package name is a placeholder until Module 0 identifies it (see §6). |

Net effect: Module 0 is now smaller and more focused than Phase 1 projected. It no longer needs to teach an OS-provisioning decision tree or build a base driver from scratch. It needs to: verify the environment, verify/launch three existing or near-existing driver layers (LiDAR, camera, base), bring up a new IMU driver, assemble the URDF/TF tree, and establish the shared `robot_bringup` launch contract.

---

## 1. COMPLETE PROJECT PROGRESSION AND DEPENDENCIES

```
MODULE 0 — Lab Zero (shared infrastructure)
   Gate: environment verified, all sensor topics live, /cmd_vel moves the
         real robot, TF tree is complete and correct in RViz.
        │
        ▼
PROJECT 1 — Obstacle Avoidance
   Needs from M0: /scan, /cmd_vel, base_link→laser_link TF
   Gate: robot reliably avoids obstacles at low speed, unsupervised, 3 clean runs.
        │
        ├──────────────────────────────┐
        ▼                              ▼
PROJECT 2 — Visual Tracking      PROJECT 3 — SLAM
   Needs from M0: camera driver     Needs from M0+P1: /odom quality,
   + P1's safe-motion pattern       full TF tree, teleop or P1-style motion
   Gate: robot centers/follows      Gate: map_saver_cli produces a map that
   a target object at low speed     RViz shows is spatially consistent with
                                     the physical room across 2+ mapping runs
                                              │
                                              ▼
                                    PROJECT 4 — Navigation (Nav2)
                                       Needs from P3: a saved map
                                       Needs from M0+P1: reliable /odom, /cmd_vel
                                       Gate: robot reaches a set goal pose
                                       autonomously, with obstacle avoidance,
                                       3 times without manual intervention.
```

Notes carried forward and made explicit for scheduling:

- **Project 2 is independent of Projects 3–4.** Both branch from Project 1 only. A fast learner (or a second student working in parallel on the same rig at a different time) can do P2 while another does P3 — the syllabus should say this explicitly rather than implying a strict 1→2→3→4 lockstep.
- **Project 4 hard-depends on Project 3's output artifact** (a saved `.yaml`/`.pgm` map pair), not just on the concept of SLAM. The course must ship at least one known-good pre-captured map as a fallback so a student can start Project 4 even if their own Project 3 map was poor — this avoids one bad mapping run blocking the entire back half of the course.
- **Every project depends on Module 0's `robot_bringup` launch contract**, not on any individual driver command. No project should ever tell a student to hand-launch `rplidar_ros` or `realsense2_camera_node` directly — always through `robot_bringup`.

---

## 2. SHARED ROBOT INFRASTRUCTURE PACKAGE DESIGN

Two packages, built in Module 0, consumed by all four projects. Both live under `~/robot_projects_ws/src/`.

### 2.1 `robot_description`

**Purpose:** the single source of truth for robot geometry and coordinate frames. Every later project inherits its TF tree from this package — no project defines its own frames.

**Build type:** `ament_cmake` (pure asset/install package — URDF, meshes, RViz config, one no-hardware launch file).

```
robot_description/
├── package.xml
├── CMakeLists.txt
├── urdf/
│   ├── robot.urdf.xacro           # top-level file; includes the four below
│   ├── base.urdf.xacro            # base_link, chassis footprint, two wheel joints
│   ├── lidar.urdf.xacro           # laser_link, mount offset/rotation from base_link
│   ├── camera.urdf.xacro          # camera_link; realsense-ros publishes the
│   │                               # camera_*_optical_frame children itself —
│   │                               # this file only fixes camera_link to base_link
│   └── imu.urdf.xacro             # imu_link for the STANDALONE imu (not the D435i's)
├── meshes/                        # STL/DAE if available; primitive box/cylinder
│                                   # geometry as fallback — do not block Module 0
│                                   # on having CAD meshes
├── rviz/
│   └── robot_description.rviz     # loads RobotModel + TF display only, no sensors
└── launch/
    └── display.launch.py          # robot_state_publisher + joint_state_publisher_gui
                                    # + rviz2 — visualizes the model with NO hardware
                                    # connected; this is the first thing Module 0 runs
```

**Why `display.launch.py` matters pedagogically:** it lets a student see and validate the TF tree and robot geometry entirely at a desk, before touching hardware — consistent with the master file's Physical Robot Testing Standard (§25: code-only → simulation → hardware, never skip straight to powered hardware).

### 2.2 `robot_bringup`

**Purpose:** the one launch surface every project uses to bring the physical robot's sensors and (where applicable) the base driver online. No project ever launches a driver directly.

**Build type:** `ament_python` (small enough to be `ament_cmake`, but Python is chosen for consistency — all project logic packages in this course are Python, and a mixed build-tool codebase adds no value here).

```
robot_bringup/
├── package.xml
├── setup.py
├── setup.cfg
├── resource/robot_bringup
├── config/
│   ├── rplidar_s3.yaml            # serial port, baudrate, frame_id=laser_link
│   ├── realsense.yaml             # enable_gyro/accel, resolution, frame ids
│   ├── standalone_imu.yaml        # port/baudrate, frame_id=imu_link (driver TBD, §6)
│   └── ekf.yaml                   # robot_localization params (see §3)
├── launch/
│   ├── bringup.launch.py          # FULL stack: description + lidar + camera +
│   │                               # imu + base driver (if not a system service,
│   │                               # see §6) + ekf. This is what every project
│   │                               # launches first.
│   ├── sensors_only.launch.py     # lidar + camera + imu + description, NO base
│   │                               # driver — used for desk-testing sensors with
│   │                               # wheels intentionally not powered
│   └── description.launch.py      # thin wrapper re-exposing robot_description's
│                                    # display.launch.py for convenience
└── test/                          # standard ament lint tests (flake8, pep257)
```

**Design rule enforced here:** every project's own launch file `include`s `robot_bringup/launch/bringup.launch.py` and only adds its own node(s) on top. This is what makes Projects 2–4 fast to build once Module 0 and Project 1 exist — they inherit a working sensor stack instead of re-deriving it.

---

## 3. TF TREE AND SENSOR FUSION DESIGN

```
map                                   (Project 3/4 only — slam_toolbox / AMCL)
 └── odom                             (see below: who publishes this transform)
      └── base_link                   (root of robot_description)
           ├── laser_link             (RPLIDAR S3, static, from lidar.urdf.xacro)
           ├── camera_link            (static, from camera.urdf.xacro)
           │    └── camera_*_optical_frame(s)   (published by realsense-ros itself)
           │    └── camera_gyro/accel_frame     (published by realsense-ros itself)
           └── imu_link               (standalone IMU, static, from imu.urdf.xacro)
```

**`odom → base_link` — decision required in Module 0, not assumed here:**

The base driver is stated to already publish `/odom` "by default." What is *not* yet known is whether it also **broadcasts the `odom → base_link` TF transform** itself (the common convention for a diff-drive controller) or only publishes the `nav_msgs/Odometry` topic and expects something else to broadcast TF.

Two supported configurations, both documented in Module 0 rather than picking one blindly:

- **Configuration A — base driver owns the transform.** If `ros2 run tf2_ros tf2_echo odom base_link` already produces output with only `robot_bringup`'s sensors running (no extra node), the base driver is broadcasting it. In this case `robot_bringup` does **not** run a second broadcaster, and Projects 1–2 use `/odom` and TF as-is.
- **Configuration B — nothing broadcasts it yet.** If the `tf2_echo` command above produces nothing, `robot_bringup` must broadcast it itself. This is where **`robot_localization`'s `ekf_node`** earns its place in the architecture (per Phase 1 §16 item 6): it fuses `/odom` (wheel odometry) with `/imu/data` (the standalone IMU, chosen over the D435i's IMU because it is base-mounted and not subject to camera-mount vibration) and publishes both `/odometry/filtered` and the `odom → base_link` TF transform.

Either way, **Project 1 does not depend on this decision** (it consumes `/scan` and publishes `/cmd_vel` directly — no odometry needed). **Projects 3 and 4 do** — `slam_toolbox` and Nav2 both require a correct, continuously-updating `odom → base_link` transform, so this must be resolved and locked in before Module 0 is considered complete, and re-verified explicitly at the start of Project 3.

`robot_bringup/config/ekf.yaml` is built and included in `bringup.launch.py` either way; the `ekf_node` itself is only *launched* in Configuration B. This keeps the package structure identical regardless of which configuration the real robot turns out to use — only a launch argument (`use_ekf:=true/false`) changes.

---

## 4. FULL ARCHITECTURE PER PROJECT

Each project gets its own package. Naming follows `snake_case`, descriptive of behavior, consistent with `robot_description`/`robot_bringup`.

### 4.1 Project 1 — `obstacle_avoidance_bot`

**Hardware used:** RPLIDAR S3 only (camera and standalone IMU are not required — the course should say this explicitly so students understand *why* a project doesn't touch every sensor).

**Software architecture:**

```
/scan (sensor_msgs/LaserScan)
        ↓
obstacle_avoidance_node
   ├── front FOV filter   (param: front_fov_degrees, default 30 → -15°..+15°,
   │                        implemented via angle_min/angle_max/angle_increment
   │                        index math per Phase 1 §16 item 1 — never a hardcoded
   │                        array slice, since angle_increment varies by scan mode)
   ├── nearest-obstacle distance in front FOV
   ├── left/right clearance comparison outside the front FOV
   └── decision: FORWARD / TURN_LEFT / TURN_RIGHT / STOP
        ↓
/cmd_vel (geometry_msgs/Twist)
        ↓
existing base driver → motors
```

**Package structure:**

```
obstacle_avoidance_bot/
├── package.xml
├── setup.py / setup.cfg
├── resource/obstacle_avoidance_bot
├── obstacle_avoidance_bot/
│   └── obstacle_avoidance_node.py
├── config/
│   └── obstacle_avoidance.yaml     # front_fov_degrees, obstacle_distance,
│                                    # linear_speed, angular_speed — all as
│                                    # ROS 2 parameters, never hardcoded
├── launch/
│   └── obstacle_avoidance.launch.py  # includes robot_bringup/bringup.launch.py,
│                                       # adds obstacle_avoidance_node
└── test/
```

**Dependencies:** `robot_bringup`, `sensor_msgs`, `geometry_msgs`, `rclpy`.

### 4.2 Project 2 — `visual_tracking_bot`

**Hardware used:** RealSense D435i (RGB stream only for the primary path — depth is called out as an Advanced Challenge, matching Phase 1's colored-object-first scope decision).

**Software architecture:**

```
/camera/color/image_raw (sensor_msgs/Image)
        ↓
color_tracker_node
   ├── cv_bridge: ROS Image → OpenCV BGR frame
   ├── BGR → HSV conversion
   ├── color mask (params: hsv_lower, hsv_upper)
   ├── contour detection → largest contour → centroid (cx, cy)
   ├── compare cx against image-center ± deadband
   └── steering decision: TURN_LEFT / TURN_RIGHT / FORWARD / object-lost behavior
        ↓
/cmd_vel (geometry_msgs/Twist)
        ↓
existing base driver → motors
```

**Package structure:**

```
visual_tracking_bot/
├── package.xml
├── setup.py / setup.cfg
├── resource/visual_tracking_bot
├── visual_tracking_bot/
│   └── color_tracker_node.py
├── config/
│   └── color_tracker.yaml          # hsv_lower, hsv_upper, deadband_px,
│                                    # linear_speed, angular_gain, lost_object_timeout
├── launch/
│   └── visual_tracking.launch.py   # includes robot_bringup/bringup.launch.py,
│                                     # adds color_tracker_node
└── test/
```

**Dependencies:** `robot_bringup`, `sensor_msgs`, `cv_bridge`, `geometry_msgs`, `rclpy`, `opencv-python` (system `python3-opencv`).

### 4.3 Project 3 — `robot_slam`

**Hardware used:** RPLIDAR S3 + full TF stack (base odometry, fused or raw per §3) + manual teleop for the first mapping pass (per Phase 1 §9: teleop-driven mapping before any autonomous motion is layered on).

**Software architecture:**

```
/scan + /odom (or /odometry/filtered) + TF
        ↓
slam_toolbox (async or sync mode — async is the default recommendation for a
              first course pass; sync is offered as an Advanced Challenge for
              comparing map quality)
        ↓
/map (nav_msgs/OccupancyGrid) ── visualized live in RViz
        ↓
map_saver_cli → maps/<room_name>.yaml + <room_name>.pgm
```

This project is mostly **configuration and orchestration**, not new node authorship — consistent with the master file's Path A/B/C model (§12): `slam_toolbox` itself is Path A (ready-made, official package), the *project* is teaching how to drive, tune, and validate it.

**Package structure:**

```
robot_slam/
├── package.xml
├── CMakeLists.txt (or setup.py — ament_cmake is fine since this package is
│                    mostly config + launch, no custom nodes)
├── config/
│   └── slam_toolbox_params.yaml    # mode: async, resolution, max_laser_range,
│                                    # matching against the S3's actual range/FOV
├── launch/
│   └── slam.launch.py              # includes robot_bringup/bringup.launch.py
│                                     # (with use_ekf:=true if Config B from §3),
│                                     # launches slam_toolbox, opens RViz with
│                                     # a mapping-specific RViz config
├── rviz/
│   └── slam.rviz                   # LaserScan + Map + TF displays
└── maps/                           # output directory for map_saver_cli;
                                     # ships with one known-good pre-captured
                                     # map as a Project 4 fallback (see §1)
```

**Dependencies:** `robot_bringup`, `slam_toolbox` (apt), `nav2_map_server` (for `map_saver_cli`).

### 4.4 Project 4 — `robot_navigation`

**Hardware used:** RPLIDAR S3 + odometry/TF stack + a saved map from Project 3.

**Software architecture:**

```
saved map + /scan + /odom (or /odometry/filtered)
        ↓
map_server (loads the .yaml/.pgm map)
        ↓
AMCL (localization against the static map)
        ↓
Nav2 stack: bt_navigator → planner_server (global path) →
            controller_server (local trajectory) → costmaps (global + local,
            local costmap consumes live /scan for dynamic obstacle avoidance)
        ↓
/cmd_vel (geometry_msgs/Twist)
        ↓
existing base driver → motors
```

This is also primarily configuration/orchestration (Path A), with the *project* being goal-setting, costmap tuning, and recovery-behavior observation — matching Phase 1's Nav2 scope.

**Package structure:**

```
robot_navigation/
├── package.xml
├── CMakeLists.txt
├── config/
│   ├── nav2_params.yaml            # AMCL, planner, controller, costmap params
│   └── nav2_costmap_footprint.yaml # robot footprint — must match the real
│                                    # differential-drive chassis dimensions,
│                                    # not a placeholder default
├── launch/
│   └── navigation.launch.py        # includes robot_bringup/bringup.launch.py
│                                     # (use_ekf:=true if Config B), includes
│                                     # nav2_bringup's bringup_launch.py with
│                                     # this project's params + a map argument
├── rviz/
│   └── navigation.rviz             # Map + costmaps + global/local path + TF
└── maps/                           # symlink or copy step from robot_slam/maps/
```

**Dependencies:** `robot_bringup`, `robot_slam` (for its map output), `navigation2` (apt), `nav2_bringup` (apt).

---

## 5. FULL COURSE WORKSPACE LAYOUT

```
robot_projects_ws/
└── src/
    ├── robot_description/            # Module 0 — built here
    ├── robot_bringup/                 # Module 0 — built here
    ├── obstacle_avoidance_bot/        # Project 1
    ├── visual_tracking_bot/           # Project 2
    ├── robot_slam/                    # Project 3
    ├── robot_navigation/              # Project 4
    │
    ├── rplidar_ros/                   # cloned from source (Jazzy branch,
    │                                   # matched to the S3 firmware/baudrate)
    ├── realsense-ros/                 # cloned from source (ros2-master branch)
    ├── <standalone_imu_driver_pkg>/   # cloned or apt-installed once identified
    │                                   # in Module 0 — see §6
    │
    └── (slam_toolbox, navigation2, nav2_bringup, cv_bridge — all apt-installed,
        not cloned, per Phase 1 §8: no repository vetting needed for core
        actively-maintained ROS 2 packages)
```

One `colcon build` for the whole workspace, sourced once — this matches the master file's Workspace Setup rule (§14) of teaching the workspace as a single coherent concept rather than per-project silos.

---

## 6. REMAINING ASSUMED ITEMS — MODULE 0 VERIFICATION CHECKLIST

The user's answers removed two of Phase 1's three blockers as *design* concerns, but the physical facts behind them still need to be confirmed on the actual robot before Module 0's instructions are final. Per the master file's rule to never claim a physical procedure is validated unless it has been, these remain explicitly marked:

| # | Assumption | How Module 0 verifies it | Why it still matters |
|---|---|---|---|
| 1 | ROS 2 Jazzy is installed and working on the Jetson | `printenv ROS_DISTRO`, `ros2 doctor`, `ros2 topic list` | If false, falls back to Phase 1 §2's decision tree (kept as an appendix, not deleted) |
| 2 | The existing base driver exposes exactly `/cmd_vel` in, `/odom` out, and is already running or trivially launchable | `ros2 node list`, `ros2 topic info /cmd_vel`, `ros2 topic info /odom`, `ros2 topic hz /odom` | Confirms the contract §2.2/§3 architecture depends on; also determines whether `robot_bringup` needs to launch it or just depend on it as a system service |
| 3 | The base driver does or does not broadcast `odom → base_link` TF itself (Configuration A vs. B, §3) | `ros2 run tf2_ros tf2_echo odom base_link` with only sensors running | Determines whether `ekf_node` runs in `robot_bringup` and whether it owns the TF broadcast — this gates Projects 3–4 |
| 4 | The base driver has a `/cmd_vel` watchdog/timeout that stops motors if commands stop publishing | Physical test: start moving, kill the publishing node, observe whether the robot stops | Safety-critical (Phase 1 §10) — if absent, the course must add a watchdog node before any autonomous project runs |
| 5 | Standalone IMU make/model and exact ROS 2 driver package | Physical inspection (label/datasheet) + `lsusb` / `dmesg` when plugged in | Determines the real package name replacing the `<standalone_imu_driver_pkg>` placeholder in §5, and the exact topic/frame it publishes on |
| 6 | RPLIDAR S3 serial baudrate matches the driver's default config | Check unit datasheet against `rplidar_s3.yaml` before first bring-up | Phase 1 flagged this as a common silent-failure point when A1/A2 tutorials are copy-pasted |

None of items 1–6 block presenting or approving this architecture — they are exactly the kind of on-robot facts Module 0's first lab exercise exists to pin down, per the master file's ASSUMED → VERIFY ON ROBOT pattern. They do block writing Module 0's actual step-by-step commands, which is Phase 3/4 work.

---

## PHASE GATE

This completes the Phase 2 deliverable:

- ✅ Complete project progression and dependencies (§1)
- ✅ Shared robot infrastructure package design — `robot_description`, `robot_bringup`, concrete file lists (§2)
- ✅ TF tree and sensor fusion design, including the one real open engineering decision (Configuration A vs. B) surfaced rather than hidden (§3)
- ✅ Full software and hardware architecture for all four projects, at package/node/topic/parameter level (§4)
- ✅ Full course workspace layout (§5)
- ✅ Updated, narrowed list of ASSUMED items for Module 0 to verify (§6)

Per the master file's development workflow, the next steps are **Phase 3 — Repository and Package Research** (confirming exact driver package names/branches for the S3, D435i, and — once identified — the standalone IMU) and **Phase 4 — Detailed Project Design**. Neither should proceed until this Phase 2 architecture is reviewed and approved.
