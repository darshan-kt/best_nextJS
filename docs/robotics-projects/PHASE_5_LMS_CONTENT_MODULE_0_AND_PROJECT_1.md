# PHASE 5 — LMS CONTENT DESIGN
## Module 0 (Lab Zero) and Project 1 (Obstacle Avoidance)

> **VALIDATION STATUS: THEORETICALLY DESIGNED, NOT PHYSICALLY VALIDATED.**
> Every command, code sample, and "expected result" below is written to be
> correct against current ROS 2 Jazzy conventions and the architecture
> finalized in Phases 1–4. None of it has been run on the physical robot
> yet. Wherever this document says "you should see," it means exactly
> that — a prediction of correct behavior, not a report of an observed
> one. Phase 6 (physical robot validation) is what upgrades any of this
> from theoretical to validated, one checkpoint at a time.

This is **Part 1 of Phase 5**, covering Module 0 and Project 1 only, per the agreed output discipline. Projects 2–4's LMS content follow in later parts.

---

# MODULE 0 — LAB ZERO

## 1. Project Overview — What Are We Building?

### Project Objective

Before you build a single robot behavior, you need a robot that reliably talks to its own sensors. Module 0 exists to do that once, carefully, so that every project after this one can simply *assume* a working LiDAR, a working camera, a working base, and a correct 3D model of how they're all positioned relative to each other.

### Real-World Application

Every real robotics team goes through exactly this step before writing any application logic — it's often called "bring-up" or "platform integration," and it's where a surprising amount of real-world robotics engineering time actually goes. Skipping it, or doing it sloppily, is the single most common reason a team's "smart" robot behavior mysteriously fails: not because the algorithm is wrong, but because a sensor was misconfigured, a coordinate frame was flipped, or nothing was watching for a driver that silently stopped publishing.

### What The Robot Will Do

By the end of Module 0, your robot will not do anything "smart" yet. It will:

- Spin up its RPLIDAR S3 and publish real distance readings on `/scan`.
- Spin up its Intel RealSense D435i and publish color images (and IMU data) on their respective topics.
- Spin up its standalone IMU (once you've identified exactly what it is).
- Confirm its existing base driver accepts `/cmd_vel` and reports `/odom`, and that it has a safety cutoff if commands stop arriving.
- Publish a complete, correct TF tree describing where every sensor sits relative to the robot's body.
- Bring all of the above up with **one launch command**.

### What The Student Will Build

Two ROS 2 packages that every later project depends on: `robot_description` (the robot's 3D model and coordinate frames) and `robot_bringup` (the one launch file that starts everything).

**[IMAGE: hero photo of the lab robot with RPLIDAR S3, D435i, and standalone IMU visible and labeled — pending physical capture]**

**[IMAGE: architecture diagram of Module 0's shared infrastructure — can be rendered directly, see §4 below]**

---

## 2. Prerequisites

### Knowledge Requirements

- Comfortable with a Linux terminal (navigating directories, editing files, reading error output)
- Basic ROS 2 concepts: nodes, topics, publishers/subscribers, launch files
- Basic Python (reading, not necessarily writing from scratch yet — Module 0 has no new Python of your own beyond what's shown here)
- No prior URDF/xacro or TF experience required — both are introduced from first principles in this module

### Hardware Requirements

- NVIDIA Jetson (Orin family) with the robot's RPLIDAR S3, Intel RealSense D435i, and standalone IMU connected
- The robot's existing custom base driver, already running or startable (per Phase 2's decision to treat it as existing infrastructure, not something this course builds)
- A workspace with the robot's wheels able to be lifted clear of the ground for the module's motor tests

### Software Requirements

- ROS 2 Jazzy Jalisco, assumed already installed and working (per your prior confirmation) — §5 below still runs a lightweight sanity check rather than assuming this blindly
- `colcon`, `rosdep`, `xacro`
- `rplidar_ros`, `realsense2_camera` (installed in §6 below)
- `robot_localization` (installed alongside, used conditionally per §9)

---

## 3. Lab Safety Check

Complete this checklist before powering any motor test in this module:

```
✓ Robot wheels are lifted clear of the ground, or the robot is secured
  on a stand, for every motor-related test in this module.
✓ LiDAR, camera, and IMU cables are routed clear of the wheels before
  any powered test.
✓ You (or a lab partner) have a hand on the power switch, or the
  terminal running any motion command is immediately Ctrl+C-able,
  during every test.
✓ A second person is present specifically for the /cmd_vel watchdog
  test in §7 — this is the first time in the course the robot moves
  under command, and it is expected to move briefly and then stop on
  its own.
✓ The battery is sufficiently charged for a full bring-up session —
  a brownout mid-test can look exactly like a software bug and waste
  real debugging time.
```

---

## 4. Project Architecture and Data Flow

Module 0 builds two packages. Here's what each one is responsible for and how they relate:

```
robot_description                       robot_bringup
(the robot's 3D model & TF tree)        (the one launch surface every
                                          project uses)
┌─────────────────────────┐             ┌──────────────────────────────┐
│ urdf/robot.urdf.xacro    │             │ launch/bringup.launch.py      │
│  ├─ base.urdf.xacro      │  consumed   │  ├─ includes description      │
│  ├─ lidar.urdf.xacro     │  by ──────► │  ├─ includes rplidar_ros       │
│  ├─ camera.urdf.xacro    │             │  ├─ includes realsense2_camera │
│  └─ imu.urdf.xacro       │             │  ├─ launches standalone IMU    │
│                          │             │  └─ conditionally launches    │
│ launch/display.launch.py │             │      robot_localization's     │
│  (desk test, no hardware)│             │      ekf_node (use_ekf arg)   │
└─────────────────────────┘             └──────────────────────────────┘
```

**Component breakdown:**

| Component | What it does | Inputs | Outputs | Topics | Message types |
|---|---|---|---|---|---|
| `robot_state_publisher` | Reads the URDF and any joint states, computes and broadcasts all the *static* geometric relationships between robot parts | URDF (via `robot_description` parameter), `/joint_states` (optional) | TF transforms | `/tf`, `/tf_static` | `tf2_msgs/msg/TFMessage` |
| `rplidar_ros` driver node | Talks to the physical RPLIDAR S3 over serial, converts raw scan data into ROS messages | Serial data from the LiDAR | Distance readings | `/scan` | `sensor_msgs/msg/LaserScan` |
| `realsense2_camera` node | Talks to the D435i over USB, exposes its RGB, depth, and IMU streams | USB data from the camera | Color images, depth images, IMU readings | `/camera/color/image_raw`, `/camera/imu`, etc. | `sensor_msgs/msg/Image`, `sensor_msgs/msg/Imu` |
| Standalone IMU driver | Talks to the standalone IMU (driver TBD — see §6) | Serial/USB data from the IMU | Orientation, angular velocity, linear acceleration | `/imu/data_raw` | `sensor_msgs/msg/Imu` |
| `ekf_node` (conditional) | Fuses wheel odometry and the standalone IMU into one corrected pose estimate | `/odom`, `/imu/data_raw` | Filtered odometry, `odom→base_link` TF | `/odometry/filtered` | `nav_msgs/msg/Odometry` |
| Existing base driver | Converts `/cmd_vel` into wheel motion, reports how far the robot has moved | `/cmd_vel` | Wheel motion, odometry | `/odom` | `nav_msgs/msg/Odometry` |

**Data flow, once everything is running:**

```
PHYSICAL SENSORS (LiDAR, camera, standalone IMU, base encoders)
        ↓
Individual driver nodes (rplidar_ros, realsense2_camera, IMU driver,
existing base driver)
        ↓
Raw topics (/scan, /camera/..., /imu/data_raw, /odom)
        ↓
robot_state_publisher (static frames) + base driver or ekf_node
(dynamic odom→base_link frame, per the use_ekf resolution in §9)
        ↓
COMPLETE TF TREE: odom → base_link → {laser_link, camera_link, imu_link}
        ↓
Available to every later project — nothing project-specific has
happened yet
```

---

## 5. Implementation — Workspace and Environment

### STEP 1 — Create the workspace

```bash
mkdir -p ~/robot_projects_ws/src
cd ~/robot_projects_ws
```

**What this does:** creates the top-level ROS 2 workspace and its `src/` directory, where every package for the entire course will live.
**Why it's required:** `colcon` (ROS 2's build tool) expects this exact layout — a workspace root containing a `src/` folder — to know what to build.
**What it receives / produces:** receives nothing; produces an empty directory structure.
**If it fails:** `mkdir` failing here almost always means a permissions issue on your home directory — check `ls -ld ~` and confirm you own it.

### STEP 2 — Environment sanity check

```bash
printenv ROS_DISTRO
ros2 doctor
ros2 topic list
```

**What this does:** confirms ROS 2 Jazzy is actually the active distribution in your shell, and that the ROS 2 daemon can start and respond.
**Why it's required:** everything else in this module assumes Jazzy is correctly sourced — catching a bad environment now is far cheaper than debugging it three commands into a driver launch.
**What success looks like:** `printenv ROS_DISTRO` prints `jazzy`; `ros2 doctor` reports no critical issues; `ros2 topic list` runs without error (an empty or near-empty list is fine at this point).
**If it fails:**
- If `ROS_DISTRO` is empty, you likely haven't sourced ROS 2 — run `source /opt/ros/jazzy/setup.bash` and add it to `~/.bashrc`.
- If an `apt install ros-jazzy-*` command anywhere in this module fails with an unmet-dependency error mentioning `libzstd1`, see the named troubleshooting box below — this is a known, currently-open Ubuntu 24.04 arm64 packaging conflict, not a sign anything you did is wrong.

> **TROUBLESHOOTING — `libzstd1` dependency conflict (Ubuntu 24.04 arm64)**
> If you see an error like `ros-jazzy-ros-base : Depends: ... libzstd1 (< ...) but ... is to be installed`, this is a confirmed, still-open packaging mismatch between Ubuntu's security-update channel and the ROS 2 Jazzy binaries (tracked upstream at `ros2/ros2#1789`). Fix it with:
> ```bash
> apt-cache policy libzstd1                             # read the exact conflicting versions
> sudo apt-get install libzstd1=<version-the-error-names>
> sudo apt-mark hold libzstd1                            # stop a later upgrade from re-breaking it
> sudo apt install ros-jazzy-ros-base                    # retry
> ```
> Use the version number from **your own error message**, not a copy-pasted one — Ubuntu's update channel shifts over time, so a fixed version string here would already be stale.

---

## 6. Implementation — Sensor Driver Bring-Up (Path A: Ready-Made Packages)

Each sensor's driver is a maintained, ready-made ROS 2 package (Phase 3's research) — you install/clone it, you don't write it. Each one is verified at **two separate layers**: hardware first, then ROS, so a failure at either layer is easy to isolate.

### STEP 3 — Install the driver packages

```bash
sudo apt install ros-jazzy-rplidar-ros ros-jazzy-robot-localization \
                 python3-colcon-common-extensions python3-rosdep
cd ~/robot_projects_ws/src
git clone -b ros2-master https://github.com/realsenseai/realsense-ros.git
```

**What this does:** installs `rplidar_ros` and `robot_localization` as prebuilt binaries via `apt`, and clones `realsense-ros` from source (Phase 3 confirmed the `ros2-master` branch as the Jazzy-supported one; cloning from source rather than a binary keeps you on a version matched to your exact D435i firmware).
**What success looks like:** all `apt` commands complete without error; the `git clone` produces a `realsense-ros/` directory under `src/`.
**If it fails:** an `apt` failure here is most likely the `libzstd1` conflict above — apply that fix and retry. A `git clone` failure is almost always a network issue; retry, or check `ping github.com`.

### STEP 4 — RPLIDAR S3: Hardware Checkpoint

```bash
ls /dev/serial/by-id/
groups $USER
```

**What this does:** confirms the LiDAR enumerates as a serial device the OS can see, and that your user account has permission to access it (via the `dialout` group).
**What success looks like:** a device path appears under `/dev/serial/by-id/`; `dialout` appears in your groups list.
**If it fails:** no device path means a cable/power issue — check the physical connection before touching ROS at all. Missing `dialout` group membership: `sudo usermod -aG dialout $USER`, then log out and back in.

> Before continuing, check the RPLIDAR S3's actual serial baudrate against its datasheet — Phase 3 flagged this as a common silent-failure point when a course example is copy-pasted from an older A-series tutorial. Update `robot_bringup/config/rplidar_s3.yaml` (built in §8) to match.

### STEP 5 — RPLIDAR S3: ROS 2 Checkpoint

```bash
ros2 launch rplidar_ros rplidar_s3_launch.py
```
(in a second terminal, once the above is running)
```bash
ros2 topic hz /scan
ros2 topic echo /scan --once
```
**What this does:** starts the official S3 driver launch file, then checks that `/scan` is actually publishing at a steady rate with sane data.
**What success looks like:** `topic hz` reports a steady, non-zero rate; `topic echo --once` shows a `ranges` array full of real distance values (not all zeros, not all `inf`).
**If it fails:** if the node starts but `/scan` never appears, double check `serial_port` and `serial_baudrate` in the launch arguments against Step 4's findings.

### STEP 6 — D435i: Hardware Checkpoint (before any ROS node runs)

```bash
lsusb | grep -i intel
realsense-viewer
```

**What this does:** confirms the camera enumerates over USB, then opens Intel's own viewer tool to visually confirm the RGB, depth, and IMU streams are all live — entirely outside of ROS.
**Why this order matters:** Jetson Orin Nano + JetPack 6.0 systems have reported cases of the D435i failing to be detected at the USB/kernel level — a hardware issue, not a ROS or Jazzy issue. Checking this first means a failure here is never mistaken for a ROS driver bug.
**What success looks like:** `lsusb` shows an Intel RealSense device; `realsense-viewer` shows live RGB, depth, and motion (IMU) data.
**If it fails:** try a different USB3 port/cable — the D435i needs full USB3 bandwidth for all three streams simultaneously; a USB2 port or an underpowered hub is a common silent cause of partial or missing streams.

### STEP 7 — D435i: ROS 2 Checkpoint

```bash
cd ~/robot_projects_ws
colcon build --packages-select realsense2_camera realsense2_camera_msgs realsense2_description
source install/setup.bash
ros2 launch realsense2_camera rs_launch.py enable_gyro:=true enable_accel:=true
```
(second terminal)
```bash
ros2 topic list | grep camera
ros2 topic hz /camera/color/image_raw
ros2 topic hz /camera/imu
```
**What success looks like:** camera topics appear in the topic list; both `image_raw` and `imu` publish at a steady rate.
**If it fails:** if `/camera/imu` never appears despite `enable_gyro`/`enable_accel` being set, this matches a known gotcha from Phase 3 research — if you changed `unite_imu_method` dynamically at runtime, gyro/accel must be re-enabled for the change to take effect. Relaunch cleanly rather than reconfiguring live.

### STEP 8 — Standalone IMU: Identification and Bring-Up

Apply Phase 3's decision framework now, on the physical unit:

```bash
lsusb
dmesg | tail -20    # after plugging the IMU in
```

**What this does:** identifies the IMU's make/model from its USB descriptor or kernel log message.
**Then, in order:** check for (a) an official ROS 2 Jazzy driver package for that exact model, (b) a maintained community package, (c) whether it's actually already riding on the same microcontroller/serial link as the base driver (in which case no separate driver is needed at all). Only if none of these apply do you write a minimal custom publisher.
**What success looks like:** `ros2 topic echo /imu/data_raw --once` shows populated `orientation`, `angular_velocity`, and `linear_acceleration` fields — not all zero, which is a common silent IMU driver failure.

### STEP 9 — Existing Base Driver: Both Checkpoints

```bash
ros2 node list
ros2 topic info /cmd_vel
ros2 topic hz /odom
```
**What success looks like:** the base driver's node appears in the node list; `/cmd_vel` shows at least one subscriber once something publishes to it; `/odom` publishes at a steady rate.

**Safety-critical watchdog test** (per §3's Lab Safety Check — second person required):

```bash
# Wheels lifted. In one terminal:
ros2 topic pub --rate 10 /cmd_vel geometry_msgs/msg/Twist \
  "{linear: {x: 0.1}, angular: {z: 0.0}}"
# Let it run for ~2 seconds, then Ctrl+C WITHOUT sending a zero-velocity message first.
```
**What success looks like:** the wheels stop spinning shortly after you Ctrl+C, on their own.
**If it fails — this is a stop-ship finding:** if the wheels keep spinning on the last commanded velocity indefinitely, the base driver has no command-timeout safety behavior. Do not proceed to Project 1's floor tests until this is fixed (either in the base driver itself, or by adding a small watchdog node that publishes a zero-velocity `Twist` if `/cmd_vel` goes stale) — every later project's safety plan assumes this protection exists.

---

## 7. Implementation — Building `robot_description` (Path B: Step-by-Step)

Unlike the drivers above, this package is authored by you — it's the course's own shared infrastructure.

### STEP 10 — Create the package

```bash
cd ~/robot_projects_ws/src
ros2 pkg create robot_description --build-type ament_cmake
mkdir -p robot_description/urdf robot_description/launch robot_description/rviz robot_description/meshes
```

**What success looks like:** the command completes and a `robot_description/` directory with `package.xml` and `CMakeLists.txt` exists.

### STEP 11 — Write the URDF/xacro files

`robot_description/urdf/base.urdf.xacro`:

```xml
<?xml version="1.0"?>
<robot xmlns:xacro="http://www.ros.org/wiki/xacro">

  <xacro:property name="base_length" value="0.30"/>
  <xacro:property name="base_width" value="0.25"/>
  <xacro:property name="base_height" value="0.10"/>
  <xacro:property name="wheel_radius" value="0.04"/>
  <xacro:property name="wheel_width" value="0.02"/>
  <xacro:property name="wheel_separation" value="0.28"/>

  <link name="base_link">
    <visual>
      <origin xyz="0 0 ${base_height/2}" rpy="0 0 0"/>
      <geometry><box size="${base_length} ${base_width} ${base_height}"/></geometry>
      <material name="base_grey"><color rgba="0.3 0.3 0.3 1.0"/></material>
    </visual>
    <collision>
      <origin xyz="0 0 ${base_height/2}" rpy="0 0 0"/>
      <geometry><box size="${base_length} ${base_width} ${base_height}"/></geometry>
    </collision>
    <inertial>
      <mass value="3.0"/>
      <origin xyz="0 0 ${base_height/2}"/>
      <inertia ixx="0.05" ixy="0.0" ixz="0.0" iyy="0.06" iyz="0.0" izz="0.08"/>
    </inertial>
  </link>

  <xacro:macro name="wheel" params="prefix reflect">
    <link name="${prefix}_wheel_link">
      <visual>
        <origin xyz="0 0 0" rpy="${pi/2} 0 0"/>
        <geometry><cylinder radius="${wheel_radius}" length="${wheel_width}"/></geometry>
        <material name="wheel_black"><color rgba="0.05 0.05 0.05 1.0"/></material>
      </visual>
      <collision>
        <origin xyz="0 0 0" rpy="${pi/2} 0 0"/>
        <geometry><cylinder radius="${wheel_radius}" length="${wheel_width}"/></geometry>
      </collision>
      <inertial>
        <mass value="0.2"/>
        <inertia ixx="0.0002" ixy="0.0" ixz="0.0" iyy="0.0002" iyz="0.0" izz="0.0003"/>
      </inertial>
    </link>
    <joint name="${prefix}_wheel_joint" type="continuous">
      <parent link="base_link"/>
      <child link="${prefix}_wheel_link"/>
      <origin xyz="0 ${reflect} * ${wheel_separation/2} ${wheel_radius}" rpy="0 0 0"/>
      <axis xyz="0 1 0"/>
    </joint>
  </xacro:macro>

  <xacro:wheel prefix="left" reflect="1"/>
  <xacro:wheel prefix="right" reflect="-1"/>

</robot>
```

> **ASSUMED — VERIFY ON ROBOT:** every dimension above (`base_length`, `wheel_separation`, etc.) is a placeholder. Measure your actual chassis and update these values before trusting any visualization or, later, Nav2's footprint configuration.

`robot_description/urdf/lidar.urdf.xacro`:

```xml
<?xml version="1.0"?>
<robot xmlns:xacro="http://www.ros.org/wiki/xacro">

  <xacro:property name="lidar_mount_x" value="0.10"/>
  <xacro:property name="lidar_mount_z" value="0.15"/>

  <link name="laser_link">
    <visual>
      <geometry><cylinder radius="0.03" length="0.04"/></geometry>
      <material name="lidar_red"><color rgba="0.8 0.1 0.1 1.0"/></material>
    </visual>
    <collision>
      <geometry><cylinder radius="0.03" length="0.04"/></geometry>
    </collision>
    <inertial>
      <mass value="0.15"/>
      <inertia ixx="0.0001" ixy="0.0" ixz="0.0" iyy="0.0001" iyz="0.0" izz="0.0001"/>
    </inertial>
  </link>

  <joint name="laser_joint" type="fixed">
    <parent link="base_link"/>
    <child link="laser_link"/>
    <origin xyz="${lidar_mount_x} 0 ${lidar_mount_z}" rpy="0 0 0"/>
  </joint>

</robot>
```

`robot_description/urdf/camera.urdf.xacro`:

```xml
<?xml version="1.0"?>
<robot xmlns:xacro="http://www.ros.org/wiki/xacro">

  <xacro:property name="camera_mount_x" value="0.13"/>
  <xacro:property name="camera_mount_z" value="0.12"/>

  <link name="camera_link">
    <visual>
      <geometry><box size="0.025 0.09 0.025"/></geometry>
      <material name="camera_dark"><color rgba="0.1 0.1 0.1 1.0"/></material>
    </visual>
    <collision>
      <geometry><box size="0.025 0.09 0.025"/></geometry>
    </collision>
    <inertial>
      <mass value="0.072"/>
      <inertia ixx="0.00003" ixy="0.0" ixz="0.0" iyy="0.00003" iyz="0.0" izz="0.00003"/>
    </inertial>
  </link>

  <joint name="camera_joint" type="fixed">
    <parent link="base_link"/>
    <child link="camera_link"/>
    <origin xyz="${camera_mount_x} 0 ${camera_mount_z}" rpy="0 0 0"/>
  </joint>

  <!-- realsense-ros publishes camera_color_optical_frame, camera_depth_optical_frame,
       camera_gyro_frame, and camera_accel_frame itself, as children of camera_link,
       once the driver is running. This file only fixes camera_link to base_link. -->

</robot>
```

`robot_description/urdf/imu.urdf.xacro`:

```xml
<?xml version="1.0"?>
<robot xmlns:xacro="http://www.ros.org/wiki/xacro">

  <xacro:property name="imu_mount_x" value="-0.05"/>
  <xacro:property name="imu_mount_z" value="0.08"/>

  <link name="imu_link">
    <visual>
      <geometry><box size="0.02 0.02 0.005"/></geometry>
      <material name="imu_green"><color rgba="0.1 0.6 0.1 1.0"/></material>
    </visual>
    <collision>
      <geometry><box size="0.02 0.02 0.005"/></geometry>
    </collision>
    <inertial>
      <mass value="0.01"/>
      <inertia ixx="0.000001" ixy="0.0" ixz="0.0" iyy="0.000001" iyz="0.0" izz="0.000001"/>
    </inertial>
  </link>

  <joint name="imu_joint" type="fixed">
    <parent link="base_link"/>
    <child link="imu_link"/>
    <origin xyz="${imu_mount_x} 0 ${imu_mount_z}" rpy="0 0 0"/>
  </joint>

</robot>
```

`robot_description/urdf/robot.urdf.xacro`:

```xml
<?xml version="1.0"?>
<robot name="lab_robot" xmlns:xacro="http://www.ros.org/wiki/xacro">
  <xacro:include filename="$(find robot_description)/urdf/base.urdf.xacro"/>
  <xacro:include filename="$(find robot_description)/urdf/lidar.urdf.xacro"/>
  <xacro:include filename="$(find robot_description)/urdf/camera.urdf.xacro"/>
  <xacro:include filename="$(find robot_description)/urdf/imu.urdf.xacro"/>
</robot>
```

**What each file does:** `base` defines the robot's body and wheels; `lidar`/`camera`/`imu` each add one sensor frame, fixed to `base_link` at a mount offset. `robot.urdf.xacro` just assembles them.
**Why fixed joints for sensors:** none of these sensors move relative to the chassis, so a `fixed` joint is correct — only the wheels use `continuous`, since they actually rotate.
**What happens if it fails:** a xacro syntax error surfaces immediately in Step 13 below (`xacro` will refuse to process the file and print a line number) — you won't get a silently-wrong robot model.

### STEP 12 — Replace `package.xml` and `CMakeLists.txt`

`robot_description/package.xml` (replace the generated template's dependency section):

```xml
<?xml version="1.0"?>
<?xml-model href="http://download.ros.org/schema/package_format3.xsd" schematypens="http://www.w3.org/2001/XMLSchema"?>
<package format="3">
  <name>robot_description</name>
  <version>0.1.0</version>
  <description>URDF/xacro model and TF-only display launch for the lab robot.</description>
  <maintainer email="you@example.com">Your Name</maintainer>
  <license>Apache-2.0</license>

  <buildtool_depend>ament_cmake</buildtool_depend>

  <exec_depend>robot_state_publisher</exec_depend>
  <exec_depend>joint_state_publisher_gui</exec_depend>
  <exec_depend>xacro</exec_depend>
  <exec_depend>rviz2</exec_depend>

  <export>
    <build_type>ament_cmake</build_type>
  </export>
</package>
```

`robot_description/CMakeLists.txt`:

```cmake
cmake_minimum_required(VERSION 3.8)
project(robot_description)

find_package(ament_cmake REQUIRED)

install(DIRECTORY urdf launch rviz meshes
  DESTINATION share/${PROJECT_NAME}
)

ament_package()
```

### STEP 13 — Write the desk-test launch file

`robot_description/launch/display.launch.py`:

```python
import os

from ament_index_python.packages import get_package_share_directory
from launch import LaunchDescription
from launch.substitutions import Command
from launch_ros.actions import Node
from launch_ros.parameter_descriptions import ParameterValue


def generate_launch_description():
    pkg_share = get_package_share_directory('robot_description')
    xacro_path = os.path.join(pkg_share, 'urdf', 'robot.urdf.xacro')
    rviz_path = os.path.join(pkg_share, 'rviz', 'robot_description.rviz')

    robot_description_content = ParameterValue(
        Command(['xacro ', xacro_path]),
        value_type=str
    )

    return LaunchDescription([
        Node(
            package='robot_state_publisher',
            executable='robot_state_publisher',
            output='screen',
            parameters=[{'robot_description': robot_description_content}]
        ),
        Node(
            package='joint_state_publisher_gui',
            executable='joint_state_publisher_gui',
            output='screen'
        ),
        Node(
            package='rviz2',
            executable='rviz2',
            arguments=['-d', rviz_path],
            output='screen'
        ),
    ])
```

### STEP 14 — Build and desk-test

```bash
cd ~/robot_projects_ws
colcon build --packages-select robot_description
source install/setup.bash
ros2 launch robot_description display.launch.py
```

The first time you run this, RViz will open with no saved configuration. Add a **RobotModel** display and a **TF** display manually (set the Fixed Frame to `base_link`), confirm you can see the chassis, wheels, and all three sensor frames, then **File → Save Config As** → save it to `robot_description/rviz/robot_description.rviz` so future launches load it automatically.

**What success looks like:** RViz shows the robot's shape with `laser_link`, `camera_link`, and `imu_link` all visibly offset from `base_link` in sensible positions, and no disconnected/orphan frames.
**If it fails:** a xacro processing error will appear in the terminal, not RViz — read the reported line number. A frame that doesn't appear where expected usually means a mount-offset value in one of the sensor xacro files needs correcting against your actual measurements.

**[IMAGE: RViz screenshot of the assembled robot model with TF frames labeled — pending physical capture, though this could actually be captured from the desk-test launch alone, no hardware required]**

---

## 8. Implementation — Building `robot_bringup`

### STEP 15 — Create the package

```bash
cd ~/robot_projects_ws/src
ros2 pkg create robot_bringup --build-type ament_python
mkdir -p robot_bringup/launch robot_bringup/config
```

### STEP 16 — Write the config files

`robot_bringup/config/rplidar_s3.yaml`:

```yaml
/**:
  ros__parameters:
    channel_type: serial
    serial_port: /dev/rplidar        # ASSUMED — VERIFY ON ROBOT (Step 4)
    serial_baudrate: 1000000         # ASSUMED — VERIFY against the S3 datasheet
    frame_id: laser_link
    inverted: false
    angle_compensate: true
    scan_mode: Standard
```

`robot_bringup/config/realsense.yaml`:

```yaml
/**:
  ros__parameters:
    enable_gyro: true
    enable_accel: true
    unite_imu_method: 2
    rgb_camera.color_profile: 640x480x30
    depth_module.depth_profile: 640x480x30
    camera_name: camera
```

`robot_bringup/config/standalone_imu.yaml`:

```yaml
# PLACEHOLDER — the standalone IMU's make/model was not yet identified
# as of Phase 3. Once Step 8 identifies it, replace this file's contents
# with the real driver's parameters, and update the node block in
# sensors_only.launch.py below to use that driver's actual package and
# executable name.
/**:
  ros__parameters:
    frame_id: imu_link
    port: /dev/ttyUSB1     # ASSUMED — VERIFY ON ROBOT
    baudrate: 115200        # ASSUMED — VERIFY ON ROBOT
```

`robot_bringup/config/ekf.yaml`:

```yaml
ekf_filter_node:
  ros__parameters:
    frequency: 30.0
    two_d_mode: true
    publish_tf: true
    map_frame: map
    odom_frame: odom
    base_link_frame: base_link
    world_frame: odom

    odom0: /odom
    odom0_config: [true,  true,  false,
                   false, false, true,
                   true,  true,  false,
                   false, false, true,
                   false, false, false]
    odom0_differential: false

    imu0: /imu/data_raw
    imu0_config: [false, false, false,
                  true,  true,  true,
                  false, false, false,
                  true,  true,  true,
                  true,  true,  true]
    imu0_differential: false
    imu0_remove_gravitational_acceleration: true
```

### STEP 17 — Write `sensors_only.launch.py`

```python
import os

from ament_index_python.packages import get_package_share_directory
from launch import LaunchDescription
from launch.actions import IncludeLaunchDescription
from launch.launch_description_sources import PythonLaunchDescriptionSource
from launch_ros.actions import Node


def generate_launch_description():
    bringup_share = get_package_share_directory('robot_bringup')
    description_share = get_package_share_directory('robot_description')

    robot_state_publisher = IncludeLaunchDescription(
        PythonLaunchDescriptionSource(
            os.path.join(description_share, 'launch', 'description.launch.py')
        )
    )

    rplidar_launch = IncludeLaunchDescription(
        PythonLaunchDescriptionSource(
            os.path.join(get_package_share_directory('rplidar_ros'),
                         'launch', 'rplidar_s3_launch.py')
        ),
        launch_arguments={'serial_port': '/dev/rplidar'}.items()
    )

    realsense_launch = IncludeLaunchDescription(
        PythonLaunchDescriptionSource(
            os.path.join(get_package_share_directory('realsense2_camera'),
                         'launch', 'rs_launch.py')
        ),
        launch_arguments={'enable_gyro': 'true', 'enable_accel': 'true'}.items()
    )

    # PLACEHOLDER — replace package/executable once Step 8 identifies the
    # standalone IMU's actual driver.
    standalone_imu_node = Node(
        package='PLACEHOLDER_imu_driver_pkg',
        executable='PLACEHOLDER_imu_driver_node',
        name='standalone_imu_driver',
        parameters=[os.path.join(bringup_share, 'config', 'standalone_imu.yaml')],
        output='screen'
    )

    return LaunchDescription([
        robot_state_publisher,
        rplidar_launch,
        realsense_launch,
        standalone_imu_node,
    ])
```

`robot_description/launch/description.launch.py` (referenced above — add this to `robot_description`, not `robot_bringup`):

```python
import os

from ament_index_python.packages import get_package_share_directory
from launch import LaunchDescription
from launch.substitutions import Command
from launch_ros.actions import Node
from launch_ros.parameter_descriptions import ParameterValue


def generate_launch_description():
    pkg_share = get_package_share_directory('robot_description')
    xacro_path = os.path.join(pkg_share, 'urdf', 'robot.urdf.xacro')

    robot_description_content = ParameterValue(
        Command(['xacro ', xacro_path]),
        value_type=str
    )

    return LaunchDescription([
        Node(
            package='robot_state_publisher',
            executable='robot_state_publisher',
            output='screen',
            parameters=[{'robot_description': robot_description_content}]
        ),
    ])
```

*(No `joint_state_publisher_gui` here — on the real robot there's no reason to fake wheel joint angles with a GUI slider. `robot_state_publisher` will simply use identity transforms for the two continuous wheel joints, which is fine: the sensor frames that actually matter for real data — `laser_link`, `camera_link`, `imu_link` — are all `fixed` joints and are published correctly regardless.)*

### STEP 18 — Write `bringup.launch.py`

```python
import os

from ament_index_python.packages import get_package_share_directory
from launch import LaunchDescription
from launch.actions import DeclareLaunchArgument, IncludeLaunchDescription
from launch.conditions import IfCondition
from launch.launch_description_sources import PythonLaunchDescriptionSource
from launch.substitutions import LaunchConfiguration
from launch_ros.actions import Node


def generate_launch_description():
    bringup_share = get_package_share_directory('robot_bringup')

    use_ekf = LaunchConfiguration('use_ekf')

    declare_use_ekf_arg = DeclareLaunchArgument(
        'use_ekf',
        default_value='false',
        # Module 0's §9 exercise resolves this per-rig. Update this default
        # once you know the answer for YOUR robot — until then, override
        # explicitly at the command line: bringup.launch.py use_ekf:=true
        description='true if the base driver does NOT already broadcast '
                     'odom->base_link and ekf_node must own it instead.'
    )

    sensors_only = IncludeLaunchDescription(
        PythonLaunchDescriptionSource(
            os.path.join(bringup_share, 'launch', 'sensors_only.launch.py')
        )
    )

    ekf_node = Node(
        package='robot_localization',
        executable='ekf_node',
        name='ekf_filter_node',
        output='screen',
        parameters=[os.path.join(bringup_share, 'config', 'ekf.yaml')],
        condition=IfCondition(use_ekf)
    )

    # NOTE: the existing base driver is treated as infrastructure this
    # course does not build (Phase 2 decision). If it auto-starts as a
    # system service, there is nothing to launch here. If it ships its
    # own launch file, add an IncludeLaunchDescription for it here once
    # you've located it in Step 9 — do not guess at its package name.

    return LaunchDescription([
        declare_use_ekf_arg,
        sensors_only,
        ekf_node,
    ])
```

### STEP 19 — Full integration test

```bash
cd ~/robot_projects_ws
colcon build
source install/setup.bash
ros2 launch robot_bringup bringup.launch.py use_ekf:=false
```

**What success looks like:** `/scan`, `/camera/color/image_raw`, `/camera/imu`, and `/imu/data_raw` are all simultaneously live; no node crashes over a sustained ~2 minute run; the full TF tree renders in RViz with no gaps.

---

## 9. Resolving `use_ekf` — A Concrete Exercise

```bash
ros2 launch robot_bringup bringup.launch.py use_ekf:=false
```
(second terminal)
```bash
ros2 run tf2_ros tf2_echo odom base_link
```

- **If a transform prints:** your base driver already broadcasts `odom→base_link` itself (**Configuration A**). Leave `use_ekf`'s default at `false` and document this as a settled fact about your robot in `robot_bringup`'s README.
- **If nothing prints (or an error/timeout occurs):** nothing is broadcasting that transform yet (**Configuration B**). Relaunch with `use_ekf:=true`, re-run the same `tf2_echo` command, and confirm a transform now appears — sourced from `ekf_node`. Update the launch file's default to `true` and document this instead.

Either way, this is now a **fact about your specific robot**, not an open design question — Projects 3 and 4 will rely on whatever you find here.

---

## 10. How to Run Module 0 (Combined)

```
TERMINAL 1
ros2 launch robot_bringup bringup.launch.py use_ekf:=<your resolved value>
   → Why this terminal exists: starts every sensor driver and (if needed)
     the EKF, all at once, matching what every later project will do.
   → What should appear: startup logs from rplidar_ros, realsense2_camera,
     the standalone IMU driver, robot_state_publisher, and (if use_ekf:=true)
     ekf_node — no errors, no repeated restarts.

TERMINAL 2
rviz2
   → Why this terminal exists: lets you see the TF tree and, optionally,
     add a LaserScan display to watch /scan visually.
   → What should appear: a complete robot model with all sensor frames,
     and (if you add a LaserScan display) a ring of points matching your
     room's walls.

TERMINAL 3 (as needed)
ros2 topic hz / ros2 topic echo commands for whichever topic you're
verifying at the moment.
```

---

## 11. Expected Results

```
✓ ros2 doctor / ROS_DISTRO / apt install all clean (or the libzstd
  workaround applied)
✓ Every sensor passes both its hardware checkpoint and its ROS checkpoint
✓ The /cmd_vel watchdog test shows the robot stopping on its own
✓ robot_description's desk-test launch shows a complete TF tree
✓ use_ekf is resolved to a documented value for this specific rig
✓ robot_bringup's full launch runs everything simultaneously without
  crashing for at least a 2-minute sustained run
```

---

## 12. Verification Checkpoints

(Reproduced from Phase 4 §0.4/§0.8, as the learner-facing version)

```
CHECKPOINT — HARDWARE: does each sensor enumerate at the OS level
  (lsusb / device nodes) BEFORE any ROS command is run?
CHECKPOINT — ROS 2: does each driver node start and appear in
  `ros2 node list` without error?
CHECKPOINT — DATA: does each topic publish at a steady rate with
  sane, non-zero values?
CHECKPOINT — TF: does the complete tree render in RViz with no
  orphan/disconnected frames?
CHECKPOINT — SAFETY: does the robot stop on its own when /cmd_vel
  publishing is killed mid-motion?
CHECKPOINT — INTEGRATION: does `bringup.launch.py` start everything
  together and stay stable for a sustained run?
```

---

## 13. Visual and Video Assets, Quizzes, Practical Assessment

### Visual Assets

- **[IMAGE: hero photo of the rig — pending]**
- Architecture diagram — rendered directly in §4 above, no physical capture needed
- **[IMAGE: RViz TF tree screenshot — capturable now via the desk-test launch, no hardware required, but not yet captured]**
- **[IMAGE: RPLIDAR S3 and D435i wiring/mounting photos — pending]**
- **[SCREENSHOT: `rqt_graph` output once the full bringup is running — pending]**

### Video Assets (all pending physical validation)

1. Project Overview Video — pending
2. Concept Video (what is a TF tree, why bring-up matters) — pending
3. Setup Video (physical sensor connections) — pending
4. Implementation Video (building the two packages) — pending
5. Execution Video (running `bringup.launch.py`) — pending
6. Debugging Video (a real driver failure and how it was diagnosed) — pending
7. Final Demonstration (all sensors live simultaneously) — pending

### Quizzes

**Project Understanding Quiz**

1. *Why does Module 0 build `robot_description` and `robot_bringup` before any project-specific code?*
   **Answer:** So every later project can assume a working, already-verified sensor and TF stack instead of re-deriving hardware bring-up from scratch each time — the single biggest lever for course quality per the course's executive strategy.

2. *What is the difference in responsibility between `robot_description` and `robot_bringup`?*
   **Answer:** `robot_description` defines the robot's static geometry and coordinate frames (what the robot looks like and how its parts relate). `robot_bringup` is the launch surface that starts the actual hardware drivers and, conditionally, the EKF — it uses `robot_description`'s model but doesn't define it.

**Concept Quiz**

1. *Why are the sensor joints in the URDF `fixed` while the wheel joints are `continuous`?*
   **Answer:** The sensors don't move relative to the chassis, so their transform to `base_link` never changes — `fixed` is correct. The wheels physically rotate, so `continuous` allows an unbounded rotation angle.

2. *What does the `use_ekf` launch argument actually decide?*
   **Answer:** Whether `robot_localization`'s `ekf_node` fuses wheel odometry with the standalone IMU and owns the `odom→base_link` TF broadcast (Configuration B), or whether the existing base driver already broadcasts that transform itself and no fusion node is needed (Configuration A).

**Data Flow Quiz**

1. *Trace the path of a single LiDAR measurement from the physical sensor to the `/scan` topic. Which node performs the conversion?*
   **Answer:** Physical S3 → serial data → `rplidar_ros` driver node (converts serial protocol into a `sensor_msgs/msg/LaserScan` message) → published on `/scan`.

**Debugging Quiz**

1. *`ros2 topic list` shows `/camera/color/image_raw`, but `ros2 topic hz /camera/color/image_raw` shows nothing publishing. What do you check next, and why?*
   **Answer:** A topic existing means a node has advertised it, but nothing publishing means either the camera isn't actually delivering frames (check `realsense-viewer` again — the Hardware Checkpoint) or the node is stalled. Since Step 6 already isolated the hardware layer, re-run it first before assuming a ROS-level bug — this is exactly why the two-step checkpoint pattern exists.

### Practical Assessment — Can You Build It Yourself?

```
CHALLENGE: Recreate robot_bringup's sensors_only.launch.py from a blank
package, without copying this document's code, using only:

✓ ros2 pkg create with the correct build type
✓ The official rplidar_ros and realsense2_camera launch file names
  (find them yourself via `ros2 pkg prefix` and browsing the installed
  share directory, not by looking them up here)
✓ A working robot_state_publisher include from your own robot_description
✓ Confirm your version passes every checkpoint in §12
```

---

# PROJECT 1 — OBSTACLE AVOIDANCE ROBOT

> **VALIDATION STATUS: THEORETICALLY DESIGNED, NOT PHYSICALLY VALIDATED.**

## 1. Project Overview — What Are We Building?

### Project Objective

A robot that drives forward on its own, continuously watching a cone of space directly ahead of it with its LiDAR, and turns away from anything that gets too close — choosing whichever side has more open space, then resuming forward motion once the way is clear.

### Real-World Application

This is the same core pattern behind a robot vacuum's collision avoidance, a warehouse AMR's safety-zone stop, and the lowest layer of almost every mobile robot's safety architecture — a fast, simple, sensor-driven reflex that runs independently of whatever higher-level task the robot is doing.

### What The Robot Will Do

Move forward at a conservative speed; if an obstacle enters its front field of view within a safe distance, stop or turn toward the clearer side; resume forward motion once clear; and always stop if its LiDAR data goes stale.

### What The Student Will Build

One new ROS 2 package, `obstacle_avoidance_bot`, containing a single node that subscribes to `/scan` and publishes `/cmd_vel` — built entirely on top of Module 0's `robot_bringup`.

**[IMAGE: robot mid-avoidance-turn in the lab — pending physical capture]**

---

## 2. Prerequisites

- **Knowledge:** completed Module 0; basic Python; comfortable reading a `sensor_msgs/msg/LaserScan` message's fields
- **Hardware:** RPLIDAR S3 (only) + the existing base driver — the camera and both IMUs are not required for this project, explained further in §3
- **Software:** Module 0's `robot_bringup` and `robot_description` packages, already built

---

## 3. Lab Safety Check

```
✓ Wheels lifted or the robot on a stand for every test before the
  first floor test (Step 8 below)
✓ LiDAR cable routed clear of the wheels before any floor test
✓ linear_speed capped at ≤ 0.15 m/s for every floor test — no exceptions
✓ Test area cleared of fragile objects; use a soft, disposable object
  as the test obstacle
✓ A person available to physically intervene throughout every floor test
✓ scan_timeout_sec's safety stop (Step 7) must be confirmed working
  BEFORE the first floor test — this is a hard prerequisite, not optional
✓ Battery charge sufficient for the full test session
```

---

## 4. Project Architecture and Data Flow

**Hardware used:** RPLIDAR S3 and the existing base driver only. The RealSense D435i and both IMUs are explicitly not used — this project makes its decision purely from `/scan`, with no need for the robot's position history or orientation.

```
PHYSICAL ENVIRONMENT
   (obstacles in the room)
        ↓
RPLIDAR S3 → rplidar_ros driver node → /scan (sensor_msgs/msg/LaserScan)
        ↓
obstacle_avoidance_node
   ├── Front FOV Filter        (param: front_fov_degrees)
   ├── Nearest-Obstacle Distance in front slice
   ├── Left/Right Clearance Comparison  (param: side_clearance_fov_degrees)
   └── Decision: FORWARD / TURN_LEFT / TURN_RIGHT / STOP
        ↓
/cmd_vel (geometry_msgs/msg/Twist)
        ↓
existing base driver → motors → ROBOT MOTION
        ↓
(motion changes what the LiDAR sees next → loop continues)
```

| Component | What it does | Inputs | Outputs | Topic | Message type |
|---|---|---|---|---|---|
| `obstacle_avoidance_node` | Filters, evaluates, and decides | `/scan` | Velocity command | `/cmd_vel` | `geometry_msgs/msg/Twist` |

---

## 5. Implementation — Path B: Build Step-by-Step

### STEP 1 — Create the package

```bash
cd ~/robot_projects_ws/src
ros2 pkg create obstacle_avoidance_bot --build-type ament_python \
  --dependencies rclpy sensor_msgs geometry_msgs
mkdir -p obstacle_avoidance_bot/config obstacle_avoidance_bot/launch
```

**What success looks like:** the package directory exists with `package.xml` listing `rclpy`, `sensor_msgs`, `geometry_msgs` as dependencies.
**If it fails:** a missing `--dependencies` entry just means you'll add it to `package.xml` by hand afterward — not fatal, just extra editing.

### STEP 2 — Minimal node, verify it runs

`obstacle_avoidance_bot/obstacle_avoidance_bot/obstacle_avoidance_node.py`:

```python
import rclpy
from rclpy.node import Node


class ObstacleAvoidanceNode(Node):
    def __init__(self):
        super().__init__('obstacle_avoidance_node')
        self.get_logger().info('obstacle_avoidance_node is alive')


def main(args=None):
    rclpy.init(args=args)
    node = ObstacleAvoidanceNode()
    rclpy.spin(node)
    node.destroy_node()
    rclpy.shutdown()


if __name__ == '__main__':
    main()
```

Add the entry point to `setup.py`:

```python
entry_points={
    'console_scripts': [
        'obstacle_avoidance_node = obstacle_avoidance_bot.obstacle_avoidance_node:main',
    ],
},
```

```bash
cd ~/robot_projects_ws
colcon build --packages-select obstacle_avoidance_bot
source install/setup.bash
ros2 run obstacle_avoidance_bot obstacle_avoidance_node
```

**What success looks like:** the log message appears; `ros2 node list` (in a second terminal) shows `/obstacle_avoidance_node`.
**If it fails:** a `ModuleNotFoundError` almost always means the entry point in `setup.py` doesn't match the file/class path exactly — check spelling and the colon syntax.

### STEP 3 — Subscribe to `/scan`, verify data arrives

```python
from sensor_msgs.msg import LaserScan
# inside __init__, after the logger.info line:
self.scan_sub = self.create_subscription(LaserScan, '/scan', self.scan_callback, 10)

def scan_callback(self, msg: LaserScan):
    self.get_logger().info(
        f'Received scan: {len(msg.ranges)} points, '
        f'angle_min={msg.angle_min:.2f}, angle_max={msg.angle_max:.2f}, '
        f'angle_increment={msg.angle_increment:.4f}'
    )
```

Run with `robot_bringup`'s sensors active (`ros2 launch robot_bringup bringup.launch.py use_ekf:=false` in another terminal first).

**What success looks like:** log lines with a real, non-zero `angle_increment` and a non-trivial `len(msg.ranges)` (typically several hundred to over a thousand points for the S3).
**If it fails:** no log output at all means `/scan` isn't being published — go back to Module 0's Checkpoint for the LiDAR, not this node.

### STEP 4 — Front-FOV filter (observation only)

```python
import math

@staticmethod
def min_range_in_arc(msg: LaserScan, angle_start: float, angle_end: float) -> float:
    """Minimum valid range within [angle_start, angle_end], using the
    scan's own angle_min/angle_increment — never a hardcoded array slice."""
    i_start = max(0, int((angle_start - msg.angle_min) / msg.angle_increment))
    i_end = min(len(msg.ranges) - 1, int((angle_end - msg.angle_min) / msg.angle_increment))
    if i_start > i_end:
        return float('inf')
    valid = [r for r in msg.ranges[i_start:i_end + 1] if msg.range_min <= r <= msg.range_max]
    return min(valid) if valid else float('inf')
```

Replace the callback's body with a call using `front_fov_degrees = 30.0` (hardcoded for now, parameterized in Step 8):

```python
def scan_callback(self, msg: LaserScan):
    front_min = self.min_range_in_arc(
        msg, -math.radians(15.0), math.radians(15.0))
    self.get_logger().info(f'Front minimum distance: {front_min:.2f} m')
```

**What success looks like:** the logged distance decreases as you manually move an object closer to the front of the (stationary) robot, and increases as you move it away.

### STEP 5 — Obstacle distance comparison (still observation only)

```python
def scan_callback(self, msg: LaserScan):
    front_min = self.min_range_in_arc(msg, -math.radians(15.0), math.radians(15.0))
    if front_min <= 0.5:
        self.get_logger().info(f'OBSTACLE at {front_min:.2f} m')
    else:
        self.get_logger().info(f'CLEAR ({front_min:.2f} m)')
```

### STEP 6 — Left/right clearance comparison (still observation only)

```python
left_min = self.min_range_in_arc(msg, math.radians(15.0), math.radians(60.0))
right_min = self.min_range_in_arc(msg, -math.radians(60.0), -math.radians(15.0))
direction = 'LEFT' if left_min >= right_min else 'RIGHT'
self.get_logger().info(f'Would turn {direction} (left={left_min:.2f}, right={right_min:.2f})')
```

### STEP 7 — Publish `/cmd_vel`, add parameters and the safety timer

Full node, replacing everything above:

```python
import math

import rclpy
from rclpy.node import Node
from sensor_msgs.msg import LaserScan
from geometry_msgs.msg import Twist


class ObstacleAvoidanceNode(Node):

    def __init__(self):
        super().__init__('obstacle_avoidance_node')

        self.declare_parameter('front_fov_degrees', 30.0)
        self.declare_parameter('obstacle_distance', 0.5)
        self.declare_parameter('stop_distance', 0.2)
        self.declare_parameter('side_clearance_fov_degrees', 45.0)
        self.declare_parameter('linear_speed', 0.12)
        self.declare_parameter('angular_speed', 0.4)
        self.declare_parameter('scan_timeout_sec', 0.5)

        self.front_fov_degrees = self.get_parameter('front_fov_degrees').value
        self.obstacle_distance = self.get_parameter('obstacle_distance').value
        self.stop_distance = self.get_parameter('stop_distance').value
        self.side_clearance_fov_degrees = self.get_parameter('side_clearance_fov_degrees').value
        self.linear_speed = self.get_parameter('linear_speed').value
        self.angular_speed = self.get_parameter('angular_speed').value
        self.scan_timeout_sec = self.get_parameter('scan_timeout_sec').value

        self.last_scan_time = None

        self.scan_sub = self.create_subscription(LaserScan, '/scan', self.scan_callback, 10)
        self.cmd_vel_pub = self.create_publisher(Twist, '/cmd_vel', 10)
        self.safety_timer = self.create_timer(0.1, self.safety_check)

        self.get_logger().info(
            f'obstacle_avoidance_node started: front_fov_degrees={self.front_fov_degrees}, '
            f'obstacle_distance={self.obstacle_distance}'
        )

    def scan_callback(self, msg: LaserScan):
        self.last_scan_time = self.get_clock().now()

        half_front = math.radians(self.front_fov_degrees / 2.0)
        front_min = self.min_range_in_arc(msg, -half_front, half_front)

        twist = Twist()

        if front_min <= self.stop_distance:
            twist.linear.x = 0.0
            twist.angular.z = 0.0
            self.get_logger().warn(f'STOP: obstacle at {front_min:.2f} m')

        elif front_min <= self.obstacle_distance:
            side_extent = half_front + math.radians(self.side_clearance_fov_degrees)
            left_min = self.min_range_in_arc(msg, half_front, side_extent)
            right_min = self.min_range_in_arc(msg, -side_extent, -half_front)

            twist.linear.x = 0.0
            if left_min >= right_min:
                twist.angular.z = self.angular_speed
                self.get_logger().info(
                    f'OBSTACLE at {front_min:.2f} m -> TURN LEFT '
                    f'(left={left_min:.2f}, right={right_min:.2f})')
            else:
                twist.angular.z = -self.angular_speed
                self.get_logger().info(
                    f'OBSTACLE at {front_min:.2f} m -> TURN RIGHT '
                    f'(left={left_min:.2f}, right={right_min:.2f})')

        else:
            twist.linear.x = self.linear_speed
            twist.angular.z = 0.0

        self.cmd_vel_pub.publish(twist)

    def safety_check(self):
        if self.last_scan_time is None:
            return
        elapsed = (self.get_clock().now() - self.last_scan_time).nanoseconds / 1e9
        if elapsed > self.scan_timeout_sec:
            self.get_logger().error(f'/scan stale for {elapsed:.2f}s — publishing safety stop')
            self.cmd_vel_pub.publish(Twist())

    @staticmethod
    def min_range_in_arc(msg: LaserScan, angle_start: float, angle_end: float) -> float:
        i_start = max(0, int((angle_start - msg.angle_min) / msg.angle_increment))
        i_end = min(len(msg.ranges) - 1, int((angle_end - msg.angle_min) / msg.angle_increment))
        if i_start > i_end:
            return float('inf')
        valid = [r for r in msg.ranges[i_start:i_end + 1] if msg.range_min <= r <= msg.range_max]
        return min(valid) if valid else float('inf')


def main(args=None):
    rclpy.init(args=args)
    node = ObstacleAvoidanceNode()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.destroy_node()
        rclpy.shutdown()


if __name__ == '__main__':
    main()
```

> This simple index-math approach assumes the front FOV plus both side-clearance zones stay within the scan's `angle_min`/`angle_max` without wrapping past ±π — true for the default values above, but revisit this if you significantly widen `front_fov_degrees` or `side_clearance_fov_degrees`.

`obstacle_avoidance_bot/config/obstacle_avoidance.yaml`:

```yaml
/**:
  ros__parameters:
    front_fov_degrees: 30.0
    obstacle_distance: 0.5
    stop_distance: 0.2
    side_clearance_fov_degrees: 45.0
    linear_speed: 0.12
    angular_speed: 0.4
    scan_timeout_sec: 0.5
```

`obstacle_avoidance_bot/launch/obstacle_avoidance.launch.py`:

```python
import os

from ament_index_python.packages import get_package_share_directory
from launch import LaunchDescription
from launch.actions import IncludeLaunchDescription
from launch.launch_description_sources import PythonLaunchDescriptionSource
from launch_ros.actions import Node


def generate_launch_description():
    bringup_share = get_package_share_directory('robot_bringup')
    own_share = get_package_share_directory('obstacle_avoidance_bot')

    bringup_launch = IncludeLaunchDescription(
        PythonLaunchDescriptionSource(
            os.path.join(bringup_share, 'launch', 'bringup.launch.py')
        ),
        launch_arguments={'use_ekf': 'false'}.items()
        # This project never reads /odom, so use_ekf's value doesn't affect
        # its behavior — 'false' here just avoids starting the EKF node
        # unnecessarily.
    )

    obstacle_avoidance_node = Node(
        package='obstacle_avoidance_bot',
        executable='obstacle_avoidance_node',
        name='obstacle_avoidance_node',
        output='screen',
        parameters=[os.path.join(own_share, 'config', 'obstacle_avoidance.yaml')]
    )

    return LaunchDescription([bringup_launch, obstacle_avoidance_node])
```

Update `obstacle_avoidance_bot/package.xml` to add `<exec_depend>robot_bringup</exec_depend>`, then:

```bash
cd ~/robot_projects_ws
colcon build --packages-select obstacle_avoidance_bot
source install/setup.bash
```

### STEP 8 — Test with wheels lifted

```bash
ros2 launch obstacle_avoidance_bot obstacle_avoidance.launch.py
```
(second terminal)
```bash
ros2 topic echo /cmd_vel
```

**What success looks like:** with an object presented in front, `angular.z` is nonzero with the sign matching the actual clearer side; with the object removed, `linear.x` matches `linear_speed` and `angular.z` is `0.0`.

### STEP 9 — Confirm the safety stop

With the node running and wheels lifted, physically disconnect the LiDAR. **What success looks like:** within `scan_timeout_sec`, an ERROR log appears and `/cmd_vel` goes to all-zero.

### STEP 10 — First floor test

Low speed, supervised, per the Lab Safety Check in §3.

---

## 6. Path C — Modify Existing (Closing Challenge)

Once the primary build works, modify it rather than rebuild it:

- Change `front_fov_degrees` from 30° to 60° and observe how much earlier the robot reacts to an obstacle approaching from a wider angle.
- Swap the left/right tie-breaking rule (currently "prefer left when equal") to "prefer right when equal" and confirm the change in a symmetric-obstacle test.
- Add a visualization marker (`visualization_msgs/msg/Marker`) showing the front FOV cone in RViz — not required for the core project, but a good exercise in extending a working node without breaking it.

---

## 7. How to Run the Project

```
TERMINAL 1
ros2 launch obstacle_avoidance_bot obstacle_avoidance.launch.py
   → Why: this single launch includes robot_bringup AND starts this
     project's own node, exactly matching Module 0's "no project ever
     hand-launches a driver directly" rule.
   → What should appear: bringup logs, then
     "obstacle_avoidance_node started: front_fov_degrees=30.0, ..."

TERMINAL 2
ros2 topic echo /cmd_vel
   → Why: lets you watch the exact commands being sent before or
     instead of trusting the physical robot's motion by eye.

TERMINAL 3 (optional)
rviz2, with a LaserScan display added
   → Why: visually confirms what the robot "sees" at the moment it
     makes each decision.
```

---

## 8. Expected Results

```
✓ ros2 node list shows /obstacle_avoidance_node alongside the
  robot_bringup nodes
✓ ros2 topic hz /cmd_vel shows steady publishing once the node is running
✓ Presenting an object in front produces a STOP or TURN log line and a
  matching nonzero angular.z on /cmd_vel
✓ Removing the object returns the robot to FORWARD (linear.x = linear_speed)
✓ Disconnecting the LiDAR produces the safety-stop ERROR log and a
  zeroed /cmd_vel within scan_timeout_sec
```

---

## 9. Verification Checkpoints

(Reproduced from Phase 4 §8, as the learner-facing version)

```
CHECKPOINT 1 — HARDWARE: is the RPLIDAR S3 connected and spinning?
CHECKPOINT 2 — ROS 2: does `ros2 launch rplidar_ros rplidar_s3_launch.py`
  start cleanly and appear in `ros2 node list`?
CHECKPOINT 3 — DATA: does `ros2 topic hz /scan` show a steady rate with
  sane values?
CHECKPOINT 4 — ALGORITHM: does the node correctly log OBSTACLE/CLEAR and
  the correct turn direction when an object is manually presented on
  either side?
CHECKPOINT 5 — CONTROL: with wheels lifted, does /cmd_vel match the
  logged decision, including correct sign on angular.z?
CHECKPOINT 6 — PHYSICAL ROBOT: on the floor at low speed, does the robot
  repeatably avoid a real obstacle without collision across multiple
  trials, only after Checkpoints 1-5 have already passed?
```

---

## 10. Visual and Video Assets, Quizzes, Practical Assessment

### Visual Assets

- **[IMAGE: hero photo of the robot mid-avoidance-turn — pending]**
- Architecture diagram — rendered in §4 above
- **[SCREENSHOT: RViz LaserScan display during an avoidance decision — pending]**
- **[SCREENSHOT: `rqt_graph` showing obstacle_avoidance_node's connections — pending]**

### Video Assets (all pending)

1. Project Overview — pending
2. Concept (FOV filtering, LaserScan fields) — pending
3. Setup — pending
4. Implementation (building the node) — pending
5. Execution — pending
6. Debugging (a real avoidance failure diagnosed) — pending
7. Final Demonstration — pending

### Quizzes

**Project Understanding Quiz**

1. *Why does this project not need the D435i camera or either IMU?*
   **Answer:** The decision loop is purely reactive on the current `/scan` — it has no need for the robot's position history (no IMU/odometry) or visual data (no camera). Adding them would add hardware dependency and complexity with no benefit to this specific behavior.

**Concept Quiz**

1. *Why is `front_fov_degrees` implemented using `angle_min`/`angle_increment` index math instead of a hardcoded array slice?*
   **Answer:** `angle_increment` (and therefore how many array indices correspond to a given angular width) can differ between LiDAR models or scan modes. Hardcoding indices silently breaks if either changes; computing indices from the message's own fields does not.

2. *What does the `stop_distance` parameter do that `obstacle_distance` alone doesn't?*
   **Answer:** It provides a harder, closer threshold at which the robot fully stops rather than merely turning — separating "start reacting" from "danger, halt now" as two distinct thresholds.

**Data Flow Quiz**

1. *If `linear_speed` is changed in `obstacle_avoidance.yaml`, which file(s) need to be rebuilt for the change to take effect?*
   **Answer:** None need rebuilding — YAML parameter files are read at launch time, not compiled. Just relaunch (`colcon build` is only needed after changing the Python node's code or `setup.py`).

**Debugging Quiz**

1. *`/scan` is confirmed publishing correctly via `ros2 topic hz`, but the robot never turns even when an object is placed directly in front of it. What do you check next?*
   **Answer:** Check whether the front FOV angle math is actually indexing the correct part of the `ranges` array — e.g., print `i_start`/`i_end` for a known object placement and confirm they land where expected. This isolates a logic bug in the node from a data problem already ruled out by the LiDAR check.

### Practical Assessment — Can You Build It Yourself?

```
CHALLENGE: Build the obstacle avoidance robot without following the
step-by-step tutorial above.

Requirements:
✓ Create your own workspace and package.
✓ Subscribe to /scan.
✓ Select a front field of view via a parameter, not a hardcoded value.
✓ Detect an obstacle within a configurable distance.
✓ Decide a turn direction by comparing left/right clearance.
✓ Publish /cmd_vel.
✓ Add a safety stop for stale /scan data.
✓ Test safely: wheels lifted first, low speed on the floor second.
```

---

**Phase 5, Part 1 (Module 0 + Project 1) is complete.** Next: Project 2 (Visual Object Tracking) LMS content, in the same structure. Let me know if anything above should change before I continue.
