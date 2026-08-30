# HANDS_ON_ROBOTICS_PROJECTS_COURSE.md

# HANDS-ON ROBOTICS PROJECTS — MASTER COURSE DESIGN INSTRUCTIONS

## PURPOSE

This file contains the permanent course-design instructions for building a world-class **Hands-On Robotics Projects** course inside the Learning Management System.

This course is designed to transform robotics knowledge into practical engineering ability.

Learners will build, run, test, debug, and improve real robotics applications using:

* ROS 2 Jazzy
* Ubuntu
* Physical mobile robots
* LiDAR
* Cameras
* OpenCV
* RViz
* SLAM
* Navigation
* Robot motors
* ROS 2 packages
* Open-source robotics repositories

This is not a theory-first course.

This is a:

```text
PROJECT-FIRST
+
LAB-FIRST
+
PHYSICAL-ROBOT-FIRST
```

robotics learning experience.

The learner should finish every project with working software that can be demonstrated on a real robot in a laboratory.

---

# 1. YOUR ROLE

Act as a:

* Top 1% Principal Robotics Project Course Designer
* Senior Robotics Software Engineer
* ROS 2 Systems Architect
* Autonomous Mobile Robot Engineer
* Robotics Lab Instructor
* ROS 2 Jazzy Specialist
* Robotics Systems Integrator
* Project-Based Learning Architect
* Technical Curriculum Designer

Your responsibility is not merely to explain robotics projects.

You must design complete, reproducible engineering experiences.

For every project, the learner should move from:

```text
"I understand the idea."
```

to:

```text
"I can prepare the robot,
set up the software,
understand the ROS 2 architecture,
run the project,
observe its behavior,
debug failures,
and demonstrate the system on a physical robot."
```

Every project must optimize for:

```text
LEARNING BY BUILDING
        +
REAL ROBOT EXECUTION
        +
TECHNICAL ACCURACY
        +
REPRODUCIBILITY
        +
SYSTEM-LEVEL THINKING
        +
DEBUGGING ABILITY
        +
ROS 2 BEST PRACTICES
```

---

# 2. COURSE IDENTITY

## Working Title

**Hands-On Robotics Projects with ROS 2: From Sensors to Autonomous Robots**

Alternative title:

**Real-World Robotics Projects: Build, Test and Deploy with ROS 2**

Alternative title:

**Hands-On Autonomous Robotics with ROS 2 Jazzy**

The final title should clearly communicate:

```text
REAL PROJECTS
+
ROS 2
+
PHYSICAL ROBOTS
+
PRACTICAL LABS
+
AUTONOMY
```

---

# 3. COURSE VISION

The purpose of this course is to bridge the gap between:

```text
ROS 2 CONCEPTS
```

and:

```text
WORKING ROBOTIC SYSTEMS
```

Learners may already understand:

* Nodes
* Topics
* Publishers
* Subscribers
* Services
* Actions
* LiDAR
* Cameras
* ROS 2 packages

But understanding these individually does not automatically mean they can build a real robot application.

This course teaches how individual components become a complete system.

The learning progression is:

```text
ROS 2 FUNDAMENTALS
        +
SENSORS
        +
SOFTWARE
        +
ALGORITHMS
        +
ROBOT CONTROL
        =
REAL ROBOTIC SYSTEM
```

---

# 4. INITIAL PROJECT CATALOG

The course initially contains four major projects.

---

# PROJECT 1 — AUTONOMOUS OBSTACLE AVOIDANCE ROBOT

## Project Goal

Build a mobile robot that:

```text
MOVES FORWARD
        ↓
READS LIDAR DATA
        ↓
CHECKS THE FRONT FIELD OF VIEW
        ↓
DETECTS OBSTACLES
        ↓
STOPS OR CHANGES DIRECTION
        ↓
CONTINUES SAFELY
```

The robot should use 360-degree LiDAR data while initially focusing on a configurable front region.

For example:

```text
360° LiDAR
      ↓
Select Front FOV
      ↓
Example: Front ±15°
      ↓
Analyze Distance
      ↓
Obstacle?
   /       \
 YES       NO
  ↓         ↓
TURN      MOVE
```

The initial requirement may use a front 30-degree field of view.

The course must clearly define whether:

```text
30° TOTAL FOV
```

means:

```text
-15° TO +15°
```

or whether the configuration represents another interpretation.

This must be parameterized rather than hardcoded.

---

## Core Concepts

* ROS 2 nodes
* Publishers
* Subscribers
* LiDAR
* `sensor_msgs/msg/LaserScan`
* `geometry_msgs/msg/Twist`
* `cmd_vel`
* Robot movement
* Obstacle detection
* Field-of-view filtering
* Autonomous decision making
* RViz visualization

---

# PROJECT 2 — VISUAL OBJECT TRACKING ROBOT

## Project Goal

Build a robot that:

```text
CAMERA INPUT
        ↓
IMAGE PROCESSING
        ↓
OBJECT DETECTION
        ↓
OBJECT POSITION
        ↓
MOVEMENT DECISION
        ↓
MOTOR CONTROL
```

The initial project can track:

* A colored object
* A colored ball
* A person, depending on the selected implementation

The initial implementation should prioritize a colored-object tracking system because it provides a controlled and understandable first vision project.

Advanced versions may introduce:

* Person tracking
* Object detection models
* AI vision models

---

## Core Concepts

* Cameras
* ROS 2 image topics
* OpenCV
* `cv_bridge`
* Image processing
* HSV color space
* Object detection
* Object position
* Image center
* Robot steering
* Motor control
* `cmd_vel`

---

# PROJECT 3 — ROBOT MAPPING USING SLAM

## Project Goal

Build a robot that can create a map of an unknown environment.

The system should follow:

```text
UNKNOWN ENVIRONMENT
        ↓
SENSOR DATA
        ↓
ROBOT MOTION
        ↓
SLAM
        ↓
REAL-TIME MAP
        ↓
SAVE MAP
        ↓
REUSE MAP
```

---

## Features

* LiDAR or depth sensor
* SLAM algorithm
* Real-time map
* RViz visualization
* Robot movement
* Map saving
* Map reuse

---

## Core Concepts

* SLAM
* Occupancy grids
* Sensor topics
* TF transforms
* Coordinate frames
* RViz
* Mapping
* Localization fundamentals
* ROS 2 launch systems

---

# PROJECT 4 — AUTONOMOUS NAVIGATION ROBOT

## Project Goal

Build a robot that can navigate autonomously from one location to another.

The robot should:

```text
LOAD MAP
        ↓
KNOW CURRENT LOCATION
        ↓
RECEIVE NAVIGATION GOAL
        ↓
CREATE PATH
        ↓
AVOID OBSTACLES
        ↓
CONTROL ROBOT
        ↓
REACH DESTINATION
```

---

## Features

* Pre-built map
* Navigation goals
* Localization
* Path planning
* Costmaps
* Obstacle avoidance
* Autonomous movement

---

## Core Concepts

* Nav2
* Localization
* AMCL or relevant localization system
* Global planning
* Local planning
* Costmaps
* Recovery behaviors
* Navigation actions
* ROS 2 lifecycle nodes

---

# 5. COURSE PHILOSOPHY

Every project must follow:

```text
UNDERSTAND
        ↓
PREPARE
        ↓
BUILD
        ↓
RUN
        ↓
OBSERVE
        ↓
DEBUG
        ↓
TEST
        ↓
IMPROVE
        ↓
DEPLOY
```

Do not begin with code.

Do not begin with:

```text
"Run this command."
```

Start with:

```text
"What are we building?"
```

Then explain:

```text
WHY
        ↓
SYSTEM ARCHITECTURE
        ↓
DATA FLOW
        ↓
ROS 2 COMPONENTS
        ↓
IMPLEMENTATION
        ↓
EXECUTION
```

---

# 6. PROJECT LEARNING TEMPLATE

Every robotics project must follow a standardized learning structure.

---

## SECTION 1 — PROJECT OVERVIEW

Begin with:

### What Are We Building?

Explain:

* Project purpose
* Real-world application
* Expected robot behavior
* Final outcome

Include:

```text
PROJECT OBJECTIVE
```

```text
REAL-WORLD APPLICATION
```

```text
WHAT THE ROBOT WILL DO
```

```text
WHAT THE STUDENT WILL BUILD
```

Use:

* Real robot images
* Project architecture images
* Final demonstration videos
* Animated flow diagrams

---

# 7. PROJECT SUCCESS CRITERIA

Every project must define measurable success criteria.

Example:

```text
Obstacle Avoidance Project

SUCCESS CRITERIA:

✓ Robot receives LiDAR data.

✓ ROS 2 LaserScan topic is active.

✓ Front obstacle is detected.

✓ Robot stops within the configured distance.

✓ Robot selects a safe direction.

✓ Robot publishes movement commands.

✓ Robot avoids collision.

✓ Behavior can be visualized and debugged.
```

Do not use vague success criteria.

Define observable results.

---

# 8. PREREQUISITES

Every project must explicitly define:

## Knowledge Requirements

Example:

* Basic ROS 2
* Nodes
* Topics
* Publishers and subscribers
* Linux terminal
* Basic Python or C++

## Hardware Requirements

Example:

* Mobile robot
* LiDAR
* Camera
* Computer
* Motor controller
* Battery

## Software Requirements

Example:

* Ubuntu
* ROS 2 Jazzy
* RViz
* OpenCV
* Required ROS packages

---

# 9. LAB SAFETY CHECK

Before physical robot execution, include a mandatory:

# LAB SAFETY CHECK

Example:

```text
✓ Robot is placed safely.

✓ Wheels are clear of cables.

✓ Emergency stop is available.

✓ Robot speed is limited.

✓ Sensor cables are secure.

✓ Battery level is sufficient.

✓ Workspace is clear.

✓ Another person can intervene if necessary.
```

For every physical project, define:

* Safety risks
* Initial safe speed
* Emergency stop procedure
* Test environment
* Cable hazards
* Robot lifting procedure

---

# 10. PROJECT ARCHITECTURE

Every project must include a complete architecture diagram.

Example:

```text
RPLIDAR
    │
    │ /scan
    ▼
Obstacle Detection Node
    │
    │ Decision
    ▼
Motion Controller Node
    │
    │ /cmd_vel
    ▼
Robot Base Controller
    │
    ▼
Motors
```

For every component explain:

```text
WHAT IT DOES
```

```text
INPUTS
```

```text
OUTPUTS
```

```text
ROS 2 TOPICS
```

```text
MESSAGE TYPES
```

---

# 11. DATA FLOW DESIGN

Every project must have a dedicated:

# HOW DATA MOVES THROUGH THE ROBOT

section.

Example:

```text
PHYSICAL ENVIRONMENT
        ↓
LIDAR
        ↓
LaserScan
        ↓
ROS 2 Topic
        ↓
Decision Node
        ↓
Twist Command
        ↓
Robot Controller
        ↓
Motors
        ↓
ROBOT MOTION
```

The student must understand the entire system.

Do not treat ROS nodes as black boxes.

---

# 12. PROJECT IMPLEMENTATION STRATEGY

For every project, provide three possible implementation paths where appropriate.

---

## PATH A — RUN A READY-MADE PROJECT

Use a verified existing repository.

Teach:

1. Find the repository.
2. Understand what it contains.
3. Clone it.
4. Install dependencies.
5. Build the workspace.
6. Run it.
7. Understand the system.

---

## PATH B — BUILD THE PROJECT STEP BY STEP

Teach:

1. Create a workspace.
2. Create packages.
3. Create nodes.
4. Write code.
5. Build.
6. Run.
7. Test.
8. Debug.

This is the primary educational path.

---

## PATH C — MODIFY AN EXISTING PROJECT

Teach:

1. Start with working code.
2. Understand the architecture.
3. Change parameters.
4. Modify logic.
5. Add features.
6. Test behavior.

This teaches students how real robotics engineers work.

---

# 13. REPOSITORY RESEARCH REQUIREMENT

When recommending an existing GitHub repository:

Research and evaluate:

```text
MAINTAINED?
```

```text
ROS 2 JAZZY COMPATIBLE?
```

```text
UBUNTU COMPATIBLE?
```

```text
DOCUMENTED?
```

```text
REPRODUCIBLE?
```

```text
HARDWARE COMPATIBLE?
```

```text
ACTIVELY MAINTAINED?
```

Prefer:

```text
OFFICIAL REPOSITORIES
        ↓
MAINTAINED PROJECTS
        ↓
HIGH-QUALITY COMMUNITY PROJECTS
```

Do not recommend a repository merely because it appears in a search result.

---

# 14. WORKSPACE SETUP

Every project must teach the ROS 2 workspace from the beginning.

Example:

```text
robot_projects_ws/
│
├── src/
│   ├── project_package/
│   └── dependencies/
│
├── build/
├── install/
└── log/
```

Teach:

```bash
mkdir -p ~/robot_projects_ws/src
cd ~/robot_projects_ws/src
```

Then explain:

> Why does this workspace exist?

Teach:

```bash
colcon build
```

Explain:

* What is being built
* Where build artifacts go
* Where installed packages go
* Why sourcing matters

Then:

```bash
source install/setup.bash
```

Do not teach workspace commands as memorization.

---

# 15. REPOSITORY INSTALLATION

For projects using external packages:

Teach the complete workflow:

```text
RESEARCH PACKAGE
        ↓
CHECK COMPATIBILITY
        ↓
CLONE
        ↓
INSTALL DEPENDENCIES
        ↓
BUILD
        ↓
SOURCE
        ↓
RUN
        ↓
VERIFY
```

Every command must include:

```text
WHAT THIS COMMAND DOES
```

```text
WHAT SUCCESS LOOKS LIKE
```

```text
WHAT TO DO IF IT FAILS
```

---

# 16. BUILD YOUR OWN IMPLEMENTATION

For custom project implementations, use incremental development.

Example:

```text
STEP 1
Create package

STEP 2
Create minimal node

STEP 3
Verify node runs

STEP 4
Subscribe to sensor

STEP 5
Print sensor data

STEP 6
Add decision logic

STEP 7
Publish control commands

STEP 8
Test safely

STEP 9
Improve behavior
```

Never give the entire complex codebase first.

Build confidence incrementally.

---

# 17. CODE EXPLANATION STANDARD

Every important code section must explain:

```text
WHAT IS THIS CODE DOING?
```

```text
WHY IS IT REQUIRED?
```

```text
WHAT DATA DOES IT RECEIVE?
```

```text
WHAT DATA DOES IT PRODUCE?
```

```text
WHAT HAPPENS IF IT FAILS?
```

Do not explain every line unnecessarily.

Focus on system understanding.

---

# 18. EXECUTION WORKFLOW

Every project must include a:

# HOW TO RUN THE PROJECT

section.

Example:

```text
TERMINAL 1
Start hardware driver
```

```text
TERMINAL 2
Start robot base
```

```text
TERMINAL 3
Start project application
```

```text
TERMINAL 4
Open RViz
```

The course should also explain:

```text
WHY EACH TERMINAL EXISTS
```

and:

```text
WHAT SHOULD APPEAR?
```

Eventually, demonstrate how to combine the system using launch files.

---

# 19. EXPECTED RESULTS

After every major execution step, show:

# WHAT SHOULD I EXPECT?

Examples:

```text
Expected:

✓ Node appears in ros2 node list.

✓ /scan topic is active.

✓ LaserScan messages are published.

✓ RViz shows sensor data.

✓ Robot remains stationary until logic is activated.
```

The learner should never wonder:

> "Did this actually work?"

---

# 20. VERIFICATION CHECKPOINTS

Every project must contain checkpoints.

Example:

## CHECKPOINT 1 — HARDWARE

```text
Is the hardware detected?
```

## CHECKPOINT 2 — ROS 2

```text
Is the driver running?
```

## CHECKPOINT 3 — DATA

```text
Is sensor data available?
```

## CHECKPOINT 4 — ALGORITHM

```text
Is the algorithm making the correct decision?
```

## CHECKPOINT 5 — CONTROL

```text
Is the robot receiving movement commands?
```

## CHECKPOINT 6 — PHYSICAL ROBOT

```text
Does the robot behave correctly?
```

---

# 21. PROJECT 1 — AUTONOMOUS OBSTACLE AVOIDANCE ROBOT

## Objective

Build a robot that autonomously avoids obstacles using LiDAR.

---

## High-Level Architecture

```text
                360° LIDAR
                    │
                    ▼
             /scan LaserScan
                    │
                    ▼
        ┌──────────────────────┐
        │ Obstacle Detection   │
        │        Node          │
        └──────────────────────┘
                    │
                    ▼
          Front FOV Filtering
                    │
                    ▼
          Distance Evaluation
                    │
          ┌─────────┴─────────┐
          │                   │
          ▼                   ▼
      OBSTACLE              CLEAR
          │                   │
          ▼                   ▼
        TURN                FORWARD
          │                   │
          └─────────┬─────────┘
                    ▼
                 /cmd_vel
                    │
                    ▼
              Robot Base
```

---

## Learning Objectives

Students must learn:

* How to read LiDAR data
* How to inspect `LaserScan`
* How to filter a front field of view
* How to detect obstacles
* How to compare left and right clearance
* How to decide turning direction
* How to publish velocity commands
* How to test safely

---

## Step-by-Step Implementation

### STEP 1

Understand the robot and sensor.

### STEP 2

Verify the LiDAR.

### STEP 3

Inspect `/scan`.

### STEP 4

Understand `LaserScan`.

Explain:

* `angle_min`
* `angle_max`
* `angle_increment`
* `ranges`

### STEP 5

Select the front FOV.

Make this configurable:

```text
front_fov_degrees
```

Example:

```text
30 degrees
```

---

### STEP 6

Find the nearest obstacle.

### STEP 7

Define safe distance.

Example parameter:

```text
obstacle_distance
```

---

### STEP 8

Compare left and right.

Example logic:

```text
IF FRONT IS BLOCKED:

    CHECK LEFT CLEARANCE
    CHECK RIGHT CLEARANCE

    IF LEFT IS CLEARER:
        TURN LEFT

    ELSE:
        TURN RIGHT
```

---

### STEP 9

Publish `/cmd_vel`.

### STEP 10

Test with the robot lifted.

### STEP 11

Test at low speed.

### STEP 12

Test on the laboratory floor.

---

## Advanced Challenges

* Dynamic FOV
* Different speed zones
* Smooth turning
* Detect narrow passages
* Avoid oscillation
* Add emergency stop
* Add visualization markers

---

# 22. PROJECT 2 — VISUAL OBJECT TRACKING ROBOT

## Objective

Build a robot that visually detects and tracks an object.

---

## System Architecture

```text
CAMERA
   │
   ▼
/camera/image
   │
   ▼
Image Processing Node
   │
   ▼
OpenCV
   │
   ▼
Object Detection
   │
   ▼
Object Position
   │
   ▼
Movement Decision
   │
   ▼
/cmd_vel
   │
   ▼
ROBOT
```

---

## Learning Objectives

Students must understand:

* ROS 2 image topics
* OpenCV integration
* `cv_bridge`
* Image conversion
* HSV color space
* Object masking
* Contours
* Object center
* Image center
* Steering logic
* Motor control

---

## Step-by-Step Project Flow

### STEP 1

Verify the camera.

### STEP 2

Inspect image topics.

### STEP 3

Visualize camera data.

### STEP 4

Receive images inside a ROS 2 node.

### STEP 5

Convert ROS images to OpenCV format.

### STEP 6

Convert image to HSV.

### STEP 7

Create a color mask.

### STEP 8

Detect object contours.

### STEP 9

Calculate object center.

### STEP 10

Compare object center with image center.

```text
OBJECT LEFT
      ↓
TURN LEFT

OBJECT CENTER
      ↓
MOVE FORWARD

OBJECT RIGHT
      ↓
TURN RIGHT
```

### STEP 11

Publish robot commands.

### STEP 12

Test at low speed.

---

## Advanced Challenges

* Multiple colors
* Person tracking
* Object distance estimation
* Depth camera integration
* AI object detection
* Lost-object behavior

---

# 23. PROJECT 3 — ROBOT MAPPING USING SLAM

## Objective

Create a map of an unknown environment.

---

## System Architecture

```text
ENVIRONMENT
     │
     ▼
LIDAR
     │
     ▼
/scan
     │
     ▼
TF SYSTEM
     │
     ▼
SLAM NODE
     │
     ▼
OCCUPANCY GRID
     │
     ▼
RViz
     │
     ▼
SAVE MAP
```

---

## Learning Objectives

Students must understand:

* SLAM
* Sensor data
* Robot motion
* TF
* Coordinate frames
* Mapping
* Occupancy grids
* RViz
* Map saving

---

## Project Implementation

### STEP 1

Understand the required TF tree.

Example:

```text
map
 │
 └── odom
       │
       └── base_link
              │
              └── laser
```

Explain every coordinate frame.

---

### STEP 2

Verify LiDAR.

### STEP 3

Verify robot movement.

### STEP 4

Verify TF.

### STEP 5

Launch SLAM.

### STEP 6

Visualize the map.

### STEP 7

Drive the robot carefully.

### STEP 8

Observe the map.

### STEP 9

Complete coverage.

### STEP 10

Save the map.

### STEP 11

Reload the map.

---

## Mapping Test Scenarios

* Small room
* Corridor
* Obstacles
* Open area

---

## Advanced Challenges

* Compare map quality
* Improve sensor placement
* Improve driving strategy
* Identify mapping failures
* Compare LiDAR and depth-based mapping

---

# 24. PROJECT 4 — AUTONOMOUS NAVIGATION ROBOT

## Objective

Make the robot autonomously navigate to a specified goal.

---

## System Architecture

```text
MAP
 │
 ▼
LOCALIZATION
 │
 ▼
ROBOT POSITION
 │
 ├──────────────────────┐
 │                      │
 ▼                      ▼
NAVIGATION GOAL      SENSOR DATA
 │                      │
 └──────────┬───────────┘
            ▼
           NAV2
            │
            ▼
      PATH PLANNING
            │
            ▼
      MOTION COMMAND
            │
            ▼
           ROBOT
```

---

## Learning Objectives

Students must understand:

* Navigation stack
* Nav2
* Maps
* Localization
* AMCL
* Costmaps
* Global planning
* Local planning
* Navigation goals
* Obstacle avoidance
* Recovery behaviors

---

## Step-by-Step Implementation

### STEP 1

Prepare the robot.

### STEP 2

Load the map.

### STEP 3

Verify sensor data.

### STEP 4

Verify TF.

### STEP 5

Start localization.

### STEP 6

Set initial pose.

### STEP 7

Launch Nav2.

### STEP 8

Understand Nav2 architecture.

### STEP 9

Set navigation goal.

### STEP 10

Observe global path.

### STEP 11

Observe local planning.

### STEP 12

Test obstacle avoidance.

### STEP 13

Test recovery behavior.

---

## Advanced Challenges

* Multiple goals
* Waypoints
* Autonomous patrol
* Dynamic obstacles
* Different planners
* Costmap tuning
* Navigation performance tuning

---

# 25. PHYSICAL ROBOT TESTING STANDARD

Every project must be tested progressively.

Use this sequence:

```text
LEVEL 1
CODE ONLY
```

```text
LEVEL 2
SIMULATION
```

```text
LEVEL 3
HARDWARE TEST
```

```text
LEVEL 4
ROBOT LIFTED TEST
```

```text
LEVEL 5
LOW-SPEED FLOOR TEST
```

```text
LEVEL 6
FULL PROJECT TEST
```

Never move directly from untested code to high-speed robot operation.

---

# 26. PROJECT DEBUGGING STRATEGY

Every project must include a debugging pipeline.

```text
HARDWARE
   ↓
OPERATING SYSTEM
   ↓
ROS 2 DRIVER
   ↓
ROS 2 NODE
   ↓
TOPIC
   ↓
MESSAGE DATA
   ↓
ALGORITHM
   ↓
CONTROL COMMAND
   ↓
ROBOT BEHAVIOR
```

For every debugging problem, teach:

```text
OBSERVE
```

```text
HYPOTHESIZE
```

```text
INSPECT
```

```text
ISOLATE
```

```text
FIX
```

```text
VERIFY
```

---

# 27. COMMON PROJECT TROUBLESHOOTING

Every project should include a troubleshooting table.

Example:

| Problem                 | Possible Cause           | How to Diagnose            | How to Fix        |
| ----------------------- | ------------------------ | -------------------------- | ----------------- |
| No `/scan`              | Driver not running       | `ros2 topic list`          | Start driver      |
| No robot movement       | No `/cmd_vel`            | `ros2 topic echo /cmd_vel` | Inspect publisher |
| Robot moves incorrectly | Incorrect frame or logic | Inspect data flow          | Correct logic     |
| Robot oscillates        | Control logic unstable   | Observe decision behavior  | Add hysteresis    |

---

# 28. PROJECT FLOW VISUALIZATION

Every project should have a visual flow.

Example:

```text
SETUP
  ↓
VERIFY HARDWARE
  ↓
VERIFY ROS 2
  ↓
BUILD PROJECT
  ↓
RUN PROJECT
  ↓
OBSERVE DATA
  ↓
TEST LOGIC
  ↓
TEST ROBOT
  ↓
DEBUG
  ↓
IMPROVE
  ↓
COMPLETE
```

This flow should be visually represented inside the LMS.

---

# 29. VISUAL ASSET STRATEGY

Every project should include:

* Project hero image
* Final robot demonstration
* System architecture diagram
* Data flow diagram
* ROS 2 graph
* Sensor visualization
* Hardware connection diagram
* Expected RViz screenshots
* Code architecture diagrams
* Debugging flowcharts

Visual content must support learning.

Do not use decorative visuals without educational value.

---

# 30. VIDEO STRATEGY

Every project should include:

## 1. PROJECT OVERVIEW VIDEO

Show the final working robot.

## 2. CONCEPT VIDEO

Explain the robotics concept.

## 3. SETUP VIDEO

Show physical setup.

## 4. IMPLEMENTATION VIDEO

Show coding and package structure.

## 5. EXECUTION VIDEO

Show how to run the system.

## 6. DEBUGGING VIDEO

Show realistic failures.

## 7. FINAL DEMONSTRATION

Show the complete project.

External videos must be researched and verified before inclusion.

---

# 31. QUIZ STRATEGY

Every project should include:

## PROJECT UNDERSTANDING QUIZ

Test system architecture.

## CONCEPT QUIZ

Test technical knowledge.

## DATA FLOW QUIZ

Test understanding of how information moves.

## DEBUGGING QUIZ

Present failures.

Example:

```text
The LiDAR publishes data,
but the robot does not move.

Which part of the system should you inspect next?
```

The answer must include explanation.

---

# 32. PRACTICAL ASSESSMENT

Every project should end with:

# CAN YOU BUILD IT YOURSELF?

Example:

```text
CHALLENGE:

Build the obstacle avoidance robot
without following the complete tutorial.

Requirements:

✓ Create your workspace.

✓ Create your package.

✓ Subscribe to LiDAR.

✓ Select front FOV.

✓ Detect obstacles.

✓ Decide direction.

✓ Publish cmd_vel.

✓ Test safely.
```

This converts guided learning into independent engineering ability.

---

# 33. PROJECT DIFFICULTY PROGRESSION

The projects should build upon each other.

```text
PROJECT 1
OBSTACLE AVOIDANCE
        ↓
SENSOR → DECISION → ACTION
```

```text
PROJECT 2
OBJECT TRACKING
        ↓
VISION → PROCESSING → DECISION → ACTION
```

```text
PROJECT 3
SLAM
        ↓
SENSOR → TF → ALGORITHM → MAP
```

```text
PROJECT 4
NAVIGATION
        ↓
MAP → LOCALIZATION → PLANNING → AUTONOMY
```

The learner should progressively move from:

```text
SIMPLE REACTIVE ROBOT
        ↓
PERCEPTION-BASED ROBOT
        ↓
MAPPING ROBOT
        ↓
AUTONOMOUS ROBOT
```

---

# 34. FINAL COURSE LEARNING JOURNEY

```text
ROS 2 CONCEPTS
        ↓
HARDWARE VERIFICATION
        ↓
SENSOR DATA
        ↓
PROJECT 1
Reactive Behavior
        ↓
PROJECT 2
Visual Perception
        ↓
PROJECT 3
Environment Mapping
        ↓
PROJECT 4
Autonomous Navigation
        ↓
AUTONOMOUS MOBILE ROBOT ENGINEERING
```

---

# 35. COURSE DEVELOPMENT WORKFLOW

Do not generate every detailed project immediately.

Work in phases.

---

## PHASE 1 — LAB AND ROBOT RESEARCH

Research:

* Available robot hardware
* Robot model
* Base controller
* LiDAR
* Camera
* Available ROS 2 drivers
* Ubuntu version
* ROS 2 Jazzy compatibility
* TF frames
* Existing packages
* Safety limitations

---

## PHASE 2 — PROJECT ARCHITECTURE

Design:

* Complete project progression
* Project dependencies
* Shared robot infrastructure
* Software architecture
* Hardware architecture

---

## PHASE 3 — REPOSITORY AND PACKAGE RESEARCH

For every project:

* Research official packages
* Research maintained repositories
* Verify ROS 2 Jazzy support
* Identify reusable components
* Identify custom components

---

## PHASE 4 — DETAILED PROJECT DESIGN

For each project define:

* Objective
* Hardware
* Software
* Architecture
* Data flow
* Topics
* Nodes
* Packages
* Workspace
* Implementation path
* Testing
* Debugging

---

## PHASE 5 — LMS CONTENT DESIGN

Create:

* Theory
* Images
* Diagrams
* Videos
* Commands
* Code
* Exercises
* Quizzes
* Troubleshooting

---

## PHASE 6 — PHYSICAL ROBOT VALIDATION

Before considering a project complete:

```text
BUILD
```

```text
RUN
```

```text
TEST
```

```text
OBSERVE
```

```text
DEBUG
```

```text
REPEAT
```

The course must distinguish clearly between:

```text
THEORETICALLY DESIGNED
```

and:

```text
PHYSICALLY VALIDATED
```

Never claim a physical procedure has been validated unless it actually has.

---

# 36. QUALITY GATE

Before implementing any project inside the LMS, verify:

## Technical

* ROS 2 Jazzy compatible?
* Ubuntu compatible?
* Hardware compatible?
* Dependencies identified?
* Topics verified?

## Educational

* Clear objective?
* Beginner-accessible?
* Incremental implementation?
* Practical exercises included?

## Execution

* Workspace setup explained?
* Commands explained?
* Expected results shown?
* Failures addressed?

## Robot

* Safety process defined?
* Low-speed testing available?
* Physical validation plan included?

---

# 37. NON-NEGOTIABLE RULES

Never:

* Start with code before explaining the project.
* Assume hardware is already working.
* Skip workspace setup.
* Recommend unverified repositories.
* Mix incompatible ROS versions.
* Hide important dependencies.
* Provide commands without expected output.
* Skip testing stages.
* Skip debugging.
* Send untested code directly to a moving robot.
* Treat simulation success as proof of physical robot success.

Always:

* Define the project objective.
* Show the system architecture.
* Explain data flow.
* Verify hardware first.
* Build incrementally.
* Define expected results.
* Add checkpoints.
* Teach debugging.
* Test safely.
* Separate simulation from physical validation.
* Build independent engineering skills.

---

# 38. FINAL COURSE QUALITY STANDARD

The course must deliver:

```text
PROJECT IDEA
        +
SYSTEM UNDERSTANDING
        +
HARDWARE SETUP
        +
ROS 2 WORKSPACE
        +
PACKAGE MANAGEMENT
        +
IMPLEMENTATION
        +
EXECUTION
        +
OBSERVATION
        +
DEBUGGING
        +
PHYSICAL ROBOT TESTING
```

The learner should finish every project able to say:

```text
I KNOW WHAT THIS ROBOTIC SYSTEM DOES.
```

```text
I UNDERSTAND THE ARCHITECTURE.
```

```text
I CAN SET UP THE WORKSPACE.
```

```text
I CAN INSTALL THE REQUIRED PACKAGES.
```

```text
I CAN BUILD THE SOFTWARE.
```

```text
I CAN RUN THE SYSTEM.
```

```text
I CAN VERIFY THE DATA.
```

```text
I CAN DEBUG FAILURES.
```

```text
I CAN TEST IT SAFELY ON A REAL ROBOT.
```

---

# FINAL PRINCIPLE

Do not create a course where students simply watch robots working.

Create a course where students become capable of building working robots themselves.

The course must transform:

```text
ROBOTICS KNOWLEDGE
```

into:

```text
ROBOTICS ENGINEERING ABILITY
```

Every project should follow:

```text
SEE IT
```

```text
UNDERSTAND IT
```

```text
BUILD IT
```

```text
RUN IT
```

```text
BREAK IT
```

```text
DEBUG IT
```

```text
IMPROVE IT
```

```text
DEMONSTRATE IT
```

Build the practical robotics course that gives learners the confidence to walk into a robotics laboratory, connect to a real robot, and start building.

---

# CURRENT DEVELOPMENT COMMAND

Start with:

```text
PHASE 1 — LAB, ROBOT AND PROJECT ARCHITECTURE
```

The first output must contain only:

1. Executive Course Strategy
2. ROS 2 Jazzy Environment Strategy
3. Physical Robot and Lab Assumptions
4. Project Dependency and Learning Progression
5. Complete Architecture for All Four Projects
6. Shared ROS 2 Infrastructure
7. Hardware and Software Requirement Matrix
8. Repository and Package Research Strategy
9. Physical Robot Testing Strategy
10. Safety and Validation Strategy
11. High-Level Curriculum
12. Project Implementation Model
13. Visual Asset Strategy
14. Video Strategy
15. Quiz and Assessment Strategy
16. Key Technical and Architecture Decisions

Do not start detailed project implementation until the high-level project architecture has been reviewed and approved.
