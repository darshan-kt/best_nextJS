# PHASE 5 — LMS CONTENT DESIGN
## Project 4 — Autonomous Navigation (Nav2), and Course Closeout

> **VALIDATION STATUS: THEORETICALLY DESIGNED, NOT PHYSICALLY VALIDATED.**
> Same discipline as every prior module. Every command, config value, and
> code sample below is a prediction against current ROS 2 Jazzy / Nav2
> conventions — phrased as "you should see," never "you will see." This
> is the last content module; Phase 6 (physical validation, on the real
> robot) is what turns any of this into a proven claim.

This is **Part 4 of Phase 5**, covering Project 4 only, plus the course-level closeout required once all four projects are content-complete. Module 0 and Projects 1–3's LMS content are complete and approved; this document builds directly on Project 3's saved map (`lab_room.yaml` / `lab_room.pgm`) without re-deriving it.

---

# PROJECT 4 — AUTONOMOUS NAVIGATION (Nav2)

## 1. Project Overview — What Are We Building?

### Project Objective

The robot loads the map you built in Project 3, figures out where it is within that map using its LiDAR, accepts a destination you set in RViz, and drives itself there — planning a path, avoiding obstacles that weren't in the original map, and recovering from getting stuck — with no steering input from you once the goal is sent.

### Real-World Application

This is the same core capability behind a hospital delivery robot navigating hallways, a warehouse AMR moving between shelves, and a home robot returning to its dock — perception, localization, planning, and control working together as one system, which is what "autonomous navigation" actually means in practice, as opposed to just "the robot moves by itself."

### What The Robot Will Do

Localize itself in a known map, accept a goal pose, plan and drive a path to it, deviate around obstacles the map didn't know about, recover from being blocked, and arrive within a stated tolerance — entirely autonomously, under close human supervision.

### What The Student Will Build

Like Project 3, this project is primarily **configuration and orchestration**, not new node authorship — Nav2 (`nav2_bringup`) is a mature, ready-made stack. You'll build `robot_navigation`: its parameters, its launch file wrapping `nav2_bringup`'s own launch composition, and one small standalone Python script demonstrating the `NavigateToPose` action client programmatically.

**[IMAGE: robot navigating autonomously toward a marked goal, with its planned path visible in RViz overlaid on the physical scene — pending physical capture]**

**[VIDEO: a full navigation run including an obstacle-avoidance deviation and a recovery behavior — pending physical capture]**

---

## 2. Prerequisites

- **Knowledge:** completed Module 0 through Project 3, including the TF-tree-first debugging discipline from Project 3 — this project has a direct equivalent (§5, lifecycle states first)
- **Hardware:** RPLIDAR S3 + the odometry/TF chain from Module 0 + Project 3's saved map. **The D435i is not used in this project's baseline scope** — explained in §4
- **Software:** `navigation2`, `nav2_bringup` installed (Phase 3 confirmed current Jazzy releases); Project 3's `lab_room.yaml`/`lab_room.pgm` present and previously confirmed reloadable

---

## 3. Lab Safety Check — ESCALATED (highest-risk project in the course)

**This is not Project 1's checklist restated. Read this as a genuine escalation, because the risk profile genuinely escalated:** Project 1 made one reactive decision at a time at low speed with its own obstacle sensor. Project 2 was tightly scoped but had no obstacle sensing at all. Project 3 kept a human driving every meter. **This is the first project where the robot commits to a multi-meter plan and executes it with no human steering input during the drive.**

```
✓ A physical E-stop or kill switch must be within IMMEDIATE arm's-reach
  of a supervising person for the ENTIRE duration of every autonomous
  goal execution. Position yourself there BEFORE sending a goal, not
  after motion has started. This is non-negotiable and stricter than
  every prior project's safety language.
✓ Your FIRST goal must be SHORT: 0.5–1 meter, in a fully clear or
  fenced area with no fragile objects nearby. Do not attempt a longer
  goal until multiple short goals have succeeded cleanly.
✓ max_vel_x and max_vel_theta remain capped at Project 1's conservative
  defaults (0.12 m/s, 0.4 rad/s) for ALL initial testing — do not raise
  Nav2's speed ceiling until you've observed several successful
  short-goal trials.
✓ NEVER send a goal and walk away. Continuous, attentive supervision is
  required for every single trial — this project is explicitly not a
  "set it and forget it" capstone, despite being the most autonomous
  thing you'll build in this course.
✓ Visually verify the planned global path in RViz BEFORE allowing
  physical execution (§5, Step 7) — this is a MANDATORY gate. A bad
  plan here has multiple meters of room to go wrong before you could
  otherwise intervene, unlike Project 1's one-step-at-a-time behavior.
✓ When deliberately triggering a recovery behavior for testing (§5,
  Step 9), position any obstacle so a spin/back-up motion cannot bring
  the robot into contact with a person — recovery behaviors are not
  aware of humans any differently than any other obstacle.
✓ Module 0's /cmd_vel watchdog remains a blocking requirement, same as
  every project — if the Nav2 stack crashes or hangs mid-execution, the
  robot must stop, not coast on its last command.
✓ Re-verify AMCL convergence (§5, Steps 4-5) before EACH new goal in a
  session, rather than assuming localization stays valid indefinitely.
```

---

## 4. Project Architecture and Data Flow

**Hardware used:** RPLIDAR S3 (in two distinct roles at once — AMCL localization AND the local costmap's obstacle layer) and the odometry/TF chain Module 0 resolved. **The D435i is not used in baseline scope** — a standard 2D Nav2 stack (AMCL + LaserScan-based costmaps) has no RGB/depth dependency; an RGB-D costmap obstacle layer is a real Nav2 capability but is a stretch extension here, not core scope, to keep this project focused on localization/planning/control.

```
PROJECT 3's SAVED MAP (lab_room.yaml/.pgm)
        ↓
map_server → /map
        ↓
RPLIDAR S3 → rplidar_ros → /scan ──────────┬───────────────────┐
        ↓                                  ↓                   ↓
existing base driver (+ekf) → /odom → AMCL (scan+map matching  Local Costmap
        ↓                              + motion prior)          (rolling window,
        └──────────────────────────→        ↓                  obstacle layer
                                    /amcl_pose + map→odom TF     from live /scan)
                                              ↓
                                    Global Costmap (static map + inflation)
                                              ↓
        [You send a goal via NavigateToPose, from RViz or the Python client]
                                              ↓
                                    bt_navigator (behavior tree orchestration)
                                              ↓
                                    planner_server → global path
                                              ↓
                                    controller_server → local trajectory
                                       (tracks global path, deviates around
                                        anything the LOCAL costmap sees that
                                        the original map didn't)
                                              ↓
                                    /cmd_vel → existing base driver → motors
                                              ↓
                                    ROBOT MOTION
                                              ↓
        (motion updates AMCL's belief + both costmaps → loop continues
        until bt_navigator reports SUCCEEDED, or a recovery behavior
        runs and either resolves it or the action is ABORTED)
```

---

## 5. Implementation — Configuration, Orchestration, and Verification

### Understanding Lifecycle Nodes (before you touch anything else)

Most nodes you've used so far (in Projects 1–3) start doing their job the instant they launch. Nav2's nodes are different: they're **lifecycle nodes**, meaning each one moves through explicit states — `unconfigured → inactive → active` — and a separate node (`lifecycle_manager`) is responsible for walking every Nav2 node through those transitions together, in the right order, at startup. A lifecycle node that is merely *running* (visible in `ros2 node list`) is not necessarily *active* — it might still be sitting in `unconfigured` or `inactive`, in which case it will not do anything, and nothing downstream of it can work correctly. **This is why "is it active, not just running" is this project's equivalent of Project 3's "check TF before judging map quality" rule.**

```bash
ros2 lifecycle list
ros2 lifecycle get /map_server
ros2 lifecycle get /amcl
ros2 lifecycle get /planner_server
ros2 lifecycle get /controller_server
ros2 lifecycle get /behavior_server
ros2 lifecycle get /bt_navigator
```

**What success looks like:** every one of the six commands reports `active`.
**If it fails:** a node stuck in `unconfigured` or `inactive` means `lifecycle_manager` either hasn't run yet, or one of its dependencies failed to configure — check that node's own startup log for the actual error before assuming anything downstream is broken.

### STEP 1 — Confirm Project 3's map exists and is valid

```bash
ls -la ~/robot_projects_ws/src/robot_slam/maps/
```
**What success looks like:** `lab_room.yaml` and `lab_room.pgm` both present, non-empty.

### STEP 2 — Create the package

```bash
cd ~/robot_projects_ws/src
ros2 pkg create robot_navigation --build-type ament_cmake
mkdir -p robot_navigation/config robot_navigation/launch
```

`robot_navigation/package.xml`:

```xml
<?xml version="1.0"?>
<?xml-model href="http://download.ros.org/schema/package_format3.xsd" schematypens="http://www.w3.org/2001/XMLSchema"?>
<package format="3">
  <name>robot_navigation</name>
  <version>0.1.0</version>
  <description>Project 4: Nav2-based autonomous navigation using Project 3's saved map.</description>
  <maintainer email="you@example.com">Your Name</maintainer>
  <license>Apache-2.0</license>

  <buildtool_depend>ament_cmake</buildtool_depend>

  <exec_depend>robot_bringup</exec_depend>
  <exec_depend>navigation2</exec_depend>
  <exec_depend>nav2_bringup</exec_depend>

  <export>
    <build_type>ament_cmake</build_type>
  </export>
</package>
```

`robot_navigation/CMakeLists.txt`:

```cmake
cmake_minimum_required(VERSION 3.8)
project(robot_navigation)

find_package(ament_cmake REQUIRED)

install(DIRECTORY config launch
  DESTINATION share/${PROJECT_NAME}
)

ament_package()
```

### STEP 3 — Write `nav2_params.yaml`

`robot_navigation/config/nav2_params.yaml`:

```yaml
amcl:
  ros__parameters:
    use_sim_time: false
    base_frame_id: base_link
    global_frame_id: map
    odom_frame_id: odom
    scan_topic: /scan
    laser_max_range: 12.0          # ASSUMED — same verified value as Project 3
    max_particles: 2000
    min_particles: 500
    update_min_a: 0.17
    update_min_d: 0.2
    alpha1: 0.2
    alpha2: 0.2
    alpha3: 0.2
    alpha4: 0.2
    alpha5: 0.2
    robot_model_type: nav2_amcl::DifferentialMotionModel
    tf_broadcast: true

bt_navigator:
  ros__parameters:
    use_sim_time: false
    global_frame: map
    robot_base_frame: base_link
    odom_topic: /odom
    default_nav_to_pose_bt_xml: navigate_to_pose_w_replanning_and_recovery.xml

controller_server:
  ros__parameters:
    use_sim_time: false
    controller_frequency: 20.0
    progress_checker_plugin: "progress_checker"
    goal_checker_plugins: ["general_goal_checker"]
    controller_plugins: ["FollowPath"]

    progress_checker:
      plugin: "nav2_controller::SimpleProgressChecker"
      required_movement_radius: 0.1
      movement_time_allowance: 10.0

    general_goal_checker:
      plugin: "nav2_controller::SimpleGoalChecker"
      xy_goal_tolerance: 0.15
      yaw_goal_tolerance: 0.17
      stateful: true

    FollowPath:
      plugin: "dwb_core::DWBLocalPlanner"
      max_vel_x: 0.12               # capped at Project 1's conservative default
      min_vel_x: 0.0
      max_vel_theta: 0.4
      acc_lim_x: 0.5
      decel_lim_x: -0.5
      acc_lim_theta: 1.0
      decel_lim_theta: -1.0
      vx_samples: 20
      vtheta_samples: 20
      sim_time: 1.5

local_costmap:
  local_costmap:
    ros__parameters:
      use_sim_time: false
      update_frequency: 5.0
      publish_frequency: 2.0
      global_frame: odom
      robot_base_frame: base_link
      rolling_window: true
      width: 3
      height: 3
      resolution: 0.05
      robot_radius: 0.18            # ASSUMED — MEASURE your actual chassis;
                                      # must match global_costmap's value below
      plugins: ["obstacle_layer", "inflation_layer"]
      obstacle_layer:
        plugin: "nav2_costmap_2d::ObstacleLayer"
        enabled: true
        observation_sources: scan
        scan:
          topic: /scan
          max_obstacle_height: 2.0
          clearing: true
          marking: true
      inflation_layer:
        plugin: "nav2_costmap_2d::InflationLayer"
        inflation_radius: 0.3

global_costmap:
  global_costmap:
    ros__parameters:
      use_sim_time: false
      update_frequency: 1.0
      global_frame: map
      robot_base_frame: base_link
      resolution: 0.05
      robot_radius: 0.18
      plugins: ["static_layer", "obstacle_layer", "inflation_layer"]
      static_layer:
        plugin: "nav2_costmap_2d::StaticLayer"
        map_subscribe_transient_local: true
      obstacle_layer:
        plugin: "nav2_costmap_2d::ObstacleLayer"
        enabled: true
        observation_sources: scan
        scan:
          topic: /scan
          max_obstacle_height: 2.0
          clearing: true
          marking: true
      inflation_layer:
        plugin: "nav2_costmap_2d::InflationLayer"
        inflation_radius: 0.3

planner_server:
  ros__parameters:
    use_sim_time: false
    planner_plugins: ["GridBased"]
    GridBased:
      plugin: "nav2_navfn_planner::NavfnPlanner"
      tolerance: 0.5

behavior_server:
  ros__parameters:
    use_sim_time: false
    behavior_plugins: ["spin", "backup", "wait"]
    spin:
      plugin: "nav2_behaviors::Spin"
    backup:
      plugin: "nav2_behaviors::BackUp"
    wait:
      plugin: "nav2_behaviors::Wait"
    global_frame: odom
    robot_base_frame: base_link

map_server:
  ros__parameters:
    use_sim_time: false

lifecycle_manager:
  ros__parameters:
    use_sim_time: false
    autostart: true
    node_names: ["map_server", "amcl", "planner_server", "controller_server",
                 "behavior_server", "bt_navigator"]
```

> **`robot_radius` is a placeholder — measure your actual chassis before trusting this config near walls or in tight spaces.** It must be set identically in both `local_costmap` and `global_costmap`.

### STEP 4 — Write the launch file

`robot_navigation/launch/navigation.launch.py`:

```python
import os

from ament_index_python.packages import get_package_share_directory
from launch import LaunchDescription
from launch.actions import DeclareLaunchArgument, IncludeLaunchDescription
from launch.launch_description_sources import PythonLaunchDescriptionSource
from launch.substitutions import LaunchConfiguration


def generate_launch_description():
    bringup_share = get_package_share_directory('robot_bringup')
    nav_share = get_package_share_directory('robot_navigation')
    nav2_bringup_share = get_package_share_directory('nav2_bringup')

    use_ekf = LaunchConfiguration('use_ekf')
    map_yaml = LaunchConfiguration('map')

    declare_use_ekf_arg = DeclareLaunchArgument(
        'use_ekf',
        default_value='false',
        description='Must match the use_ekf value Module 0 already resolved.'
    )

    declare_map_arg = DeclareLaunchArgument(
        'map',
        # Points directly at Project 3's SOURCE-tree maps directory, not
        # the installed share directory — a newly saved map is then
        # immediately usable without first rebuilding robot_slam.
        default_value=os.path.expanduser(
            '~/robot_projects_ws/src/robot_slam/maps/lab_room.yaml'),
        description="Full path to the map produced by Project 3."
    )

    sensors_launch = IncludeLaunchDescription(
        PythonLaunchDescriptionSource(
            os.path.join(bringup_share, 'launch', 'bringup.launch.py')
        ),
        launch_arguments={'use_ekf': use_ekf}.items()
    )

    nav2_launch = IncludeLaunchDescription(
        PythonLaunchDescriptionSource(
            os.path.join(nav2_bringup_share, 'launch', 'bringup_launch.py')
        ),
        launch_arguments={
            'map': map_yaml,
            'params_file': os.path.join(nav_share, 'config', 'nav2_params.yaml'),
            'use_sim_time': 'false',
        }.items()
    )

    return LaunchDescription([declare_use_ekf_arg, declare_map_arg, sensors_launch, nav2_launch])
```

```bash
cd ~/robot_projects_ws
colcon build --packages-select robot_navigation
source install/setup.bash
```

### STEP 5 — Launch and check lifecycle state (hard gate, before anything else)

```bash
ros2 launch robot_navigation navigation.launch.py use_ekf:=<your resolved value>
```
(second terminal)
```bash
ros2 lifecycle get /map_server
ros2 lifecycle get /amcl
ros2 lifecycle get /planner_server
ros2 lifecycle get /controller_server
ros2 lifecycle get /behavior_server
ros2 lifecycle get /bt_navigator
```

**Do not proceed past this point until all six report `active`.**

### STEP 6 — Set the initial pose estimate, verify AMCL actually converges

Open RViz (Nav2's own launch already starts one), and add a **PoseArray** display subscribed to `/particle_cloud` if it isn't already present in the default config.

1. Click the **"2D Pose Estimate"** button in RViz's toolbar.
2. Click on the map at the robot's actual physical location, and drag to set its actual heading.
3. **Do not assume the click was enough.** Watch `/particle_cloud`: immediately after setting the pose, particles should appear scattered around your click (reflecting AMCL's intentionally wide initial uncertainty). If the robot is stationary in a visually ambiguous space (a symmetric room), gently teleop it a short distance — this gives AMCL new scan data to disambiguate against.
4. **What success looks like:** the particle cloud visibly collapses into a single, tight cluster near the robot's true position within a few seconds of small motion. A cloud that stays spread out, or that's clustered in the wrong place, means localization has not converged — do not proceed to sending a goal.

### STEP 7 — First goal: RViz's "Nav2 Goal" tool, verify the plan before motion

1. Click **"Nav2 Goal"** in RViz's toolbar.
2. Click a point **0.5–1 meter** away in open space, and drag to set a heading.
3. **Before the robot moves:** look at the green global path line RViz draws. Does it look geometrically sane — a direct, sensible route, not cutting through a wall or taking a bizarre detour for a simple case?
4. Only once the plan looks correct, allow execution to proceed — stay near the E-stop the entire time (§3).

**What success looks like:** the robot follows the planned path and `bt_navigator` reports the goal `SUCCEEDED`.

### STEP 8 — Using `NavigateToPose` programmatically

RViz's "Nav2 Goal" button is really just a convenient way to send a `NavigateToPose` action goal. Here's what it's doing, written out as a standalone Python script (run directly with `python3`, not built into `robot_navigation`'s package — it's a teaching example, not part of the maintained stack):

```python
#!/usr/bin/env python3
import math

import rclpy
from rclpy.action import ActionClient
from rclpy.node import Node
from action_msgs.msg import GoalStatus
from geometry_msgs.msg import PoseStamped
from nav2_msgs.action import NavigateToPose


class NavigateToPoseClient(Node):

    def __init__(self):
        super().__init__('navigate_to_pose_client_example')
        self._action_client = ActionClient(self, NavigateToPose, 'navigate_to_pose')

    def send_goal(self, x: float, y: float, yaw: float = 0.0):
        goal_msg = NavigateToPose.Goal()
        goal_msg.pose = PoseStamped()
        goal_msg.pose.header.frame_id = 'map'
        goal_msg.pose.header.stamp = self.get_clock().now().to_msg()
        goal_msg.pose.pose.position.x = x
        goal_msg.pose.pose.position.y = y
        # Pure yaw-only quaternion (roll = pitch = 0):
        goal_msg.pose.pose.orientation.z = math.sin(yaw / 2.0)
        goal_msg.pose.pose.orientation.w = math.cos(yaw / 2.0)

        self.get_logger().info('Waiting for the navigate_to_pose action server...')
        self._action_client.wait_for_server()

        self.get_logger().info(f'Sending goal: x={x}, y={y}, yaw={yaw}')
        send_goal_future = self._action_client.send_goal_async(
            goal_msg, feedback_callback=self.feedback_callback)
        send_goal_future.add_done_callback(self.goal_response_callback)

    def feedback_callback(self, feedback_msg):
        feedback = feedback_msg.feedback
        self.get_logger().info(f'Distance remaining: {feedback.distance_remaining:.2f} m')

    def goal_response_callback(self, future):
        goal_handle = future.result()
        if not goal_handle.accepted:
            self.get_logger().warn('Goal rejected by the action server')
            return
        self.get_logger().info('Goal accepted, waiting for result...')
        result_future = goal_handle.get_result_async()
        result_future.add_done_callback(self.result_callback)

    def result_callback(self, future):
        status = future.result().status
        if status == GoalStatus.STATUS_SUCCEEDED:
            self.get_logger().info('Goal succeeded!')
        else:
            self.get_logger().warn(f'Goal did not succeed, status: {status}')
        rclpy.shutdown()


def main(args=None):
    rclpy.init(args=args)
    node = NavigateToPoseClient()
    node.send_goal(x=1.0, y=0.0, yaw=0.0)
    rclpy.spin(node)


if __name__ == '__main__':
    main()
```

```bash
python3 send_goal_example.py
```

**Why this is an action, and not a topic or a service, made concrete here:** notice this script does three distinct things a single topic publish never could — it **waits for acceptance** (`goal_response_callback`), **streams live feedback** while the goal is in progress (`feedback_callback`, printing `distance_remaining` as the robot moves), and receives a **final result** only when the whole multi-second-to-multi-minute drive is actually done (`result_callback`). A plain topic publish is fire-and-forget with no response; a service would block the entire time the goal is executing, which is unworkable for a drive that could take minutes. This exact shape — a goal, a feedback stream, cancelability, and a terminal result — is what ROS 2 actions exist for.

### STEP 9 — Obstacle test and recovery behavior

1. Repeat Step 7's goal, but this time with a physical obstacle placed in the path that was **not** present when Project 3's map was built.
2. **What success looks like:** the local costmap (visible in RViz) shows the obstacle, and the controller deviates from the original global path to go around it, re-joining afterward.
3. Deliberately trigger a recovery behavior by lightly blocking the robot's path in a way that cannot bring a spin/back-up motion into contact with a person (§3). **What success looks like:** the robot attempts `spin`, `back_up`, or `wait` (visible in the log output naming which behavior is running), then resumes toward the goal.

### STEP 10 — Longer goals

Only after Steps 7–9 have succeeded repeatably at short range, extend to a longer, multi-meter goal across the mapped area — still under continuous supervision, per §3.

---

## 6. Path C — Modify Existing (Closing Challenge)

- Change `inflation_radius` from `0.3` to `0.15` and repeat the obstacle test from Step 9 — observe how much closer the planned path now passes to obstacles, and connect this back to the actual physical footprint measured in `robot_radius`.
- Swap `GridBased`'s planner plugin from `nav2_navfn_planner::NavfnPlanner` to `nav2_smac_planner::SmacPlanner2D` and compare the resulting global paths for the same goal.

---

## 7. How to Run the Project

```
TERMINAL 1
ros2 launch robot_navigation navigation.launch.py use_ekf:=<your resolved value>
   → Why: brings up robot_bringup's sensors AND the full Nav2 stack via
     nav2_bringup's own launch composition — this project never
     hand-sequences six lifecycle nodes in separate terminals.
   → What should appear: bringup logs, then Nav2 startup logs, then RViz
     opens showing the loaded map.

TERMINAL 2
ros2 lifecycle get <node> for each of the six Nav2 nodes
   → Why: the hard gate from Step 5 — confirm ACTIVE before trusting
     anything else.

TERMINAL 3 (as needed)
python3 send_goal_example.py
   → Why: the programmatic alternative to RViz's "Nav2 Goal" button,
     demonstrating the action-client pattern directly.
```

---

## 8. Expected Results

```
✓ All six Nav2 lifecycle nodes report ACTIVE (Step 5) before any goal
  is sent
✓ /particle_cloud visibly collapses to a tight cluster after setting
  the initial pose and a small motion (Step 6)
✓ A sent goal produces a visualized global path in RViz BEFORE any
  physical motion (Step 7)
✓ The robot reaches the goal within tolerance (xy_goal_tolerance: 0.15m,
  yaw_goal_tolerance: ~10°) and bt_navigator reports SUCCEEDED
✓ A newly-placed obstacle causes a visible local-costmap deviation, not
  a collision (Step 9)
✓ A deliberately triggered recovery behavior executes and the robot
  resumes toward the goal afterward
```

---

## 9. Verification Checkpoints

```
CHECKPOINT 1 — HARDWARE: RPLIDAR S3 connected/spinning (reused from
  Module 0); robot physically placed within the mapped area's boundaries.

CHECKPOINT 2 — ROS 2 (hard gate): does `ros2 lifecycle get` report
  ACTIVE for map_server, amcl, planner_server, controller_server,
  behavior_server, AND bt_navigator? A node stuck in inactive or
  unconfigured invalidates every checkpoint below it.

CHECKPOINT 3 — DATA: is /map published with the correct resolution and
  origin matching Project 3's saved file? Are /scan and /odom actually
  flowing into AMCL and both costmaps?

CHECKPOINT 4 — ALGORITHM: does /particle_cloud actually CONVERGE
  (collapse to a tight cluster), not merely run without crashing? Does
  the local costmap correctly show a live obstacle placed in front of
  the robot?

CHECKPOINT 5 — CONTROL: before physical motion, does the planned global
  path look geometrically sane in RViz? During motion, does /cmd_vel
  stay within max_vel_x/max_vel_theta at all times?

CHECKPOINT 6 — PHYSICAL ROBOT: does the robot reach the goal pose
  within tolerance, fully autonomously, correctly avoiding both
  originally-mapped and newly-placed obstacles, across repeated trials?
```

---

## 10. Visual and Video Assets, Quizzes, Practical Assessment

### Visual Assets

- **[IMAGE: hero photo of the robot navigating autonomously — pending]**
- Architecture diagram — rendered directly in §4
- **[SCREENSHOT: RViz particle cloud before and after convergence, side by side — pending]**
- **[SCREENSHOT: RViz global path plus local costmap deviation around a placed obstacle — pending]**
- **[SCREENSHOT: `ros2 lifecycle get` output for all six nodes reporting ACTIVE — pending]**

### Video Assets (all pending)

1. Project Overview — pending
2. Concept (lifecycle nodes, AMCL, costmaps, actions) — pending
3. Setup — pending
4. Implementation (config + launch composition, action client script) — pending
5. Execution (a full navigation run) — pending
6. Debugging (a real localization or planning failure diagnosed) — pending
7. Final Demonstration (goal + obstacle + recovery, end to end) — pending

### Quizzes

**Project Understanding Quiz**

1. *Why does this project, like Project 3, involve almost no new node authorship?*
   **Answer:** Nav2 (via `nav2_bringup`) is a mature, ready-made stack (Path A) — the skill being taught is correctly configuring, sequencing, and verifying it, not re-implementing localization or path planning from scratch.

**Concept Quiz**

1. *What is a lifecycle node, and why does Nav2 use them instead of nodes that just start working immediately?*
   **Answer:** A lifecycle node explicitly moves through states (`unconfigured → inactive → active`), letting a coordinator (`lifecycle_manager`) bring a whole interdependent system up in a controlled, correctly-ordered way — important for Nav2 because its nodes depend on each other (e.g., the planner needs a loaded map before it's meaningful to activate it).

2. *Why must `robot_radius` be set identically in both `local_costmap` and `global_costmap`?*
   **Answer:** Both costmaps represent the same physical robot's footprint for collision-checking purposes — a mismatch would mean the local controller and the global planner disagree about how much space the robot actually needs, which can produce a plan the controller then can't safely execute.

**Data Flow Quiz**

1. *Which node broadcasts the `map → odom` transform in this project, and how does that compare to Project 3?*
   **Answer:** `amcl` broadcasts it here, replacing the role `slam_toolbox` held in Project 3 — same TF slot in the tree, different producer, because this project is localizing against an already-known map rather than building one.

**Debugging Quiz**

1. *You send a goal and the robot doesn't respond at all — no motion, no error dialog. What's the first thing to check: the lifecycle node states, the map, or the goal coordinates — and why in that order?*
   **Answer:** Lifecycle node states first. If `bt_navigator` (or any node in its dependency chain) isn't `active`, the action server may not even properly accept or execute the goal, and every symptom downstream — including "nothing happens" — is consistent with that single cause. Checking the map next makes sense once nodes are confirmed active (a missing or misaligned map is the next cheapest thing to rule out), and only then does it make sense to scrutinize the goal coordinates themselves (e.g., a goal given in the wrong frame, or one that lands outside the map or inside a wall) — investigating coordinates before ruling out the first two risks debugging the wrong layer.

2. *AMCL's particle cloud converges to a tight cluster, but it's clearly in the wrong part of the map. What does this suggest, and what should you do?*
   **Answer:** A confident, converged, but wrong localization usually means the initial pose estimate (Step 6) was set incorrectly, or the environment is symmetric enough that a single motion wasn't enough to disambiguate. Re-set the initial pose more carefully and drive a slightly longer, more distinctive path before trusting convergence again — do not send a navigation goal on a confidently-wrong localization.

### Practical Assessment — Can You Build It Yourself?

```
CHALLENGE: Navigate to a NEW goal location not covered in this
walkthrough, then deliberately place an obstacle in the path and
confirm a recovery behavior fires. This is the course's final
challenge — it should draw on everything before it, not just Nav2:

✓ Apply Project 1's safety discipline: E-stop in reach, short goal
  distance first, continuous supervision throughout.
✓ Apply Project 3's TF understanding: if anything behaves unexpectedly,
  check the TF chain (map→odom→base_link→laser_link) before assuming
  it's a Nav2 configuration problem.
✓ Confirm all six lifecycle nodes are ACTIVE before sending the goal.
✓ Confirm AMCL convergence before sending the goal.
✓ Visually verify the planned path in RViz before allowing motion.
✓ Place an obstacle not in the original map and confirm the local
  costmap deviation.
✓ Deliberately trigger and observe a recovery behavior, safely.
```

---

# COURSE CLOSEOUT

Per the master file's §34 ("Final Course Learning Journey") and §38 ("Final Course Quality Standard"), here is how the four projects tie back together, and what a learner who has completed all of them should now be able to claim — with an honest statement of what "completed" means at this point in the course's own development.

## The Progression, Realized

```
ROS 2 CONCEPTS + HARDWARE VERIFICATION (Module 0)
        ↓
PROJECT 1 — Reactive Behavior
   A robot that decides, moment to moment, from raw sensor data alone.
        ↓
PROJECT 2 — Visual Perception
   A robot that decides from a richer, image-based sense of the world —
   still purely reactive, but built on a fundamentally different input.
        ↓
PROJECT 3 — Environment Mapping
   The first project where the robot's own history (odometry) becomes
   load-bearing, and where the output is a persistent artifact — a map
   — rather than just an in-the-moment behavior.
        ↓
PROJECT 4 — Autonomous Navigation
   Everything before this project becomes an ingredient: LiDAR data
   (Project 1's sensor), a map (Project 3's artifact), odometry
   (Project 3's dependency), and a materially higher safety bar
   (Project 1's discipline, escalated) — combined into a robot that
   plans and executes its own multi-step behavior.
        ↓
AUTONOMOUS MOBILE ROBOT ENGINEERING
```

## What You Should Now Be Able to Claim

Per §38, honestly, and scoped to what this course has actually covered:

```
I KNOW WHAT EACH OF THESE FOUR ROBOTIC SYSTEMS DOES.
I UNDERSTAND EACH ONE'S ARCHITECTURE — nodes, topics, message types,
    and how data actually moves from a physical sensor to a motor command.
I CAN SET UP THE ROS 2 WORKSPACE these systems live in.
I CAN INSTALL AND CONFIGURE THE REQUIRED PACKAGES, distinguishing
    ready-made infrastructure (Path A) from code I need to write myself
    (Path B).
I CAN BUILD THE SOFTWARE, incrementally, verifying each layer before
    trusting the next.
I CAN RUN THESE SYSTEMS via a single composed launch file, not a
    fragile sequence of hand-run terminals.
I CAN VERIFY THE DATA at every stage — hardware, ROS topic, TF tree,
    algorithm output, and control command — using the checkpoint
    discipline established from Module 0 onward.
I CAN DEBUG FAILURES by isolating which layer is actually broken,
    rather than guessing at the most visible symptom.
I KNOW WHAT SAFE TESTING LOOKS LIKE, and that the safety bar rises with
    autonomy — reactive, low-speed, sensor-backed behavior is a
    different risk category than a multi-meter autonomous plan.
```

## The Honest Part

Everything above describes **content that now exists and design that has been reasoned through carefully** — it does not describe a robot that has actually done any of this. Per the master file's core rule, theoretically designed and physically validated are not the same claim, and this course closeout does not blur that line: **none of these four projects, nor Module 0's own bring-up, has been run on your actual Jetson, RPLIDAR S3, and D435i rig yet.** The code is written to be correct against current ROS 2 Jazzy conventions; it has not been compiled, launched, or driven on real hardware in this conversation, because that isn't something an AI-generated document can do.

**Phase 6 — Physical Robot Validation** is the remaining step, and it is not optional or cosmetic: it's where every checkpoint, every "expected result," and every safety assumption in this entire course either gets confirmed or gets corrected against reality. That happens next, on the actual robot — not in further generated content.

---

**Phase 5 is now complete in full — Module 0 and all four projects have complete, reviewed LMS content.** The Phase 6 checklist for turning this into physically validated content follows in a separate document: `PHASE 6 — PHYSICAL VALIDATION CHECKLIST.md`.
