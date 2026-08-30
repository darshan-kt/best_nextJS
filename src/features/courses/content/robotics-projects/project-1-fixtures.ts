/**
 * Code fixtures for the "Hands-On Robotics Projects" course, Project 1
 * (Obstacle Avoidance) section.
 *
 * Same pattern as `module-0-fixtures.ts`: full, multi-line code lives here
 * as named template-literal constants, transcribed verbatim from
 * `docs/robotics-projects/PHASE_5_LMS_CONTENT_MODULE_0_AND_PROJECT_1.md`'s
 * Project 1 portion — not re-derived or "improved" during implementation.
 */

export const OBSTACLE_AVOIDANCE_NODE_MINIMAL = `import rclpy
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
`;

export const OBSTACLE_AVOIDANCE_STEP3_SUBSCRIBE = `from sensor_msgs.msg import LaserScan

# inside __init__, after the logger.info line:
self.scan_sub = self.create_subscription(LaserScan, '/scan', self.scan_callback, 10)

def scan_callback(self, msg: LaserScan):
    self.get_logger().info(
        f'Received scan: {len(msg.ranges)} points, '
        f'angle_min={msg.angle_min:.2f}, angle_max={msg.angle_max:.2f}, '
        f'angle_increment={msg.angle_increment:.4f}'
    )
`;

export const OBSTACLE_AVOIDANCE_STEP4_FOV_FILTER = `import math

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
`;

export const OBSTACLE_AVOIDANCE_STEP4_CALLBACK = `def scan_callback(self, msg: LaserScan):
    front_min = self.min_range_in_arc(
        msg, -math.radians(15.0), math.radians(15.0))
    self.get_logger().info(f'Front minimum distance: {front_min:.2f} m')
`;

export const OBSTACLE_AVOIDANCE_STEP5_CALLBACK = `def scan_callback(self, msg: LaserScan):
    front_min = self.min_range_in_arc(msg, -math.radians(15.0), math.radians(15.0))
    if front_min <= 0.5:
        self.get_logger().info(f'OBSTACLE at {front_min:.2f} m')
    else:
        self.get_logger().info(f'CLEAR ({front_min:.2f} m)')
`;

export const OBSTACLE_AVOIDANCE_STEP6_CLEARANCE = `left_min = self.min_range_in_arc(msg, math.radians(15.0), math.radians(60.0))
right_min = self.min_range_in_arc(msg, -math.radians(60.0), -math.radians(15.0))
direction = 'LEFT' if left_min >= right_min else 'RIGHT'
self.get_logger().info(f'Would turn {direction} (left={left_min:.2f}, right={right_min:.2f})')
`;

export const OBSTACLE_AVOIDANCE_NODE_FULL = `import math

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
`;

export const OBSTACLE_AVOIDANCE_CONFIG_YAML = `/**:
  ros__parameters:
    front_fov_degrees: 30.0
    obstacle_distance: 0.5
    stop_distance: 0.2
    side_clearance_fov_degrees: 45.0
    linear_speed: 0.12
    angular_speed: 0.4
    scan_timeout_sec: 0.5
`;

export const OBSTACLE_AVOIDANCE_LAUNCH_PY = `import os

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
        # this project's behavior — 'false' here just avoids starting the
        # EKF node unnecessarily.
    )

    obstacle_avoidance_node = Node(
        package='obstacle_avoidance_bot',
        executable='obstacle_avoidance_node',
        name='obstacle_avoidance_node',
        output='screen',
        parameters=[os.path.join(own_share, 'config', 'obstacle_avoidance.yaml')]
    )

    return LaunchDescription([bringup_launch, obstacle_avoidance_node])
`;
