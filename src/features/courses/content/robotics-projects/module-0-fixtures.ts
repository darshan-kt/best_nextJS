/**
 * Code fixtures for the "Hands-On Robotics Projects" course, Module 0
 * (Lab Zero) section.
 *
 * Mirrors the pattern in `content/ros2/terminal-fixtures.ts`: large,
 * multi-line code/config content lives here as named template-literal
 * constants, and `prisma/seed.ts` imports and references them by name in
 * CODE blocks, rather than embedding thousands of characters of
 * escaped-quote strings inline in the seed file itself.
 *
 * Every constant here is transcribed verbatim from
 * `docs/robotics-projects/PHASE_5_LMS_CONTENT_MODULE_0_AND_PROJECT_1.md`
 * (the approved Phase 5 design), not re-derived or "improved" — per the
 * master course-design file's rule against silently changing approved
 * content during implementation.
 */

export const ROBOT_DESCRIPTION_BASE_XACRO = `<?xml version="1.0"?>
<robot xmlns:xacro="http://www.ros.org/wiki/xacro">

  <xacro:property name="base_length" value="0.30"/>
  <xacro:property name="base_width" value="0.25"/>
  <xacro:property name="base_height" value="0.10"/>
  <xacro:property name="wheel_radius" value="0.04"/>
  <xacro:property name="wheel_width" value="0.02"/>
  <xacro:property name="wheel_separation" value="0.28"/>

  <link name="base_link">
    <visual>
      <origin xyz="0 0 \${base_height/2}" rpy="0 0 0"/>
      <geometry><box size="\${base_length} \${base_width} \${base_height}"/></geometry>
      <material name="base_grey"><color rgba="0.3 0.3 0.3 1.0"/></material>
    </visual>
    <collision>
      <origin xyz="0 0 \${base_height/2}" rpy="0 0 0"/>
      <geometry><box size="\${base_length} \${base_width} \${base_height}"/></geometry>
    </collision>
    <inertial>
      <mass value="3.0"/>
      <origin xyz="0 0 \${base_height/2}"/>
      <inertia ixx="0.05" ixy="0.0" ixz="0.0" iyy="0.06" iyz="0.0" izz="0.08"/>
    </inertial>
  </link>

  <xacro:macro name="wheel" params="prefix reflect">
    <link name="\${prefix}_wheel_link">
      <visual>
        <origin xyz="0 0 0" rpy="\${pi/2} 0 0"/>
        <geometry><cylinder radius="\${wheel_radius}" length="\${wheel_width}"/></geometry>
        <material name="wheel_black"><color rgba="0.05 0.05 0.05 1.0"/></material>
      </visual>
      <collision>
        <origin xyz="0 0 0" rpy="\${pi/2} 0 0"/>
        <geometry><cylinder radius="\${wheel_radius}" length="\${wheel_width}"/></geometry>
      </collision>
      <inertial>
        <mass value="0.2"/>
        <inertia ixx="0.0002" ixy="0.0" ixz="0.0" iyy="0.0002" iyz="0.0" izz="0.0003"/>
      </inertial>
    </link>
    <joint name="\${prefix}_wheel_joint" type="continuous">
      <parent link="base_link"/>
      <child link="\${prefix}_wheel_link"/>
      <origin xyz="0 \${reflect} * \${wheel_separation/2} \${wheel_radius}" rpy="0 0 0"/>
      <axis xyz="0 1 0"/>
    </joint>
  </xacro:macro>

  <xacro:wheel prefix="left" reflect="1"/>
  <xacro:wheel prefix="right" reflect="-1"/>

</robot>
`;

export const ROBOT_DESCRIPTION_LIDAR_XACRO = `<?xml version="1.0"?>
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
    <origin xyz="\${lidar_mount_x} 0 \${lidar_mount_z}" rpy="0 0 0"/>
  </joint>

</robot>
`;

export const ROBOT_DESCRIPTION_CAMERA_XACRO = `<?xml version="1.0"?>
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
    <origin xyz="\${camera_mount_x} 0 \${camera_mount_z}" rpy="0 0 0"/>
  </joint>

  <!-- realsense-ros publishes camera_color_optical_frame, camera_depth_optical_frame,
       camera_gyro_frame, and camera_accel_frame itself, as children of camera_link,
       once the driver is running. This file only fixes camera_link to base_link. -->

</robot>
`;

export const ROBOT_DESCRIPTION_IMU_XACRO = `<?xml version="1.0"?>
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
    <origin xyz="\${imu_mount_x} 0 \${imu_mount_z}" rpy="0 0 0"/>
  </joint>

</robot>
`;

export const ROBOT_DESCRIPTION_ROBOT_XACRO = `<?xml version="1.0"?>
<robot name="lab_robot" xmlns:xacro="http://www.ros.org/wiki/xacro">
  <xacro:include filename="$(find robot_description)/urdf/base.urdf.xacro"/>
  <xacro:include filename="$(find robot_description)/urdf/lidar.urdf.xacro"/>
  <xacro:include filename="$(find robot_description)/urdf/camera.urdf.xacro"/>
  <xacro:include filename="$(find robot_description)/urdf/imu.urdf.xacro"/>
</robot>
`;

export const ROBOT_DESCRIPTION_PACKAGE_XML = `<?xml version="1.0"?>
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
`;

export const ROBOT_DESCRIPTION_CMAKELISTS = `cmake_minimum_required(VERSION 3.8)
project(robot_description)

find_package(ament_cmake REQUIRED)

install(DIRECTORY urdf launch rviz meshes
  DESTINATION share/\${PROJECT_NAME}
)

ament_package()
`;

export const ROBOT_DESCRIPTION_DISPLAY_LAUNCH_PY = `import os

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
`;

export const ROBOT_DESCRIPTION_LAUNCH_PY = `import os

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
`;

export const ROBOT_BRINGUP_RPLIDAR_S3_YAML = `/**:
  ros__parameters:
    channel_type: serial
    serial_port: /dev/rplidar        # ASSUMED — VERIFY ON ROBOT (Step 4)
    serial_baudrate: 1000000         # ASSUMED — VERIFY against the S3 datasheet
    frame_id: laser_link
    inverted: false
    angle_compensate: true
    scan_mode: Standard
`;

export const ROBOT_BRINGUP_REALSENSE_YAML = `/**:
  ros__parameters:
    enable_gyro: true
    enable_accel: true
    unite_imu_method: 2
    rgb_camera.color_profile: 640x480x30
    depth_module.depth_profile: 640x480x30
    camera_name: camera
`;

export const ROBOT_BRINGUP_STANDALONE_IMU_YAML = `# PLACEHOLDER — the standalone IMU's make/model was not yet identified
# as of Phase 3. Once Step 8 identifies it, replace this file's contents
# with the real driver's parameters, and update the node block in
# sensors_only.launch.py below to use that driver's actual package and
# executable name.
/**:
  ros__parameters:
    frame_id: imu_link
    port: /dev/ttyUSB1     # ASSUMED — VERIFY ON ROBOT
    baudrate: 115200        # ASSUMED — VERIFY ON ROBOT
`;

export const ROBOT_BRINGUP_EKF_YAML = `ekf_filter_node:
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
`;

export const ROBOT_BRINGUP_SENSORS_ONLY_LAUNCH_PY = `import os

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
`;

export const ROBOT_BRINGUP_BRINGUP_LAUNCH_PY = `import os

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
`;
