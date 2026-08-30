/**
 * Code fixtures for the "Hands-On Robotics Projects" course, Project 2
 * (Visual Object Tracking) section.
 *
 * Same pattern as `module-0-fixtures.ts` and `project-1-fixtures.ts`: full,
 * multi-line code lives here as named template-literal constants,
 * transcribed verbatim from
 * `docs/robotics-projects/PHASE_5_LMS_CONTENT_PROJECT_2.md` — not
 * re-derived or "improved" during implementation.
 *
 * Two distinct files, kept as two distinct sets of constants — the source
 * document deliberately keeps `hsv_calibrator.py` (one-time lighting
 * calibration, run by a human) and `color_tracker_node.py` (the
 * continuously-running tracking node) as separate artifacts with different
 * lifetimes. They are never merged into a single combined listing here.
 */

// --- color_tracker_node.py -------------------------------------------------

export const COLOR_TRACKER_NODE_MINIMAL = `import rclpy
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
`;

export const COLOR_TRACKER_STEP3_SUBSCRIBE = `from sensor_msgs.msg import Image

# inside __init__, after the logger.info line:
self.image_sub = self.create_subscription(
    Image, '/camera/color/image_raw', self.image_callback, 10)

def image_callback(self, msg: Image):
    self.get_logger().info(
        f'Received image: {msg.height}x{msg.width}, encoding={msg.encoding}'
    )
`;

export const COLOR_TRACKER_STEP4_CV_BRIDGE = `from cv_bridge import CvBridge

# inside __init__:
self.bridge = CvBridge()

def image_callback(self, msg: Image):
    frame = self.bridge.imgmsg_to_cv2(msg, desired_encoding='bgr8')
    self.get_logger().info(f'Converted frame shape: {frame.shape}')
`;

export const COLOR_TRACKER_STEP6_MASK_DEBUG = `import cv2

def image_callback(self, msg: Image):
    frame = self.bridge.imgmsg_to_cv2(msg, desired_encoding='bgr8')
    hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
    mask = cv2.inRange(hsv, self.hsv_lower, self.hsv_upper)
    self.debug_pub.publish(self.bridge.cv2_to_imgmsg(mask, encoding='mono8'))
`;

export const COLOR_TRACKER_STEP7_CONTOUR_CENTROID = `contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
valid = [c for c in contours if cv2.contourArea(c) >= self.min_contour_area]
if valid:
    largest = max(valid, key=cv2.contourArea)
    m = cv2.moments(largest)
    cx = int(m['m10'] / m['m00'])
    cy = int(m['m01'] / m['m00'])
    self.get_logger().info(f'Centroid at ({cx}, {cy})')
`;

export const COLOR_TRACKER_STEP8_STEERING_DECISION = `frame_center_x = frame.shape[1] / 2.0   # read from the actual frame width,
                                          # never a hardcoded resolution
offset = cx - frame_center_x
if abs(offset) <= self.centroid_deadzone_px:
    self.get_logger().info(f'CENTERED (offset={offset:.0f}px)')
elif offset > 0:
    self.get_logger().info(f'Would TURN RIGHT (offset={offset:.0f}px)')
else:
    self.get_logger().info(f'Would TURN LEFT (offset={offset:.0f}px)')
`;

export const COLOR_TRACKER_STEP9_LOST_TARGET = `# on a valid detection:
self.last_detection_time = self.get_clock().now()
# when no valid contour is found this frame, simply don't update
# last_detection_time — the safety_check timer (Step 10) handles the
# STOP decision once target_lost_timeout_sec has elapsed
`;

export const COLOR_TRACKER_NODE_FULL = `import cv2
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
`;

export const COLOR_TRACKER_CONFIG_YAML = `/**:
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
`;

export const VISUAL_TRACKING_BOT_SETUP_PY = `import os
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
`;

export const VISUAL_TRACKING_LAUNCH_PY = `import os

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
`;

// --- hsv_calibrator.py -------------------------------------------------
// A standalone calibration utility, not part of the running robot — kept
// as its own file and its own set of fixtures, never merged with the
// tracker node above.

export const HSV_CALIBRATOR_FULL = `import cv2
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
`;
