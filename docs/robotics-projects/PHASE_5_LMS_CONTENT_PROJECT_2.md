# PHASE 5 — LMS CONTENT DESIGN
## Project 2 — Visual Object Tracking

> **VALIDATION STATUS: THEORETICALLY DESIGNED, NOT PHYSICALLY VALIDATED.**
> As with Module 0 and Project 1, every command, code sample, and
> "expected result" below is a prediction of correct behavior against
> current ROS 2 Jazzy and OpenCV conventions — not a report of something
> observed on the physical robot. Phrasing throughout is "you should
> see," never "you will see" or "as shown in the video." This becomes
> validated only in Phase 6, on the real robot.

This is **Part 2 of Phase 5**, covering Project 2 only. Module 0 and Project 1's LMS content are complete and approved in `PHASE 5 — LMS CONTENT — MODULE 0 AND PROJECT 1.md`; this document assumes that infrastructure exists and builds on top of it exactly as Phase 4 designed.

---

# PROJECT 2 — VISUAL OBJECT TRACKING ROBOT

## 1. Project Overview — What Are We Building?

### Project Objective

A robot that finds a specific colored object using its camera, keeps that object centered in view by turning toward it, and moves forward while the object stays roughly centered — a simple "follow me" behavior built entirely from a single RGB image stream.

### Real-World Application

Color-based visual tracking is the simplest member of a family of techniques used everywhere from warehouse robots following a colored floor marker, to camera-based ball-tracking in robotics competitions, to the first working prototype most computer-vision engineers build before moving to a learned object detector. It teaches the full perception → decision → actuation loop using nothing but classical image processing — no machine learning model required.

### What The Robot Will Do

Continuously watch its camera feed for a calibrated target color; when found, turn toward it and move forward; when it's centered, drive straight; when it disappears from view, stop — deliberately, not by spinning to search for it again.

### What The Student Will Build

One new package, `visual_tracking_bot`, containing two pieces: the tracking node itself (`color_tracker_node`), and a small standalone calibration utility (`hsv_calibrator`) used once per lighting setup to determine the color thresholds — kept as a separate tool rather than folded into the tracking node, since calibration and tracking are genuinely different tasks with different lifetimes.

**[IMAGE: robot centered on a colored ball mid-track — pending physical capture]**

**[SCREENSHOT: hsv_calibrator's live mask preview window — pending physical capture]**

---

## 2. Prerequisites

- **Knowledge:** completed Module 0 and Project 1; basic Python; no prior OpenCV experience required — HSV color space and contour detection are introduced from first principles below
- **Hardware:** Intel RealSense D435i (RGB stream only) + the existing base driver. **The RPLIDAR S3 is not used in this project** — explained in §4
- **Software:** Module 0's `robot_bringup`/`robot_description`, already built; `python3-opencv` installed via `apt` (see the troubleshooting box in §5, Step 4 — this matters more here than anywhere else in the course so far)

---

## 3. Lab Safety Check

**This project has a fundamentally different risk profile than Project 1, and the checklist below reflects that rather than restating Project 1's language:**

Project 1 had its own obstacle sensor as a safety net, independent of its primary task. **This project has no obstacle sensing running at all.** The LiDAR is still physically present and even publishing `/scan` via `robot_bringup`, but nothing in this project reads it. If the robot turns toward something the camera doesn't recognize as the target, there is no algorithmic fallback to stop it.

```
✓ The floor-test area must be COMPLETELY clear in EVERY direction the
  robot could possibly turn toward — not just along the target object's
  path — because this project cannot detect or react to any obstacle
  that isn't the specific tracked color.
✓ Lost-target behavior is a deliberate design decision: on losing the
  target, the robot STOPS after target_lost_timeout_sec. It does NOT
  spin or search. A blind spin-search would be a real collision risk
  specifically because this project has no obstacle sensing to catch a
  bad guess.
✓ Wheels lifted for all of Step 11 and Checkpoint 5 (§9) — verify
  turning direction before any floor test, exactly as in Project 1.
✓ linear_speed capped at ≤ 0.15 m/s for every floor test, same as
  Project 1 — with the added note that this project's proportional
  steering can produce continuously varying turn rates, so watch that
  max_angular_speed is actually being respected, not just angular_gain
  trusted blindly.
✓ Camera and any debug-viewing laptop/cable kept clear of the wheels.
✓ A person available to physically intervene throughout every floor
  test, positioned to step into the robot's path if it turns toward an
  unexpected direction — no sensor will catch that before it happens.
✓ Re-run the HSV calibration procedure (§5, Step 5) if the test
  session's lighting differs from when hsv_lower/hsv_upper were last
  set — a stale calibration is a software-correctness issue that
  manifests as physically unpredictable turning, not just a vision bug.
✓ Battery charge sufficient for the full test session.
```

---

## 4. Project Architecture and Data Flow

**Hardware used:** Intel RealSense D435i (RGB stream only) and the existing base driver. **Not used:** RPLIDAR S3, the D435i's own depth stream, either IMU, `/odom` — this project's control loop depends only on the current camera frame, with no need for position history or orientation, exactly as established in Phase 4's scoping check.

```
PHYSICAL ENVIRONMENT
   (colored target object moves within camera view)
        ↓
Intel RealSense D435i → realsense2_camera_node → /camera/color/image_raw
        ↓
color_tracker_node
   ├── cv_bridge: ROS Image → OpenCV BGR frame
   ├── BGR → HSV conversion
   ├── Color Mask                (params: hsv_lower, hsv_upper — calibrated)
   ├── Contour Detection → largest contour ≥ min_contour_area
   ├── Centroid Calculation (cx, cy)
   ├── Compare cx to image-center ± centroid_deadzone_px
   └── Decision: TURN_LEFT / TURN_RIGHT / FORWARD
       — or, after target_lost_timeout_sec with no detection: STOP
        ↓
/cmd_vel → existing base driver → motors → ROBOT MOTION
        ↓
(motion re-centers the object in view → loop continues)
```

| Component | What it does | Inputs | Outputs | Topic | Message type |
|---|---|---|---|---|---|
| `color_tracker_node` | Detects and steers toward the calibrated color | `/camera/color/image_raw` | Velocity command, optional debug image | `/cmd_vel`, `/color_tracker/debug_image` | `geometry_msgs/msg/Twist`, `sensor_msgs/msg/Image` |
| `hsv_calibrator` (utility, not part of the running robot) | Interactive tool to find `hsv_lower`/`hsv_upper` under current lighting | `/camera/color/image_raw` | Printed parameter values (to your terminal, for you to copy) | — | — |

---

## 5. Implementation — Path B: Build Step-by-Step

### STEP 1 — Create the package

```bash
cd ~/robot_projects_ws/src
ros2 pkg create visual_tracking_bot --build-type ament_python \
  --dependencies rclpy sensor_msgs geometry_msgs cv_bridge
mkdir -p visual_tracking_bot/config visual_tracking_bot/launch
```

**What success looks like:** package directory exists with the four dependencies listed in `package.xml`.

### STEP 2 — Minimal node, verify it runs

`visual_tracking_bot/visual_tracking_bot/color_tracker_node.py`:

```python
import rclpy
from rclpy.node import Node


class ColorTrackerNode(Node):
    def __init__(self):
        super().__init__('color_tracker_node')
        self.get_logger().info('color_tracker_node is alive')


def main(args=None):
    rclpy.init(args=args)
    node = ColorTrackerNode()
    rclpy.spin(node)
    node.destroy_node()
    rclpy.shutdown()


if __name__ == '__main__':
    main()
```

Add the entry point to `setup.py` (shown in full in Step 10). Build and run:

```bash
cd ~/robot_projects_ws
colcon build --packages-select visual_tracking_bot
source install/setup.bash
ros2 run visual_tracking_bot color_tracker_node
```

**What success looks like:** the log message appears, and `/color_tracker_node` shows up in `ros2 node list`.

### STEP 3 — Subscribe to `/camera/color/image_raw`, verify data arrives

Before running this step, apply Module 0's **two-step hardware-then-ROS checkpoint** for the D435i exactly as established there — `lsusb`/`realsense-viewer` first, then the ROS driver check — rather than repeating that procedure here.

```python
from sensor_msgs.msg import Image

# inside __init__, after the logger.info line:
self.image_sub = self.create_subscription(
    Image, '/camera/color/image_raw', self.image_callback, 10)

def image_callback(self, msg: Image):
    self.get_logger().info(
        f'Received image: {msg.height}x{msg.width}, encoding={msg.encoding}'
    )
```

Run with `robot_bringup` active in another terminal first. **What success looks like:** log lines showing the image's actual height/width/encoding, read from the message fields — never assume a fixed resolution in code, since it's configured in `robot_bringup/config/realsense.yaml`, not hardcoded here.
**If it fails:** no log output means `/camera/color/image_raw` isn't publishing — go back to Module 0's D435i checkpoints, not this node.

### STEP 4 — `cv_bridge` conversion

```python
from cv_bridge import CvBridge

# inside __init__:
self.bridge = CvBridge()

def image_callback(self, msg: Image):
    frame = self.bridge.imgmsg_to_cv2(msg, desired_encoding='bgr8')
    self.get_logger().info(f'Converted frame shape: {frame.shape}')
```

**What success looks like:** `frame.shape` logs as `(height, width, 3)`, matching Step 3's reported dimensions, with no exception raised.

> **TROUBLESHOOTING — `cv_bridge` / OpenCV version mismatch**
> This is the exact point in the course where Phase 3's flagged risk becomes real: if `imgmsg_to_cv2` raises an import or runtime error mentioning OpenCV, it almost always means Python's `cv2` module and the OpenCV build `ros-jazzy-cv-bridge` was compiled against don't match. **The fix is prevention, not patching:** install OpenCV only via `apt install python3-opencv`, and never run `pip install opencv-python` (or `opencv-python-headless`) alongside it on the same system. If you've already mixed the two, `pip uninstall opencv-python` and confirm `python3 -c "import cv2; print(cv2.__version__)"` resolves to the `apt`-installed version before continuing.

### STEP 5 — Calibrate HSV thresholds (standalone tool, run once per lighting setup)

`visual_tracking_bot/visual_tracking_bot/hsv_calibrator.py`:

```python
import cv2
import rclpy
from rclpy.node import Node
from sensor_msgs.msg import Image
from cv_bridge import CvBridge


def _nothing(_):
    pass


class HSVCalibratorNode(Node):
    """Standalone calibration utility — not part of the running robot.
    Run once per lighting setup to find hsv_lower/hsv_upper, then copy
    the printed values into visual_tracking_bot/config/color_tracker.yaml."""

    def __init__(self):
        super().__init__('hsv_calibrator')
        self.bridge = CvBridge()
        self.create_subscription(Image, '/camera/color/image_raw', self.image_callback, 10)

        cv2.namedWindow('Calibration')
        cv2.createTrackbar('H min', 'Calibration', 0, 179, _nothing)
        cv2.createTrackbar('H max', 'Calibration', 179, 179, _nothing)
        cv2.createTrackbar('S min', 'Calibration', 0, 255, _nothing)
        cv2.createTrackbar('S max', 'Calibration', 255, 255, _nothing)
        cv2.createTrackbar('V min', 'Calibration', 0, 255, _nothing)
        cv2.createTrackbar('V max', 'Calibration', 255, 255, _nothing)

        self.get_logger().info(
            'Adjust the trackbars until ONLY your target object is white '
            'in the Mask window. Press "p" to print the current values, '
            '"q" to quit.'
        )

    def image_callback(self, msg: Image):
        frame = self.bridge.imgmsg_to_cv2(msg, desired_encoding='bgr8')
        hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)

        h_min = cv2.getTrackbarPos('H min', 'Calibration')
        h_max = cv2.getTrackbarPos('H max', 'Calibration')
        s_min = cv2.getTrackbarPos('S min', 'Calibration')
        s_max = cv2.getTrackbarPos('S max', 'Calibration')
        v_min = cv2.getTrackbarPos('V min', 'Calibration')
        v_max = cv2.getTrackbarPos('V max', 'Calibration')

        mask = cv2.inRange(hsv, (h_min, s_min, v_min), (h_max, s_max, v_max))

        cv2.imshow('Camera', frame)
        cv2.imshow('Mask', mask)
        key = cv2.waitKey(1) & 0xFF

        if key == ord('p'):
            self.get_logger().info(
                f'hsv_lower: [{h_min}, {s_min}, {v_min}]   '
                f'hsv_upper: [{h_max}, {s_max}, {v_max}]'
            )
        elif key == ord('q'):
            cv2.destroyAllWindows()
            rclpy.shutdown()


def main(args=None):
    rclpy.init(args=args)
    node = HSVCalibratorNode()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        cv2.destroyAllWindows()
        if rclpy.ok():
            node.destroy_node()
            rclpy.shutdown()


if __name__ == '__main__':
    main()
```

```bash
ros2 run visual_tracking_bot hsv_calibrator
```

**What this does:** shows a live camera feed, a live binary mask, and six trackbars — adjust them until the mask shows your target object as a clean white blob and everything else as black, under your **current, actual** lab lighting.
**What success looks like:** pressing `p` logs a line like `hsv_lower: [0, 120, 70]   hsv_upper: [10, 255, 255]` — copy those exact numbers into `config/color_tracker.yaml`.
**If it fails:** if no window appears at all, you're likely running this over SSH without X11 forwarding — either run it with a display attached directly, or forward X11 (`ssh -X`).
**Re-run this any time lighting changes materially** — this is a documented re-calibration trigger, not a one-time setup step.

### STEP 6 — Apply the mask, publish a debug view

```python
import cv2

def image_callback(self, msg: Image):
    frame = self.bridge.imgmsg_to_cv2(msg, desired_encoding='bgr8')
    hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
    mask = cv2.inRange(hsv, self.hsv_lower, self.hsv_upper)
    self.debug_pub.publish(self.bridge.cv2_to_imgmsg(mask, encoding='mono8'))
```

(`self.hsv_lower`/`self.hsv_upper` and `self.debug_pub` are introduced properly in Step 10's full listing — this step is shown in isolation to keep the incremental build visible.)

```bash
ros2 run rqt_image_view rqt_image_view
```

Select `/color_tracker/debug_image`. **What success looks like:** a clean white blob where your target object is, black everywhere else — visually confirming the calibration before any motion logic is added.

### STEP 7 — Contour detection and centroid (observation only)

```python
contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
valid = [c for c in contours if cv2.contourArea(c) >= self.min_contour_area]
if valid:
    largest = max(valid, key=cv2.contourArea)
    m = cv2.moments(largest)
    cx = int(m['m10'] / m['m00'])
    cy = int(m['m01'] / m['m00'])
    self.get_logger().info(f'Centroid at ({cx}, {cy})')
```

**What success looks like:** the logged centroid tracks the object smoothly as you move it by hand in front of the camera, and disappears (no log line) when the object is removed.

### STEP 8 — Steering decision (still observation only)

```python
frame_center_x = frame.shape[1] / 2.0   # read from the actual frame width,
                                          # never a hardcoded resolution
offset = cx - frame_center_x
if abs(offset) <= self.centroid_deadzone_px:
    self.get_logger().info(f'CENTERED (offset={offset:.0f}px)')
elif offset > 0:
    self.get_logger().info(f'Would TURN RIGHT (offset={offset:.0f}px)')
else:
    self.get_logger().info(f'Would TURN LEFT (offset={offset:.0f}px)')
```

### STEP 9 — Lost-target tracking

```python
# on a valid detection:
self.last_detection_time = self.get_clock().now()
# when no valid contour is found this frame, simply don't update
# last_detection_time — the safety_check timer (Step 10) handles the
# STOP decision once target_lost_timeout_sec has elapsed
```

### STEP 10 — Publish `/cmd_vel`, full node with parameters and safety timer

```python
import cv2
import rclpy
from rclpy.node import Node
from sensor_msgs.msg import Image
from geometry_msgs.msg import Twist
from cv_bridge import CvBridge


class ColorTrackerNode(Node):

    def __init__(self):
        super().__init__('color_tracker_node')

        self.declare_parameter('hsv_lower', [0, 120, 70])
        self.declare_parameter('hsv_upper', [10, 255, 255])
        self.declare_parameter('min_contour_area', 500)
        self.declare_parameter('centroid_deadzone_px', 40)
        self.declare_parameter('angular_gain', 0.005)
        self.declare_parameter('max_linear_speed', 0.12)
        self.declare_parameter('max_angular_speed', 0.4)
        self.declare_parameter('target_lost_timeout_sec', 1.0)
        self.declare_parameter('publish_debug_image', True)

        self.hsv_lower = tuple(self.get_parameter('hsv_lower').value)
        self.hsv_upper = tuple(self.get_parameter('hsv_upper').value)
        self.min_contour_area = self.get_parameter('min_contour_area').value
        self.centroid_deadzone_px = self.get_parameter('centroid_deadzone_px').value
        self.angular_gain = self.get_parameter('angular_gain').value
        self.max_linear_speed = self.get_parameter('max_linear_speed').value
        self.max_angular_speed = self.get_parameter('max_angular_speed').value
        self.target_lost_timeout_sec = self.get_parameter('target_lost_timeout_sec').value
        self.publish_debug_image = self.get_parameter('publish_debug_image').value

        self.bridge = CvBridge()
        self.last_detection_time = None

        self.image_sub = self.create_subscription(
            Image, '/camera/color/image_raw', self.image_callback, 10)
        self.cmd_vel_pub = self.create_publisher(Twist, '/cmd_vel', 10)
        if self.publish_debug_image:
            self.debug_pub = self.create_publisher(Image, '/color_tracker/debug_image', 10)

        # Same watchdog pattern as Project 1's scan_timeout_sec — a timer
        # independent of the camera's own frame rate, so a stalled camera
        # feed or a lost target can't leave the robot coasting forever.
        self.safety_timer = self.create_timer(0.1, self.safety_check)

        self.get_logger().info('color_tracker_node started')

    def image_callback(self, msg: Image):
        frame = self.bridge.imgmsg_to_cv2(msg, desired_encoding='bgr8')
        frame_height, frame_width = frame.shape[:2]  # read at runtime, never
                                                       # a hardcoded resolution

        hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
        mask = cv2.inRange(hsv, self.hsv_lower, self.hsv_upper)

        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        valid_contours = [c for c in contours if cv2.contourArea(c) >= self.min_contour_area]

        if not valid_contours:
            if self.publish_debug_image:
                self.debug_pub.publish(self.bridge.cv2_to_imgmsg(mask, encoding='mono8'))
            return  # no update to /cmd_vel this frame; safety_check owns the STOP decision

        largest = max(valid_contours, key=cv2.contourArea)
        m = cv2.moments(largest)
        cx = int(m['m10'] / m['m00'])
        cy = int(m['m01'] / m['m00'])
        self.last_detection_time = self.get_clock().now()

        offset = cx - (frame_width / 2.0)
        twist = Twist()
        twist.linear.x = self.max_linear_speed
        if abs(offset) <= self.centroid_deadzone_px:
            twist.angular.z = 0.0
        else:
            angular = -self.angular_gain * offset
            twist.angular.z = max(-self.max_angular_speed,
                                   min(self.max_angular_speed, angular))
        self.cmd_vel_pub.publish(twist)

        if self.publish_debug_image:
            debug_frame = frame.copy()
            cv2.drawContours(debug_frame, [largest], -1, (0, 255, 0), 2)
            cv2.circle(debug_frame, (cx, cy), 5, (0, 0, 255), -1)
            self.debug_pub.publish(self.bridge.cv2_to_imgmsg(debug_frame, encoding='bgr8'))

    def safety_check(self):
        if self.last_detection_time is None:
            return
        elapsed = (self.get_clock().now() - self.last_detection_time).nanoseconds / 1e9
        if elapsed > self.target_lost_timeout_sec:
            self.get_logger().warn(
                f'Target lost for {elapsed:.2f}s (> target_lost_timeout_sec) — '
                f'publishing STOP, not searching')
            self.cmd_vel_pub.publish(Twist())


def main(args=None):
    rclpy.init(args=args)
    node = ColorTrackerNode()
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

`visual_tracking_bot/config/color_tracker.yaml`:

```yaml
/**:
  ros__parameters:
    hsv_lower: [0, 120, 70]     # PLACEHOLDER — replace with YOUR values
                                  # from Step 5, under YOUR lab's actual
                                  # current lighting
    hsv_upper: [10, 255, 255]    # PLACEHOLDER — same as above
    min_contour_area: 500
    centroid_deadzone_px: 40
    angular_gain: 0.005
    max_linear_speed: 0.12
    max_angular_speed: 0.4
    target_lost_timeout_sec: 1.0
    publish_debug_image: true
```

`visual_tracking_bot/setup.py` (full):

```python
import os
from glob import glob
from setuptools import find_packages, setup

package_name = 'visual_tracking_bot'

setup(
    name=package_name,
    version='0.1.0',
    packages=find_packages(exclude=['test']),
    data_files=[
        ('share/ament_index/resource_index/packages', ['resource/' + package_name]),
        ('share/' + package_name, ['package.xml']),
        (os.path.join('share', package_name, 'launch'), glob('launch/*.launch.py')),
        (os.path.join('share', package_name, 'config'), glob('config/*.yaml')),
    ],
    install_requires=['setuptools'],
    zip_safe=True,
    maintainer='Your Name',
    maintainer_email='you@example.com',
    description='Project 2: reactive color-based visual object tracking.',
    license='Apache-2.0',
    tests_require=['pytest'],
    entry_points={
        'console_scripts': [
            'color_tracker_node = visual_tracking_bot.color_tracker_node:main',
            'hsv_calibrator = visual_tracking_bot.hsv_calibrator:main',
        ],
    },
)
```

`visual_tracking_bot/launch/visual_tracking.launch.py`:

```python
import os

from ament_index_python.packages import get_package_share_directory
from launch import LaunchDescription
from launch.actions import IncludeLaunchDescription
from launch.launch_description_sources import PythonLaunchDescriptionSource
from launch_ros.actions import Node


def generate_launch_description():
    bringup_share = get_package_share_directory('robot_bringup')
    own_share = get_package_share_directory('visual_tracking_bot')

    bringup_launch = IncludeLaunchDescription(
        PythonLaunchDescriptionSource(
            os.path.join(bringup_share, 'launch', 'bringup.launch.py')
        ),
        launch_arguments={'use_ekf': 'false'}.items()
        # This project never reads /odom either — same reasoning as
        # Project 1. 'false' just avoids starting the EKF unnecessarily.
    )

    color_tracker_node = Node(
        package='visual_tracking_bot',
        executable='color_tracker_node',
        name='color_tracker_node',
        output='screen',
        parameters=[os.path.join(own_share, 'config', 'color_tracker.yaml')]
    )

    return LaunchDescription([bringup_launch, color_tracker_node])
```

Update `package.xml` to add `<exec_depend>robot_bringup</exec_depend>`, then:

```bash
cd ~/robot_projects_ws
colcon build --packages-select visual_tracking_bot
source install/setup.bash
```

### STEP 11 — Test with wheels lifted

```bash
ros2 launch visual_tracking_bot visual_tracking.launch.py
```
(second terminal)
```bash
ros2 topic echo /cmd_vel
```

Move the calibrated object left/right by hand in front of the camera. **What success looks like:** `angular.z`'s sign matches the direction the object needs the robot to turn, magnitude never exceeds `max_angular_speed`, and it returns to `0.0` when the object sits within `centroid_deadzone_px` of center. Remove the object entirely and confirm `/cmd_vel` goes to all-zero within `target_lost_timeout_sec`.

### STEP 12 — First floor test

Low speed, fully cleared path in every direction (per §3), supervised.

---

## 6. Path C — Modify Existing (Closing Challenge)

- Re-calibrate for a **different colored object** than the one you started with, without re-reading this document's steps — use only `hsv_calibrator`'s own on-screen instructions.
- Change `centroid_deadzone_px` to `10` and observe whether the robot starts oscillating (small, rapid left-right corrections) — then explain why, in terms of the dead-zone's purpose.
- Add a second color range (e.g., handle a target color that wraps around HSV's hue boundary near 0°/180°, which needs two `inRange` masks OR'd together) as a stretch exercise.

---

## 7. How to Run the Project

```
TERMINAL 1 (once, per lighting setup — not part of normal operation)
ros2 run visual_tracking_bot hsv_calibrator
   → Why: determines hsv_lower/hsv_upper for the current lighting;
     copy the printed values into config/color_tracker.yaml, then
     close this tool — it is not run alongside the tracking node.

TERMINAL 2
ros2 launch visual_tracking_bot visual_tracking.launch.py
   → Why: brings up robot_bringup's sensors and starts color_tracker_node,
     exactly matching the "no project hand-launches a driver" rule.
   → What should appear: bringup logs, then "color_tracker_node started"

TERMINAL 3
ros2 run rqt_image_view rqt_image_view, viewing /color_tracker/debug_image
   → Why: lets you see exactly what the node sees and decides, without
     needing to interpret raw /cmd_vel numbers alone.

TERMINAL 4 (optional)
ros2 topic echo /cmd_vel
   → Why: confirms the exact commanded velocity at any instant.
```

---

## 8. Expected Results

```
✓ ros2 node list shows /color_tracker_node alongside the robot_bringup nodes
✓ /color_tracker/debug_image shows a clean, isolated mask/annotated frame
  under current lighting (re-run calibration if it doesn't)
✓ Presenting the object left/right produces correctly-signed angular.z
  on /cmd_vel, capped at max_angular_speed
✓ Centering the object returns angular.z to 0.0 with linear.x at
  max_linear_speed
✓ Removing the object produces a WARN log and a zeroed /cmd_vel within
  target_lost_timeout_sec
```

---

## 9. Verification Checkpoints

```
CHECKPOINT 1 — HARDWARE: does lsusb/realsense-viewer show the D435i's
  RGB stream live, BEFORE any ROS node is started? (Module 0's pattern,
  reused here without re-deriving it.)

CHECKPOINT 2 — ROS 2: does realsense2_camera_node start cleanly, and
  does /camera/color/image_raw appear in `ros2 topic list`?

CHECKPOINT 3 — DATA: does `ros2 topic hz /camera/color/image_raw` show
  a steady rate, and does the cv_bridge conversion complete without
  throwing across a sustained run (not just once)?

CHECKPOINT 4 — ALGORITHM: under the lab's ACTUAL current lighting, does
  the calibrated mask isolate the target with minimal noise (checked
  visually via /color_tracker/debug_image), and does the computed
  centroid stay stable when the object is held still?

CHECKPOINT 5 — CONTROL: with wheels lifted, does /cmd_vel show correctly
  signed, correctly capped angular.z as the object moves, returning to
  zero within the dead-zone?

CHECKPOINT 6 — PHYSICAL ROBOT: on the floor at low speed, in a fully
  cleared area, does the robot smoothly follow a slowly-moved object
  without oscillating, and does it stop (not spin) within
  target_lost_timeout_sec when the object is removed?
```

---

## 10. Visual and Video Assets, Quizzes, Practical Assessment

### Visual Assets

- **[IMAGE: hero photo of the robot tracking a colored object — pending]**
- Architecture diagram — rendered directly in §4 above
- **[SCREENSHOT: hsv_calibrator's Camera/Mask windows mid-calibration — pending]**
- **[SCREENSHOT: /color_tracker/debug_image with contour and centroid drawn — pending]**
- **[SCREENSHOT: rqt_graph showing color_tracker_node's connections — pending]**

### Video Assets (all pending)

1. Project Overview — pending
2. Concept (HSV color space, contours, centroids) — pending
3. Setup — pending
4. Implementation (building both the calibrator and the tracker) — pending
5. Execution — pending
6. Debugging (a real tracking failure diagnosed) — pending
7. Final Demonstration — pending

### Quizzes

**Project Understanding Quiz**

1. *Why is the HSV calibration tool a separate script from the tracking node, rather than one combined program?*
   **Answer:** Calibration and tracking are different tasks with different lifetimes — calibration is run once (or occasionally, when lighting changes) by a human adjusting sliders interactively, while tracking runs continuously and autonomously with no human input. Combining them would force the tracking node to carry GUI/trackbar code it never needs while actually running the robot.

**Concept Quiz**

1. *Why does the mask isolation step use HSV color space instead of the camera's native BGR/RGB?*
   **Answer:** HSV separates a color's hue from its brightness and saturation, so a threshold range can be built around "what color is this" largely independent of lighting intensity — a BGR/RGB threshold would need to account for brightness changes directly in every channel, which is far harder to tune robustly.

2. *What does `min_contour_area` protect against?*
   **Answer:** Small, noisy blobs in the mask (stray pixels matching the color range by coincidence, or small reflections) being mistaken for the actual target — filtering by a minimum area ensures only a plausibly object-sized region is tracked.

**Data Flow Quiz**

1. *If the D435i's resolution is changed in `robot_bringup/config/realsense.yaml`, does `color_tracker_node`'s code need to change?*
   **Answer:** No — the node reads `frame.shape` from the actual incoming frame at runtime rather than hardcoding a resolution, so it adapts automatically. This is the same discipline as Module 0's FOV index-math fix, applied to image dimensions instead of scan angles.

**Debugging Quiz**

1. *The `/color_tracker/debug_image` mask preview shows the target object cleanly isolated as a white blob, but the robot doesn't move at all. Which layer do you check first: image processing, centroid math, or the publisher — and why?*
   **Answer:** Check the publisher layer first, specifically whether `/cmd_vel` is actually being published at all (`ros2 topic hz /cmd_vel`) and whether anything is subscribed to it (`ros2 topic info /cmd_vel`). A clean mask already proves image processing is working; the next thing downstream in the pipeline — and the cheapest to check — is whether a `Twist` message is leaving the node at all, before assuming a subtler bug in the centroid or steering math.

2. *The robot tracks correctly indoors near a window during the day, but loses the target entirely in the evening under artificial light. What's the most likely cause, and what's the fix?*
   **Answer:** The HSV calibration was performed under different lighting than the current test — natural daylight and artificial lighting produce different color casts. The fix is re-running `hsv_calibrator` under the current lighting, exactly as the Lab Safety Check (§3) names as a required trigger, not re-tuning the tracking node's logic.

### Practical Assessment — Can You Build It Yourself?

```
CHALLENGE: Re-calibrate and re-verify the tracker for a NEW colored
object, without following this document's steps verbatim.

Requirements:
✓ Choose a different-colored object than the one you calibrated first.
✓ Run hsv_calibrator and determine new hsv_lower/hsv_upper values
  using only its own on-screen instructions.
✓ Update config/color_tracker.yaml and relaunch.
✓ Confirm Checkpoint 4 (mask isolation, centroid stability) passes for
  the new object before attempting Checkpoint 5 or any floor test.
✓ Test safely: wheels lifted first, low speed on a fully cleared floor
  second.
```

---

**Phase 5, Part 2 (Project 2) is complete.** Next: Project 3 (SLAM Mapping) LMS content, in the same structure. Let me know if anything above should change before I continue.
