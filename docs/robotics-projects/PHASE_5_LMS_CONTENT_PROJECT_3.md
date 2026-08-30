# PHASE 5 — LMS CONTENT DESIGN
## Project 3 — Robot Mapping Using SLAM

> **VALIDATION STATUS: THEORETICALLY DESIGNED, NOT PHYSICALLY VALIDATED.**
> Same discipline as every prior module: commands and code below are
> predictions of correct behavior against current ROS 2 Jazzy and
> `slam_toolbox` conventions, phrased as "you should see," never "you
> will see." This becomes validated only in Phase 6, on the physical
> robot — not in this document.

This is **Part 3 of Phase 5**, covering Project 3 only. Module 0, Project 1, and Project 2's LMS content are complete and approved; this document builds directly on Module 0's `robot_bringup` without re-deriving anything already settled there.

---

# PROJECT 3 — ROBOT MAPPING USING SLAM

## 1. Project Overview — What Are We Building?

### Project Objective

You will drive the robot slowly and deliberately around a room using keyboard teleoperation, while `slam_toolbox` fuses live LiDAR scans with the robot's odometry to build a 2D occupancy-grid map in real time. You'll watch the map take shape in RViz, complete a loop that revisits your starting point to confirm the map doesn't drift, then save the finished map to disk in exactly the format and location Project 4 will load it from next.

### Real-World Application

This is the same fundamental capability behind warehouse robots mapping a new facility, vacuum robots building a floor plan on their first run in a home, and search-and-rescue robots building a map of an unknown space as they explore it. SLAM — Simultaneous Localization And Mapping — is one of the foundational problems in mobile robotics, and this project teaches it using a mature, widely-used library rather than implementing the algorithm from scratch.

### What The Robot Will Do

Build a live occupancy-grid map while you drive it by keyboard, visibly in RViz, and save that map to a file pair your next project depends on.

### What The Student Will Build

This project is different from Projects 1 and 2 in an important way: **you are not writing a new node.** `slam_toolbox` is a mature, ready-made package — the engineering skill here is learning to configure, drive, and validate it correctly, not to reimplement SLAM. You'll build the `robot_slam` package: configuration, a launch file, and a saved-maps directory.

**[IMAGE: RViz screenshot of a completed room map, walls clean and single-lined — pending physical capture]**

**[VIDEO: a teleop-driven mapping run from start to loop closure — pending physical capture]**

---

## 2. Prerequisites

- **Knowledge:** completed Module 0 and Project 1; comfortable with the concept of TF frames (introduced in Module 0); no prior SLAM experience required
- **Hardware:** RPLIDAR S3 + the odometry/TF chain from Module 0 (base driver, optionally combined with the standalone IMU via `use_ekf`) + a keyboard. **The RealSense D435i is not used in this project** — explained in §4
- **Software:** Module 0's `robot_bringup` built and its `use_ekf` value already resolved and documented (§9 of that module) — **this project consumes that value as a fact, it does not re-test it**

---

## 3. Lab Safety Check

```
✓ A human is in direct control of every motion command via keyboard
  teleop for the entire mapping run — there is no autonomous decision
  loop to fail in this project's primary path.
✓ Cap teleop step speed to the same conservative range used elsewhere
  in the course — a human watching a laptop screen instead of the
  robot can still drive too fast into a wall.
✓ Clear the physical path for your planned mapping loop before driving
  — remove trip hazards and loose cables from the floor area.
✓ Maintain direct line of sight to the physical robot while driving —
  do not rely on the RViz map view alone. RViz only shows what the
  LiDAR has already scanned, not obstacles at a height the 2D LiDAR
  plane can't see.
✓ Module 0's /cmd_vel watchdog remains a blocking requirement here too
  — if your keyboard terminal loses focus or an SSH session drops
  mid-drive, the robot must stop rather than continue on its last
  command indefinitely.
✓ If your course later adds autonomous frontier-exploration mapping as
  a stretch exercise, it must be held to the exact same speed-cap and
  supervision discipline as Projects 1-2 — this project's primary path
  avoids that question entirely by keeping a human in the loop.
```

---

## 4. Project Architecture and Data Flow

**Hardware used:** RPLIDAR S3, and the odometry/TF chain Module 0 already resolved. **The D435i is not used** — this is 2D LiDAR-based SLAM, not visual SLAM; the algorithm operates entirely on `/scan` and TF.

**On `use_ekf`, stated plainly for this project:** Projects 1 and 2 never touched `/odom` — skipping it cost them nothing, because their decisions depended only on the current sensor frame. **This is the first project where that's no longer true.** `slam_toolbox` uses odometry as a motion prior between LiDAR scans to disambiguate matches in open or repetitive spaces — without it, scan-to-scan drift accumulates unchecked on a real robot. This project does not re-decide `use_ekf`; it simply launches `robot_bringup` with whatever value Module 0 already determined for your specific rig, and consumes the resulting `odom → base_link` transform as a given fact.

```
PHYSICAL ENVIRONMENT (unmapped room)
        ↓
RPLIDAR S3 → rplidar_ros → /scan
        ↓                          existing base driver (+ ekf_node if
        │                          use_ekf:=true, per Module 0's resolved
        │                          value) → /odom or /odometry/filtered
        │                                        ↓
        │                          odom → base_link TF
        ↓                                        ↓
     TF TREE:  base_link → laser_link (static)
               odom → base_link (dynamic, from base driver/EKF)
        ↓                                        ↓
slam_toolbox (online asynchronous mode — chosen in Phase 4 because it
              won't block/lag the live map→odom TF broadcast the way
              synchronous mode risks under momentary Jetson load)
   ├── Scan matching against current map estimate
   ├── Odometry motion prior between scans
   ├── Pose-graph optimization + loop-closure correction
   └── Occupancy grid update
        ↓                                          ↑
map → odom TF (broadcast BY slam_toolbox) ─────────┘
        ↓
/map + /map_metadata → RViz (live)

   [running concurrently, driven by you:]
Keyboard → teleop_twist_keyboard → /cmd_vel → existing base driver →
motors → ROBOT MOTION → new viewpoint → new /scan → (loop continues)
        ↓
map_saver_cli → robot_slam/maps/<room_name>.yaml + <room_name>.pgm
```

---

## 5. Implementation — Configuration and Orchestration (Path A + Verification)

This project's "build" is configuration, launch composition, and disciplined verification — not new node code. Every step below still follows the course's incremental philosophy: verify one layer before trusting the next.

### STEP 1 — Re-verify the TF chain you already resolved in Module 0

```bash
ros2 launch robot_bringup bringup.launch.py use_ekf:=<your resolved value>
```
(second terminal)
```bash
ros2 run tf2_ros tf2_echo odom base_link
```

**What this does:** confirms `odom → base_link` is broadcasting continuously, exactly as Module 0 established, before adding SLAM on top of it.
**What success looks like:** a transform prints continuously, with no gaps.
**If it fails:** do not proceed — this means something changed since Module 0 (a config drift, a node not starting). Fix this before touching `slam_toolbox` at all; a broken transform here will silently corrupt every map you build.

### STEP 2 — Verify teleop alone, wheels lifted

```bash
sudo apt install ros-jazzy-teleop-twist-keyboard   # confirmed maintained, Phase 3
ros2 run teleop_twist_keyboard teleop_twist_keyboard
```

**What this does:** opens an interactive terminal tool — `i` drives forward, `,` backward, `j`/`l` turn in place, `k` stops, and `u`/`o`/`m`/`.` combine turning with motion. `q`/`z` scale both speeds up/down, `w`/`x` scale linear speed only, `e`/`c` scale angular speed only.
**What success looks like:** with wheels lifted, each key produces the expected wheel rotation direction — verify this exactly the same way Project 1 verified its own command source before trusting it.
**If it fails:** if keys produce no motion, confirm the terminal running `teleop_twist_keyboard` has keyboard focus — it reads raw terminal input, not a separate window.

### STEP 3 — Create the `robot_slam` package

```bash
cd ~/robot_projects_ws/src
ros2 pkg create robot_slam --build-type ament_cmake
mkdir -p robot_slam/config robot_slam/launch robot_slam/rviz robot_slam/maps
```

`robot_slam/package.xml`:

```xml
<?xml version="1.0"?>
<?xml-model href="http://download.ros.org/schema/package_format3.xsd" schematypens="http://www.w3.org/2001/XMLSchema"?>
<package format="3">
  <name>robot_slam</name>
  <version>0.1.0</version>
  <description>Project 3: teleop-driven 2D LiDAR SLAM using slam_toolbox.</description>
  <maintainer email="you@example.com">Your Name</maintainer>
  <license>Apache-2.0</license>

  <buildtool_depend>ament_cmake</buildtool_depend>

  <exec_depend>robot_bringup</exec_depend>
  <exec_depend>slam_toolbox</exec_depend>
  <exec_depend>teleop_twist_keyboard</exec_depend>
  <exec_depend>nav2_map_server</exec_depend>

  <export>
    <build_type>ament_cmake</build_type>
  </export>
</package>
```

`robot_slam/CMakeLists.txt`:

```cmake
cmake_minimum_required(VERSION 3.8)
project(robot_slam)

find_package(ament_cmake REQUIRED)

install(DIRECTORY config launch rviz maps
  DESTINATION share/${PROJECT_NAME}
)

ament_package()
```

### STEP 4 — Write `slam_toolbox`'s parameters

`robot_slam/config/slam_toolbox_params.yaml`:

```yaml
slam_toolbox:
  ros__parameters:
    solver_plugin: solver_plugins::CeresSolver
    ceres_linear_solver: SPARSE_NORMAL_CHOLESKY
    ceres_preconditioner: SCHUR_JACOBI
    ceres_trust_strategy: LEVENBERG_MARQUARDT
    ceres_dogleg_type: TRADITIONAL_DOGLEG
    ceres_loss_function: None

    odom_frame: odom
    map_frame: map
    base_frame: base_link
    scan_topic: /scan
    mode: mapping

    resolution: 0.05
    max_laser_range: 12.0        # ASSUMED — VERIFY against the RPLIDAR S3
                                   # datasheet before trusting distant walls
    minimum_time_interval: 0.2
    transform_publish_period: 0.02
    map_update_interval: 5.0
    minimum_travel_distance: 0.2
    minimum_travel_heading: 0.17
    do_loop_closing: true
    loop_search_maximum_distance: 3.0
    transform_timeout: 0.2
    tf_buffer_duration: 30.0
    stack_size_to_use: 40000000
```

**Why online asynchronous, not synchronous (decided in Phase 4, applied here):** `slam_toolbox` ships both modes. Synchronous mode processes every scan in strict order and blocks if it falls behind — on a real robot, a momentarily busy Jetson can turn into a lagging `map → odom` broadcast, which shows up as jittery or stale map updates while you're actively driving. Asynchronous mode drops an occasional scan under load instead of blocking — a non-event at teleop speeds. This is why the launch file below uses `slam_toolbox`'s own `online_async_launch.py`.

### STEP 5 — Write the launch file

`robot_slam/launch/slam.launch.py`:

```python
import os

from ament_index_python.packages import get_package_share_directory
from launch import LaunchDescription
from launch.actions import DeclareLaunchArgument, IncludeLaunchDescription
from launch.launch_description_sources import PythonLaunchDescriptionSource
from launch.substitutions import LaunchConfiguration
from launch_ros.actions import Node


def generate_launch_description():
    bringup_share = get_package_share_directory('robot_bringup')
    slam_share = get_package_share_directory('robot_slam')
    slam_toolbox_share = get_package_share_directory('slam_toolbox')

    use_ekf = LaunchConfiguration('use_ekf')

    declare_use_ekf_arg = DeclareLaunchArgument(
        'use_ekf',
        default_value='false',
        # Set this to whatever Module 0 already determined for YOUR robot
        # (Configuration A -> false, Configuration B -> true). This
        # project consumes that fact; it does not re-decide it.
        description='Must match the use_ekf value Module 0 already resolved.'
    )

    bringup_launch = IncludeLaunchDescription(
        PythonLaunchDescriptionSource(
            os.path.join(bringup_share, 'launch', 'bringup.launch.py')
        ),
        launch_arguments={'use_ekf': use_ekf}.items()
    )

    slam_toolbox_launch = IncludeLaunchDescription(
        PythonLaunchDescriptionSource(
            os.path.join(slam_toolbox_share, 'launch', 'online_async_launch.py')
        ),
        launch_arguments={
            'slam_params_file': os.path.join(slam_share, 'config', 'slam_toolbox_params.yaml'),
            'use_sim_time': 'false',
        }.items()
    )

    rviz_node = Node(
        package='rviz2',
        executable='rviz2',
        arguments=['-d', os.path.join(slam_share, 'rviz', 'slam.rviz')],
        output='screen'
    )

    return LaunchDescription([declare_use_ekf_arg, bringup_launch, slam_toolbox_launch, rviz_node])
```

```bash
cd ~/robot_projects_ws
colcon build --packages-select robot_slam
source install/setup.bash
```

### STEP 6 — Launch with the robot stationary, confirm a local patch appears

```bash
ros2 launch robot_slam slam.launch.py use_ekf:=<your resolved value>
```

The first launch will open RViz with no saved configuration. Add **Map**, **LaserScan**, and **TF** displays, set the Fixed Frame to `map`, then **File → Save Config As** → `robot_slam/rviz/slam.rviz`, exactly as Module 0 taught for its own RViz config.

**What success looks like:** even with the robot completely stationary, a small local patch of map appears around the robot's current position — confirming the pipeline works before any driving happens.

### STEP 7 — THE TF CHECKPOINT — verify before judging map quality

This is a standalone, mandatory checkpoint, not a footnote: **a broken TF chain is the single most common root cause of a bad-looking map, and it is very easy to misdiagnose as a `slam_toolbox` tuning problem if you don't check this first.**

```bash
ros2 run tf2_ros tf2_echo map laser_link
```

**What success looks like:** a continuously updating transform prints, with no gaps or timeouts.

```bash
cd ~/robot_projects_ws
ros2 run tf2_tools view_frames
```

**What this does:** samples the running TF tree for a few seconds and renders it to a PDF (named `frames.pdf` or a timestamped variant, depending on your `tf2_tools` version) in your current directory.
**What success looks like:** opening that PDF shows one connected chain — `map → odom → base_link → laser_link` (and `base_link → camera_link`, `base_link → imu_link` as side branches) — with **no orphaned or disconnected frames**.
**If it fails:** if `map` is missing entirely, `slam_toolbox` isn't running or hasn't started broadcasting yet — check its node status before anything else. If `odom → base_link` is missing, go back to Step 1 — this project didn't break it, but something regressed since Module 0.

### STEP 8 — First teleop-driven mapping pass

With Step 7 passed, drive slowly in a small, simple space first — do not attempt a full loop yet. Watch the `/map` display build live in RViz as you move.

### STEP 9 — Deliberate loop-closure test

Drive back over territory you've already mapped, forming a small loop. **This is the concrete "is this map good enough" checkpoint:** watch whether the walls in the overlapping region snap together into a single clean line, or whether you see two offset copies of the same wall (a doubled/ghosted wall). A clean, single line is the pass condition — not merely "a map appeared."

**If you see doubling:** slow down further, and/or tighten `minimum_travel_distance`/`minimum_travel_heading` in the config, then re-attempt. Doubling after Step 7 has already passed indicates a `slam_toolbox` tuning or driving-speed problem, not a TF problem — this is exactly why the TF checkpoint comes first, so you're not chasing the wrong layer.

### STEP 10 — Complete the full loop and save the map

Once you're satisfied with loop-closure quality, complete a full loop of your intended test area, ending back near your starting position.

```bash
mkdir -p ~/robot_projects_ws/src/robot_slam/maps
ros2 run nav2_map_server map_saver_cli -f ~/robot_projects_ws/src/robot_slam/maps/lab_room
```

**What this does:** saves the current `/map` topic to disk as `lab_room.yaml` (metadata: resolution, origin, thresholds) and `lab_room.pgm` (the actual grid image).
**What success looks like:**
```bash
ls -la ~/robot_projects_ws/src/robot_slam/maps/
```
shows both `lab_room.yaml` and `lab_room.pgm`, neither zero bytes.
**This exact file pair, at this exact path, is what Project 4 will load next** — get the name and location right here, since the next project builds directly on it.

### STEP 11 — Reload the saved map to confirm it's actually usable

```bash
ros2 run nav2_map_server map_server --ros-args -p yaml_filename:=/home/<you>/robot_projects_ws/src/robot_slam/maps/lab_room.yaml
```
(second terminal)
```bash
ros2 lifecycle set /map_server configure
ros2 lifecycle set /map_server activate
```
(third terminal, or reuse RViz)
```bash
ros2 topic echo /map --once
```

**What success looks like:** the reloaded `/map` visually matches (in RViz, add a Map display subscribed to this instance) what you built live in Step 8-10 — confirming the saved file is valid and complete, not just that `map_saver_cli` exited without an error code.

---

## 6. Path C — Modify Existing (Closing Challenge)

- Change `do_loop_closing` to `false`, repeat the same loop-closure test from Step 9, and compare the result — this makes concrete exactly what loop closure is correcting for.
- (Advanced) Record a `ros2 bag record /scan /tf /tf_static` session during a mapping run, then replay it through `slam_toolbox`'s **online synchronous** launch file instead, and compare map quality/timing against your live asynchronous run — the tradeoff named in §5 becomes directly observable.

---

## 7. How to Run the Project

```
TERMINAL 1
ros2 launch robot_slam slam.launch.py use_ekf:=<your resolved value>
   → Why: brings up robot_bringup's sensors, slam_toolbox, and RViz
     together — matching the "no project hand-launches a driver" rule.
   → What should appear: bringup logs, then slam_toolbox startup logs,
     then RViz opens showing at least a local map patch.

TERMINAL 2
ros2 run teleop_twist_keyboard teleop_twist_keyboard
   → Why: this is how you drive during the mapping run — a human is
     the only "controller" active in this project's primary path.

TERMINAL 3 (as needed)
ros2 run tf2_ros tf2_echo map laser_link  /  ros2 run tf2_tools view_frames
   → Why: the TF checkpoint from Step 7 — run this BEFORE judging map
     quality any time something looks wrong.
```

---

## 8. Expected Results

```
✓ odom→base_link transform confirmed present before slam_toolbox is
  even launched (Step 1)
✓ A local map patch appears with the robot stationary (Step 6)
✓ map→laser_link transform confirmed continuous, and view_frames shows
  one connected tree with no orphans (Step 7) — BEFORE judging map quality
✓ Walls in a deliberately-closed loop appear as single clean lines, not
  doubled (Step 9)
✓ map_saver_cli produces a non-empty .yaml + .pgm pair at the exact
  path Project 4 expects (Step 10)
✓ The reloaded map visually matches the live-built one (Step 11)
```

---

## 9. Verification Checkpoints

```
CHECKPOINT 1 — HARDWARE: RPLIDAR S3 connected/spinning (Module 0's
  check, reused); keyboard/terminal focus confirmed working for teleop.

CHECKPOINT 2 — ROS 2: does slam_toolbox start without error and reach
  and stay in the ACTIVE lifecycle state?

CHECKPOINT 3 — TF (hard gate, checked BEFORE map quality): is the full
  chain map→odom→base_link→laser_link complete and continuously
  updating, per Step 7? A failure here invalidates any conclusion drawn
  from Checkpoint 4.

CHECKPOINT 4 — ALGORITHM / MAP QUALITY: during the deliberate loop test
  (Step 9), does the map snap to a single clean wall line rather than
  leaving a doubled/offset copy?

CHECKPOINT 5 — CONTROL: does teleop move the robot in the expected
  direction immediately, with no lag that would cause overshoot around
  a corner while you're watching the map instead of the robot?

CHECKPOINT 6 — PHYSICAL ROBOT / ARTIFACT: after a full loop, does
  map_saver_cli produce a valid map that, when reloaded (Step 11),
  visually matches the live-built one with no missing regions?
```

---

## 10. Visual and Video Assets, Quizzes, Practical Assessment

### Visual Assets

- **[IMAGE: hero photo of the robot mid-mapping-run — pending]**
- Architecture diagram — rendered directly in §4 above
- **[SCREENSHOT: RViz map mid-build, before loop closure — pending]**
- **[SCREENSHOT: RViz map after loop closure, walls clean — pending]**
- **[SCREENSHOT: a "bad" map showing doubled walls, for contrast — pending, and worth capturing deliberately once, since it's genuinely instructive]**
- **[PDF/IMAGE: `view_frames` output showing the complete TF tree — pending]**

### Video Assets (all pending)

1. Project Overview — pending
2. Concept (what SLAM is solving, pose graphs, loop closure) — pending
3. Setup — pending
4. Implementation (config + launch composition) — pending
5. Execution (a full teleop mapping run) — pending
6. Debugging (a real TF or drift problem diagnosed) — pending
7. Final Demonstration (save, reload, confirm) — pending

### Quizzes

**Project Understanding Quiz**

1. *Why does this project not involve writing a new ROS 2 node, unlike Projects 1 and 2?*
   **Answer:** `slam_toolbox` is a mature, ready-made package (Path A) — the engineering skill this project teaches is correctly configuring, driving, and validating an existing SLAM system, not re-implementing the algorithm. Projects 1 and 2 taught node authorship because their behaviors were simple enough to build from scratch as a learning exercise; SLAM is not.

**Concept Quiz**

1. *Why does `slam_toolbox` need odometry at all if it's already matching LiDAR scans against the map?*
   **Answer:** Scan matching alone is ambiguous in open or repetitive spaces (a long corridor, a mostly empty room) — odometry supplies a motion prior between scans that disambiguates which match is physically plausible, preventing unchecked drift.

2. *What does `do_loop_closing: true` actually do, conceptually?*
   **Answer:** When the robot revisits a previously-mapped area, loop closure recognizes the match and corrects the accumulated pose-graph error across the whole loop — this is the mechanism directly responsible for walls "snapping together" into a single line instead of staying doubled.

**Data Flow Quiz**

1. *Which node is responsible for broadcasting the `map → odom` transform, and how is that different from Module 0's `odom → base_link` transform?*
   **Answer:** `slam_toolbox` broadcasts `map → odom`, correcting for accumulated drift by comparing the map to live scans. `odom → base_link` is Module 0's separate, already-resolved transform (from the base driver or `ekf_node`), representing short-term motion only — the two together complete the full localization chain.

**Debugging Quiz**

1. *Your map shows duplicated/offset walls after driving a loop. In what order do you check: the TF tree, the `slam_toolbox` parameters, or the LiDAR data itself — and why that order?*
   **Answer:** TF tree first, `slam_toolbox` parameters second, raw LiDAR data third (though in this scenario LiDAR was already implicitly validated in Module 0). Check TF first because a broken or incorrect `odom → base_link` transform will corrupt the map in a way that looks identical to a tuning problem, and it's the cheapest, fastest thing to rule out (Step 7's checkpoint). Only once TF is confirmed correct does it make sense to suspect `slam_toolbox`'s own parameters (e.g. `minimum_travel_distance` too loose, causing sparse updates) — investigating parameters before ruling out TF risks tuning around a problem that isn't actually there.

2. *`view_frames` shows `laser_link` as an orphaned frame, disconnected from the rest of the tree. What's the most likely cause?*
   **Answer:** `robot_description`'s static transform from `base_link` to `laser_link` isn't being published — most likely `robot_state_publisher` isn't running, or the URDF failed to load. This is a Module 0-layer problem resurfacing, not a `slam_toolbox` issue.

### Practical Assessment — Can You Build It Yourself?

```
CHALLENGE: Map a DIFFERENT area than the one used in this walkthrough,
without following the steps verbatim.

Requirements:
✓ Run the Step 7 TF checkpoint BEFORE judging your map's quality.
✓ Perform a deliberate loop-closure test and confirm clean (non-doubled)
  walls in the overlap region.
✓ Save the map with a name reflecting the new area (not "lab_room").
✓ Reload the saved map independently and visually confirm it matches
  what you built live — this is the direct rehearsal for what Project 4
  requires from you next.
```

---

**Phase 5, Part 3 (Project 3) is complete.** Next: Project 4 (Nav2 Autonomous Navigation) LMS content — the last content module in the course. Once that's done, **Phase 5 is fully complete**, and the only thing remaining per the master file's workflow is **Phase 6: physical robot validation**, which happens on the real hardware, not in this conversation. Let me know if anything above should change before I continue to Project 4.
