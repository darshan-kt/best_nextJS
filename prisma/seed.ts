import { PrismaPg } from "@prisma/adapter-pg";

import { Prisma, PrismaClient } from "../src/db/generated/client";
import { hashPassword } from "../src/features/auth/password";

/**
 * Development seed data.
 *
 * Not production data and not a migration: this exists so that the
 * catalogue can be developed, reviewed and screenshotted against
 * realistic content, and so that visibility rules can be *demonstrated*
 * rather than asserted. The set below deliberately includes courses that
 * must NOT appear in the public catalogue — a draft, an archived course,
 * and a published-but-PRIVATE one — because a visibility filter that is
 * only ever tested against data it accepts has not been tested at all.
 *
 * Idempotent: every write is an upsert keyed on a natural unique field, so
 * running it twice changes nothing. Never destructive — it does not
 * truncate, because a seed script that deletes rows is one careless
 * environment variable away from doing so in production (§41).
 */

// The Prisma CLI is not running, so nothing has loaded `.env` yet.
try {
  process.loadEnvFile();
} catch {
  // No .env file — fall through to the ambient environment.
}

const INSTRUCTOR_EMAIL = "instructor@example.com";
const INSTRUCTOR_PASSWORD = "seed-password-123";

/// A learner account, so the enrollment flow can be exercised end to end
/// in development without signing up by hand each time.
const STUDENT_EMAIL = "student@example.com";
const STUDENT_PASSWORD = "seed-password-123";

/// Content blocks for the two lessons the learning player (Milestone 6) is
/// screenshotted against. Every other seeded lesson is intentionally left
/// without blocks — an empty lesson is a real state the player has to
/// render ("this lesson doesn't have any content yet"), and it should stay
/// exercised rather than every lesson accidentally getting content.
///
/// Media points at MDN's own CC0-licensed sample assets rather than a
/// generated placeholder, so the IMAGE and VIDEO blocks render something
/// real for `next/image` and `<video>` to load. This is seed data, not
/// application logic — the renderers themselves are provider-agnostic
/// (§32) and know nothing about where these particular URLs live.
type SeedContentBlock =
  | { type: "TEXT"; data: { body: string } }
  | { type: "IMAGE"; data: { src: string; alt: string; caption?: string } }
  | { type: "VIDEO"; data: { src: string; title: string; posterSrc?: string } }
  | {
      type: "CODE";
      data: { code: string; language?: string; filename?: string };
    }
  | {
      type: "EMBED";
      data: {
        provider: "youtube";
        videoId: string;
        title: string;
        creator: string;
        whySelected?: string;
        durationLabel?: string;
      };
    }
  | {
      type: "CALLOUT";
      data: { variant: "INFO" | "TIP" | "WARNING" | "DANGER"; title?: string; body: string };
    }
  | {
      type: "FILE";
      data: { href: string; label: string; description?: string; sizeLabel?: string };
    }
  | {
      type: "QUIZ";
      quiz: {
        title: string;
        description?: string;
        questions: SeedQuizQuestion[];
      };
    }
  | {
      type: "EXERCISE";
      exercise: { title: string; instructions?: string; config: SeedExerciseConfig };
    };

/// Mirrors `exerciseConfigSchema` in `features/exercises/schemas.ts` —
/// kept as a separate, looser type here rather than importing the Zod
/// schema's inferred type, the same way `SeedQuizQuestion` doesn't import
/// from `features/quizzes/schemas.ts`: seed data is allowed to be a
/// simplified shape of what the real schema accepts, and importing the
/// exact type would make this file's blocks accidentally coupled to
/// whichever fields the app schema happens to make optional today.
type SeedRichText = { body: string };
type SeedExerciseConfig =
  | { type: "GUIDED"; goal: SeedRichText; steps: { title: string; content: SeedRichText }[] }
  | {
      type: "INDEPENDENT";
      goal: SeedRichText;
      successCriteria: string[];
      hints?: string[];
    }
  | {
      type: "DEBUGGING";
      scenario: SeedRichText;
      hints: string[];
      solution: SeedRichText;
      rootCause?: SeedRichText;
    };

/// Question payloads (§18), matched to the `questionDataSchemas` /
/// `questionValueSchemas` shapes in `features/quizzes/schemas.ts`. All four
/// implemented types are represented so the quiz-taking flow has something
/// real to exercise for each one.
type SeedQuizQuestion =
  | {
      type: "SINGLE_CHOICE" | "MULTIPLE_CHOICE";
      prompt: string;
      explanation?: string;
      points?: number;
      options: { id: string; label: string }[];
      correctOptionIds: string[];
    }
  | {
      type: "TRUE_FALSE";
      prompt: string;
      explanation?: string;
      points?: number;
      correctAnswer: boolean;
    }
  | {
      type: "SHORT_ANSWER";
      prompt: string;
      explanation?: string;
      points?: number;
      acceptedAnswers: string[];
    };

const MDN_SAMPLE_IMAGE =
  "https://interactive-examples.mdn.mozilla.net/media/cc0-images/grapefruit-slice-332-332.jpg";
const MDN_SAMPLE_VIDEO =
  "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";

/// Curriculum for a couple of courses (§11: Course → Section → Lesson).
/// Not every seeded course gets one — a course with an empty curriculum is
/// a state the detail page has to render, so leaving some empty keeps that
/// path exercised.
interface SeedLesson {
  slug: string;
  title: string;
  durationMinutes: number;
  isPublished?: boolean;
  contentBlocks?: SeedContentBlock[];
}

interface SeedSection {
  title: string;
  summary: string;
  lessons: SeedLesson[];
}

const CURRICULA: Record<string, SeedSection[]> = {
  "typescript-foundations": [
    {
      title: "The type system, from the ground up",
      summary: "What the compiler actually knows, and how it learns it.",
      lessons: [
        {
          slug: "structural-typing",
          title: "Structural typing and why it surprises people",
          durationMinutes: 14,
          contentBlocks: [
            {
              type: "TEXT",
              data: {
                body: "TypeScript compares the shape of two types, not their names. A value satisfies a type if it has the required members — where it came from doesn't matter.\n\nThis is different from the nominal typing you may know from Java or C#, where a class only satisfies an interface it explicitly declares. It's also why two unrelated types can be assignable to each other by accident, which is the surprise this lesson is named for.",
              },
            },
            {
              type: "IMAGE",
              data: {
                src: MDN_SAMPLE_IMAGE,
                alt: "A sliced grapefruit",
                caption:
                  "Placeholder image block — real course artwork replaces this.",
              },
            },
            {
              type: "CODE",
              data: {
                language: "typescript",
                filename: "structural.ts",
                code: 'interface Point {\n  x: number;\n  y: number;\n}\n\nfunction logPoint(point: Point) {\n  console.log(`${point.x}, ${point.y}`);\n}\n\n// No declared relationship to `Point` — it just happens to have\n// the right shape, plus an extra field TypeScript doesn\'t mind.\nconst labeled = { x: 10, y: 20, label: "origin" };\nlogPoint(labeled); // fine',
              },
            },
            {
              type: "QUIZ",
              quiz: {
                title: "Check your understanding: structural typing",
                description:
                  "A short comprehension check on shape-based assignability.",
                questions: [
                  {
                    type: "SINGLE_CHOICE",
                    prompt:
                      "Which best describes how TypeScript decides whether a value satisfies a type?",
                    explanation:
                      "TypeScript compares the shape of two types, not their names — that's structural typing.",
                    options: [
                      { id: "a", label: "By name — the value must declare the type" },
                      { id: "b", label: "By comparing the shape of members" },
                      { id: "c", label: "By its position in the runtime prototype chain" },
                      { id: "d", label: "By the order its properties were declared" },
                    ],
                    correctOptionIds: ["b"],
                  },
                  {
                    type: "MULTIPLE_CHOICE",
                    prompt:
                      "Which of these are true about structural typing in TypeScript? Select all that apply.",
                    explanation:
                      "A value can satisfy an interface it never declares, and two unrelated interfaces with identical members are mutually assignable.",
                    options: [
                      { id: "a", label: "A value can satisfy an interface it never declares" },
                      { id: "b", label: "Extra properties are always rejected on direct assignment" },
                      { id: "c", label: "Two unrelated interfaces with identical members are mutually assignable" },
                      { id: "d", label: "It matches Java's default typing model" },
                    ],
                    correctOptionIds: ["a", "c"],
                  },
                  {
                    type: "TRUE_FALSE",
                    prompt:
                      "In the `logPoint` example, `labeled` was accepted because it explicitly implements the `Point` interface.",
                    explanation:
                      "It works because its shape matches Point, not because of a declared implementation — there is no `implements Point` anywhere.",
                    correctAnswer: false,
                  },
                  {
                    type: "SHORT_ANSWER",
                    prompt:
                      "What is the general term for a type system that checks compatibility based on structure rather than declared names?",
                    explanation:
                      "Structural typing — contrasted with the nominal typing used by languages like Java or C#.",
                    acceptedAnswers: ["structural typing", "structural type system"],
                  },
                ],
              },
            },
          ],
        },
        {
          slug: "inference",
          title: "Inference: what you can leave unwritten",
          durationMinutes: 18,
          contentBlocks: [
            {
              type: "TEXT",
              data: {
                body: "The compiler infers a type from the value assigned to it, so an annotation on a `const` you initialize immediately is usually redundant. Inference gets more interesting — and more useful — at function boundaries and with generics, where it can propagate a type through several calls without it ever being written down.",
              },
            },
            {
              type: "VIDEO",
              data: {
                src: MDN_SAMPLE_VIDEO,
                title: "Placeholder clip — real lesson video replaces this.",
                posterSrc: MDN_SAMPLE_IMAGE,
              },
            },
            {
              type: "CODE",
              data: {
                language: "typescript",
                code: "// No annotation needed: inferred as `number`.\nlet count = 0;\n\n// Inferred as `(a: number, b: number) => number`.\nfunction add(a: number, b: number) {\n  return a + b;\n}",
              },
            },
            {
              type: "CALLOUT",
              data: {
                variant: "TIP",
                title: "Editor tip",
                body: "Hover any inferred variable in your editor to see the type TypeScript actually assigned it — you don't have to work it out by hand.",
              },
            },
            {
              type: "EMBED",
              data: {
                provider: "youtube",
                videoId: "dQw4w9WgXcQ",
                title: "Placeholder video — a real curated video replaces this.",
                creator: "Placeholder channel",
                whySelected:
                  "Stands in for a real, verified curated video until one is researched — see EMBED's attribution fields.",
                durationLabel: "3 min",
              },
            },
            {
              type: "FILE",
              data: {
                href: "https://example.com/typescript-inference-notes.pdf",
                label: "Inference quick reference (placeholder)",
                description:
                  "Placeholder download — points at a real hosted file once one exists.",
                sizeLabel: "1 page",
              },
            },
            {
              type: "EXERCISE",
              exercise: {
                title: "Why won't this compile?",
                instructions:
                  "A short type-narrowing bug to find using the compiler's own error message.",
                config: {
                  type: "DEBUGGING",
                  scenario: {
                    body: 'This function refuses to compile: `function shout(input: string | null) { return input.toUpperCase(); }`. TypeScript reports: "\'input\' is possibly \'null\'."',
                  },
                  hints: [
                    "The union type `string | null` means TypeScript can't assume which branch you're in at that line, even though you might \"know\" it won't be null.",
                    "TypeScript narrows a union only after a runtime check it can see — try adding a check for `null` before calling `.toUpperCase()`.",
                  ],
                  solution: {
                    body: "Add a null check before calling .toUpperCase() so the compiler can narrow the type on the line that uses it.",
                  },
                  rootCause: {
                    body: "TypeScript's control-flow analysis narrows a union based only on checks it can see in the code — an `if` guard, a truthiness check, or similar. It never infers that a value \"can't actually be null\" from how the code is used elsewhere.",
                  },
                },
              },
            },
          ],
        },
        {
          slug: "narrowing",
          title: "Narrowing and control-flow analysis",
          durationMinutes: 22,
        },
      ],
    },
    {
      title: "Types that describe real programs",
      summary: "Generics, unions and the shapes application code needs.",
      lessons: [
        {
          slug: "discriminated-unions",
          title: "Discriminated unions and exhaustiveness",
          durationMinutes: 20,
        },
        {
          slug: "generics",
          title: "Generics without the astronaut architecture",
          durationMinutes: 25,
        },
        {
          slug: "unpublished-draft-lesson",
          title: "Draft: conditional types",
          durationMinutes: 30,
          // Must not appear in the curriculum outline.
          isPublished: false,
        },
      ],
    },
  ],
  "designing-data-models": [
    {
      title: "Modelling for the questions you will ask",
      summary: "Access patterns first, tables second.",
      lessons: [
        {
          slug: "normalisation",
          title: "Normalisation, and when to stop",
          durationMinutes: 16,
        },
        {
          slug: "access-patterns",
          title: "Designing from access patterns",
          durationMinutes: 21,
        },
      ],
    },
    {
      title: "Indexes and migrations",
      summary: "Making it fast, and changing it safely.",
      lessons: [
        {
          slug: "index-selection",
          title: "Choosing indexes that earn their keep",
          durationMinutes: 24,
        },
        {
          slug: "safe-migrations",
          title: "Migrations that do not take production down",
          durationMinutes: 27,
        },
      ],
    },
  ],

  /// ROS 2 Fundamentals — real course content, not a demo fixture like the
  /// courses above (see the COURSES entry for this slug). Modules 0-2 so
  /// far; modules 3-15 land module-by-module per
  /// ROS2_COURSE_KICKOFF_PROMPTS.md's own sequencing, each carrying its own
  /// quality review before implementation. The approved per-module designs
  /// these are built from live in `docs/course-design/`.
  "ros2-fundamentals": [
    {
      title: "Course Onboarding and Roadmap",
      summary:
        "Set expectations and confirm you're ready to start, before any technical content.",
      lessons: [
        {
          slug: "welcome-and-what-youll-build",
          title: "Welcome & What You'll Build",
          durationMinutes: 15,
          contentBlocks: [
            {
              type: "TEXT",
              data: {
                body: "This course takes you from \"I've heard of ROS 2\" to building and debugging a real multi-node robotic system. You won't be memorizing commands — every concept starts with a real robotics problem, then builds up the ROS 2 answer to it.",
              },
            },
            {
              type: "IMAGE",
              data: {
                src: "/courses/ros2-fundamentals/module-0-capstone-preview.png",
                alt: "A six-stage pipeline diagram: Robot Controller, Topics, Robot Simulation, Sensor Data, Sensor Processing Node, Robot Behavior.",
                caption: "The final capstone project — this is where the course is headed.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "You won't understand every box in that diagram yet — that's the point. By the time you reach the capstone module, you'll have built, run, and debugged every piece of it yourself.",
              },
            },
            {
              type: "CALLOUT",
              data: {
                variant: "TIP",
                body: "Nothing on this page needs to be memorized — just get a feel for the shape of what's coming.",
              },
            },
          ],
        },
        {
          slug: "course-roadmap-and-how-this-course-works",
          title: "Course Roadmap & How This Course Works",
          durationMinutes: 15,
          contentBlocks: [
            {
              type: "TEXT",
              data: {
                body: "Every important concept in this course follows a deliberate pattern: why the concept exists, what it is, how it works, seeing it run, building it yourself, breaking it on purpose, fixing it, reflecting on it, and connecting it to what comes next.",
              },
            },
            {
              type: "IMAGE",
              data: {
                src: "/courses/ros2-fundamentals/module-0-learning-philosophy.png",
                alt: "A nine-step flow: WHY, WHAT, HOW, SEE IT, DO IT, BREAK IT, FIX IT, REFLECT, RECAP.",
                caption: "The pattern behind every major lesson in this course.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Practical work comes in three flavors. A GUIDED exercise is a recipe — follow the steps. An INDEPENDENT exercise is \"make dinner with these ingredients\" — a goal, with fewer instructions. A DEBUGGING exercise is \"the dish came out wrong\" — you're given a broken system and have to work out why, with hints available if you get stuck.",
              },
            },
            {
              type: "CALLOUT",
              data: {
                variant: "INFO",
                body: "Quizzes in this course explain why an answer is right or wrong, not just mark it — getting something wrong is part of learning here, not a penalty.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "16 modules in total, each ending in a short quiz, with one mid-course check after the actions module and one final check before the capstone project.",
              },
            },
          ],
        },
        {
          slug: "environment-and-readiness-checklist",
          title: "Environment & Readiness Checklist",
          durationMinutes: 15,
          contentBlocks: [
            {
              type: "TEXT",
              data: {
                body: "Before installing anything, let's make sure you're set up to succeed. None of this is ROS 2-specific yet — that starts in the next module.",
              },
            },
            {
              type: "CALLOUT",
              data: {
                variant: "INFO",
                title: "Hardware & OS",
                body: "A 64-bit machine with 8GB+ RAM (16GB recommended if running Ubuntu inside a VM), 25GB+ free disk space, and a GPU capable of basic OpenGL 3.3+ — integrated graphics from the last ~8 years is generally fine; this matters for Gazebo later, not for anything before it. Ubuntu 24.04 LTS is required — native, dual-boot, VM, or WSL2 are all valid, with trade-offs covered honestly in the next module.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "This course teaches Python as the main path throughout. C++ shows up occasionally to prove the concepts transfer between languages — it's never a second full track you need to follow in parallel.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Readiness checklist: comfortable using a terminal (running commands, navigating directories); basic programming literacy in at least one language; willingness to troubleshoot — this course treats debugging as a real skill, not an afterthought.",
              },
            },
            {
              type: "CALLOUT",
              data: {
                variant: "TIP",
                body: "Missing one of these is okay — the next module teaches ROS 2-specific terminal use from scratch. General comfort is enough; ROS experience isn't required.",
              },
            },
            {
              type: "FILE",
              data: {
                href: "/courses/ros2-fundamentals/environment-checklist.pdf",
                label: "Environment Checklist (PDF)",
                description: "A one-page reference to revisit before starting Module 3.",
                sizeLabel: "1 page",
              },
            },
          ],
        },
      ],
    },
    {
      title: "What Is ROS 2 and Why Do We Need It?",
      summary:
        "Motivation before mechanism — why robot software is built the way it is, before installing anything.",
      lessons: [
        {
          slug: "why-robotics-software-is-hard",
          title: "Why Robotics Software Is Hard",
          durationMinutes: 16,
          contentBlocks: [
            {
              type: "TEXT",
              data: {
                body: "Imagine you're asked to write the software for a warehouse delivery robot. It needs to carry a box from one end of a building to the other, without hitting anyone, without getting lost, and without stopping every few seconds to think about it.\n\nWhere do you even start?",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Start listing what the robot actually has to do, and the list gets long fast. It has to see the world around it. It has to work out what it's looking at. It has to decide where to go next. It has to move without falling over or running into a wall. It has to read its own hardware — battery, wheel speed, motor temperature. And every one of those pieces has to share what it knows with the others.\n\nHere's the part that makes robotics genuinely different from most software: none of that happens in sequence. It all happens at once, continuously, while the robot is moving. There's no waiting for the previous step to finish.",
              },
            },
            {
              type: "IMAGE",
              data: {
                src: "/courses/ros2-fundamentals/module-1-robot-concerns.png",
                alt: "A robot at the center with six labeled concerns radiating outward: sensors (camera, LIDAR, wheel encoders), actuators (wheel motors, gripper, arm joints), perception (making sense of sensor data), planning (deciding what to do next), control (moving safely), and communication (sharing data between all the pieces).",
                caption:
                  "Six distinct jobs, running simultaneously on one machine — not a pipeline that runs once.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Now that you've seen the shape of the problem, the names are worth having:\n\nSensors are the robot's inputs — cameras, LIDAR, wheel encoders. They produce raw data, nothing more.\n\nPerception is making sense of that data. A camera gives you pixels; perception is what turns those pixels into \"there is a person two metres ahead.\"\n\nPlanning is deciding what to do next. Given where the robot is and what's around it, what's the route?\n\nControl is actually and safely carrying that decision out — holding a speed, steering, stopping in time.\n\nActuators are the robot's outputs — the motors, grippers and joints that move real hardware in the real world.\n\nCommunication is what ties all of it together, constantly, while everything else is running.\n\nNotice the order those arrived in: you built the intuition first, and only then attached the vocabulary. That's deliberate, and it's how the rest of this course works too.",
              },
            },
            {
              type: "CALLOUT",
              data: {
                variant: "INFO",
                title: "Take a moment",
                body: "Think of a robot you've actually seen — a robot vacuum, a warehouse robot, a delivery drone. Can you spot its sensors? Its actuators? What do you think its \"planning\" looks like when it decides where to go next? You don't need a right answer here; you need the habit of seeing a robot as several jobs at once rather than one machine.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "So a robot's software isn't one job. It's at least six, all running at the same time, all needing to talk to each other.\n\nWhich raises the obvious next question: how do you fit all of that into one program? And what goes wrong when you try?",
              },
            },
          ],
        },
        {
          slug: "monolithic-vs-modular-robotics-software",
          title: "Monolithic vs. Modular Robotics Software",
          durationMinutes: 16,
          contentBlocks: [
            {
              type: "TEXT",
              data: {
                body: "Back to the delivery robot. Suppose you take the straightforward path: write perception, planning, and control as one big program. One codebase, one process, everything in the same place.\n\nIt'll work — for a while. Then ask yourself: what happens when the planning code crashes? What happens when you want to swap the camera for a better one?",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Here's what goes wrong, concretely:\n\nOne bug anywhere crashes everything. A null-pointer error deep in the planning logic doesn't just stop planning — it takes down the process, and the process is the whole robot. Perception stops. Control stops. The robot is now a very expensive box on wheels.\n\nYou can't test one piece in isolation. Want to check whether your planning logic handles a dead end correctly? In a monolith, that often means having the real camera attached and pointed at a real dead end.\n\nTwo engineers can't work in parallel comfortably. One person on perception and one on control means both editing the same program, in the same files, with conflicts to resolve every day.\n\nSwapping one sensor means touching code that has nothing to do with sensors. A new camera model shouldn't require you to think about the motor-control loop — but in one big program, everything is reachable from everything else, so it usually does.",
              },
            },
            {
              type: "IMAGE",
              data: {
                src: "/courses/ros2-fundamentals/module-1-monolith-vs-modular.png",
                alt: "Left: one large tangled box labelled Robot Software, noting that one bug anywhere stops the whole robot. Right: the same functionality split into separate connected boxes — Camera, Perception, Planning, Control — where swapping the camera changes only one piece and a crash in planning leaves perception running.",
                caption:
                  "The same work, restructured. Modularity doesn't reduce what the robot does — it changes what has to be touched when one part changes.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "So what if each of those concerns were its own separate program, that just... talked to the others?\n\nPerception runs on its own. Planning runs on its own. Control runs on its own. When perception has something to say, it sends it. When planning needs to know what's ahead, it listens.\n\nThat arrangement has a name: a distributed system — independent, cooperating processes rather than one big one. Each piece can crash, restart, be rewritten, or be swapped out without the others noticing. Each piece can be tested on its own, with fake data standing in for a real camera. Two engineers can work on two pieces without ever touching the same file.\n\nThe work hasn't gotten smaller. It's been divided along lines that make it manageable.",
              },
            },
            {
              type: "CALLOUT",
              data: {
                variant: "TIP",
                title: "You may already know this idea",
                body: "This isn't unique to robotics. It's the same reasoning behind a modern website built from many small backend services instead of one giant application — same motivation, same trade-offs, different domain. If that comparison means something to you, you already have most of the intuition you need here.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Dividing robot software into cooperating pieces that talk to each other is a good idea. It's also a lot of work to build from scratch — you'd need to solve how pieces find each other, how they exchange data, what happens when one disappears, and how to inspect the whole thing while it's running.\n\nRobotics engineers didn't each solve that separately. They reached for a framework that had already solved it. That framework is what the next lesson is about.",
              },
            },
          ],
        },
        {
          slug: "what-ros-2-is-and-why-not-ros-1",
          title: "What ROS 2 Is, and Why Not ROS 1",
          durationMinutes: 20,
          contentBlocks: [
            {
              type: "TEXT",
              data: {
                body: "ROS — the Robot Operating System — is the answer robotics engineers actually reached for, starting in 2007. It came out of a need that looked exactly like the one in the last lesson: everyone building robots was solving the same structural problem over and over, badly, in isolation.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Despite the name, ROS is not an operating system in the sense that Linux or Windows is. It doesn't manage your CPU or your filesystem. Your robot still runs Linux underneath.\n\nWhat ROS actually gives you is two things.\n\nFirst, a framework and toolset for building exactly the kind of modular, cooperating robot software from the last lesson — the plumbing for separate programs to find each other and exchange data, plus tools to inspect what's happening while the robot runs.\n\nSecond, an ecosystem. Thousands of reusable pieces of robot software that other people have already written and released — camera drivers, navigation systems, arm controllers. Needing a driver for a common LIDAR usually means installing someone's package, not writing one.",
              },
            },
            {
              type: "IMAGE",
              data: {
                src: "/courses/ros2-fundamentals/module-1-node-pipeline.png",
                alt: "A horizontal pipeline of five labelled boxes: Camera Node publishing raw images, then Perception Node finding what is in them, then Planning Node choosing a safe path, then Control Node turning the path into motion, then the Robot whose wheels and motors move.",
                caption:
                  "Each box is a node — its own small program with one job. This is the last lesson's abstract \"cooperating pieces\" made concrete.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Walk the diagram left to right.\n\nThe Camera node does one thing: read the camera and publish the images. The Perception node reads those images and publishes what it found — obstacles, people, free space. The Planning node takes that and publishes a route. The Control node turns that route into wheel speeds. The robot moves.\n\nNow revisit the two problems from the last lesson, against this picture.\n\nSwap the camera for a better model? Only the Camera node changes. Everything downstream still receives images in the same shape and never learns that anything happened.\n\nA bug crashes the Planning node? Perception keeps running. The camera keeps publishing. You've lost route-planning, which is serious — but you haven't lost the robot, and you can restart just that piece.\n\nEach box in that diagram is called a node. That's the term for one of these small single-purpose programs, and it's the single most important word in ROS 2. Module 5 defines it properly; for now, \"one program, one job\" is exactly the right mental model.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "So why ROS 2, and not just ROS?\n\nThe original ROS was designed in the mid-2000s, for a fairly specific picture of robotics: one research robot, on a trusted lab network, with a person nearby. Within that picture it worked well, and it's still in use.\n\nBut it carried architectural assumptions that didn't survive contact with what robotics became. It relied on a single central process to help nodes find each other — meaning one process whose failure took the system with it. It had no built-in security, because a closed lab network didn't seem to need any. And it wasn't built with today's demands in mind: fleets of robots coordinating with each other, real-time control guarantees, small embedded hardware, commercial products shipping to customers.\n\nROS 2 is the response. Not a patch release and not a cleanup — a rebuilt foundation that keeps the ideas that worked (nodes, message-passing, the ecosystem) and replaces the machinery underneath. What that machinery actually is, is Module 2's subject.",
              },
            },
            {
              type: "CALLOUT",
              data: {
                variant: "INFO",
                title: "Watch the version when you search",
                body: "This course teaches ROS 2 (Jazzy Jalisco) throughout. When you go looking for help online, a tutorial that just says \"ROS\" with no \"2\" is almost certainly about ROS 1. Commands and concepts often look similar enough to be confusing but aren't identical — and following ROS 1 instructions on a ROS 2 install is a genuinely common way to lose an afternoon.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Before moving on to Module 2, answer this for yourself, in your own words: what problem does ROS 2 solve?\n\nIf the answer that comes to mind is about the structure of robot software — many specialised pieces that have to cooperate, and the machinery that lets them — then this module has done its job.",
              },
            },
            {
              type: "QUIZ",
              quiz: {
                title: "Module 1 Check: What Problem Does ROS 2 Solve?",
                description:
                  "Four questions on the reasoning behind ROS 2, not on terminology. Each answer explains why, and points back at the lesson to revisit.",
                questions: [
                  {
                    type: "SINGLE_CHOICE",
                    prompt:
                      "A delivery robot's camera-handling code has a bug that crashes it. The robot's software is written as one large program. What else stops working?",
                    options: [
                      { id: "everything", label: "Everything — planning and control run inside the same program, so they go down with it" },
                      { id: "camera-only", label: "Only the camera handling; planning and control keep running" },
                      { id: "nothing", label: "Nothing — the robot automatically restarts the failed part" },
                      { id: "readers", label: "Only the parts that happened to be reading camera data at that moment" },
                    ],
                    correctOptionIds: ["everything"],
                    explanation:
                      "In a monolithic design there is only one process, so a crash anywhere ends all of it — the robot stops entirely. This is the central motivation from Lesson 2: modularity would have contained the failure to the camera piece alone, leaving perception and control running. Review Lesson 2 if this one didn't feel obvious.",
                  },
                  {
                    type: "SINGLE_CHOICE",
                    prompt: "Which is the most accurate description of what ROS / ROS 2 provides?",
                    options: [
                      { id: "framework", label: "A framework and toolset for building modular, communicating robot software" },
                      { id: "os", label: "An operating system that replaces Linux on the robot" },
                      { id: "sim", label: "A robot simulator for testing code without hardware" },
                      { id: "allinone", label: "A single all-in-one control program you configure for your robot" },
                    ],
                    correctOptionIds: ["framework"],
                    explanation:
                      "ROS 2 is a framework, a toolset, and an ecosystem of reusable packages. Despite the name it is not an operating system — your robot still runs Linux underneath. It is not a simulator (that is Gazebo, in Module 14), and it is emphatically not one program you configure: the entire point is many small cooperating programs. Review Lesson 3.",
                  },
                  {
                    type: "TRUE_FALSE",
                    prompt: "ROS 2 was created to patch a few small bugs that had accumulated in ROS 1.",
                    correctAnswer: false,
                    explanation:
                      "False. ROS 2 is a foundational redesign, not a bugfix release. It addresses things ROS 1's original mid-2000s architecture never anticipated — multi-robot fleets, real-time control, embedded hardware, security, and commercial deployment — which required replacing the machinery underneath rather than repairing it. Review Lesson 3.",
                  },
                  {
                    type: "SINGLE_CHOICE",
                    prompt:
                      "Look back at the Camera → Perception → Planning → Control → Robot pipeline. You're upgrading only the camera hardware, and its driver with it. Which part of the pipeline has to change?",
                    options: [
                      { id: "camera-node", label: "Just the Camera node" },
                      { id: "all-nodes", label: "Every node in the pipeline" },
                      { id: "camera-control", label: "The Camera node and the Control node" },
                      { id: "robot", label: "The robot hardware configuration, but none of the nodes" },
                    ],
                    correctOptionIds: ["camera-node"],
                    explanation:
                      "Just the Camera node. It keeps publishing images in the same shape, so everything downstream carries on without knowing anything changed. This is the whole reason for dividing the system into independent nodes — and it is the direct answer to Lesson 2's complaint that swapping a sensor in a monolith means touching unrelated code.",
                  },
                ],
              },
            },
          ],
        },
      ],
    },
    {
      title: "ROS 2 Ecosystem and Fundamental Architecture",
      summary:
        "The graph, the stack beneath it, and how ROS 2 code is packaged — the mental model Module 3 makes real.",
      lessons: [
        {
          slug: "the-ros-2-graph",
          title: "The ROS 2 Graph",
          durationMinutes: 18,
          contentBlocks: [
            {
              type: "TEXT",
              data: {
                body: "You've seen the shape of a ROS 2 system: a camera node, a perception node, a planning node, a control node — each a separate program, each doing one job, passing results along.\n\nThis module gives that shape a name. It's called the ROS 2 graph, and it's the vocabulary the rest of this course is built on.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Here's the part that makes it a graph rather than just a list of programs.\n\nEvery node you start joins one shared, live structure. It announces what it produces and what it wants to receive, and the nodes that care find it — automatically, with nothing coordinating them centrally and no configuration file listing who talks to whom.\n\nStart a node, and it wires itself in. Stop it, and the others notice it's gone. The graph is not a diagram someone drew once; it's the live, current state of what's running and who's connected to whom, changing as you start and stop things.",
              },
            },
            {
              type: "IMAGE",
              data: {
                src: "/courses/ros2-fundamentals/module-2-ros-graph.png",
                alt: "The camera, perception, planning and control nodes drawn as ellipses connected by labelled directed edges: /camera publishes /image_raw to /perception, which publishes /obstacles to /planning, which publishes /plan to /control, which publishes /cmd_vel to the robot hardware. An /odom edge loops back from the robot to /planning, making the structure a graph rather than a straight line.",
                caption:
                  "Module 1's pipeline, redrawn as it actually is — a connected graph. Nodes are drawn as ellipses here to match what rqt_graph shows you in Module 13.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Look at the labels on the connections: /image_raw, /obstacles, /cmd_vel. Those are topics — named channels carrying a continuous flow of data from whoever publishes to whoever is listening. Most of what happens in a ROS 2 system happens over topics.\n\nTopics aren't the only way nodes talk. There are two others, and it's worth knowing they exist before you meet them properly:\n\nServices are request and response — ask a question, wait for an answer, get on with your life. Useful when you need a result rather than a stream.\n\nActions are for longer jobs that take real time to finish and that you might want to monitor or cancel partway — \"drive to the kitchen\" rather than \"here's the current wheel speed.\"\n\nHow any of this actually works in code is Module 6's job, with services and actions getting Modules 7 and 8 to themselves. For now, just know these are the three ways the graph's connections carry data.",
              },
            },
            {
              type: "CALLOUT",
              data: {
                variant: "INFO",
                title: "\"Automatically\" reaches further than you might expect",
                body: "By default, ROS 2 nodes discover each other over the local network — not just within one program, and not just on one machine. On a shared network (a university lab, an office Wi-Fi), your nodes may unexpectedly \"see\" someone else's robot, and theirs may see yours. This is configurable, via a setting called ROS_DOMAIN_ID, and it's covered at the point where it actually starts to matter.",
              },
            },
            {
              type: "EMBED",
              data: {
                provider: "youtube",
                videoId: "8aoFndU7jos",
                title: "Getting Started with ROS 2",
                creator: "Mike Likes Robots",
                durationLabel: "20 min",
                whySelected:
                  "A second, differently-voiced walk through the same ideas you just met — nodes, the graph, and the three ways they communicate. It also gives an early, deliberate glimpse of services, actions and packages before their own modules arrive, which is exactly why it sits here rather than earlier: everything it names has now been named in this lesson first. Watch it as reinforcement, not as new material — nothing in it is assessed before its own module.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "You know what the graph is and roughly how nodes talk across it.\n\nNext: what's actually running underneath to make that discovery and communication possible — because \"the nodes just find each other\" is a description of the behaviour, not an explanation of it.",
              },
            },
          ],
        },
        {
          slug: "the-ros-2-stack",
          title: "The ROS 2 Stack",
          durationMinutes: 16,
          contentBlocks: [
            {
              type: "TEXT",
              data: {
                body: "When two nodes talk, something has to carry the data across the network, notice a node crashing mid-conversation, and figure out who's currently running.\n\nYou don't write any of that. There's a whole stack underneath the graph handling it, and you never call into most of it directly.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "From the top down, here's what sits between your code and the wire.\n\nYour ROS 2 application is the node you write — your perception logic, your control loop.\n\nThe client library is the API you actually call: rclpy in Python, rclcpp in C++. When you write \"publish this message,\" this is what you're talking to.\n\nThe ROS middleware interface, usually written RMW, is a translation layer. It exists so that the layer below it can be swapped without your code changing.\n\nDDS is the real networking and discovery engine — the thing that genuinely finds other nodes and moves bytes between them.\n\nThe network is the wire: Ethernet, Wi-Fi, or just loopback when everything is on one machine.",
              },
            },
            {
              type: "IMAGE",
              data: {
                src: "/courses/ros2-fundamentals/module-2-stack.png",
                alt: "A vertical five-layer stack with downward arrows: ROS 2 Application (the node you write) labelled \"your code\", then ROS 2 Client Library (rclpy, rclcpp) labelled \"the API you call\", then ROS Middleware Interface (RMW) labelled \"translation layer\", then DDS labelled \"networking / discovery\", then Network labelled \"the wire\". The top layer is highlighted as the only one you write against.",
                caption:
                  "Five layers, one of which is yours. The top box is the only place your code lives.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "DDS is the industry-standard technology that actually finds other nodes and moves data between them. It isn't a ROS invention — it's used in aerospace, defence and industrial systems that have nothing to do with robotics, which is a large part of why ROS 2 chose it.\n\nYou don't need its internals to use ROS 2 well. This course won't go deeper than this paragraph on DDS itself.\n\nThat's a deliberate boundary, not an omission. Almost everything a beginner reads about DDS is written for people tuning a production system, and reading it early tends to convince learners that ROS 2 is far more complicated than it is to actually use.",
              },
            },
            {
              type: "CALLOUT",
              data: {
                variant: "TIP",
                title: "When you see unfamiliar acronyms",
                body: "If a tutorial or an error message mentions \"RMW\" or a specific DDS vendor — Fast DDS, Cyclone DDS — that's this middleware layer talking. You're not missing something fundamental if you don't recognise those names yet. Note where you saw it and carry on.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "You know what's underneath one node.\n\nNext: how many nodes get organised into distributable, reusable units — and where ROS 2 itself actually comes from when you install it.",
              },
            },
          ],
        },
        {
          slug: "distributions-packages-and-workspaces",
          title: "Distributions, Packages, and Workspaces",
          durationMinutes: 18,
          contentBlocks: [
            {
              type: "TEXT",
              data: {
                body: "ROS 2 isn't one download.\n\nIt's released in named distributions — this course uses Jazzy Jalisco. Your code lives inside packages, and those packages are organised inside a workspace.\n\nModule 10 covers the mechanics of building and managing all this. This lesson is just the map, so that Module 3's install makes sense while you're doing it.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "A distribution is a tested, compatible bundle of ROS 2 itself plus thousands of community packages, released on a schedule, with a name and a support window.\n\nThe comparison that usually lands: it's the same idea as an Ubuntu release. \"Ubuntu 24.04\" isn't a program, it's a versioned collection of software that's been tested together. Jazzy Jalisco is that, for ROS 2.\n\nThis is why Module 1 told you to check the version on every tutorial you read, and why Module 0's checklist pinned you to Ubuntu 24.04 — Jazzy targets that release specifically.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "A package bundles one or more related nodes together with everything they need to run: the code, the configuration, the message definitions, the declared dependencies.\n\nPackages are the unit of reuse, and that matters more than it sounds. When Module 1 said an engineer can install someone else's camera driver instead of writing one, this is the mechanism. That driver is a package. You install it, and its nodes become things you can run.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "A workspace is where your own packages live while you're developing them.\n\nIt's kept deliberately separate from the distribution's pre-built packages. The distribution's packages sit in a system directory you don't edit; your workspace is a folder you own, containing the packages you're actively writing.\n\nThe separation is what lets you build and break your own code without ever putting the working ROS 2 installation underneath it at risk.",
              },
            },
            {
              type: "IMAGE",
              data: {
                src: "/courses/ros2-fundamentals/module-2-scopes.png",
                alt: "Two containers side by side. On the left, a solid box labelled Jazzy Jalisco — a distribution installed at /opt/ros/jazzy — holding package chips including rclpy, rclcpp, turtlesim, rviz2, demo_nodes_cpp, tf2, sensor_msgs, geometry_msgs, nav2_bringup, image_transport, and a dashed chip reading plus thousands more. On the right, a dashed box labelled Your workspace holding two chips, my_first_package and my_robot_bringup.",
                caption:
                  "Three different scopes, not three levels of difficulty: what ROS 2 ships with, versus what you're building.",
              },
            },
            {
              type: "CALLOUT",
              data: {
                variant: "WARNING",
                title: "This is the map, not the territory",
                body: "Module 10 is where all of this becomes hands-on — a real workspace, a real package you create and build yourself. If the words colcon or rosdep mean nothing to you yet, that is exactly where you should be right now. Nothing in this lesson needs to be memorised; it needs to be recognised later.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "That's the whole architecture, in three pieces.\n\nNodes connect on a graph (Lesson 1). A stack underneath makes that connection possible (Lesson 2). Packages inside a distribution organise and share the code (this lesson).\n\nModule 3 makes all of it real: installing ROS 2 Jazzy on Ubuntu 24.04, and understanding exactly what that puts on your machine and why you have to source it before it works.",
              },
            },
            {
              type: "QUIZ",
              quiz: {
                title: "Module 2 Check: The Graph, the Stack, and the Packaging",
                description:
                  "Four questions on the architecture you've just built a mental model of. As always, the explanation matters more than the score.",
                questions: [
                  {
                    type: "SINGLE_CHOICE",
                    prompt: "What is a ROS 2 distribution most similar to?",
                    options: [
                      { id: "release-bundle", label: "A tested, versioned release bundle — the same idea as an Ubuntu release" },
                      { id: "one-program", label: "A single downloadable robot program you run" },
                      { id: "company", label: "The company that maintains ROS 2" },
                      { id: "language", label: "A programming language used to write robot code" },
                    ],
                    correctOptionIds: ["release-bundle"],
                    explanation:
                      "A distribution — Jazzy Jalisco, here — is a bundle of ROS 2 plus thousands of community packages that have been tested together, released on a schedule with a name and a support window. Exactly like \"Ubuntu 24.04\" naming a tested collection rather than a single program. Not a company (that's Open Robotics), and not a language: ROS 2 code is written in Python or C++. Review Lesson 3.",
                  },
                  {
                    type: "SINGLE_CHOICE",
                    prompt:
                      "You need a driver for a common LIDAR sensor, and someone has already written and released one. What ROS 2 concept lets you use theirs instead of writing your own?",
                    options: [
                      { id: "package", label: "Install their package" },
                      { id: "topic", label: "Subscribe to their topic" },
                      { id: "distro", label: "Switch to the distribution they used" },
                      { id: "copy", label: "Copy their node's source file into your own node" },
                    ],
                    correctOptionIds: ["package"],
                    explanation:
                      "The package is ROS 2's unit of reuse — nodes bundled with their code, config and dependencies into something installable. Subscribing to a topic is how you'd read data from a node that's already running; it doesn't get you the driver. And copying source into your own node throws away exactly the reuse a package exists to provide. Review Lesson 3.",
                  },
                  {
                    type: "TRUE_FALSE",
                    prompt:
                      "DDS is something every ROS 2 developer needs to configure by hand before their code will work.",
                    correctAnswer: false,
                    explanation:
                      "False. DDS runs underneath the client library by default, and most ROS 2 developers never touch it directly — you write against rclpy or rclcpp at the top of the stack and the layers below already work. There are production situations where DDS gets tuned deliberately, but that is a long way from \"needed before your code will work.\" Review Lesson 2.",
                  },
                  {
                    type: "SINGLE_CHOICE",
                    prompt:
                      "Your node calls a function from rclpy to publish a message. Looking at the stack diagram, which layer is that call landing in?",
                    options: [
                      { id: "client-library", label: "The ROS 2 Client Library" },
                      { id: "rmw", label: "The ROS Middleware Interface (RMW)" },
                      { id: "dds", label: "DDS" },
                      { id: "network", label: "The network" },
                    ],
                    correctOptionIds: ["client-library"],
                    explanation:
                      "rclpy is the client library — the API you actually call. Your request then travels down through RMW, which translates it, to DDS, which does the real discovery and data transport, and finally onto the network. All three of those lower layers are involved in delivering the message, but the call you wrote lands in the client library. Review Lesson 2's stack diagram.",
                  },
                ],
              },
            },
          ],
        },
      ],
    },
  ],
};

interface SeedCourse {
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  visibility: "PUBLIC" | "PRIVATE";
  /** Days before now, so ordering by recency is observable. */
  publishedDaysAgo?: number;
}

const COURSES: SeedCourse[] = [
  {
    slug: "typescript-foundations",
    title: "TypeScript Foundations",
    subtitle:
      "Types, inference and the compiler's mental model, from first principles.",
    description:
      "Build a working understanding of structural typing, generics and narrowing, then apply it to real application code.",
    status: "PUBLISHED",
    visibility: "PUBLIC",
    publishedDaysAgo: 2,
  },
  {
    slug: "designing-data-models",
    title: "Designing Data Models That Last",
    subtitle:
      "Relational modelling, indexing and migrations for systems that outlive their first release.",
    description:
      "Normalisation, access patterns, index selection and safe production migrations, using PostgreSQL throughout.",
    status: "PUBLISHED",
    visibility: "PUBLIC",
    publishedDaysAgo: 9,
  },
  {
    slug: "web-accessibility-in-practice",
    title: "Web Accessibility in Practice",
    subtitle:
      "Semantics, keyboard navigation and assistive technology, applied to real interfaces.",
    description:
      "Move past checklist compliance and learn to build interfaces that genuinely work for everyone who uses them.",
    status: "PUBLISHED",
    visibility: "PUBLIC",
    publishedDaysAgo: 16,
  },
  {
    slug: "react-server-components",
    title: "React Server Components",
    subtitle:
      "Where rendering happens, why it matters, and how to decide for each component.",
    description:
      "Server and client boundaries, streaming, data fetching and the performance characteristics of each choice.",
    status: "PUBLISHED",
    visibility: "PUBLIC",
    publishedDaysAgo: 23,
  },
  {
    slug: "applied-sql-performance",
    title: "Applied SQL Performance",
    subtitle: "Reading query plans and fixing the queries that actually hurt.",
    description:
      "Profiling, explain plans, index strategy and the query rewrites that turn a slow page into a fast one.",
    status: "PUBLISHED",
    visibility: "PUBLIC",
    publishedDaysAgo: 31,
  },
  {
    slug: "testing-strategies",
    title: "Testing Strategies for Product Teams",
    subtitle:
      "What to test, at which level, and how to keep a suite worth running.",
    description:
      "Unit, integration and end-to-end testing as a portfolio of trade-offs rather than a coverage target.",
    status: "PUBLISHED",
    visibility: "PUBLIC",
    publishedDaysAgo: 44,
  },

  // --- Real course content, not a demo fixture ----------------------------
  //
  // Everything above is throwaway dev/demo data for exercising the catalog
  // and player. This one is the actual ROS 2 Fundamentals course being
  // built module-by-module (ROS2_COURSE_DESIGN.md,
  // ROS2_COURSE_KICKOFF_PROMPTS.md) — currently just Module 0. DRAFT until
  // enough modules exist that listing it wouldn't misrepresent an
  // incomplete course as a finished one; see `isPubliclyVisible` in
  // features/auth/policy.ts for why DRAFT already keeps it out of the
  // catalog and out of self-service enrollment without any extra code.
  //
  // Real content living in the same file/mechanism as the demo fixtures
  // above is a deliberate, temporary choice — worth revisiting once a real
  // deployment target exists (see the AWS deployment-planning session).
  // Not solved here.
  {
    slug: "ros2-fundamentals",
    title: "ROS 2 Fundamentals: From First Principles to Building Your First Robotic System",
    subtitle:
      "From \"I've heard of ROS 2\" to building, running, and debugging a real multi-node robotic system.",
    description:
      "A beginner-to-intermediate ROS 2 course pinned to Jazzy Jalisco on Ubuntu 24.04, teaching nodes, topics, services, actions, and simulation through real robotics problems, hands-on practice, and deliberate debugging exercises — not a command-reference tutorial.",
    status: "DRAFT",
    visibility: "PUBLIC",
  },

  // --- Must never appear in the public catalogue -------------------------

  {
    slug: "unreleased-course-draft",
    title: "Draft: Distributed Systems",
    subtitle: "Still being written — must not appear in the catalogue.",
    description: "Draft content.",
    status: "DRAFT",
    visibility: "PUBLIC",
  },
  {
    slug: "internal-onboarding",
    title: "Private: Internal Onboarding",
    subtitle:
      "Published but PRIVATE — must not appear in the public catalogue.",
    description: "Internal-only content, a stand-in for a future org catalogue.",
    status: "PUBLISHED",
    visibility: "PRIVATE",
    publishedDaysAgo: 5,
  },
  {
    slug: "retired-jquery-course",
    title: "Archived: jQuery Essentials",
    subtitle: "Retired — must not appear in the catalogue.",
    description: "Kept for learners who already enrolled.",
    status: "ARCHIVED",
    visibility: "PUBLIC",
    publishedDaysAgo: 900,
  },
];

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

async function main(): Promise<void> {
  // Imported after the environment is populated so that validation sees
  // the loaded values, and inside the function because this file is
  // transpiled to CommonJS, which has no top-level await.
  const { env } = await import("../src/config/env.js");

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: env.DATABASE_URL }),
    log: ["warn", "error"],
  });

  try {
    await seed(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

async function seed(prisma: PrismaClient): Promise<void> {
  const instructor = await prisma.user.upsert({
    where: { email: INSTRUCTOR_EMAIL },
    update: {},
    create: {
      email: INSTRUCTOR_EMAIL,
      name: "Dr. Alex Mercer",
      passwordHash: await hashPassword(INSTRUCTOR_PASSWORD),
      roles: {
        create: [{ role: "INSTRUCTOR" }],
      },
    },
  });

  for (const course of COURSES) {
    const publishedAt =
      course.status === "PUBLISHED" && course.publishedDaysAgo !== undefined
        ? daysAgo(course.publishedDaysAgo)
        : course.status === "ARCHIVED" && course.publishedDaysAgo !== undefined
          ? daysAgo(course.publishedDaysAgo)
          : null;

    await prisma.course.upsert({
      where: { slug: course.slug },
      update: {
        title: course.title,
        subtitle: course.subtitle,
        description: course.description,
        status: course.status,
        visibility: course.visibility,
        publishedAt,
      },
      create: {
        slug: course.slug,
        title: course.title,
        subtitle: course.subtitle,
        description: course.description,
        status: course.status,
        visibility: course.visibility,
        publishedAt,
        instructorId: instructor.id,
      },
    });
  }

  await prisma.user.upsert({
    where: { email: STUDENT_EMAIL },
    update: {},
    create: {
      email: STUDENT_EMAIL,
      name: "Sam Rivera",
      passwordHash: await hashPassword(STUDENT_PASSWORD),
      roles: {
        create: [{ role: "STUDENT" }],
      },
    },
  });

  await seedCurricula(prisma);

  const listed = COURSES.filter(
    (course) => course.status === "PUBLISHED" && course.visibility === "PUBLIC"
  ).length;

  console.log(
    `Seeded ${COURSES.length} courses (${listed} publicly listed, ` +
      `${COURSES.length - listed} intentionally hidden) for ${INSTRUCTOR_EMAIL}, ` +
      `curricula for ${Object.keys(CURRICULA).length}, and ${STUDENT_EMAIL}.`
  );
}

/**
 * Sections and lessons for the courses that have them.
 *
 * `Section` has no unique key beyond its id — deliberately, since a unique
 * `position` would collide during drag-and-drop reordering — so this
 * matches on (courseId, title) rather than upserting. The alternative,
 * deleting and recreating sections, would take their lessons with them and
 * (once Milestone 7 lands) any progress recorded against them. A seed
 * script must never be the reason data disappears.
 */
async function seedCurricula(prisma: PrismaClient): Promise<void> {
  for (const [courseSlug, sections] of Object.entries(CURRICULA)) {
    const course = await prisma.course.findUnique({
      where: { slug: courseSlug },
      select: { id: true },
    });

    if (!course) {
      continue;
    }

    for (const [index, section] of sections.entries()) {
      const existing = await prisma.section.findFirst({
        where: { courseId: course.id, title: section.title },
        select: { id: true },
      });

      const sectionId =
        existing?.id ??
        (
          await prisma.section.create({
            data: {
              courseId: course.id,
              title: section.title,
              summary: section.summary,
              position: index,
            },
            select: { id: true },
          })
        ).id;

      for (const [lessonIndex, lesson] of section.lessons.entries()) {
        const { id: lessonId } = await prisma.lesson.upsert({
          // Lessons do have a natural key: (sectionId, slug).
          where: {
            sectionId_slug: { sectionId, slug: lesson.slug },
          },
          update: {
            title: lesson.title,
            durationMinutes: lesson.durationMinutes,
            isPublished: lesson.isPublished ?? true,
            position: lessonIndex,
          },
          create: {
            sectionId,
            slug: lesson.slug,
            title: lesson.title,
            durationMinutes: lesson.durationMinutes,
            isPublished: lesson.isPublished ?? true,
            position: lessonIndex,
          },
          select: { id: true },
        });

        if (lesson.contentBlocks) {
          for (const [position, block] of lesson.contentBlocks.entries()) {
            await seedContentBlock(prisma, lessonId, position, block);
          }
        }
      }
    }
  }
}

/**
 * One content block (§11). No natural key beyond (lessonId, position) —
 * the same situation as `Section` above, and the same fix: look the row
 * up first, then decide create vs. update explicitly, rather than fake a
 * unique key `upsert` doesn't actually have.
 *
 * QUIZ and EXERCISE blocks own a real `Quiz`/`Exercise` row rather than a
 * JSON payload (schema comment on `LessonContentBlock`), so seeding either
 * is two writes: the row itself, then the block that points at it.
 */
async function seedContentBlock(
  prisma: PrismaClient,
  lessonId: string,
  position: number,
  block: SeedContentBlock
): Promise<void> {
  const existing = await prisma.lessonContentBlock.findFirst({
    where: { lessonId, position },
    select: { id: true, quizId: true, exerciseId: true },
  });

  if (block.type === "QUIZ") {
    const quizData = {
      title: block.quiz.title,
      description: block.quiz.description ?? null,
    };

    const quiz = existing?.quizId
      ? await prisma.quiz.update({ where: { id: existing.quizId }, data: quizData })
      : await prisma.quiz.create({ data: quizData });

    if (existing) {
      await prisma.lessonContentBlock.update({
        where: { id: existing.id },
        data: { type: "QUIZ", quizId: quiz.id, data: Prisma.JsonNull },
      });
    } else {
      await prisma.lessonContentBlock.create({
        data: { lessonId, position, type: "QUIZ", quizId: quiz.id },
      });
    }

    await Promise.all(
      block.quiz.questions.map((question, index) =>
        seedQuizQuestion(prisma, quiz.id, index, question)
      )
    );
    return;
  }

  if (block.type === "EXERCISE") {
    const exerciseData = {
      title: block.exercise.title,
      instructions: block.exercise.instructions ?? null,
      config: block.exercise.config as Prisma.InputJsonValue,
    };

    const exercise = existing?.exerciseId
      ? await prisma.exercise.update({ where: { id: existing.exerciseId }, data: exerciseData })
      : await prisma.exercise.create({ data: exerciseData });

    if (existing) {
      await prisma.lessonContentBlock.update({
        where: { id: existing.id },
        data: { type: "EXERCISE", exerciseId: exercise.id, data: Prisma.JsonNull },
      });
    } else {
      await prisma.lessonContentBlock.create({
        data: { lessonId, position, type: "EXERCISE", exerciseId: exercise.id },
      });
    }
    return;
  }

  if (existing) {
    await prisma.lessonContentBlock.update({
      where: { id: existing.id },
      data: { type: block.type, data: block.data },
    });
  } else {
    await prisma.lessonContentBlock.create({
      data: { lessonId, position, type: block.type, data: block.data },
    });
  }
}

/**
 * One quiz question (§18). Like `LessonContentBlock`, `QuizQuestion` has no
 * natural key beyond `(quizId, position)` — same find-then-branch shape as
 * everything else position-ordered in this file.
 */
async function seedQuizQuestion(
  prisma: PrismaClient,
  quizId: string,
  position: number,
  question: SeedQuizQuestion
): Promise<void> {
  const existing = await prisma.quizQuestion.findFirst({
    where: { quizId, position },
    select: { id: true },
  });

  const data =
    question.type === "TRUE_FALSE"
      ? { correctAnswer: question.correctAnswer }
      : question.type === "SHORT_ANSWER"
        ? { acceptedAnswers: question.acceptedAnswers }
        : { options: question.options, correctOptionIds: question.correctOptionIds };

  const questionData = {
    quizId,
    position,
    type: question.type,
    prompt: question.prompt,
    explanation: question.explanation ?? null,
    points: question.points ?? 1,
    data,
  };

  if (existing) {
    await prisma.quizQuestion.update({
      where: { id: existing.id },
      data: questionData,
    });
  } else {
    await prisma.quizQuestion.create({ data: questionData });
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
