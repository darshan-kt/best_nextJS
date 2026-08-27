import { PrismaPg } from "@prisma/adapter-pg";

import { Prisma, PrismaClient } from "../src/db/generated/client";
import { hashPassword } from "../src/features/auth/password";
import type {
  CalloutBlockData,
  CodeBlockData,
  EmbedBlockData,
  FileBlockData,
  ImageBlockData,
  TextBlockData,
  VideoBlockData,
} from "../src/features/learning/schemas";
import {
  ROS2_BEFORE_AND_AFTER_TRANSCRIPT,
  ROS2_INSTALL_SCRIPT,
  ROS2_LOCALE_FIX_SCRIPT,
} from "../src/features/courses/content/ros2/terminal-fixtures";

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
///
/// Block payloads are `z.infer`red from the Zod schemas in
/// `src/features/learning/schemas.ts` rather than restated here. They were
/// restated once, and the copies silently drifted the moment a field was
/// added to a schema — seed data that typechecks against a stale local copy
/// but fails validation at render is the exact failure that duplication
/// invites (§4, §34). The schemas are the boundary contract (§9); this file
/// is one of the things being contracted.
type SeedContentBlock =
  | { type: "TEXT"; data: TextBlockData }
  | { type: "IMAGE"; data: ImageBlockData }
  | { type: "VIDEO"; data: VideoBlockData }
  | { type: "CODE"; data: CodeBlockData }
  | { type: "EMBED"; data: EmbedBlockData }
  | { type: "CALLOUT"; data: CalloutBlockData }
  | { type: "FILE"; data: FileBlockData }
  /// QUIZ and EXERCISE stay hand-written: they own relational rows
  /// (`Quiz`, `Exercise`) rather than a JSON payload, so there is no
  /// block-data schema to derive them from — see the note at the top of
  /// `features/learning/schemas.ts`.
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
/** Mirrors `richTextSchema`, including the inline visuals (diagrams and
 *  code samples) that `inlineVisualSchema` allows inside an exercise step,
 *  goal, scenario or solution — Module 3's exercises are the first to use
 *  them, since a terminal command is part of the instruction, not a
 *  separate block beside it. */
type SeedRichText = {
  body: string;
  visuals?: (
    | { kind: "IMAGE"; data: ImageBlockData }
    | { kind: "CODE"; data: CodeBlockData }
  )[];
};
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
  /// courses above (see the COURSES entry for this slug). Modules 0-3 so
  /// far; modules 4-15 land module-by-module per
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
                durationLabel: "9 min",
                // The source video is 19:49. Its "What is ROS 2?" and
                // "Message Passing" chapters run 0:24-9:48 and cover
                // exactly this lesson's ground; the chapters after that
                // are Module 3's, 10's and 13's material. Playing the
                // matching span keeps §14's short-video preference
                // without discarding a video that was verified against
                // §15 (see docs/course-design/module-2-design.md).
                startSeconds: 24,
                endSeconds: 588,
                whySelected:
                  "A second, differently-voiced walk through the same ideas you just met — nodes, the graph, and the three ways they communicate. This plays the two chapters that match this lesson; the rest of the video moves on to packages, tooling and installation, which are Modules 3, 10 and 13's ground. Watch it as reinforcement, not as new material — nothing in it is assessed before its own module.",
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
    {
      title: "ROS 2 Installation and Environment Setup",
      summary:
        "Get ROS 2 Jazzy running on your own machine — and understand every step well enough to fix it when it breaks.",
      lessons: [
        {
          slug: "choosing-your-setup",
          title: "Choosing Your Setup",
          durationMinutes: 18,
          contentBlocks: [
            {
              type: "TEXT",
              data: {
                body: "You know what ROS 2 is built from. Now you'll put it on your machine.\n\nThat starts with a decision you have to make before installing anything: how are you going to run Ubuntu 24.04?",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "There are four realistic options, and none of them is universally right.\n\nNative means Ubuntu is the only operating system on the machine. Best performance, cleanest graphics support, and by far the least trouble when you reach Gazebo. The cost is that it claims a whole machine.\n\nDual-boot keeps your existing operating system and lets you choose at startup. You get native performance when you're in Ubuntu, at the price of the most setup friction of the four — partitioning a disk is the one step here that can genuinely lose data if rushed.\n\nA virtual machine runs Ubuntu in a window on your current OS. Easiest to set up, trivially easy to undo — delete the VM and nothing remains — but you pay some performance cost, and graphics acceleration is where VMs get awkward.\n\nWSL2 runs Ubuntu inside Windows, with the least setup of all if you're already on Windows. Everything up to and including Module 13 works well. Graphics support has real caveats.",
              },
            },
            {
              type: "IMAGE",
              data: {
                src: "/courses/ros2-fundamentals/module-3-setup-options.png",
                alt: "A comparison table of four ways to run Ubuntu 24.04 — native, dual-boot, virtual machine and WSL2 — rated across performance, setup effort, how easy each is to undo, and Gazebo/GPU readiness for Module 14. Native and dual-boot rate best for performance and Gazebo; the VM is easiest to undo; WSL2 is easiest to set up; both the VM and WSL2 carry real caveats for Gazebo.",
                caption:
                  "The same four options, scored on what actually differs between them.",
              },
            },
            {
              type: "CALLOUT",
              data: {
                variant: "WARNING",
                title: "If you're leaning towards a VM or WSL2",
                body: "Graphics and GPU passthrough is the single most common source of pain in those two setups, and it lands in Module 14 when you start running Gazebo. Nothing before that module will make you feel it. It's not a reason to avoid either option — plenty of people complete this course on both — but it's worth knowing now, while changing your mind is still cheap.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Whichever option you pick, the version is not negotiable.\n\nThis course targets ROS 2 Jazzy Jalisco, and Jazzy's standard install path supports Ubuntu 24.04 and no other version. Not 22.04, not 25.04. The packages simply are not published for them.\n\nIf you're currently on a different Ubuntu version, that is the first thing to fix — before anything ROS 2-related. Trying to force Jazzy onto the wrong base is the single most common way to lose a day on this module.",
              },
            },
            {
              type: "CALLOUT",
              data: {
                variant: "INFO",
                title: "You've seen this pin before",
                body: "This is the same Jazzy / Ubuntu 24.04 pairing from Module 0's environment checklist and Module 1's version-awareness note. Nothing new — this is just the point where you act on it.",
              },
            },
            {
              type: "EXERCISE",
              exercise: {
                title: "Confirm you're actually on Ubuntu 24.04",
                instructions:
                  "Before installing anything, prove the foundation is right. This takes about a minute.",
                config: {
                  type: "GUIDED",
                  goal: {
                    body: "Boot into the setup you've chosen and confirm, from the terminal, that you're running Ubuntu 24.04 — not assuming it, checking it.",
                  },
                  steps: [
                    {
                      title: "Open a terminal in your Ubuntu environment",
                      content: {
                        body: "Native or dual-boot: boot into Ubuntu. VM: start the VM and open a terminal inside it. WSL2: open your Ubuntu distribution from Windows Terminal. Ctrl+Alt+T opens a terminal in a standard Ubuntu desktop.",
                      },
                    },
                    {
                      title: "Ask the system what it is",
                      content: {
                        body: "Run this and read the output rather than skimming it:",
                        visuals: [
                          {
                            kind: "CODE",
                            data: { language: "bash", code: "lsb_release -a" },
                          },
                        ],
                      },
                    },
                    {
                      title: "Check the Release line specifically",
                      content: {
                        body: "You're looking for a Release line reading exactly 24.04, and a Codename of noble. Anything else means Jazzy will not install by the method this course teaches — stop here and sort the base system out first.",
                        visuals: [
                          {
                            kind: "CODE",
                            data: {
                              language: "text",
                              code: "No LSB modules are available.\nDistributor ID: Ubuntu\nDescription:    Ubuntu 24.04.1 LTS\nRelease:        24.04\nCodename:       noble",
                              caption:
                                "Illustrative output. The first line is a harmless notice, not an error. Your point release will differ — 24.04.2, 24.04.3 and so on are all fine. The Release line reading 24.04 and the Codename reading noble are what matter.",
                            },
                          },
                        ],
                      },
                    },
                  ],
                },
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Ubuntu 24.04 confirmed.\n\nNext: actually installing ROS 2 Jazzy onto it — and understanding exactly what that puts on your machine, and where.",
              },
            },
          ],
        },
        {
          slug: "installing-ros-2-jazzy",
          title: "Installing ROS 2 Jazzy",
          durationMinutes: 24,
          contentBlocks: [
            {
              type: "TEXT",
              data: {
                body: "Module 2 said a distribution is a tested bundle of ROS 2 plus thousands of community packages.\n\nInstalling Jazzy means putting a real copy of that bundle onto your machine. It's worth knowing exactly where it lands, because in two lessons' time you'll be pointing your terminal at that location deliberately.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Conceptually, the install is two steps, and neither is ROS-specific.\n\nFirst you add a package source. Ubuntu's package manager only installs from repositories it knows about, and ROS 2 isn't in Ubuntu's default set. You add the ROS repository's address and its signing key — the key is what lets apt verify the packages genuinely came from the ROS maintainers.\n\nThen you install, using exactly the same apt command you'd use for any other Ubuntu software. The bundle you want is ros-jazzy-desktop: ROS 2 itself plus the common tooling, including RViz and the demo nodes you'll verify with in Lesson 4.\n\nThat's the whole mechanism. There is nothing mysterious in it — which is precisely why running the commands without knowing this makes failures so much harder to diagnose.",
              },
            },
            {
              type: "CODE",
              data: {
                language: "bash",
                filename: "install-ros2-jazzy.sh",
                code: ROS2_INSTALL_SCRIPT,
              },
            },
            {
              type: "TEXT",
              data: {
                body: "When that finishes, everything has landed under a single directory: /opt/ros/jazzy/.\n\nThis is the literal, physical answer to the question Module 2 left open — where did all those packages actually go? They're there. You can list them, read them, and inspect them like any other files on the machine.\n\nNothing was scattered across your home directory, and nothing was hidden. One distribution, one directory.",
              },
            },
            {
              type: "IMAGE",
              data: {
                src: "/courses/ros2-fundamentals/module-3-install-tree.png",
                alt: "An annotated directory tree of /opt/ros/jazzy/ showing five entries: bin/ where the ros2 command lives, lib/ holding compiled libraries and the node executables ros2 run launches, include/ holding C++ headers for building your own packages in Module 10, share/ holding per-package resources such as message definitions and launch files, and setup.bash, the script sourced in Lesson 3 that connects the terminal to everything above.",
                caption:
                  "What the install actually put on your machine. setup.bash at the bottom is Lesson 3's whole subject.",
              },
            },
            {
              type: "EMBED",
              data: {
                provider: "youtube",
                videoId: "ZGds6NuZLzo",
                title: "Install ROS2 Jazzy Jalisco on Ubuntu 24.04 | ROS2 Tutorial",
                creator: "The Construct Robotics Institute",
                durationLabel: "6 min",
                whySelected:
                  "A real screen recording of the exact install you just read through, on the exact distribution and Ubuntu version this course targets. Watch it to see what success looks like on screen — the pace of each step, and what the output should roughly resemble — before or while you run it yourself.",
              },
            },
            {
              type: "CALLOUT",
              data: {
                variant: "TIP",
                title: "Check the distro name on anything you watch or read",
                body: "The video above installs the full desktop bundle for Jazzy, matching this course. When you look this up elsewhere later — and you will — check the distribution name on screen first. Instructions for Humble, Foxy or Iron look almost identical and will not work here. A wrong distro name is the fastest thing to spot and the easiest to miss.",
              },
            },
            {
              type: "EXERCISE",
              exercise: {
                title: "Install ROS 2 Jazzy on your machine",
                instructions:
                  "The module's central make-it-real moment. Work through it alongside the video if that helps.",
                config: {
                  type: "GUIDED",
                  goal: {
                    body: "Get ros-jazzy-desktop installed on the Ubuntu 24.04 environment you confirmed in Lesson 1, and confirm the files landed where this lesson says they do.",
                  },
                  steps: [
                    {
                      title: "Add the repository and its signing key",
                      content: {
                        body: "Run steps 1 and 2 from the code block above. If the add-apt-repository step asks you to press Enter to continue, that's expected. If anything here fails outright, note the exact error — Lesson 4's decision tree covers the two most likely causes.",
                      },
                    },
                    {
                      title: "Install the desktop bundle",
                      content: {
                        body: "Run step 3. This downloads on the order of a gigabyte and can take several minutes on a slow connection — a long pause is normal, not a hang.",
                        visuals: [
                          {
                            kind: "CODE",
                            data: { language: "bash", code: "sudo apt update\nsudo apt install -y ros-jazzy-desktop" },
                          },
                        ],
                      },
                    },
                    {
                      title: "Confirm the files are actually there",
                      content: {
                        body: "Don't take the installer's word for it. List the directory and check you can see the entries from the diagram above:",
                        visuals: [
                          {
                            kind: "CODE",
                            data: { language: "bash", code: "ls /opt/ros/jazzy/" },
                          },
                        ],
                      },
                    },
                  ],
                },
              },
            },
            {
              type: "TEXT",
              data: {
                body: "ROS 2 is on disk now.\n\nOpen a brand new terminal and type ros2. It won't work.\n\nThat's not a mistake, and you haven't broken anything. That's Lesson 3's problem, and understanding why is more useful than the fix itself.",
              },
            },
          ],
        },
        {
          slug: "sourcing-and-environment-variables",
          title: "Sourcing and Environment Variables",
          durationMinutes: 20,
          contentBlocks: [
            {
              type: "TEXT",
              data: {
                body: "Open a brand new terminal and type:\n\nros2 --help\n\nYou'll get command not found: ros2 — even though you just installed it, and even though you watched the files land in /opt/ros/jazzy/.\n\nThis isn't a bug, and nothing went wrong with your install. This is exactly how this stage is supposed to look.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Here's why.\n\nWhen you type a command, your terminal doesn't search the whole filesystem for something with that name. That would be slow and unpredictable. Instead it looks only in the directories listed in an environment variable called PATH — a list of places worth checking, carried by your current shell session.\n\nInstalling ROS 2 put files on disk. It did not add /opt/ros/jazzy/bin to your PATH. As far as your terminal is concerned, that directory may as well not exist.\n\nPATH isn't the only variable involved, either. ROS 2 also needs to know where to find message definitions, Python modules, and the packages themselves — several variables, all currently unset.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Which is what setup.bash is for.\n\n/opt/ros/jazzy/setup.bash is a script that sets every environment variable ROS 2 needs, all at once. You saw it at the bottom of the directory diagram in the last lesson.\n\nThe important part is how you run it. Running a script normally starts a separate process, that process gets its own copy of the environment, it makes its changes, and then it exits and takes them with it — leaving your terminal exactly as it was.\n\nSourcing runs the script inside your current shell instead of in a child process. The variables it sets stay set, because there was never a separate process for them to disappear with.\n\nThat's the whole idea. \"Sourcing\" means \"run this in my current shell so its changes stick.\"",
              },
            },
            {
              type: "CODE",
              data: {
                language: "bash",
                filename: "before-and-after.sh",
                caption:
                  "Illustrative output, abridged at the ellipses. The exact help text changes between Jazzy patch releases and the command list is longer than shown. What matters is the shape: the same command fails before sourcing and works after it.",
                code: ROS2_BEFORE_AND_AFTER_TRANSCRIPT,
              },
            },
            {
              type: "CALLOUT",
              data: {
                variant: "WARNING",
                title: "That only fixed the terminal you ran it in",
                body: "Sourcing changes the environment of one shell session. Open a new terminal window right now and ros2 will be missing again — that's expected, not broken. It catches nearly everyone once, and it's the single most common reason a beginner thinks their install failed. Making it automatic is the next step.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "You don't want to type that line every time you open a terminal.\n\nThe standard fix is to append it to ~/.bashrc — a script bash runs automatically whenever it starts an interactive shell. Put the source line there and every new terminal sources ROS 2 for you.\n\nThis is worth understanding rather than pasting. You're not installing anything or changing ROS 2; you're adding one line to a file that runs on terminal startup. If it ever causes a problem, you remove that line. That's the entire mechanism, and it's why Lesson 4's troubleshooting tree can tell you to go and read that file.",
              },
            },
            {
              type: "EXERCISE",
              exercise: {
                title: "Make ros2 available, then make it permanent",
                instructions:
                  "Three steps, each with an outcome you can see. Don't skip the first one — watching it fail is the point.",
                config: {
                  type: "GUIDED",
                  goal: {
                    body: "Observe the before/after of sourcing yourself, then configure your shell so every new terminal has ROS 2 available automatically — and prove it in a genuinely new terminal.",
                  },
                  steps: [
                    {
                      title: "Watch it fail, deliberately",
                      content: {
                        body: "In a fresh terminal, confirm both of these behave as this lesson describes. Seeing the failure yourself is what makes the fix meaningful later:",
                        visuals: [
                          {
                            kind: "CODE",
                            data: { language: "bash", code: "ros2 --help        # expect: command not found\necho $ROS_DISTRO   # expect: an empty line" },
                          },
                        ],
                      },
                    },
                    {
                      title: "Source it, and watch it work",
                      content: {
                        body: "Now source the setup script and re-run both commands in the same terminal. ROS_DISTRO should read jazzy, and ros2 --help should print its command list:",
                        visuals: [
                          {
                            kind: "CODE",
                            data: { language: "bash", code: "source /opt/ros/jazzy/setup.bash\necho $ROS_DISTRO   # expect: jazzy\nros2 --help        # expect: the ros2 help output" },
                          },
                        ],
                      },
                    },
                    {
                      title: "Make it permanent, then prove it",
                      content: {
                        body: "Append the source line to ~/.bashrc, then open a completely new terminal window — not a cleared screen, not a new tab in the same shell that's already sourced. In that new window, echo $ROS_DISTRO should read jazzy with no manual sourcing:",
                        visuals: [
                          {
                            kind: "CODE",
                            data: { language: "bash", code: "echo \"source /opt/ros/jazzy/setup.bash\" >> ~/.bashrc\n\n# Now open a NEW terminal window, and in it:\necho $ROS_DISTRO   # expect: jazzy" },
                          },
                        ],
                      },
                    },
                  ],
                },
              },
            },
            {
              type: "CALLOUT",
              data: {
                variant: "TIP",
                title: "What you just connected",
                body: "Module 2's stack diagram had a ROS 2 Client Library layer sitting under your code. Sourcing setup.bash is literally the step that connects your terminal to that layer — it's why rclpy becomes importable and why ros2 becomes a command. The diagram stopped being an abstraction about thirty seconds ago.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Your terminal knows about ROS 2 permanently now.\n\nNext: formally verifying that everything actually works — three checkpoints in order — and exactly what to do when one of them doesn't.",
              },
            },
          ],
        },
        {
          slug: "verification-and-troubleshooting",
          title: "Verification and Troubleshooting",
          durationMinutes: 26,
          contentBlocks: [
            {
              type: "TEXT",
              data: {
                body: "Three checks, in order, each more specific than the last.\n\nThey're deliberately cumulative: Checkpoint 2 only means anything if Checkpoint 1 passed, and Checkpoint 3 presupposes both. So run them in sequence and stop at the first failure — that's the one worth diagnosing. Chasing a Checkpoint 3 failure while Checkpoint 1 is quietly broken is how people end up reinstalling for no reason.\n\nIf one fails, the decision tree further down tells you exactly where to look.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "CHECKPOINT 1 — Can ROS 2 run?\n\nThe most basic question there is: does your terminal have a working ros2 command at all?\n\nRun ros2 --help. Success looks like the usage text and the list of subcommands — action, bag, node, param, pkg, run, topic and the rest.\n\nIf you want a fuller picture, ros2 doctor runs a set of environment checks and reports back; \"All checks passed\" is what you're after. A warning or two about network interfaces is common and not necessarily a problem at this stage.\n\nFailure here almost always means one of two things: not sourced, or not actually installed.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "CHECKPOINT 2 — Can the terminal find ROS 2 packages?\n\nA working ros2 command doesn't prove your environment can find the packages that came with the distribution. This checks that.\n\nRun ros2 pkg list. Success is a long alphabetical list — several hundred entries, starting around action_msgs and ament_cmake and running well past rclpy, rviz2 and turtlesim.\n\nThose names should look familiar. They're the package chips from Module 2's diagram, and this is the moment that concept stops being a diagram and becomes a list your own machine produced.\n\nA short list, or no list, means your environment is only partly wired up — the install may have half-completed, or the wrong distribution may be sourced.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "CHECKPOINT 3 — Can a ROS 2 node run?\n\nFinding packages isn't the same as running one. This is the real test.\n\nRun ros2 run demo_nodes_cpp talker. Success is a steady stream of log lines, roughly one per second, each announcing a published message:\n\n[INFO] [1699887654.123456789] [talker]: Publishing: 'Hello World: 1'\n[INFO] [1699887655.187654321] [talker]: Publishing: 'Hello World: 2'\n\nPress Ctrl+C to stop it.\n\nThat is a real ROS 2 node, running on your machine, publishing to a topic — the thing Module 1's diagram was drawing and Module 2 named. demo_nodes_cpp ships with the desktop bundle you installed, which is why it's here rather than anything you'd have to build.",
              },
            },
            {
              type: "IMAGE",
              data: {
                src: "/courses/ros2-fundamentals/module-3-troubleshooting-tree.png",
                alt: "A troubleshooting decision tree with five branches, each running symptom to diagnostic command to fix. Branch one: apt install fails immediately, check lsb_release -a, cause is the wrong Ubuntu version. Branch two, marked as the fifth branch: commands die mid-run with UnicodeDecodeError or encoding errors, check locale, cause is a locale that is not UTF-8. Branch three: permission denied during install or when running a node, check ls -la on the dot-ros directory, cause is permission issues from a stray sudo. Branch four: command not found for ros2 despite a successful install, check echo of ROS_DISTRO, cause is forgetting to source. Branch five: ros2 runs but behaves oddly, check for ros lines in bashrc, cause is conflicting installs.",
                caption:
                  "Find your symptom along the top row, then read down. Every failure here has a specific, checkable cause — the diagram opens full-size if the text is small.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Walking the branches, left to right.\n\nWrong Ubuntu version. The symptom is early and blunt: the repository step or apt install ros-jazzy-desktop fails almost immediately, often complaining it can't find the package. Run lsb_release -a and read the Release line. It must say exactly 24.04. If it says 22.04 or 20.04, Jazzy's standard install path cannot proceed — the packages don't exist for those releases. Fix the base system first; there's no workaround worth attempting here.\n\nLocale not set to UTF-8. Covered on its own below, because its symptom looks unlike the other four.\n\nPermission issues. Either the install fails with \"Permission denied\", or — more confusingly — the install went fine and a ros2 command fails later. Run ls -la ~/.ros and look at the owner column. If root owns files in there, a ros2 command was run with sudo at some point, and every later run as yourself now fails trying to write to files it no longer owns. Fix with sudo chown -R $USER:$USER ~/.ros. Then don't sudo ros2 commands: apt needs root, ROS 2 does not.\n\nForgot to source. command not found: ros2, despite an install you watched succeed. Run echo $ROS_DISTRO — an empty line means this terminal was never sourced. Source it, and if you expected it to be automatic, check the line actually made it into ~/.bashrc with grep ros ~/.bashrc, and that you tested in a genuinely new terminal rather than the one that was already open.\n\nExisting conflicting installs. The subtlest of the five, because nothing errors outright — ros2 runs, but the wrong packages appear or discovery behaves inconsistently. Run echo $ROS_DISTRO and confirm it reads exactly jazzy, then grep ros ~/.bashrc to see how many distributions are being sourced. More than one is the problem.",
              },
            },
            {
              type: "CALLOUT",
              data: {
                variant: "INFO",
                title: "Why locale gets its own branch",
                body: "The other four branches all fail in ways that point at themselves: something is missing, unset, unowned, or duplicated. A misconfigured locale is different. The install is correct, sourcing is correct, permissions are fine, nothing conflicts — the environment is right, but its character encoding is wrong. So commands die partway through with a UnicodeDecodeError or an encoding complaint rather than a clean \"not found\", which sends people hunting for a broken install that isn't broken. Run locale: if LANG reads C or POSIX rather than something ending in UTF-8, that's your answer. Setting a UTF-8 locale is step one of ROS 2's own official install instructions, which is exactly why it's so easy to skim past and so puzzling afterwards.",
              },
            },
            {
              type: "CODE",
              data: {
                language: "bash",
                filename: "fix-locale.sh",
                caption:
                  "Illustrative output. Real locale output is a dozen or so lines and your values may differ — en_GB.UTF-8 is just as good as en_US.UTF-8. The only thing being checked is whether they end in UTF-8 at all.",
                code: ROS2_LOCALE_FIX_SCRIPT,
              },
            },
            {
              type: "CALLOUT",
              data: {
                variant: "DANGER",
                title: "Never source two distributions in one terminal",
                body: "If ROS 1, or a second ROS 2 distribution, is also installed on this machine, having both sourced at once produces failures that are genuinely hard to explain — commands that exist but behave wrongly, packages that appear and disappear, nodes that can't find each other. Nothing errors cleanly, which is what makes it so costly. Source exactly one distribution per terminal, and keep only one source line in ~/.bashrc.",
              },
            },
            {
              type: "EXERCISE",
              exercise: {
                title: "Debugging challenge: Checkpoint 3 fails on permissions",
                instructions:
                  "Work the symptom before revealing anything. The hints come one at a time on purpose — the habit of diagnosing systematically is what this exercise is actually teaching.",
                config: {
                  type: "DEBUGGING",
                  scenario: {
                    body: "Checkpoints 1 and 2 both passed cleanly. ros2 --help prints its help, and ros2 pkg list returns several hundred packages.\n\nThen Checkpoint 3 fails. Running ros2 run demo_nodes_cpp talker produces a Permission denied error as the node tries to write to its log directory, and the node never starts publishing.\n\nNothing was reinstalled between the checks, and no error appeared during installation.\n\nWhat's happened, and how would you confirm it before changing anything?",
                    visuals: [
                      {
                        kind: "CODE",
                        data: {
                          language: "text",
                          code: "$ ros2 run demo_nodes_cpp talker\n[ERROR] [rcl]: Failed to create log directory: /home/you/.ros/log\n  Permission denied\n[ros2run]: Process exited with failure 1",
                          caption:
                            "Illustrative output. Your username replaces \"you\" in the path, and the exact wording varies between releases. The shape to recognise is a permission error on a path under ~/.ros.",
                        },
                      },
                    ],
                  },
                  hints: [
                    "Checkpoints 1 and 2 passing tells you a lot: ROS 2 is installed, this terminal is sourced correctly, and packages are discoverable. So the problem isn't the install and isn't the environment — it's specific to writing something.",
                    "Check who owns the ROS 2 log directory: ls -la ~/.ros. Look at the owner column rather than the permission bits. Does anything in there belong to someone other than your own username?",
                    "If root owns files under ~/.ros, ask how they got there. What would have to have been run, at least once, for root to create files in your home directory? Think back over the commands you've run in this module.",
                  ],
                  rootCause: {
                    body: "sudo runs a command as root — including any files that command creates as a side effect. A single sudo ros2 ... run, even once, creates root-owned log and configuration files under ~/.ros. Every subsequent run as your normal user then fails trying to write to files it no longer has permission to touch.\n\nThe reason this is confusing is that the failure appears long after the mistake, on a completely different command, and looks like a broken installation rather than a permissions problem.",
                  },
                  solution: {
                    body: "Give the directory back to yourself, then re-run Checkpoint 3 normally — without sudo:",
                    visuals: [
                      {
                        kind: "CODE",
                        data: {
                          language: "bash",
                          code: "ls -la ~/.ros            # confirm root owns something in here\nsudo chown -R $USER:$USER ~/.ros\n\nros2 run demo_nodes_cpp talker   # no sudo, ever",
                        },
                      },
                    ],
                  },
                },
              },
            },
            {
              type: "EXERCISE",
              exercise: {
                title: "Closing challenge: run all three checkpoints from memory",
                instructions:
                  "No scrolling back. If you can't recall a command, that's useful information about what to re-read.",
                config: {
                  type: "INDEPENDENT",
                  goal: {
                    body: "Open a completely fresh terminal and run all three checkpoints in order, from memory, without referring back to this lesson. Confirm all three pass.",
                  },
                  successCriteria: [
                    "A brand new terminal window, opened after your ~/.bashrc change — not one that was already open",
                    "Checkpoint 1 passes without sourcing anything manually first",
                    "Checkpoint 2 returns a long package list, and you can spot at least one package name you recognise from Module 2",
                    "Checkpoint 3 prints publishing log lines, which you then stop cleanly with Ctrl+C",
                    "You can say, in your own words, what sourcing did to make all three possible",
                  ],
                  hints: [
                    "The three checkpoints go from most general to most specific: can it run at all, can it find things, can it do something.",
                    "Checkpoint 3's node lives in the demo_nodes_cpp package, and the executable is the one that talks rather than the one that listens.",
                  ],
                },
              },
            },
            {
              type: "QUIZ",
              quiz: {
                title: "Module 3 Check: Installation, Sourcing, and Diagnosis",
                description:
                  "Five troubleshooting scenarios. Each explanation names the branch of the decision tree it belongs to, so a wrong answer points you somewhere specific.",
                questions: [
                  {
                    type: "SINGLE_CHOICE",
                    prompt:
                      "You open a brand new terminal and run ros2 --help. It says command not found. You installed ROS 2 successfully an hour ago. Most likely cause?",
                    options: [
                      { id: "not-sourced", label: "This terminal hasn't sourced the ROS 2 setup script" },
                      { id: "bad-install", label: "The installation silently failed and must be redone" },
                      { id: "wrong-ubuntu", label: "The machine is running the wrong Ubuntu version" },
                      { id: "needs-sudo", label: "ros2 needs to be run with sudo" },
                    ],
                    correctOptionIds: ["not-sourced"],
                    explanation:
                      "Sourcing affects one shell session, so a new terminal starts without ROS 2 on its PATH unless ~/.bashrc does it for you. Confirm with echo $ROS_DISTRO — an empty line means unsourced. This is the \"forgot to source\" branch, and it's the most common failure on this module by a wide margin. Reinstalling would waste an hour and change nothing, and sudo would actively make things worse by creating root-owned files.",
                  },
                  {
                    type: "SINGLE_CHOICE",
                    prompt:
                      "ros2 --help works fine, but ros2 pkg list returns nothing at all. Which checkpoint has failed, and what's the sensible next step?",
                    options: [
                      { id: "cp2", label: "Checkpoint 2 — re-check $ROS_DISTRO and sourcing, and confirm the install actually completed" },
                      { id: "cp1", label: "Checkpoint 1 — the ros2 command itself is broken" },
                      { id: "cp3", label: "Checkpoint 3 — nodes can't be run on this machine" },
                      { id: "reinstall", label: "None — reinstall Ubuntu and start over" },
                    ],
                    correctOptionIds: ["cp2"],
                    explanation:
                      "Checkpoint 2 is exactly \"can the terminal find ROS 2 packages?\", so an empty list is that checkpoint failing. Checkpoint 1 clearly passed, since ros2 --help worked. The usual causes are a partly-sourced environment or an install that didn't finish, both of which are checkable in seconds. Reinstalling the operating system for this is the instinct the whole decision tree exists to replace.",
                  },
                  {
                    type: "TRUE_FALSE",
                    prompt:
                      "If a ros2 command isn't working, it's reasonable to try running it with sudo to rule out a permissions problem.",
                    correctAnswer: false,
                    explanation:
                      "False, and this one bites hard. sudo ros2 ... creates root-owned files under ~/.ros, and every later run as your normal user then fails trying to write to them — so a command that was merely unsourced becomes a genuine permissions problem you created. This is precisely the debugging exercise's root cause. apt needs root to install ROS 2; ROS 2 itself never needs root to run.",
                  },
                  {
                    type: "SINGLE_CHOICE",
                    prompt:
                      "A colleague has ROS 1 and ROS 2 Jazzy installed on the same machine, and ~/.bashrc sources both. Things mostly work but behave inconsistently. What's the safest practice?",
                    options: [
                      { id: "one-per-terminal", label: "Source exactly one distribution per terminal — leave only one source line in ~/.bashrc" },
                      { id: "order", label: "Keep both, but make sure ROS 2 is sourced after ROS 1 so it wins" },
                      { id: "uninstall", label: "Uninstall ROS 1 entirely; the two cannot coexist on one machine" },
                      { id: "fine", label: "Nothing — sourcing both is supported and the inconsistency is unrelated" },
                    ],
                    correctOptionIds: ["one-per-terminal"],
                    explanation:
                      "Both can be installed side by side; what causes trouble is having both sourced in the same shell, which produces failures that don't error cleanly. Relying on source order is fragile and doesn't actually separate the environments. Uninstalling ROS 1 is heavier than necessary — the fix is one source line per terminal. This is the \"conflicting installs\" branch.",
                  },
                  {
                    type: "SINGLE_CHOICE",
                    prompt:
                      "Partway through setup, commands start failing with a UnicodeDecodeError rather than a \"not found\" error. Sourcing is correct, the packages are installed, and nothing is owned by root. What should you check?",
                    options: [
                      { id: "locale", label: "Run locale — the shell may not be using a UTF-8 locale" },
                      { id: "resource", label: "Re-source setup.bash; the environment has been lost mid-session" },
                      { id: "reinstall2", label: "Reinstall ros-jazzy-desktop, since the package files are corrupted" },
                      { id: "domain", label: "Set ROS_DOMAIN_ID, since discovery is misconfigured" },
                    ],
                    correctOptionIds: ["locale"],
                    explanation:
                      "An encoding error means the environment is present but mis-encoded — LANG reading C or POSIX instead of a UTF-8 locale. Setting a UTF-8 locale is step one of ROS 2's official install instructions, which is exactly why it gets skimmed past. This branch is worth knowing precisely because it doesn't look like the others: nothing is missing, unset or unowned, so the usual four checks all come back clean. Fix with locale-gen and update-locale, then re-check with locale.",
                  },
                ],
              },
            },
            {
              type: "TEXT",
              data: {
                body: "That's the module.\n\nUbuntu confirmed (Lesson 1), ROS 2 physically installed and located (Lesson 2), your terminal connected to it permanently (Lesson 3), and three checkpoints passed — with five real failure modes either fixed or now understood well enough to diagnose (this lesson).\n\nEvery checkpoint you just ran used a plain demo node, deliberately not Turtlesim. That's next. Module 4 is the first time you'll run and control an actual simulated robot — and everything that makes ros2 run work today is what makes that possible.",
              },
            },
          ],
        },
      ],
    },
    {
      title: "Your First ROS 2 System",
      summary:
        "Run and control an actual simulated robot, then look inside the running system — and come out with four questions the rest of the course answers.",
      lessons: [
        {
          slug: "meet-turtlesim",
          title: "Meet Turtlesim",
          durationMinutes: 16,
          contentBlocks: [
            {
              type: "TEXT",
              data: {
                body: "Your last checkpoint in Module 3 was ros2 run demo_nodes_cpp talker, and it printed lines of text.\n\nThis lesson runs a command of exactly the same shape. One package name and one executable name are different. This time, something opens.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Turtlesim is a deliberately trivial simulator: a coloured square, and a turtle that leaves a line behind it as it moves.\n\nThat triviality is the point, and it isn't a compromise. A realistic robot at this stage would hide the thing you're actually here to see. Every minute spent understanding its joints, its sensors and its physics would be a minute not spent on the architecture around it — and the architecture is what transfers.\n\nSo the turtle is not the subject. The system around the turtle is the subject. Keep that in mind when it looks too simple to be worth your time; by Lesson 3 you'll be inspecting a live distributed system, and the fact that it happens to be driving a cartoon is what makes that possible this early.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "First, confirm you already have it.\n\nIn Module 3 you installed ros-jazzy-desktop, and turtlesim is part of that bundle. So for most people this is a confirmation rather than an install.",
              },
            },
            {
              type: "CODE",
              data: {
                language: "bash",
                filename: "check-turtlesim.sh",
                code: "# What can I actually run from the turtlesim package?\nros2 pkg executables turtlesim\n\n# turtlesim draw_square\n# turtlesim mimic\n# turtlesim turtle_teleop_key\n# turtlesim turtlesim_node\n\n# Nothing listed? You installed a smaller variant than ros-jazzy-desktop:\nsudo apt update && sudo apt install -y ros-jazzy-turtlesim",
                caption:
                  "Illustrative output. The executables shown are the ones this module uses; your list may include others depending on your install variant. If turtlesim_node and turtle_teleop_key are both there, you have everything this module needs.",
              },
            },
            {
              type: "CODE",
              data: {
                language: "bash",
                filename: "run-turtlesim.sh",
                code: "ros2 run turtlesim turtlesim_node",
              },
            },
            {
              type: "IMAGE",
              data: {
                src: "/courses/ros2-fundamentals/module-4-turtlesim-window.png",
                alt: "A terminal running ros2 run turtlesim turtlesim_node, with an arrow labelled \"draws into\" pointing to a separate TurtleSim window containing a green turtle on a blue background. The terminal is annotated \"the node is here — this terminal is still busy\"; the window is annotated \"the window is just output — there is no control in it\".",
                caption:
                  "The program and the picture are two different things. The terminal holds the running node; the window is only what it draws.",
              },
            },
            {
              type: "CALLOUT",
              data: {
                variant: "WARNING",
                title: "If no window appears, this is almost certainly not ROS 2",
                body: "This is the first program in the course that opens a window, which makes it the first time your graphics setup matters. If you're on a virtual machine or WSL2, this is the moment the warning from Module 3 Lesson 1 becomes real.\n\nThe tell is a healthy-looking terminal — log lines appear, no errors, the command doesn't exit — with nothing on screen. That combination means the node started fine and had nowhere to draw. Module 3's troubleshooting tree deliberately didn't cover this, because nothing before now needed a display. The checks below are that missing branch.",
              },
            },
            {
              type: "CODE",
              data: {
                language: "bash",
                filename: "check-display.sh",
                code: "# Does this shell have a display to draw on at all?\necho $DISPLAY\n#   :0        <- fine\n#   :1        <- also fine\n#   (empty)   <- this is your problem\n\n# WSL2: WSLg provides the display. Windows 11 has it built in;\n# on Windows 10 you need an X server running on the Windows side.\nwsl.exe --version   # run this from Windows, not from inside Ubuntu\n\n# Virtual machine: install guest additions and enable 3D acceleration\n# in the VM's display settings, then reboot the guest.\n\n# Connected over SSH? Forward X11 explicitly:\n# ssh -X user@host",
                caption:
                  "Illustrative output. Display values vary by setup and none of these commands is ROS 2 — that is the point. A missing window is a host-environment problem, and fixing it happens outside ROS 2 entirely.",
              },
            },
            {
              type: "EXERCISE",
              exercise: {
                title: "Get the turtle on screen",
                instructions:
                  "Short, and more important than it looks. Everything in this module assumes this window exists.",
                config: {
                  type: "GUIDED",
                  goal: {
                    body: "Start turtlesim_node and confirm — visually, on your actual screen — that a window with a turtle in it is open. Not \"the command ran without errors\": a window you can see.",
                  },
                  steps: [
                    {
                      title: "Confirm the package is there",
                      content: {
                        body: "Check what turtlesim gives you to run. You're looking for turtlesim_node and turtle_teleop_key in the list:",
                        visuals: [
                          {
                            kind: "CODE",
                            data: {
                              language: "bash",
                              code: "ros2 pkg executables turtlesim",
                            },
                          },
                        ],
                      },
                    },
                    {
                      title: "Start the simulator",
                      content: {
                        body: "Run it, and leave this terminal alone afterwards — the program lives in it. Don't close it, and don't press Ctrl+C until you're finished with the whole lesson:",
                        visuals: [
                          {
                            kind: "CODE",
                            data: {
                              language: "bash",
                              code: "ros2 run turtlesim turtlesim_node",
                            },
                          },
                        ],
                      },
                    },
                    {
                      title: "Look at your screen, not at the terminal",
                      content: {
                        body: "A window titled TurtleSim should be open, with a blue background and a turtle near the middle. If the terminal looks healthy but no window appeared, work through the display checks above before continuing — the rest of this module depends on being able to see the turtle move.",
                      },
                    },
                  ],
                },
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Look at what you actually typed:\n\nros2 run turtlesim turtlesim_node\n\nAnd what you typed in Module 3:\n\nros2 run demo_nodes_cpp talker\n\nSame command, same shape: ros2 run, then a package, then an executable inside it. Nothing about the command got more advanced. The program it started did.\n\nThat shape is worth holding on to, because it doesn't change. Every node you run for the rest of this course — including ones you write yourself — starts the same way.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "The turtle is sitting still, and nothing in that window will move it. Click it, press the arrow keys in it, and nothing happens.\n\nThat's not a missing feature. Controlling the turtle is a different program's job — and running it is Lesson 2.",
              },
            },
          ],
        },
        {
          slug: "two-programs-one-system",
          title: "Two Programs, One System",
          durationMinutes: 18,
          contentBlocks: [
            {
              type: "TEXT",
              data: {
                body: "Leave turtlesim running. Open a second terminal.\n\nThe turtle needs something to tell it where to go, and that something is a completely separate program — one that knows how to read your arrow keys and turn them into movement commands.",
              },
            },
            {
              type: "CALLOUT",
              data: {
                variant: "TIP",
                title: "This is a brand new terminal",
                body: "If you skipped the ~/.bashrc step in Module 3 Lesson 3, ros2 will be missing here — same failure, same fix, and this is exactly why making it permanent was worth the extra thirty seconds.\n\nCheck with echo $ROS_DISTRO. It should print jazzy. An empty line means source /opt/ros/jazzy/setup.bash first.",
              },
            },
            {
              type: "CODE",
              data: {
                language: "bash",
                filename: "drive-the-turtle.sh",
                code: "ros2 run turtlesim turtle_teleop_key\n\n# Reading from keyboard\n# ---------------------------\n# Use arrow keys to move the turtle.\n# Use G|B|V|C|D|E|R|T keys to rotate to absolute orientations.\n# 'F' to cancel a rotation.",
                caption:
                  "Illustrative output. The exact banner wording varies between releases. What matters is that it prints something and then sits there waiting — that means it started correctly.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Now arrange your windows so you can see the TurtleSim window and the teleop terminal at the same time.\n\nThen the one rule that catches almost everybody: the teleop terminal must have keyboard focus. Not the TurtleSim window — the terminal.\n\nThis feels wrong, because the window you're watching is the turtle. But turtle_teleop_key reads keystrokes from the terminal it's running in, and the TurtleSim window has no keyboard handling at all. Click the window you're watching and your arrow keys go nowhere. The official ROS 2 tutorial gives the same instruction in its own words, for the same reason.",
              },
            },
            {
              type: "EXERCISE",
              exercise: {
                title: "Drive the turtle",
                instructions:
                  "Both programs need to be running at once. Keep the first terminal untouched.",
                config: {
                  type: "GUIDED",
                  goal: {
                    body: "Move the turtle around deliberately, and draw a closed shape — a square or a triangle — with the line it leaves behind.",
                  },
                  steps: [
                    {
                      title: "Check the new terminal knows about ROS 2",
                      content: {
                        body: "A new terminal is a new shell. Prove it's sourced before assuming anything else is wrong:",
                        visuals: [
                          {
                            kind: "CODE",
                            data: {
                              language: "bash",
                              code: "echo $ROS_DISTRO   # expect: jazzy",
                            },
                          },
                        ],
                      },
                    },
                    {
                      title: "Start the teleop node",
                      content: {
                        body: "Leave turtlesim_node running in the first terminal. In this second one:",
                        visuals: [
                          {
                            kind: "CODE",
                            data: {
                              language: "bash",
                              code: "ros2 run turtlesim turtle_teleop_key",
                            },
                          },
                        ],
                      },
                    },
                    {
                      title: "Arrange the windows, then click the terminal",
                      content: {
                        body: "Position them so the TurtleSim window is visible while the teleop terminal is the one you've clicked into. This is a real step, not stage direction — get it wrong and nothing will move, and you'll spend ten minutes looking for a fault that isn't there.",
                      },
                    },
                    {
                      title: "Draw something on purpose",
                      content: {
                        body: "Use the arrow keys to trace a closed shape. Up moves forward, left and right rotate. You'll notice the turtle moves a short distance and then stops by itself, so a straight edge takes several presses — that behaviour is deliberate and it comes up again at the end of this lesson.",
                      },
                    },
                  ],
                },
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Now stop and look at what just happened, because it's easy to miss.\n\nTurtlesim started first. At that moment, teleop did not exist. Turtlesim was not told that anything would ever want to drive it.\n\nTeleop started second, in a different terminal, as a separate program with its own process. It was never given an address, a port number, a socket, or a configuration file. Nothing you typed connected the two.\n\nAnd yet your arrow keys move the turtle.",
              },
            },
            {
              type: "IMAGE",
              data: {
                src: "/courses/ros2-fundamentals/module-4-invisible-link.png",
                alt: "Two terminals side by side — one running turtlesim_node labelled \"started first, knows nothing about teleop\", the other running turtle_teleop_key labelled \"started second, knows nothing about turtlesim\" — joined by a dashed arrow labelled /turtle1/cmd_vel, with a tag reading \"this link has a name — you meet it properly in Module 6\".",
                caption:
                  "Neither program was configured to find the other. The connection between them is real, has a name, and was made without you.",
              },
            },
            {
              type: "CALLOUT",
              data: {
                variant: "INFO",
                title: "You've already seen this, as a diagram",
                body: "Module 2 called this automatic discovery and drew it as part of the ROS Graph. At the time it was a claim on a slide — something you were asked to accept.\n\nThis is the same mechanism, running on your machine, with your two terminals. Nothing was faked for the demonstration: this is genuinely how ROS 2 nodes find each other, and it works the same way whether the two programs are in adjacent terminals or on different computers on the same network.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "One more thing to notice before you move on, and then deliberately not explain.\n\nPress an arrow key and let go. The turtle moves a short distance and stops on its own — even though you never told it to stop.\n\nThat is not a bug, and it isn't Turtlesim being simplistic. It's a direct consequence of how the two programs communicate, and the explanation is genuinely interesting. It's also Module 6's, so hold on to the question rather than looking it up. Lesson 3 gives you a way to see the evidence for yourself.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Two programs. One system. No configuration.\n\nNext: opening a third terminal and interrogating that system from the outside, while it's still running.",
              },
            },
          ],
        },
        {
          slug: "inspecting-a-running-system",
          title: "Inspecting a Running System",
          durationMinutes: 20,
          contentBlocks: [
            {
              type: "TEXT",
              data: {
                body: "Both programs are still running. Leave them that way and open a third terminal.\n\nYou are about to interrogate a live system from the outside. No code changes, no restart, no special debug mode, no flag you had to remember to pass at startup. The system is simply inspectable while it runs.\n\nThat is worth pausing on, because it isn't how most software works. In ROS 2 it's ordinary, everyday practice — and it is one of the genuinely unusual things the framework gives you.",
              },
            },
            {
              type: "CODE",
              data: {
                language: "bash",
                filename: "inspect.sh",
                code: "ros2 node list\n# /turtlesim\n# /teleop_turtle\n\nros2 topic list\n# /parameter_events\n# /rosout\n# /turtle1/cmd_vel\n# /turtle1/color_sensor\n# /turtle1/pose\n\nros2 service list\n# /clear\n# /kill\n# /reset\n# /spawn\n# /turtle1/set_pen\n# /turtle1/teleport_absolute\n# ...\n\nros2 action list\n# /turtle1/rotate_absolute",
                caption:
                  "Illustrative output, abridged. Service and topic lists are longer than shown and include per-node parameter entries; exact names and ordering vary with your ROS 2 version. Match the shape — several entries per command, including one named /turtle1/cmd_vel — not the exact characters.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Read those four results at the level of \"what kind of thing is this\", and no deeper.\n\nNodes are the separate programs. Two of them: the simulator and the teleop program you started. Each one is a running process doing one job.\n\nTopics are streams of data flowing between them. One of them is /turtle1/cmd_vel — the name from the diagram in Lesson 2. Another, /turtle1/pose, is the turtle continuously reporting where it is.\n\nServices are things you can ask for and get an answer back. /spawn adds another turtle. /turtle1/teleport_absolute puts the turtle somewhere instantly.\n\nActions are long-running goals you can track while they happen and cancel partway through. Turtlesim offers one: rotating to a specific angle, which takes real time to complete.",
              },
            },
            {
              type: "CALLOUT",
              data: {
                variant: "INFO",
                title: "You are not expected to understand these yet",
                body: "That was four paragraphs for four concepts that each get an entire module. It's deliberately thin, and you should read it as thin rather than as something you failed to absorb.\n\nThis lesson's job is to make sure you have seen these things exist, in a real system, with your own two programs. Nodes are Module 5. Topics are Module 6. Services are Module 7. Actions are Module 8. Every question this raises has a scheduled answer.\n\nIf you finish this module able to say \"I've seen a topic, and I know roughly what kind of thing it is\", that is exactly the intended outcome.",
              },
            },
            {
              type: "IMAGE",
              data: {
                src: "/courses/ros2-fundamentals/module-4-inspection-map.png",
                alt: "A four-row map. ros2 node list shows the separate programs running now, explained in Module 5. ros2 topic list shows continuous streams of data, Module 6. ros2 service list shows ask-and-get-an-answer requests, Module 7. ros2 action list shows long-running goals you can track and cancel, Module 8.",
                caption:
                  "A map, not a test. Each command has a module with its name on it.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "A list tells you what exists. It doesn't tell you what's actually happening.\n\nFor that there's echo, which attaches to a topic and prints every message flowing through it, live. This is the single most useful command in this lesson — it turns an abstract claim about two programs communicating into something you can watch.\n\nRun it, then press an arrow key in your teleop terminal and watch this third terminal.",
              },
            },
            {
              type: "CODE",
              data: {
                language: "bash",
                filename: "watch-the-data.sh",
                code: "ros2 topic echo /turtle1/cmd_vel\n\n# ... nothing, until you press an arrow key in the teleop terminal:\n\nlinear:\n  x: 2.0\n  y: 0.0\n  z: 0.0\nangular:\n  x: 0.0\n  y: 0.0\n  z: 0.0\n---",
                caption:
                  "Illustrative output. The numbers depend on which key you pressed and how the teleop node is configured; newer releases may print additional message fields. The shape — a linear group, an angular group, and a --- between messages — is what to match.",
              },
            },
            {
              type: "IMAGE",
              data: {
                src: "/courses/ros2-fundamentals/module-4-cmd-vel-anatomy.png",
                alt: "An annotated breakdown of one cmd_vel message. The linear group's x value is highlighted at 2.0 while all five other values are zero. Annotations explain that linear is straight-line speed and angular is turning speed, that the arrow key changed exactly one number, and that the --- separator means this is a stream of messages rather than a single event.",
                caption:
                  "Pressing a key set exactly one number. Everything else stayed at zero.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Here is the part that stops this being a toy.\n\nA topic named /cmd_vel, carrying a message with a linear part and an angular part, is not something Turtlesim invented for teaching. It is the standard way mobile robots are driven in ROS 2. Real wheeled robots — warehouse robots, delivery robots, research platforms — subscribe to a topic with that name and that message shape, and drive their motors from it.\n\nWhich means the command you just ran works, unchanged, on a real robot. So do all four list commands. You are not learning a simplified teaching version that gets replaced later.\n\nThe turtle is a toy. The interface is not.",
              },
            },
            {
              type: "EXERCISE",
              exercise: {
                title: "Answer four questions using only the command line",
                instructions:
                  "No steps this time — just the goal. Every command you need was in this lesson; work from memory or scroll back, but don't expect to be walked through it.",
                config: {
                  type: "INDEPENDENT",
                  goal: {
                    body: "With turtlesim and teleop both still running, answer these four questions using nothing but the terminal:\n\n1. How many separate ROS 2 programs are running right now?\n2. Which topic carries your steering commands?\n3. Roughly how many services does turtlesim offer?\n4. Name one action it offers.\n\nThis is the first exercise in this course that gives you a goal instead of a procedure. That's on purpose.",
                  },
                  successCriteria: [
                    "You found the number of running nodes without being told which command to use.",
                    "You identified /turtle1/cmd_vel as the topic carrying steering commands, and can say how you knew.",
                    "You listed turtlesim's services and can name at least two of them.",
                    "You named the action turtlesim offers, and noticed there is only one.",
                  ],
                  hints: [
                    "All four answers come from the same family of commands, and you ran every one of them earlier in this lesson. The pattern is ros2 <thing> list.",
                    "For question 2: you saw the topic name in Lesson 2's diagram before you ever ran a command. Cross-check it against ros2 topic list rather than trusting your memory.",
                    "For question 4: ros2 action list returns a single line here. If you expected more, that's a reasonable expectation — turtlesim is small, and most real systems offer several.",
                  ],
                },
              },
            },
            {
              type: "TEXT",
              data: {
                body: "You can now look inside a running ROS 2 system from the outside, and watch real data move through it.\n\nNext: what to do when what you see is nothing at all — and names for everything you just looked at.",
              },
            },
          ],
        },
        {
          slug: "when-it-doesnt-work",
          title: "When It Doesn't Work, and What You Just Saw",
          durationMinutes: 22,
          contentBlocks: [
            {
              type: "TEXT",
              data: {
                body: "Those four commands in Lesson 3 weren't a sightseeing tour.\n\nThey are the debugger. In ROS 2, \"why isn't this working\" is answered by inspecting the live system, not by adding print statements and restarting — and the tools you use to be curious are the same tools you use to diagnose.\n\nHere is the first time you need them.",
              },
            },
            {
              type: "EXERCISE",
              exercise: {
                title: "Debugging challenge: the turtle won't move",
                instructions:
                  "Work the symptom before revealing anything. The hints come one at a time deliberately — the habit being taught here is the order you check things in, not the answer.",
                config: {
                  type: "DEBUGGING",
                  scenario: {
                    body: "The TurtleSim window is open and the turtle is clearly visible.\n\nturtle_teleop_key is running in a second terminal. It printed its usage banner without errors, so it started correctly — which also tells you that terminal is sourced properly, since ros2 was found and ran.\n\nYou press the arrow keys. Nothing moves. No error appears in either terminal.\n\nWhat's happened, and how would you confirm it before changing anything?",
                  },
                  hints: [
                    "Don't start at the keyboard, and don't restart anything yet. Ask a narrower question first: is anything being published at all? Open a third terminal and run ros2 topic echo /turtle1/cmd_vel, then press the arrow keys again. Messages, or silence?",
                    "Silence. That rules out a whole half of the system: turtlesim isn't ignoring commands, because no commands are being sent. The problem is upstream of the topic entirely, on the teleop side.",
                    "Teleop is running, healthy and sourced — so it isn't broken. What else would stop a running program from ever noticing your keystrokes? Look at which window your window manager has highlighted right now.",
                  ],
                  rootCause: {
                    body: "The TurtleSim window had keyboard focus, not the teleop terminal.\n\nturtle_teleop_key reads raw keystrokes from the terminal it is running in. When the TurtleSim window is focused, your arrow keys go to the simulator — and the simulator has no keyboard handling whatsoever, so it silently discards them. Teleop never sees a keypress, so it never publishes a message, so nothing reaches the turtle.\n\nNothing was broken. The input never reached the publisher. That's why there was no error anywhere: from every program's point of view, absolutely nothing happened.",
                  },
                  solution: {
                    body: "Click the teleop terminal to give it focus, keeping the TurtleSim window visible but unfocused, then drive again. Confirm with echo still running in the third terminal — messages should now appear on every keypress:",
                    visuals: [
                      {
                        kind: "CODE",
                        data: {
                          language: "bash",
                          code: "# Terminal 3, still watching:\nros2 topic echo /turtle1/cmd_vel\n\n# Click Terminal 2 (teleop), press an arrow key, and messages appear here.",
                        },
                      },
                    ],
                  },
                },
              },
            },
            {
              type: "TEXT",
              data: {
                body: "The specific answer matters less than the order you arrived at it.\n\nYou did not start by guessing. You asked one narrow question — is anything being sent? — and the answer to that one question cut the problem in half. Silence meant the fault was on the sending side, so you never wasted a minute investigating the receiver.\n\nAsk whether anything is being published before asking why nothing is arriving.\n\nAlmost every communication bug in ROS 2 splits along that line, and you now have a command that tests it directly. This was the easiest possible case to practise on: both programs healthy, no error messages, and a cause that has nothing to do with ROS 2 at all. The cases in later modules are harder. The first question stays the same.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "So: names for the four things you've been looking at.\n\nNodes are the separate programs that make up a system. You ran two. Real robots run dozens, each with one job. That's Module 5, and you'll write your own.\n\nTopics are continuous one-way streams of data. /turtle1/cmd_vel carried your steering; /turtle1/pose carries the turtle's position back out. That's Module 6 — including why the turtle stops on its own when you let go of a key.\n\nServices are request-and-response: you ask, something happens, you get an answer. /spawn and /turtle1/teleport_absolute are both services. That's Module 7.\n\nActions are for goals that take time — you can watch progress and cancel partway. Turtlesim's single action rotates the turtle to an absolute angle. That's Module 8.\n\nYou now have a question for each of the next four modules. That was the goal of this one.",
              },
            },
            {
              type: "CALLOUT",
              data: {
                variant: "TIP",
                title: "A common assumption worth correcting now",
                body: "It's natural to assume one program equals one ROS 2 application — that a robot runs \"the robot software\", singular.\n\nYou just ran two separate programs that formed one system, and neither was in charge of the other. That's the normal shape. A real robot runs dozens of nodes at once: one reading a laser scanner, one planning a path, one driving the motors, one watching the battery. Any of them can be restarted, replaced or inspected without stopping the rest.\n\nThat's why Module 5 spends its time on why systems get split up, not just on what the word \"node\" means.",
              },
            },
            {
              type: "QUIZ",
              quiz: {
                title: "Module 4 Check: Running and Inspecting Your First System",
                description:
                  "Five questions about what you actually observed. The explanations matter more than the answers — each one points at the module that goes deeper.",
                questions: [
                  {
                    type: "SINGLE_CHOICE",
                    prompt:
                      "You started turtlesim_node and turtle_teleop_key in separate terminals. You never gave either one an address, a port, or a config file — yet the arrow keys drive the turtle. What made that connection possible?",
                    options: [
                      { id: "discovery", label: "Automatic discovery — the nodes found each other on their own" },
                      { id: "same-terminal", label: "They were started from the same machine, so they share memory" },
                      { id: "bashrc", label: "The source line in ~/.bashrc connected them" },
                      { id: "turtlesim-special", label: "Turtlesim is a special case, wired to accept teleop specifically" },
                    ],
                    correctOptionIds: ["discovery"],
                    explanation:
                      "This is Module 2's automatic discovery, seen working on your own machine. Nodes announce what they publish and subscribe to, and the middleware matches them up — which is why start order didn't matter and why no configuration was needed. It also works across different computers on a network, not just between terminals. Sourcing (~/.bashrc) only makes the ros2 command available in a shell; it connects nothing. And nothing about turtlesim is special here — the same thing happens between any two nodes.",
                  },
                  {
                    type: "SINGLE_CHOICE",
                    prompt:
                      "Which single command tells you how many separate ROS 2 programs are currently running?",
                    options: [
                      { id: "node-list", label: "ros2 node list" },
                      { id: "topic-list", label: "ros2 topic list" },
                      { id: "pkg-list", label: "ros2 pkg list" },
                      { id: "run", label: "ros2 run" },
                    ],
                    correctOptionIds: ["node-list"],
                    explanation:
                      "Nodes are the running programs, so ros2 node list is the one that counts them — it returned /turtlesim and /teleop_turtle for you. ros2 topic list shows the data streams between them, which is a different question. ros2 pkg list shows what is installed on the machine, which is not the same as what is running — several hundred packages are installed and two nodes are running. ros2 run starts a node rather than listing any.",
                  },
                  {
                    type: "SINGLE_CHOICE",
                    prompt:
                      "ros2 topic echo /turtle1/cmd_vel prints nothing at all while you press the arrow keys, and the turtle doesn't move. Where is the problem?",
                    options: [
                      { id: "publisher", label: "On the publishing side — nothing is being sent, so turtlesim is not at fault" },
                      { id: "subscriber", label: "In turtlesim — it's receiving messages but ignoring them" },
                      { id: "topic-name", label: "The topic doesn't exist, so it must be recreated" },
                      { id: "reinstall", label: "The ROS 2 install is broken and should be reinstalled" },
                    ],
                    correctOptionIds: ["publisher"],
                    explanation:
                      "Silence from echo means no messages exist on that topic, which puts the fault before the topic, not after it. That single check cuts the problem in half and saves you from investigating a receiver that is working perfectly — the habit is to ask whether anything is being published before asking why nothing is arriving. In this module's debugging exercise the cause was keyboard focus, but the same reasoning applies whatever the specific cause turns out to be. If the topic genuinely didn't exist it wouldn't appear in ros2 topic list, which is the next thing to check.",
                  },
                  {
                    type: "TRUE_FALSE",
                    prompt:
                      "Turtlesim is a learning tool, so the commands you used on it don't transfer to real robots.",
                    correctAnswer: false,
                    explanation:
                      "False, and this is the point of using turtlesim at all. A topic named /cmd_vel carrying a message with linear and angular parts is the standard velocity interface for real mobile robots — warehouse robots and research platforms are driven exactly this way. The four list commands and topic echo work unchanged on any ROS 2 system, real or simulated. What's simplified here is the robot, not the interface, so nothing you learned in this module gets replaced later.",
                  },
                  {
                    type: "SINGLE_CHOICE",
                    prompt:
                      "Of the four things you listed in Lesson 3, which would you expect to handle a long-running task that you could monitor while it happens and cancel partway through?",
                    options: [
                      { id: "actions", label: "Actions" },
                      { id: "topics", label: "Topics" },
                      { id: "services", label: "Services" },
                      { id: "nodes", label: "Nodes" },
                    ],
                    correctOptionIds: ["actions"],
                    explanation:
                      "Actions. You aren't expected to know this from experience yet — it's answerable from the map in Lesson 3, which glosses actions as long-running goals you can track and cancel. The distinction matters and Module 8 develops it: a service is request-and-response, so you ask and wait with no visibility while it runs and no way to change your mind. A topic is a one-way stream with no notion of a goal being complete. An action gives you progress updates and a cancel option, which is what you want for something like \"drive to that location\" that takes thirty seconds and might need to be abandoned.",
                  },
                ],
              },
            },
            {
              type: "FILE",
              data: {
                href: "/courses/ros2-fundamentals/module-4-turtlesim-cheatsheet.pdf",
                label: "Turtlesim & system inspection — quick reference (PDF)",
                description:
                  "Every command from this module on one page, with the two troubleshooting paths — nothing moves, and no window appears — on the same sheet. Worth keeping open on a second screen from here on; the inspection commands come back in every remaining module.",
                sizeLabel: "60 KB",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "That's the module.\n\nA window and a robot (Lesson 1). Two independent programs cooperating with no configuration between them (Lesson 2). The running system inspected from outside, with names for what you found (Lesson 3). Those same tools used to diagnose a real failure (this lesson).\n\nYou ran two nodes without knowing what a node is. That worked — and it stops working the moment you want to write your own.\n\nModule 5 answers the first of your four questions: what a node actually is, why robotics systems are split into many of them rather than one big program, and how to build one yourself.",
              },
            },
          ],
        },
      ],
    },
    {
      title: "ROS 2 Nodes",
      summary:
        "What a node actually is, why robots are built out of dozens of them, and how to write one yourself — in about fifteen lines.",
      lessons: [
        {
          slug: "what-a-node-actually-is",
          title: "What a Node Actually Is",
          durationMinutes: 18,
          contentBlocks: [
            {
              type: "TEXT",
              data: {
                body: "In Module 4 you ran ros2 node list and got two lines back. You were told they were \"the separate programs running right now\", and that each one gets a full module.\n\nThis is that module, and this is the rest of the answer.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "A node is one running process that does one job and announces itself to the rest of the system by name.\n\nRead that again with the emphasis on running. A node is not a file on disk. It is not a class, or a library, or a folder. It is a process that is executing right now — which is why it appears in ros2 node list only while it's running, and why pressing Ctrl+C makes it stop existing.\n\nThat distinction sounds pedantic until something goes wrong. \"The node isn't there\" and \"the file isn't there\" are completely different problems with completely different fixes, and beginners conflate them constantly.",
              },
            },
            {
              type: "CALLOUT",
              data: {
                variant: "INFO",
                title: "One executable, usually one node",
                body: "Everything in this module assumes one program contains exactly one node, which is true of almost everything you'll meet as a beginner and true of both programs you ran in Module 4.\n\nIt is possible to put several nodes inside one executable. It's occasionally useful, it has a name (composition), and it comes up much later. Worth knowing the rule has an exception so you don't build a false certainty — not worth chasing now.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Now the thing that costs beginners an hour: there are three names in play, they look alike, and they are not the same.\n\nIn ros2 run turtlesim turtlesim_node, turtlesim is the package — a bundle of software you installed. turtlesim_node is the executable — the specific program inside that package that you asked to run. And /turtlesim, with a leading slash, is the node name — what the running process calls itself, and what showed up in ros2 node list.\n\nThree words, three different things, and in this case two of them look nearly identical.\n\nTeleop makes the point unmissable. The executable is turtle_teleop_key. The node is /teleop_turtle. Those aren't even the same words in the same order. You cannot derive one from the other — you have to ask the running system.",
              },
            },
            {
              type: "IMAGE",
              data: {
                src: "/courses/ros2-fundamentals/module-5-node-anatomy.png",
                alt: "A diagram separating how a node is started from what a node is. On the left, the package turtlesim and the executable turtlesim_node are labelled \"how you started it\", with a warning that neither is the node's name. In the centre, a box labelled \"the node\" named /turtlesim, described as one running process doing one job that stops existing on Ctrl+C. On the right, four ports: publishes, subscribes, services and actions.",
                caption:
                  "The package and executable are how you launched it. The node is the thing that's running.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "A node exposes four kinds of connection to the rest of the system: the topics it publishes, the topics it subscribes to, the services it offers, and the actions it offers.\n\nThose are exactly Module 4's four list commands — but seen from inside one node rather than across the whole system. ros2 topic list told you every topic that exists anywhere. ros2 node info tells you which of them this particular node is responsible for.\n\nThat shift in viewpoint is what makes debugging possible. \"A topic exists\" is rarely useful. \"This node publishes it and that node subscribes to it\" is the thing you actually need to know.",
              },
            },
            {
              type: "CODE",
              data: {
                language: "bash",
                filename: "node-info.sh",
                code: "ros2 node info /turtlesim\n\n/turtlesim\n  Subscribers:\n    /parameter_events: rcl_interfaces/msg/ParameterEvent\n    /turtle1/cmd_vel: geometry_msgs/msg/Twist\n  Publishers:\n    /parameter_events: rcl_interfaces/msg/ParameterEvent\n    /rosout: rcl_interfaces/msg/Log\n    /turtle1/color_sensor: turtlesim/msg/Color\n    /turtle1/pose: turtlesim/msg/Pose\n  Service Servers:\n    /clear: std_srvs/srv/Empty\n    /kill: turtlesim/srv/Kill\n    /spawn: turtlesim/srv/Spawn\n    ...\n  Action Servers:\n    /turtle1/rotate_absolute: turtlesim/action/RotateAbsolute",
                caption:
                  "Illustrative output, abridged at the ellipsis. Service lists are longer than shown and parameter-related entries vary by ROS 2 version. What matters is the shape: four labelled sections, with /turtle1/cmd_vel appearing under Subscribers.",
              },
            },
            {
              type: "CALLOUT",
              data: {
                variant: "TIP",
                title: "node list is the census. node info is the interview.",
                body: "One tells you who is out there. The other tells you what a specific node thinks it's connected to — which is very often not what you assumed when you wrote it.\n\nWhen one node in a working system starts misbehaving, this is the command that narrows the problem fastest. It comes back in every remaining module.",
              },
            },
            {
              type: "EXERCISE",
              exercise: {
                title: "Interrogate both nodes",
                instructions:
                  "Start turtlesim and teleop again if they're not running — same two commands as Module 4. Then read the output rather than skimming it.",
                config: {
                  type: "GUIDED",
                  goal: {
                    body: "Use ros2 node info on both nodes and answer two questions from the output alone: which node publishes /turtle1/cmd_vel and which subscribes to it, and which of the two offers services.",
                  },
                  steps: [
                    {
                      title: "Interview the simulator",
                      content: {
                        body: "Look specifically at where /turtle1/cmd_vel appears — under Subscribers or under Publishers:",
                        visuals: [
                          {
                            kind: "CODE",
                            data: {
                              language: "bash",
                              code: "ros2 node info /turtlesim",
                            },
                          },
                        ],
                      },
                    },
                    {
                      title: "Interview the driver",
                      content: {
                        body: "Now the other one. The same topic should appear — in the opposite section:",
                        visuals: [
                          {
                            kind: "CODE",
                            data: {
                              language: "bash",
                              code: "ros2 node info /teleop_turtle",
                            },
                          },
                        ],
                      },
                    },
                    {
                      title: "Say the direction out loud",
                      content: {
                        body: "Teleop publishes /turtle1/cmd_vel. Turtlesim subscribes to it. Data flows from the thing reading your keyboard to the thing drawing the turtle — which is the direction the arrow pointed in Module 4's diagram, now confirmed from the system itself rather than taken on trust.\n\nGetting publisher and subscriber the wrong way round is the single most common misreading of this output, and it makes Module 6 twice as hard. Worth thirty seconds of care now.",
                      },
                    },
                  ],
                },
              },
            },
            {
              type: "TEXT",
              data: {
                body: "You can now say what a node is, tell it apart from the package and executable that started it, and interrogate one.\n\nThe more interesting question is why anyone would build a robot out of dozens of these instead of one program that does everything. That's next.",
              },
            },
          ],
        },
        {
          slug: "why-systems-are-split-into-nodes",
          title: "Why Systems Are Split Into Nodes",
          durationMinutes: 18,
          contentBlocks: [
            {
              type: "TEXT",
              data: {
                body: "Splitting a program into a dozen communicating processes is more work than writing one program. More things to start, more things to name, more places for a bug to hide.\n\nNobody does that for elegance. Here is what it actually buys — and, at the end of this lesson, what it costs.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Picture a mobile robot that drives itself around a building.\n\nSomething reads the laser scanner. Something works out where the robot is from those readings. Something decides where to go next. Something turns that decision into wheel speeds. Something watches the battery. Something reads the camera.\n\nIn ROS 2 each of those is its own node — its own process, with its own job, started and stopped independently. Several of them were probably written by different people, and at least one was almost certainly written by someone outside the team entirely and reused without modification.",
              },
            },
            {
              type: "IMAGE",
              data: {
                src: "/courses/ros2-fundamentals/module-5-real-robot-nodes.png",
                alt: "A node graph of a mobile robot: lidar_driver and camera_driver feed localisation over /scan and /image_raw; localisation feeds path_planner over /pose; path_planner feeds motor_controller over /cmd_vel; battery_monitor publishes /battery_state. The lidar_driver box is shaded and tagged \"written by someone else, reused unchanged\".",
                caption:
                  "Six nodes, each one job. A working robot runs dozens — and no one person wrote them all.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Four things that buys you, each of them concrete rather than architectural.\n\nIndependent failure. If the path planner crashes, the motor controller does not. It keeps running, keeps accepting commands, and is still there when the planner is restarted. In a single-program design, one bad pointer takes down the wheels too.\n\nReuse. A driver written for one laser scanner works on the next robot that uses the same scanner, unchanged. This is why the lidar node in the diagram above is shaded — most teams did not write theirs.\n\nLanguage independence. A Python node and a C++ node work together with no bridge, no bindings and no translation layer, because they communicate over topics rather than by calling each other's functions. You will write Python in this course and use C++ nodes without noticing.\n\nDistribution. Nodes can run on different computers on the same network. The heavy vision processing on a workstation, the motor driver on the robot itself — and neither one needs to know the difference.",
              },
            },
            {
              type: "EXERCISE",
              exercise: {
                title: "Kill one node and watch the other survive",
                instructions:
                  "Thirty seconds, no new commands. The claim about independent failure is one you can test rather than believe.",
                config: {
                  type: "GUIDED",
                  goal: {
                    body: "With turtlesim and teleop both running, stop teleop only — and confirm from three different angles that turtlesim neither noticed nor cared.",
                  },
                  steps: [
                    {
                      title: "Stop teleop, and only teleop",
                      content: {
                        body: "Click the teleop terminal and press Ctrl+C. Leave the turtlesim terminal completely alone.",
                      },
                    },
                    {
                      title: "Look at the simulator",
                      content: {
                        body: "The turtle is still on screen. The turtlesim terminal shows no error, no warning, and hasn't exited. From its point of view nothing happened at all — which is the point.",
                      },
                    },
                    {
                      title: "Take the census",
                      content: {
                        body: "Confirm it from the system rather than by eye. One name should be gone; the other should still be there:",
                        visuals: [
                          {
                            kind: "CODE",
                            data: {
                              language: "bash",
                              code: "ros2 node list   # /turtlesim only — /teleop_turtle is gone",
                            },
                          },
                        ],
                      },
                    },
                    {
                      title: "Bring it back",
                      content: {
                        body: "Restart teleop and press an arrow key. It works immediately. You reconfigured nothing, restarted nothing else, and told neither program about the other:",
                        visuals: [
                          {
                            kind: "CODE",
                            data: {
                              language: "bash",
                              code: "ros2 run turtlesim turtle_teleop_key",
                            },
                          },
                        ],
                      },
                    },
                  ],
                },
              },
            },
            {
              type: "TEXT",
              data: {
                body: "That is the entire argument, and you just ran it.\n\nA component of a running system was killed and restarted, and the rest of the system did not notice. In a single-program design that sequence is called a crash followed by a restart, and everything else goes down with it. Here it's called Tuesday.\n\nOn a real robot this is not a party trick. It's how you restart a misbehaving path planner without power-cycling a machine that's holding something heavy.",
              },
            },
            {
              type: "CALLOUT",
              data: {
                variant: "INFO",
                title: "Module 1 argued this. You just did the experiment.",
                body: "Module 1 made the case that monolithic robotics software doesn't scale, and drew monolith-versus-modular as a diagram. It was a claim you were asked to accept on the strength of the argument.\n\nYou now have evidence. Same idea, your machine, thirty seconds.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Now the honest half, because a module that only sells the benefits produces engineers who split everything into forty pieces.\n\nMore nodes means more processes to start, supervise and shut down — which is why launch files exist, and why they get a whole module later. It means a bug can now live between two nodes rather than inside either one, in the space where they disagree about a topic name or a message type. It means debugging spans several terminals at once, which is why RQt and the inspection tools matter. And data crossing a process boundary is not free — it is cheap, and almost always worth it, but it is not the zero cost of a function call.\n\nDeciding how many nodes, and where to draw the lines between them, is real engineering judgement. It is not a rule you can look up.",
              },
            },
            {
              type: "CALLOUT",
              data: {
                variant: "WARNING",
                title: "\"One node per job\" hides a hard question",
                body: "The guideline is one node, one job. The trouble is that \"job\" is doing enormous work in that sentence.\n\nA node per sensor is almost always right. A node per function is almost always wrong — follow that instinct and you end up with forty processes, a launch file nobody understands, and a debugging problem worse than the monolith you were avoiding.\n\nWhen in doubt, start with fewer and split when something concrete forces you to — a piece that needs to restart independently, or run on a different machine, or be reused elsewhere.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "You've seen why systems are split up, and what it costs to split them badly.\n\nNext: writing one yourself. About fifteen lines, and no build system anywhere in sight.",
              },
            },
          ],
        },
        {
          slug: "writing-your-first-node",
          title: "Writing Your First Node",
          durationMinutes: 24,
          contentBlocks: [
            {
              type: "TEXT",
              data: {
                body: "This is a plain Python file that you run with python3. No workspace, no package, no build step.\n\nThat is deliberate, and it's worth saying why before you wonder what's being hidden from you. Workspaces, packages and colcon are real, they matter, and they get a full module later. But none of them is what a node is. Dragging them in now would mean your first node fails because an entry point string had a typo, and you'd spend the evening debugging build configuration instead of learning the thing this module is about.\n\nSo: one file, run it directly, and Module 10 will explain why that stops being good enough.",
              },
            },
            {
              type: "CALLOUT",
              data: {
                variant: "INFO",
                title: "Why import rclpy works at all",
                body: "You can import ROS 2's Python library from an ordinary script because sourcing /opt/ros/jazzy/setup.bash put it on this shell's Python path.\n\nThat's the same sourcing from Module 3 Lesson 3 — the one that felt like a chore at the time. This is the first moment it does something you can see. If import rclpy fails, the fix is not pip; it's echo $ROS_DISTRO, and then sourcing.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Build it in three stages. Run each one before reading the next — every stage does something different, and the differences are the lesson.\n\nCreate a file called my_first_node.py anywhere you like. Your home directory is fine.",
              },
            },
            {
              type: "CODE",
              data: {
                language: "python",
                filename: "my_first_node.py — stage 1",
                code: "import rclpy\nfrom rclpy.node import Node\n\nrclpy.init()\nnode = Node(\"my_first_node\")\nrclpy.shutdown()",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Run it with python3 my_first_node.py. It returns to the prompt instantly and prints nothing.\n\nThat is the correct outcome. A node was created — briefly. Then the script reached the end and the process exited, taking the node with it.\n\nThis is the first lesson's point made concrete: a node is a running process, so a node that doesn't stay running isn't a node you can do anything with. If you'd run ros2 node list in another terminal you would never have caught it; it didn't exist long enough.",
              },
            },
            {
              type: "CODE",
              data: {
                language: "python",
                filename: "my_first_node.py — stage 2",
                code: "import rclpy\nfrom rclpy.node import Node\n\nrclpy.init()\nnode = Node(\"my_first_node\")\n\n# Keep this node alive and let ROS 2 run it.\nrclpy.spin(node)\n\nnode.destroy_node()\nrclpy.shutdown()",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Run it again. This time it doesn't come back — the terminal sits there, apparently doing nothing, until you press Ctrl+C.\n\nspin is worth understanding rather than copying. It hands control of your program over to ROS 2 and says: keep this node alive, and call my code when something happens. It is the reason the process doesn't exit, and it is the reason Ctrl+C is how you stop a node.\n\nThe common misreading is that spin is a wait — a sleep with a nicer name. It isn't. It's the thing that runs your code. Nothing in a ROS 2 node happens outside it.",
              },
            },
            {
              type: "EXERCISE",
              exercise: {
                title: "Write it, run it, and find yourself in the census",
                instructions:
                  "Two terminals. The second one is where this becomes real.",
                config: {
                  type: "GUIDED",
                  goal: {
                    body: "Get stage 2 running, then find your own node's name in ros2 node list from a different terminal — the same command that showed you turtlesim and teleop in Module 4.",
                  },
                  steps: [
                    {
                      title: "Run stage 1 and watch it exit",
                      content: {
                        body: "Don't skip this. Seeing it exit instantly is what makes spin meaningful thirty seconds later:",
                        visuals: [
                          {
                            kind: "CODE",
                            data: {
                              language: "bash",
                              code: "python3 my_first_node.py   # returns immediately, prints nothing",
                            },
                          },
                        ],
                      },
                    },
                    {
                      title: "Add spin and run it again",
                      content: {
                        body: "Now it should stay running and not return to the prompt. Leave it running.",
                      },
                    },
                    {
                      title: "Take the census from a second terminal",
                      content: {
                        body: "Open a new terminal — check it's sourced if you skipped the ~/.bashrc step — and look for your own node's name:",
                        visuals: [
                          {
                            kind: "CODE",
                            data: {
                              language: "bash",
                              code: "ros2 node list\n# /my_first_node",
                              caption:
                                "Illustrative output. If turtlesim or teleop are still running from earlier lessons, their names appear here too — that's fine and expected.",
                            },
                          },
                        ],
                      },
                    },
                    {
                      title: "Notice what just happened",
                      content: {
                        body: "The program you wrote is in the same list, produced by the same command, as the simulator you were given. There is no separate category for beginner nodes. From the system's point of view yours is simply a node, exactly like the others.",
                      },
                    },
                  ],
                },
              },
            },
            {
              type: "IMAGE",
              data: {
                src: "/courses/ros2-fundamentals/module-5-node-program-shape.png",
                alt: "The shape of a ROS 2 node program as four stages with their code beside them: start ROS 2 for this process (rclpy.init), create the node, hand control to ROS 2 (rclpy.spin) with a branch showing that your callbacks run from spin rather than spin being a wait, and clean up node first (destroy_node then shutdown).",
                caption:
                  "Every ROS 2 node program has this shape. Your code lives in the callbacks, not in a loop you write yourself.",
              },
            },
            {
              type: "CODE",
              data: {
                language: "python",
                filename: "my_first_node.py — stage 3",
                code: "import rclpy\nfrom rclpy.node import Node\n\n\nclass MyFirstNode(Node):\n    def __init__(self):\n        super().__init__(\"my_first_node\")\n        self.count = 0\n        # Call self.on_timer() once every second.\n        self.create_timer(1.0, self.on_timer)\n\n    def on_timer(self):\n        self.count += 1\n        self.get_logger().info(f\"Still here. Tick {self.count}.\")\n\n\ndef main():\n    rclpy.init()\n    node = MyFirstNode()\n    try:\n        rclpy.spin(node)\n    except KeyboardInterrupt:\n        pass\n    finally:\n        node.destroy_node()\n        rclpy.shutdown()\n\n\nif __name__ == \"__main__\":\n    main()",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Run this one and it logs a line every second until you stop it.\n\nTwo things changed. The node is now a class that inherits from Node, which is how essentially every real ROS 2 node is written — it gives you somewhere to keep state, like that counter. And there's a timer, which asks ROS 2 to call your method once a second.\n\nThat timer is the important one. You did not write a loop. You handed ROS 2 a function and said \"call this every second,\" and spin does the calling. That callback pattern is the whole of Module 6: a subscriber is the same idea, except the trigger is a message arriving instead of a second passing.",
              },
            },
            {
              type: "CALLOUT",
              data: {
                variant: "TIP",
                title: "Use the logger, not print()",
                body: "print() works and nobody will stop you. But self.get_logger().info() stamps every line with the node's name and a timestamp, and publishes it on /rosout alongside every other node's output.\n\nWith one node running, that's a nicety. With twelve running across three terminals, it's the difference between a debuggable system and a wall of anonymous text where you cannot tell which process said what.",
              },
            },
            {
              type: "CODE",
              data: {
                language: "cpp",
                filename: "the same node in C++ (read only)",
                code: "#include \"rclcpp/rclcpp.hpp\"\n\nclass MyFirstNode : public rclcpp::Node {\npublic:\n  MyFirstNode() : Node(\"my_first_node\"), count_(0) {\n    timer_ = create_wall_timer(std::chrono::seconds(1),\n                               [this]() { on_timer(); });\n  }\n\nprivate:\n  void on_timer() {\n    RCLCPP_INFO(get_logger(), \"Still here. Tick %d.\", ++count_);\n  }\n  rclcpp::TimerBase::SharedPtr timer_;\n  int count_;\n};\n\nint main(int argc, char ** argv) {\n  rclcpp::init(argc, argv);\n  rclcpp::spin(std::make_shared<MyFirstNode>());\n  rclcpp::shutdown();\n}",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "You are not expected to write that, and this course stays in Python throughout.\n\nRead it for one reason: init, a node object with a name, a timer, spin, shutdown. All five are there, in the same order, doing the same jobs. The concept transfers completely. Only the syntax changes.\n\nThat is not a coincidence or a nicety — it's the language independence from Lesson 2, seen from the inside. A C++ node and a Python node are the same kind of thing to ROS 2, which is why they interoperate without anyone building a bridge.",
              },
            },
            {
              type: "FILE",
              data: {
                href: "/courses/ros2-fundamentals/module-5-first-node.py",
                label: "my_first_node.py — the finished stage 3 script",
                description:
                  "The complete, commented version of what you just built. If you fought a typo, diff against this rather than starting over. Run it with python3, not ros2 run — it deliberately isn't a package.",
                sizeLabel: "2 KB",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "You've written a node, run it, and found it in the system's own list.\n\nNext: what happens when there are several of them — including the one mistake that produces the strangest symptoms in this whole module, because it produces no error at all.",
              },
            },
          ],
        },
        {
          slug: "naming-discovery-and-many-nodes",
          title: "Naming, Discovery, and Many Nodes",
          durationMinutes: 22,
          contentBlocks: [
            {
              type: "TEXT",
              data: {
                body: "A node's name is not decoration. It's the address every other piece of tooling uses to talk about it.\n\nros2 node info takes a name. Every debugging command you've learned takes a name. So a node called my_first_node in a system of thirty nodes is a node you cannot usefully talk about — and on a real robot you will have several instances of the same program running at once, which makes the hard-coded name in your script an active problem rather than a cosmetic one.",
              },
            },
            {
              type: "CODE",
              data: {
                language: "bash",
                filename: "renaming.sh",
                code: "# Rename at launch, without editing the file:\nros2 run turtlesim turtlesim_node --ros-args -r __node:=simulator_a\n\n# The same works for your own script:\npython3 my_first_node.py --ros-args -r __node:=left_wheel\n\n# Confirm it took effect:\nros2 node list\n# /left_wheel",
                caption:
                  "Illustrative output. Your list will also show anything else you have running. The point is that the name changed without the file changing.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "That -r __node:= is your first taste of remapping — telling a node to use a different name for something at launch rather than at edit time. Node names are the narrowest and most useful case; the general form covers topics too, and that's Module 9.\n\nNow discovery, which Module 4 asked you to notice and this module can finally explain.\n\nWhen a node starts, it announces itself and what it publishes and subscribes to. Other nodes are listening for exactly those announcements, and they match up automatically. There is no central server, no master process, nothing that has to be started first.\n\nThat last point is a genuine difference from ROS 1, where a roscore had to be running before anything else would work — and it's why start order didn't matter in Module 4. Turtlesim didn't need to exist before teleop, or after it.",
              },
            },
            {
              type: "CALLOUT",
              data: {
                variant: "INFO",
                title: "No master also means no fence",
                body: "Because there's no central process deciding who belongs, a node running on another machine on the same network can join your system without you doing anything at all.\n\nThat's genuinely useful — it's how the distribution benefit from Lesson 2 works in practice. It's also occasionally startling, particularly in a classroom or shared office where several people are running the same tutorial at once and suddenly seeing each other's nodes.\n\nThe fix is ROS_DOMAIN_ID, which partitions networks into separate ROS 2 systems. That's Module 9 — worth knowing it exists if you hit this before then.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Which brings us to the failure mode that makes this lesson worth its length.\n\nWhat happens if two nodes have the same name?\n\nROS 2 does not stop you. There's no error, no warning, no refusal to start. Both processes run. Both work. Both log happily.\n\nThe only visible symptom is that ros2 node list prints the same name twice — and that's easy to read as a display quirk rather than a problem. Meanwhile every tool that resolves a node name has become ambiguous, because the name no longer identifies one thing. Commands don't fail; they just answer a question that now has two answers.",
              },
            },
            {
              type: "IMAGE",
              data: {
                src: "/courses/ros2-fundamentals/module-5-name-collision.png",
                alt: "Two identical node boxes, both named /my_first_node, both marked healthy and logging in separate terminals. Dashed red arrows fork upward from a ros2 node info command toward both boxes, labelled \"which one?\". Below, ros2 node list prints /my_first_node twice, annotated as the only warning you get.",
                caption:
                  "Nothing crashed. The system is ambiguous rather than broken — which is harder to notice and harder to diagnose.",
              },
            },
            {
              type: "EXERCISE",
              exercise: {
                title: "Debugging challenge: results that keep changing",
                instructions:
                  "This one has no error message anywhere. Work the symptom systematically — that's the skill being taught here, more than the specific answer.",
                config: {
                  type: "DEBUGGING",
                  scenario: {
                    body: "You start your node from Lesson 3 in one terminal. In a second terminal you start the same script again, because you want two of them running.\n\nBoth terminals look completely healthy. Both are logging their tick once a second, exactly as expected. Nothing has errored and nothing has crashed.\n\nThen ros2 node info /my_first_node starts returning results that don't match what you expect — and, stranger, results that differ between runs of the same command.\n\nWhat's happened, and how would you confirm it before changing anything?",
                  },
                  hints: [
                    "Before investigating either node, take the census. Run ros2 node list and read every line carefully — including the ones that look like duplicates of each other. Count them.",
                    "The same name appears twice. That isn't a display bug: there really are two nodes, and they really are both called the same thing. Now reconsider the command you were running — what can ros2 node info /my_first_node possibly mean when the name identifies two things?",
                    "Every node-targeting command takes a name, not a process id. There's nothing else for it to go on. What should a tool do when the name it was handed matches two different nodes?",
                  ],
                  rootCause: {
                    body: "Both processes claimed the node name my_first_node, because the name is hard-coded in the script and you ran that script twice.\n\nA node's name is its address in the system, and ROS 2 does not enforce uniqueness — it will let two nodes share a name and carry on without comment. Every tool that resolves that name is then ambiguous, which is exactly why the results looked inconsistent rather than wrong. Nothing failed. The question simply stopped having a single answer.\n\nThis is worth sitting with, because it breaks a habit. Most of the bugs in this course so far announced themselves: command not found, Permission denied, a turtle that wouldn't move. This one announces nothing. Inconsistency is the symptom.",
                  },
                  solution: {
                    body: "Give each instance a distinct name at launch rather than editing the file twice. Stop the second one, and restart it renamed:",
                    visuals: [
                      {
                        kind: "CODE",
                        data: {
                          language: "bash",
                          code: "python3 my_first_node.py --ros-args -r __node:=my_second_node\n\nros2 node list\n# /my_first_node\n# /my_second_node   <- two different names, no ambiguity",
                          caption:
                            "Illustrative output. Anything else you have running appears here too. The fix is confirmed by two different names, not by an absence of errors — there were never any errors.",
                        },
                      },
                    ],
                  },
                },
              },
            },
            {
              type: "EXERCISE",
              exercise: {
                title: "Run a three-node system",
                instructions:
                  "Goal only, no procedure. Every command you need appeared earlier in this module.",
                config: {
                  type: "INDEPENDENT",
                  goal: {
                    body: "Start three copies of your Lesson 3 node at the same time, each with a distinct and meaningful name of your own choosing — something like left_wheel, right_wheel and battery_monitor rather than node1, node2, node3.\n\nConfirm all three appear with distinct names, then interrogate exactly one of them and explain how the system knew which one you meant.",
                  },
                  successCriteria: [
                    "Three copies of the same script are running simultaneously, in three terminals.",
                    "ros2 node list shows three distinct names, with no duplicates.",
                    "You renamed them at launch rather than by editing the file three times.",
                    "ros2 node info on one of them returns that node specifically, and you can say why that worked here but not in the debugging exercise.",
                  ],
                  hints: [
                    "You are not editing my_first_node.py at all for this. Everything happens on the command line.",
                    "The renaming syntax is in this lesson's first CODE block. It goes after the script name, not before it.",
                    "If a name comes back with a leading slash in node list and you typed it without one, that's normal — pass it to node info the way node list printed it.",
                  ],
                },
              },
            },
            {
              type: "QUIZ",
              quiz: {
                title: "Module 5 Check: Nodes, Names, and Why Systems Split",
                description:
                  "Five questions on what you built and observed. The explanations carry the teaching — each one names the concept to revisit if the answer surprised you.",
                questions: [
                  {
                    type: "SINGLE_CHOICE",
                    prompt:
                      "ros2 node list shows /my_first_node twice. Nothing has errored, and both terminals look healthy. What has happened, and why does it matter?",
                    options: [
                      { id: "ambiguous", label: "Two processes claim the same node name, so every name-targeting tool is now ambiguous" },
                      { id: "display", label: "A display glitch in node list — there is really only one node" },
                      { id: "crashed", label: "One node has crashed and is being shown twice before it disappears" },
                      { id: "harmless", label: "Nothing — duplicate names are normal and ROS 2 resolves them automatically" },
                    ],
                    correctOptionIds: ["ambiguous"],
                    explanation:
                      "ROS 2 does not enforce unique node names. Both nodes run happily, which is precisely the problem: there is no error to notice, and the duplicated line in node list is the only signal you get. Tools like ros2 node info take a name and nothing else, so once a name matches two nodes the answer stops being well-defined — you see inconsistency rather than failure. Fix it by renaming at launch with --ros-args -r __node:=<name>.",
                  },
                  {
                    type: "SINGLE_CHOICE",
                    prompt:
                      "Your robot's path planner node crashes while the robot is driving. What happens to the motor controller node running alongside it?",
                    options: [
                      { id: "keeps-running", label: "It keeps running, unaffected — it is a separate process" },
                      { id: "crashes-too", label: "It crashes too, since nodes in one system share a process" },
                      { id: "restarts", label: "ROS 2 automatically restarts both nodes together" },
                      { id: "blocks", label: "It blocks and waits until the planner comes back" },
                    ],
                    correctOptionIds: ["keeps-running"],
                    explanation:
                      "Independent failure is the concrete benefit of splitting a system into processes, and you tested it in Lesson 2 by killing teleop while turtlesim carried on without noticing. The motor controller keeps running and keeps accepting commands; it simply stops receiving new ones until the planner is restarted. Nothing restarts anything automatically in plain ROS 2 — supervising and restarting nodes is what launch files and process managers are for, which is Module 11.",
                  },
                  {
                    type: "SINGLE_CHOICE",
                    prompt:
                      "You want to know which topics one specific node publishes and which it subscribes to. Which command?",
                    options: [
                      { id: "node-info", label: "ros2 node info <name>" },
                      { id: "node-list", label: "ros2 node list" },
                      { id: "topic-list", label: "ros2 topic list" },
                      { id: "pkg-list", label: "ros2 pkg list" },
                    ],
                    correctOptionIds: ["node-info"],
                    explanation:
                      "node list is the census — who is out there. node info is the interview — what one specific node thinks it is connected to. topic list is the closest wrong answer and worth being clear about: it tells you which topics exist across the whole system, but says nothing about which node is responsible for any of them, which is usually the thing you actually need when debugging.",
                  },
                  {
                    type: "SINGLE_CHOICE",
                    prompt:
                      "In the command ros2 run turtlesim turtlesim_node, which part is the node's name?",
                    options: [
                      { id: "neither", label: "Neither — the node is called /turtlesim, and you can only learn that by asking the running system" },
                      { id: "turtlesim-node", label: "turtlesim_node — the second argument is always the node name" },
                      { id: "turtlesim", label: "turtlesim — the first argument is always the node name" },
                      { id: "ros2-run", label: "ros2 run — the command sets the name automatically" },
                    ],
                    correctOptionIds: ["neither"],
                    explanation:
                      "Three different things share similar words here: turtlesim is the package, turtlesim_node is the executable, and /turtlesim is the node name that appears in ros2 node list. You cannot derive the node name from the command — it is chosen inside the program. Teleop makes this unmissable: the executable is turtle_teleop_key and the node is /teleop_turtle, which are not even the same words in the same order.",
                  },
                  {
                    type: "TRUE_FALSE",
                    prompt:
                      "Because a Python node and a C++ node are written in different languages, they need a bridge or translation layer to communicate.",
                    correctAnswer: false,
                    explanation:
                      "False. Nodes communicate over topics, services and actions — not by calling each other's functions — so the language boundary never arises. You saw the same node written twice in this lesson, and init, a named node object, a timer, spin and shutdown appeared in both. That is exactly why a team can reuse a driver someone else wrote without caring what language it was written in, which was the reuse argument from Lesson 2 seen from the inside.",
                  },
                ],
              },
            },
            {
              type: "TEXT",
              data: {
                body: "That's the module.\n\nA node is a named running process with four kinds of connection, distinct from the package and executable that started it (Lesson 1). Systems are split into many of them for independent failure, reuse, language independence and distribution — at a real cost in moving parts (Lesson 2). You wrote one in about fifteen lines and found it in the system's own census (Lesson 3). Names are addresses, discovery needs no master, and duplicate names produce ambiguity rather than errors (this lesson).\n\nYour node runs, logs, and has a name. But it doesn't talk to anything — it's a node in a system of one.\n\nModule 6 is the big one: topics, publishers and subscribers. It answers the question Module 4 left open on purpose, about why the turtle stops moving the moment you let go of the arrow key. And by the end of it your node will be driving the turtle itself, with teleop removed entirely.",
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
