/**
 * Code fixtures for the "Hands-On Robotics Projects" course, Project 3
 * (Robot Mapping Using SLAM) section.
 *
 * Same pattern as `module-0-fixtures.ts`, `project-1-fixtures.ts`, and
 * `project-2-fixtures.ts`: full, multi-line code lives here as named
 * template-literal constants, transcribed verbatim from
 * `docs/robotics-projects/PHASE_5_LMS_CONTENT_PROJECT_3.md` — not
 * re-derived or "improved" during implementation.
 *
 * Project 3 has no new ROS 2 node to author incrementally (§1 of the
 * source doc: "you are not writing a new node" — `slam_toolbox` is a
 * ready-made package). The fixtures here are the `robot_slam` package's
 * configuration and orchestration files only: `package.xml`,
 * `CMakeLists.txt` (the same `ament_cmake` shape as `robot_description`'s,
 * not `robot_1`/`robot_2`'s `ament_python` shape, since this package ships
 * no Python nodes of its own), the `slam_toolbox` parameters, and the
 * launch file that composes `robot_bringup` + `slam_toolbox` + RViz.
 */

export const PROJECT_3_PACKAGE_XML = `<?xml version="1.0"?>
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
`;

export const PROJECT_3_CMAKELISTS = `cmake_minimum_required(VERSION 3.8)
project(robot_slam)

find_package(ament_cmake REQUIRED)

install(DIRECTORY config launch rviz maps
  DESTINATION share/\${PROJECT_NAME}
)

ament_package()
`;

export const PROJECT_3_SLAM_TOOLBOX_PARAMS_YAML = `slam_toolbox:
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
`;

export const PROJECT_3_SLAM_LAUNCH_PY = `import os

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
`;
