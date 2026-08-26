````md
# ROS2_COURSE_DESIGN.md

# ROS 2 FUNDAMENTALS COURSE — MASTER COURSE DESIGN INSTRUCTIONS

## PURPOSE

This file contains the permanent course-design instructions for building the **ROS 2 Fundamentals** course inside this Learning Management System.

Claude must follow these instructions when:

- Designing the course curriculum
- Researching ROS 2 learning resources
- Designing modules and lessons
- Creating theory content
- Designing practical exercises
- Creating quizzes
- Recommending videos
- Designing diagrams and visual assets
- Building course content inside the LMS
- Reviewing the educational quality of the course

This course is a production-quality educational product.

Do not treat it as a simple collection of ROS 2 documentation or tutorials.

---

# 1. YOUR ROLE

Act as a:

- Top 1% Principal Robotics Course Designer
- Senior ROS 2 Educator
- Robotics Software Architect
- Instructional Designer
- Hands-On Learning Experience Designer
- Technical Curriculum Architect
- Senior Robotics Engineer

Your responsibility is not merely to generate content.

You must design a complete learning experience.

Think like someone responsible for creating one of the best beginner-to-intermediate ROS 2 courses available online.

Every decision should optimize for:

```text
LEARNING EFFECTIVENESS
        +
TECHNICAL ACCURACY
        +
BEGINNER ACCESSIBILITY
        +
PRACTICAL EXPERIENCE
        +
VISUAL UNDERSTANDING
        +
REAL-WORLD RELEVANCE
````

---

# 2. COURSE IDENTITY

## Working Title

**ROS 2 Fundamentals: From First Principles to Building Your First Robotic System**

You may propose a stronger course title if it provides a clearer or more compelling value proposition.

---

## Course Goal

Take a learner from:

```text
"I have heard about ROS 2"
```

to:

```text
"I understand how ROS 2 systems are structured,
how components communicate,
how to build ROS 2 applications,
and how to debug and inspect a robotics system."
```

The course should build confidence and practical ability.

---

# 3. TARGET AUDIENCE

The course should primarily target:

* Absolute beginners to ROS 2
* Robotics enthusiasts
* Engineering students
* Software developers entering robotics
* Python developers interested in robotics
* C++ developers entering robotics
* Beginners with basic Linux familiarity
* Learners with basic programming knowledge

Do not assume previous ROS 2 knowledge.

---

# 4. COURSE LEARNING OUTCOMES

By completing the course, learners should be able to:

1. Explain what ROS 2 is.
2. Explain why ROS 2 is needed.
3. Understand the challenges of robotics software.
4. Explain the high-level differences between ROS 1 and ROS 2.
5. Understand the ROS 2 ecosystem.
6. Install and configure ROS 2.
7. Create and manage ROS 2 workspaces.
8. Create ROS 2 packages.
9. Understand the ROS 2 computation graph.
10. Understand ROS 2 nodes.
11. Create and run ROS 2 nodes.
12. Understand topics.
13. Create publishers and subscribers.
14. Understand ROS 2 services.
15. Create service clients and servers.
16. Understand ROS 2 actions.
17. Understand action clients and servers.
18. Understand parameters.
19. Understand ROS 2 messages and interfaces.
20. Use ROS 2 command-line tools.
21. Understand ROS 2 packages and dependencies.
22. Use `colcon`.
23. Use launch files.
24. Understand lifecycle nodes.
25. Use RQt tools.
26. Use `rqt_graph`.
27. Inspect and debug ROS 2 systems.
28. Understand ROS 2 logging fundamentals.
29. Understand ROS 2 simulation fundamentals.
30. Get started with Gazebo.
31. Build and run a complete multi-node ROS 2 application.
32. Debug common ROS 2 problems independently.

---

# 5. COURSE PHILOSOPHY

The course must follow this learning sequence:

```text
WHY
  ↓
WHAT
  ↓
HOW
  ↓
SEE IT
  ↓
DO IT
  ↓
BREAK IT
  ↓
FIX IT
  ↓
REFLECT
  ↓
RECAP
```

Do not teach ROS 2 as a collection of commands to memorize.

For every important concept, answer:

1. What problem does this solve?
2. Why do we need it?
3. How does it work conceptually?
4. What happens inside the system?
5. How is it used in practice?
6. What happens when it is used incorrectly?
7. How does it connect to the larger ROS 2 system?

---

# 6. CORE INSTRUCTIONAL MODEL

Every major lesson should follow this structure where appropriate:

```text
1. REAL-WORLD PROBLEM
        ↓
2. INTUITIVE EXPLANATION
        ↓
3. VISUALIZATION
        ↓
4. ROS 2 CONCEPT
        ↓
5. LIVE DEMONSTRATION
        ↓
6. HANDS-ON PRACTICE
        ↓
7. KNOWLEDGE CHECK
        ↓
8. DEBUGGING SCENARIO
        ↓
9. RECAP
        ↓
10. CONNECTION TO THE NEXT CONCEPT
```

Do not force every lesson into exactly the same structure.

Adapt the learning experience to the concept.

However, avoid long theory-only sections.

---

# 7. COURSE VERSION STRATEGY

ROS 2 changes over time.

Before creating technical instructions:

1. Identify the primary ROS 2 distribution.
2. Identify the target Ubuntu version.
3. Identify the target Gazebo integration.
4. Identify version-specific commands.
5. Separate version-independent concepts from version-specific instructions.

Maintain a:

# COURSE VERSION MATRIX

```text
Primary ROS 2 Distribution:
Ubuntu Version:
Gazebo Version:
Python Version:
C++ Standard:
Primary Development Language:
```

Never accidentally mix instructions from different ROS 2 distributions.

If content is version-dependent, explicitly label it.

---

# 8. COURSE RESEARCH REQUIREMENT

Before finalizing the curriculum, research and evaluate:

* Official ROS 2 documentation
* Official ROS 2 tutorials
* Current ROS 2 distributions
* High-quality ROS 2 courses
* Udemy ROS 2 courses
* University robotics courses
* Robotics training platforms
* High-quality YouTube educators
* Current Gazebo learning resources

Research must evaluate:

```text
WHAT EXISTING COURSES DO WELL
        +
WHAT THEY DO POORLY
        +
WHERE BEGINNERS STRUGGLE
        +
HOW THIS COURSE CAN IMPROVE THE EXPERIENCE
```

Do not copy another curriculum.

Synthesize the strongest ideas into a superior learning experience.

---

# 9. COURSE MODULE STRUCTURE

The course should contain approximately:

```text
12 to 16 modules
```

Do not force the exact number.

Optimize for learning progression.

The recommended course structure is:

---

## MODULE 0 — COURSE ONBOARDING AND ROADMAP

Teach:

* Welcome
* Course overview
* What learners will build
* Learning roadmap
* Required knowledge
* Required software
* Required hardware
* Computer requirements
* Linux requirements
* Programming requirements
* Python and C++ strategy
* How practical exercises work
* How quizzes work
* How to get help

Include:

* Visual course roadmap
* "What you will build" preview
* Readiness assessment
* Environment checklist

---

## MODULE 1 — WHAT IS ROS 2 AND WHY DO WE NEED IT?

Do not begin with installation.

First create motivation.

Teach:

* What robotics software is
* Why robotics software is complex
* Sensors
* Actuators
* Perception
* Planning
* Control
* Communication
* Distributed robotics systems
* Monolithic software limitations
* Why modular robotics software matters

Then introduce:

* ROS
* ROS 1
* ROS 2
* Why ROS 2 exists
* What problems ROS 2 solves

Use real robot examples.

Example architecture:

```text
Camera Node
     ↓
Perception Node
     ↓
Planning Node
     ↓
Control Node
     ↓
Robot
```

End by answering:

> What problem does ROS 2 solve?

---

## MODULE 2 — ROS 2 ECOSYSTEM AND FUNDAMENTAL ARCHITECTURE

Teach:

* ROS 2 ecosystem
* ROS distributions
* Middleware
* ROS graph
* Nodes
* Communication interfaces
* Packages
* Workspaces
* DDS introduction

Use the conceptual architecture:

```text
ROS 2 Application
      ↓
ROS 2 Client Library
      ↓
ROS Middleware Interface
      ↓
DDS
      ↓
Network
```

Do not overwhelm beginners with DDS internals.

Teach enough to build intuition.

---

## MODULE 3 — ROS 2 INSTALLATION AND ENVIRONMENT SETUP

Cover:

* Supported operating systems
* Ubuntu setup
* ROS 2 installation
* ROS distribution selection
* Environment variables
* Sourcing
* Terminal setup
* Verification
* Troubleshooting

Teach why installation steps matter.

Learners should understand:

* What is being installed
* Where ROS 2 is installed
* Why sourcing is necessary
* Why environment configuration matters

Include checkpoints:

```text
CHECKPOINT 1
Can ROS 2 run?

CHECKPOINT 2
Can the terminal find ROS 2 packages?

CHECKPOINT 3
Can a ROS 2 node run?
```

Include:

* Step-by-step instructions
* Terminal demonstrations
* Common mistakes
* Troubleshooting decision tree

---

## MODULE 4 — YOUR FIRST ROS 2 SYSTEM

Use Turtlesim or another highly effective beginner-friendly environment.

Teach:

* Starting ROS 2 applications
* Running nodes
* Controlling a simulated robot
* Inspecting the system

Introduce:

```bash
ros2 node list
ros2 topic list
ros2 service list
ros2 action list
```

The goal is curiosity.

Learners should begin asking:

> What are nodes, topics, services, and actions?

---

## MODULE 5 — ROS 2 NODES

Teach:

* What a node is
* Why systems are divided into nodes
* Node responsibilities
* Node communication
* Node naming
* Node discovery
* Multiple nodes

Use:

* Real robot examples
* Turtlesim
* Custom Python examples
* C++ comparisons where valuable

Learners should create their first ROS 2 node.

Include:

* Theory
* Diagram
* Live coding
* Guided exercise
* Independent exercise
* Debugging exercise
* Quiz

---

## MODULE 6 — TOPICS, PUBLISHERS, AND SUBSCRIBERS

This must be one of the strongest modules.

Teach:

* Publish/subscribe architecture
* Topics
* Publishers
* Subscribers
* Message types
* Message flow
* Multiple publishers
* Multiple subscribers
* Topic inspection

Use visual diagrams.

Example:

```text
Publisher
    │
    │ /robot/sensor_data
    ▼
   TOPIC
    │
    ├────────────► Subscriber A
    │
    └────────────► Subscriber B
```

Teach:

```bash
ros2 topic list
ros2 topic echo
ros2 topic info
ros2 topic pub
ros2 interface show
```

Learners should create:

* A publisher
* A subscriber
* A multi-node communication system

---

## MODULE 7 — ROS 2 SERVICES

Start with the problem:

> What if a robot needs to request something and wait for a response?

Teach:

* Client
* Server
* Request
* Response
* Service types

Visual model:

```text
Client
  │ Request
  ▼
Service Server
  │
  │ Response
  ▼
Client
```

Teach:

```bash
ros2 service list
ros2 service type
ros2 service call
```

Learners should create:

* Service server
* Service client

Compare:

| Communication | Best Use             |
| ------------- | -------------------- |
| Topic         | Continuous data      |
| Service       | Request and response |
| Action        | Long-running goal    |

---

## MODULE 8 — ROS 2 ACTIONS

Start with a real problem:

> Move to a location while reporting progress and allowing cancellation.

Teach:

* Goals
* Feedback
* Results
* Cancellation
* Action clients
* Action servers

Visual:

```text
Client
   │ Goal
   ▼
Action Server
   │
   ├── Feedback ───► Client
   │
   └── Result ─────► Client
```

The learner must understand:

```text
WHEN TO USE TOPICS
WHEN TO USE SERVICES
WHEN TO USE ACTIONS
```

---

## MODULE 9 — PARAMETERS, MESSAGES, AND INTERFACES

Teach:

* Parameters
* Messages
* Service definitions
* Action definitions
* Standard interfaces
* Custom interfaces

Introduce:

```text
.msg
.srv
.action
```

Teach:

* Interface inspection
* Parameter configuration
* Custom interfaces

---

## MODULE 10 — WORKSPACES, PACKAGES, COLCON, AND DEPENDENCIES

Teach the development workflow.

Cover:

* Workspaces
* `src`
* `build`
* `install`
* `log`
* Packages
* Dependencies
* `colcon build`
* `rosdep`
* Package manifests

Visual:

```text
ROS2_WORKSPACE
│
├── src
│   ├── package_a
│   └── package_b
│
├── build
├── install
└── log
```

Learners must:

1. Create a workspace.
2. Create a package.
3. Build it.
4. Source it.
5. Run a node.

Include common mistakes:

* Forgot to source
* Wrong workspace
* Missing dependency
* Build failure
* Package not found

---

## MODULE 11 — LAUNCH FILES AND MULTI-NODE SYSTEMS

Teach why manually running many nodes does not scale.

Progress from:

```text
Terminal 1 → Node A
Terminal 2 → Node B
Terminal 3 → Node C
```

To:

```text
Launch
   │
   ├── Node A
   ├── Node B
   └── Node C
```

Teach:

* Launch files
* Multiple nodes
* Parameters
* Arguments
* Configuration

Practical task:

Build and launch a multi-node ROS 2 application.

---

## MODULE 12 — LIFECYCLE NODES

Teach:

* Why lifecycle management is useful
* Controlled initialization
* Robot system states
* Lifecycle transitions

Conceptual flow:

```text
Unconfigured
      ↓
Inactive
      ↓
Active
      ↓
Finalized
```

Use practical examples:

* Camera driver
* Sensor initialization
* Robot controller
* Safety-critical systems

---

## MODULE 13 — RQT AND DEVELOPMENT TOOLS

Teach graphical introspection.

Cover:

* RQt
* rqt_graph
* Service tools
* Parameter tools
* Console
* Logging
* System inspection

Include:

* Broken ROS graph challenges
* Debugging scenarios
* System inspection tasks

---

## MODULE 14 — SIMULATION AND GAZEBO

Teach:

* Why simulation matters
* Simulation versus real robots
* Gazebo fundamentals
* Robot models
* Worlds
* Sensors
* ROS 2 integration

Focus on:

> How does a ROS 2 developer interact with a simulated robot?

Learners should:

1. Run a simulation.
2. Inspect ROS nodes.
3. Send commands.
4. Observe sensor data.
5. Control the robot.

---

## MODULE 15 — FINAL CAPSTONE PROJECT

The course should end with a meaningful project.

Possible project:

# Build a Complete ROS 2 Mobile Robot Simulation

The project should integrate:

* Multiple nodes
* Topics
* Publishers
* Subscribers
* Services
* Actions where appropriate
* Parameters
* Launch files
* RQt
* Gazebo

Conceptual architecture:

```text
Robot Controller
        ↓
     Topics
        ↓
Robot Simulation
        ↓
Sensor Data
        ↓
Sensor Processing Node
        ↓
Robot Behavior
```

The learner should:

1. Build the system.
2. Run the system.
3. Inspect the system.
4. Debug the system.
5. Modify the system.

---

# 10. LESSON DESIGN REQUIREMENTS

Every lesson should contain:

## Lesson Metadata

```text
Title
Learning Objective
Estimated Duration
Difficulty
Prerequisites
```

## Hook

Start with:

* Real problem
* Robot scenario
* Question
* Demonstration

Do not begin important lessons with dry definitions.

---

## Theory

Explain:

```text
WHAT
WHY
HOW
```

Use intuition first.

Introduce technical terminology after understanding has been established.

---

## Visual Content

For every important concept, determine whether it requires:

* Diagram
* Architecture visualization
* Infographic
* Animation
* Screenshot
* Flowchart
* Terminal visualization
* Code visualization

Every visual must have a learning purpose.

Do not use decorative images without educational value.

---

## Practical Work

Every major concept should include practical interaction.

Possible formats:

* Guided exercise
* Independent exercise
* Debugging challenge
* System inspection challenge
* Mini project

---

# 11. PRACTICAL EXERCISE MODEL

Use multiple exercise types.

## GUIDED EXERCISE

Learner follows detailed steps.

## INDEPENDENT EXERCISE

Learner receives a goal with fewer instructions.

## DEBUGGING EXERCISE

Provide a broken system.

The learner must:

1. Observe the problem.
2. Investigate.
3. Use ROS 2 tools.
4. Identify the root cause.
5. Fix the problem.

Example:

```text
Problem:
Subscriber receives no messages.

Possible causes:
- Wrong topic name
- Wrong message type
- Publisher not running
- Incorrect namespace
- Incorrect environment
```

Do not immediately reveal the solution.

Teach systematic debugging.

---

# 12. QUIZ DESIGN RULES

Avoid quizzes that only test memorization.

Use:

* Single choice
* Multiple choice
* True/false
* Scenario questions
* Architecture questions
* Debugging questions
* Command selection questions

Every answer should provide:

```text
CORRECT / INCORRECT

WHY?

WHAT CONCEPT SHOULD BE REVIEWED?
```

Example:

> A robot continuously publishes laser scan data.
> Which ROS 2 communication mechanism is most appropriate?

The explanation is more important than simply identifying the correct answer.

---

# 13. SPACED RECAP SYSTEM

Important concepts must return later.

Example:

```text
MODULE 4
Introduction to Nodes

MODULE 6
Nodes + Topics

MODULE 7
Nodes + Services

MODULE 11
Multiple Nodes + Launch

MODULE 13
Inspect Nodes Using RQt

MODULE 15
Integrate Nodes in Final Project
```

Do not teach concepts once and forget them.

The course should progressively reinforce knowledge.

---

# 14. VIDEO STRATEGY

The course may include:

## Original Course Videos

Created specifically for this course.

## Curated External Videos

Selected from high-quality YouTube content.

## Embedded Demonstrations

Short focused demonstrations.

Do not overload learners with long videos.

Preferred pattern:

```text
THEORY
  ↓
SHORT EXPLANATION VIDEO
  ↓
HANDS-ON DEMONSTRATION
  ↓
PRACTICE
  ↓
QUIZ
```

---

# 15. EXTERNAL VIDEO RESEARCH REQUIREMENT

When recommending external YouTube videos:

Research and verify the video.

For every recommendation provide:

```text
VIDEO TITLE:
CREATOR / CHANNEL:
LINK:
APPROXIMATE DURATION:
COURSE MODULE:
LESSON:
ROS 2 VERSION RELEVANCE:
WHY SELECTED:
WHAT THE LEARNER WILL GAIN:
```

Evaluate:

* Technical accuracy
* Beginner friendliness
* Teaching quality
* ROS 2 relevance
* Production quality
* Version relevance

Do not recommend videos simply because they are popular.

Do not recommend multiple videos that duplicate the same learning objective without justification.

---

# 16. VISUAL LEARNING STRATEGY

This course must be visually rich.

Important concepts that should receive dedicated visual treatment:

* ROS 2 architecture
* ROS graph
* Nodes
* Topics
* Publishers
* Subscribers
* Services
* Actions
* Parameters
* Workspaces
* Packages
* Launch systems
* Lifecycle nodes
* DDS overview
* RQt
* Message flow
* Gazebo integration

For every major visual, define:

```text
PURPOSE:
CONCEPT:
VISUAL FORMAT:
WHAT SHOULD BE SHOWN:
WHAT THE LEARNER SHOULD UNDERSTAND:
```

---

# 17. STUDY MATERIALS

Design supporting resources such as:

* Cheat sheets
* Command references
* Architecture diagrams
* Summary notes
* Glossary
* Troubleshooting guides
* Downloadable exercises
* Source code
* Challenge solutions

Create a dedicated:

# ROS 2 COMMAND CHEAT SHEET

Cover:

```bash
ros2 node
ros2 topic
ros2 service
ros2 action
ros2 param
ros2 pkg
ros2 run
ros2 launch
ros2 bag
```

For each command include:

```text
WHAT IT DOES
WHEN TO USE IT
EXAMPLE
COMMON MISTAKES
```

---

# 18. PYTHON AND C++ STRATEGY

Make a deliberate decision.

Do not teach everything twice unless educationally valuable.

Recommended approach:

## PRIMARY TRACK

Use one language as the primary learning path.

Python is recommended for beginner accessibility.

## SECONDARY TRACK

Introduce equivalent C++ examples when they add educational or professional value.

Clearly distinguish:

```text
ROS 2 CONCEPT
        VS
PYTHON IMPLEMENTATION
        VS
C++ IMPLEMENTATION
```

Learners should understand that ROS 2 concepts transfer across languages.

---

# 19. LMS CONTENT BLOCK STRATEGY

The LMS supports:

* TEXT
* IMAGE
* VIDEO
* QUIZ
* EXERCISE
* CODE
* CALLOUT
* FILE
* EMBED

For every lesson, recommend the content block sequence.

Example:

```text
TEXT
↓
IMAGE
↓
VIDEO
↓
TEXT
↓
CODE
↓
EXERCISE
↓
QUIZ
↓
RECAP
```

Do not force identical structures.

Select blocks based on learning needs.

---

# 20. KNOWLEDGE GRAPH

Create and maintain concept dependencies.

Example:

```text
ROS 2 Fundamentals
        ↓
ROS Graph
        ↓
Nodes
        ↓
Topics
   ↙          ↘
Services      Parameters
   ↓
Actions
   ↓
Launch
   ↓
Lifecycle
   ↓
Simulation
   ↓
Final Project
```

Identify:

* Prerequisites
* Concept dependencies
* Difficult transitions
* Common misconceptions

---

# 21. COMMON MISCONCEPTIONS

Identify and address misconceptions.

Example:

## Nodes

Misconception:

> Every ROS 2 application is one node.

Correct understanding:

> Robotics systems usually consist of multiple specialized nodes.

---

## Topics

Misconception:

> Topics work like function calls.

Correct understanding:

> Topics provide asynchronous publish/subscribe communication.

---

## Services

Misconception:

> Services and topics are interchangeable.

Correct understanding:

> Services are generally appropriate for request-response interactions.

---

# 22. COURSE ASSESSMENT STRATEGY

Design:

## PRE-COURSE ASSESSMENT

Measure learner readiness.

## MODULE QUIZZES

Check conceptual understanding.

## PRACTICAL ASSESSMENTS

Validate hands-on ability.

## MID-COURSE ASSESSMENT

Combine multiple concepts.

## FINAL ASSESSMENT

Evaluate overall understanding.

## CAPSTONE PROJECT

Validate practical ability.

---

# 23. REQUIRED COURSE DELIVERABLES

Before generating full lesson content, provide:

## 1. EXECUTIVE COURSE SUMMARY

* Course title
* Target audience
* Skill level
* Prerequisites
* Duration
* Learning outcomes

## 2. BENCHMARK ANALYSIS

Analyze:

* Official ROS 2 resources
* Leading online courses
* High-quality video resources

Identify:

* Strengths
* Weaknesses
* Gaps
* Opportunities

## 3. COURSE LEARNING JOURNEY

Provide the complete progression from beginner to capstone.

## 4. COMPLETE CURRICULUM

For every module provide:

* Title
* Purpose
* Lessons
* Learning objectives
* Estimated duration
* Practical work
* Quiz
* Assessment

## 5. DETAILED LESSON MAP

For every lesson provide:

* Objective
* Concepts
* Content blocks
* Visual requirements
* Video requirements
* Practical exercise
* Quiz
* Recap

## 6. PRACTICAL PROJECT ROADMAP

Show how the final project evolves throughout the course.

## 7. VIDEO RESOURCE RESEARCH

Provide curated and verified recommendations.

## 8. VISUAL ASSET STRATEGY

Identify:

* Images
* Diagrams
* Animations
* Screenshots
* Simulation visuals

## 9. STUDY MATERIALS

List all supporting resources.

## 10. QUIZ AND ASSESSMENT STRATEGY

Include representative examples.

## 11. CAPSTONE DESIGN

Provide:

* Requirements
* Architecture
* Implementation steps
* Evaluation criteria
* Expected outcome

---

# 24. COURSE DEVELOPMENT PROCESS

Do not immediately generate hundreds of lessons.

Work in phases.

---

## PHASE 1 — RESEARCH

Research:

* Current ROS 2 ecosystem
* Official documentation
* Current ROS 2 distributions
* Best available courses
* High-quality videos
* Current Gazebo practices

---

## PHASE 2 — COURSE STRATEGY

Create:

* Target learner profile
* Learning philosophy
* Learning outcomes
* Version strategy
* Teaching strategy

---

## PHASE 3 — CURRICULUM

Create:

* Modules
* Lessons
* Learning objectives
* Practical progression
* Assessment strategy

---

## PHASE 4 — KNOWLEDGE ARCHITECTURE

Design:

* Concept dependency graph
* Prerequisite map
* Spaced repetition strategy
* Misconception strategy

---

## PHASE 5 — MODULE DESIGN

Design the next module in detail.

Include:

* Lessons
* Content blocks
* Theory
* Visuals
* Videos
* Exercises
* Quizzes
* Recap

---

## PHASE 6 — QUALITY REVIEW

Review every module for:

```text
TECHNICAL ACCURACY
        +
LEARNING EFFECTIVENESS
        +
BEGINNER ACCESSIBILITY
        +
PRACTICAL VALUE
        +
VISUAL RICHNESS
        +
VERSION ACCURACY
```

---

## PHASE 7 — LMS IMPLEMENTATION

Only after the module design is approved:

1. Implement the course structure.
2. Create modules.
3. Create lessons.
4. Add content blocks.
5. Add visuals.
6. Add videos.
7. Add exercises.
8. Add quizzes.
9. Validate the learner experience.

---

# 25. QUALITY GATE BEFORE COURSE IMPLEMENTATION

Before implementing a module inside the LMS, verify:

## Curriculum

* Does the lesson belong in this sequence?
* Are prerequisites satisfied?
* Is the progression appropriate?

## Content

* Is the technical content accurate?
* Is it appropriate for the target ROS 2 version?

## Learning

* Is there enough practice?
* Is there enough visual explanation?
* Are misconceptions addressed?

## UX

* Is the content easy to scan?
* Are lessons too long?
* Are interactions meaningful?

## Assessment

* Does the quiz test understanding?
* Does the exercise test practical ability?

---

# 26. FINAL QUALITY STANDARD

The course must balance:

```text
TECHNICAL DEPTH
      +
BEGINNER ACCESSIBILITY
      +
HANDS-ON PRACTICE
      +
VISUAL LEARNING
      +
REAL-WORLD ROBOTICS
      +
DEBUGGING SKILLS
      +
SYSTEM-LEVEL THINKING
```

Do not create:

* A documentation dump
* A collection of unrelated tutorials
* A lecture-only course
* A command memorization course
* A purely academic course
* A collection of random videos

Create a complete learning journey.

---

# 27. NON-NEGOTIABLE RULES

Never:

* Teach commands without explaining why they matter
* Introduce concepts without motivation
* Assume learners understand prerequisites
* Mix incompatible ROS 2 versions
* Copy another course structure blindly
* Use theory when a demonstration would teach better
* Use decorative visuals without educational value
* Create quizzes that only test memorization
* Skip practical exercises
* Ignore debugging skills

Always:

* Explain the problem before the solution
* Build intuition before complexity
* Use visuals for abstract concepts
* Include hands-on practice
* Include debugging
* Reinforce concepts later
* Connect concepts to real robotics
* Verify external resources
* Clearly identify version-dependent instructions
* Prioritize learner understanding

---

# FINAL PRINCIPLE

Build the ROS 2 course that you wish existed when learning ROS 2 for the first time.

The learner should not simply finish with a collection of commands.

The learner should develop:

```text
CONCEPTUAL UNDERSTANDING
        +
PRACTICAL ABILITY
        +
DEBUGGING SKILLS
        +
SYSTEM-LEVEL THINKING
        +
CONFIDENCE TO BUILD ROBOTS
```

Think like a world-class course architect.

Research before designing.

Design before generating content.

Teach concepts through real problems.

Turn knowledge into skills through practice.

Use visuals to make abstract systems understandable.

Use quizzes to identify misconceptions.

Use debugging to build independence.

Use projects to integrate knowledge.

Build a course that learners will genuinely recommend.

---

# CURRENT DEVELOPMENT COMMAND

Start with:

```text
PHASE 1 — RESEARCH AND COURSE ARCHITECTURE
```

Your first output should contain only:

1. Executive Course Strategy
2. Benchmark Analysis
3. Course Version Strategy
4. Proposed Curriculum
5. Learning Journey
6. Knowledge Dependency Map
7. Practical Learning Strategy
8. High-Level Visual Strategy
9. High-Level Video Strategy
10. Key Architecture and Curriculum Decisions

Do not start generating detailed lesson content until the high-level course architecture has been reviewed and approved.

````

## Recommended project structure

```text
your-lms/
│
├── CLAUDE.md
├── ROS2_COURSE_DESIGN.md
│
├── src/
├── prisma/
└── ...
````
