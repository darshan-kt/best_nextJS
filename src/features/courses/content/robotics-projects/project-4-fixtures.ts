/**
 * Code fixtures for the "Hands-On Robotics Projects" course, Project 4
 * (Autonomous Navigation / Nav2) section.
 *
 * Same pattern as `module-0-fixtures.ts`, `project-1-fixtures.ts`,
 * `project-2-fixtures.ts`, and `project-3-fixtures.ts`: full, multi-line
 * code lives here as named template-literal constants, transcribed
 * verbatim from
 * `docs/robotics-projects/PHASE_5_LMS_CONTENT_PROJECT_4_AND_COURSE_CLOSEOUT.md`
 * — not re-derived or "improved" during implementation.
 *
 * Like Project 3, this project is primarily configuration and
 * orchestration around a mature, ready-made stack (`nav2_bringup`), not
 * new node authorship (§1 of the source doc). The one piece of Python
 * here (`PROJECT_4_SEND_GOAL_EXAMPLE`) is explicitly a standalone teaching
 * script, not part of the maintained `robot_navigation` package — the
 * source doc says so directly ("run directly with python3, not built into
 * robot_navigation's package") — so it is never given a `filename` under
 * `robot_navigation/` in the seed, only its own top-level script name.
 */

export const PROJECT_4_PACKAGE_XML = `<?xml version="1.0"?>
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
`;

export const PROJECT_4_CMAKELISTS = `cmake_minimum_required(VERSION 3.8)
project(robot_navigation)

find_package(ament_cmake REQUIRED)

install(DIRECTORY config launch
  DESTINATION share/\${PROJECT_NAME}
)

ament_package()
`;

export const PROJECT_4_NAV2_PARAMS_YAML = `amcl:
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
`;

export const PROJECT_4_NAVIGATION_LAUNCH_PY = `import os

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
`;

export const PROJECT_4_SEND_GOAL_EXAMPLE = `#!/usr/bin/env python3
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
`;
