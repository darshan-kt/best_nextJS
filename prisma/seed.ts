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
import {
  ROBOT_BRINGUP_BRINGUP_LAUNCH_PY,
  ROBOT_BRINGUP_EKF_YAML,
  ROBOT_BRINGUP_REALSENSE_YAML,
  ROBOT_BRINGUP_RPLIDAR_S3_YAML,
  ROBOT_BRINGUP_SENSORS_ONLY_LAUNCH_PY,
  ROBOT_BRINGUP_STANDALONE_IMU_YAML,
  ROBOT_DESCRIPTION_BASE_XACRO,
  ROBOT_DESCRIPTION_CAMERA_XACRO,
  ROBOT_DESCRIPTION_CMAKELISTS,
  ROBOT_DESCRIPTION_DISPLAY_LAUNCH_PY,
  ROBOT_DESCRIPTION_IMU_XACRO,
  ROBOT_DESCRIPTION_LAUNCH_PY,
  ROBOT_DESCRIPTION_LIDAR_XACRO,
  ROBOT_DESCRIPTION_PACKAGE_XML,
  ROBOT_DESCRIPTION_ROBOT_XACRO,
} from "../src/features/courses/content/robotics-projects/module-0-fixtures";
import {
  OBSTACLE_AVOIDANCE_CONFIG_YAML,
  OBSTACLE_AVOIDANCE_LAUNCH_PY,
  OBSTACLE_AVOIDANCE_NODE_FULL,
  OBSTACLE_AVOIDANCE_NODE_MINIMAL,
  OBSTACLE_AVOIDANCE_STEP3_SUBSCRIBE,
  OBSTACLE_AVOIDANCE_STEP4_CALLBACK,
  OBSTACLE_AVOIDANCE_STEP4_FOV_FILTER,
  OBSTACLE_AVOIDANCE_STEP5_CALLBACK,
  OBSTACLE_AVOIDANCE_STEP6_CLEARANCE,
} from "../src/features/courses/content/robotics-projects/project-1-fixtures";
import {
  COLOR_TRACKER_CONFIG_YAML,
  COLOR_TRACKER_NODE_FULL,
  COLOR_TRACKER_NODE_MINIMAL,
  COLOR_TRACKER_STEP3_SUBSCRIBE,
  COLOR_TRACKER_STEP4_CV_BRIDGE,
  COLOR_TRACKER_STEP6_MASK_DEBUG,
  COLOR_TRACKER_STEP7_CONTOUR_CENTROID,
  COLOR_TRACKER_STEP8_STEERING_DECISION,
  COLOR_TRACKER_STEP9_LOST_TARGET,
  HSV_CALIBRATOR_FULL,
  VISUAL_TRACKING_BOT_SETUP_PY,
  VISUAL_TRACKING_LAUNCH_PY,
} from "../src/features/courses/content/robotics-projects/project-2-fixtures";

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
    }
  /// Robotics Hardware & Sensors course (Stage 1). Like QUIZ/EXERCISE,
  /// these reference a relational row rather than owning JSON — but the
  /// row is looked up by slug rather than created inline, since the same
  /// `HardwareDevice` is seeded once (see `HARDWARE_DEVICES` below) and
  /// referenced from several blocks/lessons.
  | { type: "SPEC_TABLE"; deviceSlug: string; specKeys?: string[] }
  | { type: "DEVICE_CARD"; deviceSlug: string };

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

/// Robotics Hardware & Sensors course (Stage 1, `docs/hardware/
/// STAGE_1_SCHEMA_PLAN.md`). Every spec/topic value below is traceable to
/// something actually fetched and cited in `docs/hardware/
/// JAZZY_DEVICE_VERIFICATION.md` — deliberately a short, conservative
/// list rather than padded with plausible-sounding numbers pulled from
/// memory (the same Verification Rule the findings doc itself follows).
/// These are Stage 1 schema-validation fixtures, not the final device
/// profiles — Stage 4 replaces this with the full researched spec set
/// (range, FOV, resolution, sample rate) from manufacturer datasheets.
interface SeedHardwareSpec {
  key: string;
  label: string;
  value: string;
  unit?: string;
  whyItMatters: string;
  sortOrder: number;
}

interface SeedHardwareTopic {
  topicName: string;
  messageType: string;
  description: string;
}

interface SeedHardwareDevice {
  slug: string;
  name: string;
  manufacturer: string;
  category: "RGB_D_CAMERA" | "LIDAR_2D";
  summary: string;
  heroImageSrc?: string;
  heroImageAlt?: string;
  driverPackage: string;
  driverRepoUrl: string;
  rosDistroCompat: string[];
  supportStatus:
    | "ACTIVELY_MAINTAINED"
    | "COMMUNITY_MAINTAINED"
    | "LEGACY"
    | "DEPRECATED";
  supportStatusNote?: string;
  /// Resolved to a real `homeSectionId` in a deferred pass after
  /// `seedCurricula` has created the section — see `seed()`.
  homeCourseSlug: string;
  homeSectionTitle: string;
  specs: SeedHardwareSpec[];
  topics: SeedHardwareTopic[];
}

const HARDWARE_DEVICES: SeedHardwareDevice[] = [
  {
    slug: "rplidar-a2",
    name: "RPLIDAR A2",
    manufacturer: "Slamtec",
    category: "LIDAR_2D",
    summary:
      "A 360° 2D laser scanner that measures distance to surrounding objects, publishing a live LaserScan a robot uses for obstacle detection, mapping and localization.",
    // Real product photo, not generated (VISUAL STANDARD). Sourced
    // 2026-08-28 — one hero angle only; PHOTOGRAPHY_CHECKLIST.md's full
    // shot list (top-down, side profile, adapter-board and model-label
    // close-ups, RViz2 captures) is still open.
    heroImageSrc: "/hardware/rplidar-a2-hero.png",
    heroImageAlt:
      "The RPLIDAR A2 2D LiDAR unit: a round black scanning head with a red scan-window ring and its connector cable.",
    driverPackage: "rplidar_ros",
    driverRepoUrl: "https://github.com/Slamtec/rplidar_ros",
    rosDistroCompat: ["jazzy", "humble"],
    supportStatus: "ACTIVELY_MAINTAINED",
    homeCourseSlug: "robotics-hardware-and-sensors",
    homeSectionTitle: "RPLIDAR A2",
    specs: [
      // Physical/optical specs (0-6) — the full official Slamtec table,
      // added in Stage 7 for Module 2's SPEC_TABLE blocks. `whyItMatters`
      // is lifted from STAGE_4_RPLIDAR_A2_PROFILE.md §1, not reworded.
      {
        key: "measuring_range",
        label: "Measuring Range",
        value: "0.2 m – 16 m (A2M7); 0.2 m – 12 m (A2M8/A2M12)",
        whyItMatters:
          "Sets the usable detection envelope; a robot's obstacle-avoidance planning distance must sit comfortably inside this, not at its edge.",
        sortOrder: 0,
      },
      {
        key: "range_resolution",
        label: "Range Resolution (Accuracy)",
        value: "≤1% of range up to 12 m; ≤2% of range from 12–16 m",
        whyItMatters:
          "This is the closest thing to a published accuracy figure this device has. At 10 m, ≤1% means readings are accurate to roughly ±10 cm; at 15 m, inside the coarser ≤2% band, that widens to roughly ±30 cm — a real, published accuracy tolerance, not an inferred one.",
        sortOrder: 1,
      },
      {
        key: "angular_resolution",
        label: "Angular Resolution",
        value: "0.225° (A2M7/A2M12); 0.45° (A2M8)",
        whyItMatters:
          "Determines whether two close/thin obstacles resolve as distinct returns or merge into one — smaller means finer detail per 360° sweep.",
        sortOrder: 2,
      },
      {
        key: "sample_rate",
        label: "Sample Rate",
        value: "16,000 samples/sec (A2M7/A2M12); 8,000 samples/sec (A2M8)",
        whyItMatters:
          "More samples per second at the same rotation speed means finer angular resolution per sweep — the reason A2M7/A2M12 out-resolve the A2M8 above.",
        sortOrder: 3,
      },
      {
        key: "rotation_speed",
        label: "Rotation Speed",
        value: "10 Hz, adjustable 5–15 Hz",
        whyItMatters:
          "A real trade-off: faster rotation means a fresher scan sooner, at the cost of fewer samples per revolution.",
        sortOrder: 4,
      },
      {
        key: "angular_range",
        label: "Angular Range",
        value: "360°",
        whyItMatters:
          "Full omnidirectional coverage every rotation — the headline contrast against a fixed-cone sensor like an RGB-D camera.",
        sortOrder: 5,
      },
      {
        key: "laser_safety_class",
        label: "Laser Safety Class",
        value: "Class 1",
        whyItMatters:
          "Confirmed directly from the official spec page — safe under normal operating conditions, including direct viewing. A real, checkable safety rating, not a marketing claim.",
        sortOrder: 6,
      },
      // ROS 2 integration specs (7-9) — unchanged from Stage 1.
      {
        key: "serial_baudrate",
        label: "Serial Baud Rate (A2M8)",
        value: "115200",
        unit: "baud",
        whyItMatters:
          "Must match exactly for the driver to read valid data. Wrong baud rate is a classic real symptom: the device shows up in lsusb and the port opens, but scan data is garbled or absent — and it's model-specific (the A3 launch file defaults to 256000).",
        sortOrder: 7,
      },
      {
        key: "usb_bridge_chip",
        label: "USB-Serial Bridge",
        value: "Silicon Labs CP2102",
        whyItMatters:
          "This is the chip udev rules match on (vendor 10c4, product ea60) to give the device a stable /dev/rplidar symlink instead of a shifting /dev/ttyUSBn.",
        sortOrder: 8,
      },
      {
        key: "publisher_qos",
        label: "Publisher QoS Reliability",
        value: "RELIABLE",
        whyItMatters:
          "Confirmed directly from the driver's source, not assumed: RViz2's default LaserScan subscription is also RELIABLE, so no QoS override is needed to visualize this device's data.",
        sortOrder: 9,
      },
    ],
    topics: [
      {
        topicName: "/scan",
        messageType: "sensor_msgs/msg/LaserScan",
        description:
          "One full 360° sweep per message — ranges, angles and intensities for everything the laser detected that rotation.",
      },
    ],
  },
  {
    slug: "orbbec-astra-pro",
    name: "Orbbec Astra Pro",
    manufacturer: "Orbbec",
    category: "RGB_D_CAMERA",
    summary:
      "An RGB-D camera reporting color video and per-pixel depth from two separate sensing paths — a UVC RGB camera and an OpenNI2 structured-light depth engine — that a robot combines into a 3D view of what's in front of it.",
    // Real product photo, not generated (VISUAL STANDARD). Sourced
    // 2026-08-28. Unlike the RPLIDAR shot, this one could NOT be confirmed
    // against a legible model label in the photo itself — the Astra Pro
    // vs. Astra Pro Plus mix-up is this device's own single most-flagged
    // risk (JAZZY_DEVICE_VERIFICATION.md §2.1, PHOTOGRAPHY_CHECKLIST.md's
    // "single most important disambiguation shot"), so this is stated
    // honestly rather than silently assumed. Swap this file, not just the
    // path here, once the label close-up confirms it.
    heroImageSrc: "/hardware/orbbec-astra-pro-hero.png",
    heroImageAlt:
      "The Orbbec Astra Pro RGB-D camera: a black horizontal bar housing the RGB lens and depth-sensing emitter/receiver, on a small stand.",
    driverPackage: "astra_camera",
    driverRepoUrl: "https://github.com/yosefl20/ros2_astra_camera",
    rosDistroCompat: ["jazzy"],
    supportStatus: "LEGACY",
    supportStatusNote:
      "The manufacturer's actively-maintained driver (OrbbecSDK_ROS2) does not support this exact device — only newer, similarly-named models like the Astra Pro Plus. This Jazzy path comes from a small, independently-confirmed-working community fork of the legacy OpenNI2 driver, not an official release. Full verification record: docs/hardware/JAZZY_DEVICE_VERIFICATION.md §2.",
    homeCourseSlug: "robotics-hardware-and-sensors",
    homeSectionTitle: "Orbbec Astra Pro",
    specs: [
      // Physical/optical specs (0-5) — the full table, added in Stage 7
      // for Module 4's SPEC_TABLE blocks. `whyItMatters` is lifted from
      // STAGE_4_ASTRA_PRO_PROFILE.md §1, not reworded.
      {
        key: "depth_range",
        label: "Depth Range",
        value: "0.6 m – 8.0 m (optimal 0.6 m – 5.0 m)",
        whyItMatters:
          "Beyond the optimal band, depth noise rises sharply — plan robot behavior around the optimal figure, not the maximum.",
        sortOrder: 0,
      },
      {
        key: "depth_resolution",
        label: "Depth Resolution",
        value: "VGA (640×480), QVGA (320×240), or QQVGA (160×120), up to 30 FPS",
        whyItMatters:
          "Lower resolution trades detail for bandwidth/CPU cost — relevant when running alongside the RPLIDAR in the capstone.",
        sortOrder: 1,
      },
      {
        key: "rgb_resolution",
        label: "RGB Resolution",
        value: "Up to 1280×960 (lower FPS) or 640×480 @ 30 FPS",
        whyItMatters:
          "The fork's own launch defaults use 640×480 @ 30 FPS MJPEG — the default a learner actually sees, not the sensor's technical ceiling.",
        sortOrder: 2,
      },
      {
        key: "field_of_view",
        label: "Field of View",
        value: "60° horizontal × 49.5° vertical (73° diagonal)",
        whyItMatters:
          "A fixed cone, directly contrasted against the RPLIDAR's full 360° — this device sees a lot of detail in a small window, not the whole room.",
        sortOrder: 3,
      },
      {
        key: "interface",
        label: "Interface",
        value: "USB 2.0, as two separate USB identities from one housing",
        whyItMatters:
          "The single most important fact about this device's electrical behavior — one cable, two logical devices, confirmed at the source-code level (see the two USB identity specs below).",
        sortOrder: 4,
      },
      {
        key: "dimensions_weight",
        label: "Dimensions / Weight",
        value: "~165 × 30 × 40 mm / ~0.3 kg",
        whyItMatters:
          "Relevant for the capstone's physical mounting.",
        sortOrder: 5,
      },
      // ROS 2 integration specs (6-8) — unchanged from Stage 1.
      {
        key: "usb_identity_depth",
        label: "USB Identity — Depth Engine",
        value: "2bc5:0403",
        whyItMatters:
          "The depth/OpenNI2 half of this camera enumerates as its own USB device, separate from the RGB camera below — expect two lines in lsusb for one physical unit, not one.",
        sortOrder: 6,
      },
      {
        key: "usb_identity_rgb",
        label: "USB Identity — RGB (UVC)",
        value: "2bc5:0501",
        whyItMatters:
          "Confirmed from two independent sources (the udev rules file and the launch file's uvc_vendor_id/uvc_product_id defaults) — the RGB camera is a UVC device sharing this id with several other Orbbec models, which is why a learner must not assume one lsusb line means one identity.",
        sortOrder: 7,
      },
      {
        key: "color_format",
        label: "Default Color Format",
        value: "MJPEG, 640x480 @ 30fps",
        whyItMatters:
          "The launch file's own defaults — worth knowing before assuming a different resolution or format is required just to get a first image.",
        sortOrder: 8,
      },
    ],
    topics: [
      {
        topicName: "/camera/color/image_raw",
        messageType: "sensor_msgs/msg/Image",
        description:
          "The RGB/UVC stream — published when enable_color and use_uvc_camera are both true (default).",
      },
      {
        topicName: "/camera/color/camera_info",
        messageType: "sensor_msgs/msg/CameraInfo",
        description: "Intrinsics for the RGB (UVC) sensor.",
      },
      {
        topicName: "/camera/depth/image_raw",
        messageType: "sensor_msgs/msg/Image",
        description: "The raw OpenNI2 depth stream, in millimeters as 16-bit values.",
      },
      {
        topicName: "/camera/depth/camera_info",
        messageType: "sensor_msgs/msg/CameraInfo",
        description: "Intrinsics for the OpenNI2 depth sensor.",
      },
      {
        topicName: "/camera/ir/image_raw",
        messageType: "sensor_msgs/msg/Image",
        description:
          "The raw infrared stream from the depth receiver — published when enable_ir is true (default).",
      },
      {
        topicName: "/camera/depth_registered/points",
        messageType: "sensor_msgs/msg/PointCloud2",
        description:
          "A point cloud published via a topic remap of depth/color/points — named 'registered' regardless of whether the depth_registration parameter (default false) actually aligns color to depth. See Module 4 Section D.",
      },
    ],
  },
];

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
                body: "The compiler infers a type from the value assigned to it, so an annotation on a const you initialize immediately is usually redundant. Inference gets more interesting — and more useful — at function boundaries and with generics, where it can propagate a type through several calls without it ever being written down.",
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
                    body: "TypeScript's control-flow analysis narrows a union based only on checks it can see in the code — an if guard, a truthiness check, or similar. It never infers that a value \"can't actually be null\" from how the code is used elsewhere.",
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
    {
      title: "Topics, Publishers, and Subscribers",
      summary:
        "Publish/subscribe, message types, and the two nodes that finally drive the turtle without teleop — plus what happens once there's more than one of either.",
      lessons: [
        {
          slug: "the-publish-subscribe-model",
          title: "The Publish/Subscribe Model",
          durationMinutes: 20,
          contentBlocks: [
            {
              type: "TEXT",
              data: {
                body: "Module 4 asked you to hold on to a question rather than look it up: why does the turtle move for a moment and then stop on its own when you let go of an arrow key?\n\nIt turns out you can't answer that without explaining the whole communication model underneath it — which is why it waited. Here is the model, and the answer falls out of it for free.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "A publisher sends a message to a name. Every node that has subscribed to that name gets its own copy of it. The publisher does not know who is subscribed, how many nodes are subscribed, or whether anyone is subscribed at all — and it behaves identically in every one of those cases.\n\nThat's the entire model. Everything else in this module is a consequence of it.",
              },
            },
            {
              type: "IMAGE",
              data: {
                src: "/courses/ros2-fundamentals/module-6-fanout.png",
                alt: "A publisher node on the left with three arrows fanning out to three independent subscriber boxes on the right, each arrow labelled /robot/sensor_data. A dashed region around the three subscribers is annotated \"the publisher cannot see any of this.\"",
                caption:
                  "The name is a rendezvous, not a place. Any number of subscribers can attach to it, and nothing about the publisher changes.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Three properties fall straight out of that one-paragraph model, and each one matters for a different reason later in this course.\n\nOne-way: there is no reply. If you send something and need an answer back, you don't want a topic — you want a service, which is Module 7.\n\nAnonymous: the publisher never learns who received anything, or whether anyone did.\n\nMany-to-many: any number of publishers and any number of subscribers can share one name. You'll meet what that actually means, including the case where it goes wrong, in Lesson 5.",
              },
            },
            {
              type: "CALLOUT",
              data: {
                variant: "WARNING",
                title: "A topic is not a function call",
                body: "publish() returns immediately, returns nothing, and succeeds in exactly the same way whether ten nodes are listening or none. Nothing waits, and nothing confirms delivery.\n\nIf part of your mental model involves waiting for an answer, you're reaching for the wrong mechanism — that's a service, not a topic.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "And it is not a server either, which is easy to assume once you've ruled out a function call.\n\nThere is no process anywhere called /turtle1/cmd_vel. Nothing is \"running the topic.\" What actually happened, back in Module 5 Lesson 4, is that two nodes independently announced the same name with the same message type, and the middleware matched them — after which data goes directly from one process to the other. The name is a rendezvous two nodes agreed to use, not a place either of them lives.",
              },
            },
            {
              type: "CALLOUT",
              data: {
                variant: "INFO",
                title: "Nothing to start, nothing to blame",
                body: "Because there's no process in the middle, when data stops flowing there are exactly two places the fault can be: the publisher, or the subscriber. Nothing third-party can be down.\n\nThat's why ros2 topic info — Lesson 2 — is worth learning properly. It's also why ros2 topic list showing a name only tells you someone is publishing or subscribing to it right now. Topics don't persist on their own; the name only exists while something is using it.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Time to collect evidence for Module 4's question, using a command you already own.\n\nStart turtlesim and teleop as usual, then open a third terminal and run echo on the steering topic. Press one arrow key, once, and let go immediately.",
              },
            },
            {
              type: "CODE",
              data: {
                language: "bash",
                filename: "watch-one-keypress.sh",
                code: "ros2 topic echo /turtle1/cmd_vel\n\n# press one arrow key, once, and release it:\n\nlinear:\n  x: 2.0\n  y: 0.0\n  z: 0.0\nangular:\n  x: 0.0\n  y: 0.0\n  z: 0.0\n---\n\n# ...then nothing. No second message follows.",
                caption:
                  "Illustrative output. The exact numbers depend on which key you pressed. What matters: exactly one message, then silence — not a stream that continues while the key is down.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "That's half the answer: teleop publishes exactly one message per keypress. It is not streaming while the key is held — the echo output proves it, one block and then a gap.\n\nThe other half is turtlesim's side, and it isn't visible in this output at all: turtlesim discards a command more than one second old and sets the velocity to zero. One message therefore buys up to one second of motion. After that, with nothing new arriving, the turtle stops itself.",
              },
            },
            {
              type: "IMAGE",
              data: {
                src: "/courses/ros2-fundamentals/module-6-timeline.png",
                alt: "A horizontal timeline from a keypress event at t=0, through one message published and the turtle moving, to a marker at t=1s labelled \"turtlesim: last command is now stale, velocity to zero here,\" with the axis continuing empty afterward.",
                caption:
                  "The stop is caused by silence, not by anything anyone sent.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "That's not a turtlesim quirk — it's a safety pattern, and it's worth seeing why.\n\nIf a subscriber kept obeying the last command it ever received, a publisher crashing or a network link dropping would leave a real robot driving at its last commanded speed with nobody steering it. Building continuous-command topics so that silence means stop is what prevents that. The cost is real too: driving a robot means publishing repeatedly, for as long as you want it to move — a fact about your own code that lands squarely in Lesson 3, the moment you write a publisher yourself.",
              },
            },
            {
              type: "EXERCISE",
              exercise: {
                title: "Measure the one-second window yourself",
                instructions:
                  "Three observations, no new commands — everything you need is echo, which you've been running since Module 4.",
                config: {
                  type: "GUIDED",
                  goal: {
                    body: "With turtlesim, teleop and ros2 topic echo /turtle1/cmd_vel all running, confirm both halves of this lesson's claim for yourself: one keypress is one message, and one message buys about a second of motion.",
                  },
                  steps: [
                    {
                      title: "Count the messages for one keypress",
                      content: {
                        body: "Press an arrow key once and let go immediately. Count how many message blocks appear in the echo terminal. It should be exactly one — not a burst, and not zero.",
                      },
                    },
                    {
                      title: "Watch the turtle, not the terminal",
                      content: {
                        body: "Press once more, but this time watch the simulator window instead of the terminal. The turtle should move for roughly a second and then stop on its own, with no second command visible in echo.",
                      },
                    },
                    {
                      title: "Hold the key down and compare",
                      content: {
                        body: "Now hold an arrow key down. The echo terminal fills with messages continuously — that's your terminal's own key-repeat generating real keypresses, not teleop streaming on its own — and the turtle moves the whole time you hold it, stopping about a second after you release. Compare this against step 2: continuous input produces continuous messages; a single input produces exactly one.",
                      },
                    },
                  ],
                },
              },
            },
            {
              type: "TEXT",
              data: {
                body: "You know what a topic is, and you've watched the silence-means-stop rule catch the turtle in the act.\n\nWhat you don't know yet is what actually travels over one — why those six numbers in the echo output, and not some other shape entirely. That's next.",
              },
            },
          ],
        },
        {
          slug: "message-types-and-reading-a-topic",
          title: "Message Types and Reading a Topic",
          durationMinutes: 22,
          contentBlocks: [
            {
              type: "TEXT",
              data: {
                body: "Module 4 showed you the shape of a cmd_vel message — a linear group, an angular group, six numbers — and told you roughly what it meant. It never showed you where that shape comes from, or how you'd find out for a topic nobody had explained to you first.\n\nBoth are one command away, and by the end of this lesson you'll be able to walk up to any topic in any ROS 2 system and read it cold.",
              },
            },
            {
              type: "CODE",
              data: {
                language: "bash",
                filename: "topic-census-with-types.sh",
                code: "ros2 topic list -t\n\n/parameter_events [rcl_interfaces/msg/ParameterEvent]\n/rosout [rcl_interfaces/msg/Log]\n/turtle1/cmd_vel [geometry_msgs/msg/Twist]\n/turtle1/color_sensor [turtlesim/msg/Color]\n/turtle1/pose [turtlesim/msg/Pose]",
                caption:
                  "Illustrative output. The same census as Module 4's ros2 topic list, with each topic's type now shown in brackets.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Read a type name like a path: geometry_msgs/msg/Twist is package, then kind, then type.\n\ngeometry_msgs is not turtlesim's package — it's a standard interface package shared across the entire ROS 2 ecosystem, which is exactly why Module 4 could truthfully tell you the command you ran works unchanged on a real robot. turtlesim/msg/Pose, by contrast, belongs to turtlesim alone; nothing else uses it.",
              },
            },
            {
              type: "CODE",
              data: {
                language: "bash",
                filename: "show-the-definition.sh",
                code: "ros2 interface show geometry_msgs/msg/Twist\n\n# This expresses velocity in free space broken into its linear and angular parts.\n\nVector3  linear\n\tfloat64 x\n\tfloat64 y\n\tfloat64 z\nVector3  angular\n\tfloat64 x\n\tfloat64 y\n\tfloat64 z",
                caption:
                  "Illustrative output. The definition itself, including its own comment — this doesn't vary between machines the way live data does.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Join it up with what you already saw in Module 4: those six numbers in the echo output were linear.x, linear.y, linear.z, angular.x, angular.y, angular.z, and the arrow key changed exactly one of them. The definition is where that shape is decided. echo is just where you watch it filled in with real values.",
              },
            },
            {
              type: "CALLOUT",
              data: {
                variant: "INFO",
                title: "Reading a definition, not writing one",
                body: "You're looking something up here, not authoring it. Where message definitions actually come from, what the .msg file format looks like, and how to build your own custom interface are Module 9's job — along with the wider landscape of standard interfaces beyond these two.\n\nWhat matters right now is narrower and immediately useful: every topic has a type, and you can always look it up.",
              },
            },
            {
              type: "CODE",
              data: {
                language: "bash",
                filename: "topic-info.sh",
                code: "ros2 topic info /turtle1/cmd_vel\n\nType: geometry_msgs/msg/Twist\nPublisher count: 1\nSubscription count: 1",
                caption:
                  "Illustrative output. Publisher and subscription counts will change as you add your own nodes later in this module.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Those counts are the point, and they're a genuinely new kind of question. Module 4's habit was is data flowing?, answered by echo. This one is is anyone actually connected?, answered by info — and the two failure modes look identical from the outside while having completely different causes.\n\nA topic with one publisher and zero subscribers is a node shouting into an empty room. Zero publishers and one subscriber is a node waiting for something that will never come. echo can't tell you which; info can.",
              },
            },
            {
              type: "IMAGE",
              data: {
                src: "/courses/ros2-fundamentals/module-6-contract.png",
                alt: "Three candidate publisher boxes on the left, each labelled with a topic name and message type, connecting or failing to connect to one subscriber box on the right. The first, with matching name and type, connects with a solid arrow. The second, same name but a mismatched type, and the third, a mismatched name but matching type, both show broken dashed arrows annotated \"no error, no warning, no connection.\"",
                caption:
                  "The name is the address; the type is part of that same address, not a detail to check later.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Which is the point this diagram makes concrete: the name alone is not enough. Two nodes using the same topic name with different message types do not connect to each other, and nothing announces this anywhere. As far as the system is concerned, they're two unrelated conversations that happen to share a name.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "One more direction worth noticing before you move on — everything so far has been commands going into turtlesim. /turtle1/pose is turtlesim reporting its own state back out, continuously, many times a second, whether or not anything happens to be subscribed.",
              },
            },
            {
              type: "CODE",
              data: {
                language: "bash",
                filename: "the-other-direction.sh",
                code: "ros2 interface show turtlesim/msg/Pose\n\nfloat32 x\nfloat32 y\nfloat32 theta\n\nfloat32 linear_velocity\nfloat32 angular_velocity\n\n---\n\nros2 topic echo /turtle1/pose\n\nx: 5.544444561004639\ny: 5.544444561004639\ntheta: 0.0\nlinear_velocity: 0.0\nangular_velocity: 0.0\n---",
                caption:
                  "Illustrative output. x/y/theta describe where the turtle is and which way it's facing; the two velocities describe its current motion. Your own numbers will differ — turtlesim starts each session at the same point, but any prior driving changes them.",
              },
            },
            {
              type: "CALLOUT",
              data: {
                variant: "TIP",
                title: "The general shape of every robot",
                body: "Commands in on one topic, state out on another. Swap turtlesim for a real mobile base and the names barely change — you'd still expect a /cmd_vel in and an /odom or a /pose out.",
              },
            },
            {
              type: "EXERCISE",
              exercise: {
                title: "Profile a topic you were told nothing about",
                instructions:
                  "/turtle1/color_sensor hasn't been mentioned anywhere in this course. Use only the commands from this lesson.",
                config: {
                  type: "GUIDED",
                  goal: {
                    body: "Find out everything this lesson's commands can tell you about /turtle1/color_sensor: its message type, that type's fields, and how many publishers and subscribers it currently has.",
                  },
                  steps: [
                    {
                      title: "Find its type",
                      content: {
                        body: "Run the census with types and find the line for /turtle1/color_sensor.",
                        visuals: [
                          {
                            kind: "CODE",
                            data: { language: "bash", code: "ros2 topic list -t" },
                          },
                        ],
                      },
                    },
                    {
                      title: "Look up the definition",
                      content: {
                        body: "Now show the type you found. It's turtlesim's own — not a standard interface — so expect fields specific to a colour reading.",
                        visuals: [
                          {
                            kind: "CODE",
                            data: {
                              language: "bash",
                              code: "ros2 interface show turtlesim/msg/Color",
                            },
                          },
                        ],
                      },
                    },
                    {
                      title: "Check who's connected",
                      content: {
                        body: "Confirm the publisher and subscriber counts, same as you did for cmd_vel.",
                        visuals: [
                          {
                            kind: "CODE",
                            data: {
                              language: "bash",
                              code: "ros2 topic info /turtle1/color_sensor",
                            },
                          },
                        ],
                      },
                    },
                    {
                      title: "Watch it, and notice what doesn't happen",
                      content: {
                        body: "Echo it and drive the turtle around the window for a bit. The three r/g/b values report the canvas colour directly underneath the turtle — and turtlesim's default background is a flat, uniform blue, so driving through open space changes nothing at all. The values only move if the turtle crosses a line it has already drawn with its own pen. If you expected the numbers to change just from moving, that expectation — not the sensor — was the thing worth correcting.",
                      },
                    },
                  ],
                },
              },
            },
            {
              type: "TEXT",
              data: {
                body: "You can now read any topic in any system: its name, its type, what that type's fields are, and who's actually connected to it.\n\nNext, you write to one.",
              },
            },
          ],
        },
        {
          slug: "writing-a-publisher",
          title: "Writing a Publisher",
          durationMinutes: 22,
          contentBlocks: [
            {
              type: "TEXT",
              data: {
                body: "Module 5 ended on a promise: \"by the end of it your node will be driving the turtle itself, with teleop removed entirely.\" This is that lesson.\n\nSame shape of file as Module 5's node: a plain Python script, run with python3, no workspace and no package — for exactly the reasons Module 5 Lesson 3 gave, and Module 10 will pick up.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Before writing a line, assemble what you already know into a plan. Publish to the same name turtlesim subscribes to — Lesson 2's topic info proved which one. Use the same type, geometry_msgs/msg/Twist. And publish more often than once a second, because of Lesson 1's timeout.\n\nThree facts, all already earned, none of them new information in this lesson.",
              },
            },
            {
              type: "CODE",
              data: {
                language: "python",
                filename: "turtle_driver.py",
                code: "import rclpy\nfrom rclpy.node import Node\nfrom geometry_msgs.msg import Twist\n\n\nclass TurtleDriver(Node):\n    def __init__(self):\n        super().__init__(\"turtle_driver\")\n        self.publisher_ = self.create_publisher(Twist, \"/turtle1/cmd_vel\", 10)\n        self.create_timer(0.5, self.on_timer)\n\n    def on_timer(self):\n        msg = Twist()\n        msg.linear.x = 2.0\n        msg.angular.z = 1.8\n        self.publisher_.publish(msg)\n\n\ndef main():\n    rclpy.init()\n    node = TurtleDriver()\n    try:\n        rclpy.spin(node)\n    except KeyboardInterrupt:\n        pass\n    finally:\n        node.destroy_node()\n        rclpy.shutdown()\n\n\nif __name__ == \"__main__\":\n    main()",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Close teleop entirely before you run this. Then run it alongside turtlesim, with nothing else steering.\n\nThe turtle drives a steady circle — and it's worth stopping on what just happened. Nothing is reading a keyboard. The only thing steering the turtle is a file you wrote, and turtlesim cannot tell the difference, because from turtlesim's side there is no difference. That's Lesson 1's anonymity property, demonstrated instead of asserted.",
              },
            },
            {
              type: "CALLOUT",
              data: {
                variant: "INFO",
                title: "What the 10 actually is",
                body: "That third argument to create_publisher is a send queue — how many outgoing messages ROS 2 will hold for you if a subscriber or the network can't keep up. 10 is the conventional default, and it's the right choice here.\n\nIt belongs to a family of delivery settings called QoS, which matters enormously for high-rate sensor data and not at all for driving a turtle. If you go looking, that's what you'll find — you aren't missing a prerequisite. Module 9 is where you actually learn what this number does and how to choose a different one; for now, treat 10 as a safe default that needs no justification.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "The rate isn't arbitrary, either. At 2 Hz — every 0.5 seconds — a message arrives comfortably inside turtlesim's one-second window.\n\nSlow the timer past one second and the turtle stutters: moving, stopping, moving, stopping. Each command expires before its replacement arrives. That's not a bug in the code — it's Lesson 1's safety rule doing exactly what it's for, seen for the first time from the side that has to satisfy it rather than the side that enforces it.",
              },
            },
            {
              type: "CALLOUT",
              data: {
                variant: "TIP",
                title: "Measuring the rate you actually got",
                body: "ros2 topic hz /turtle1/cmd_vel reports the rate that actually reached the topic. You chose a rate in your code; this measures what really arrived — and on a busy machine, or with slow work inside a callback, those two numbers aren't always the same.",
              },
            },
            {
              type: "EXERCISE",
              exercise: {
                title: "Write it, run it, then break it on purpose",
                instructions:
                  "The stutter is the most convincing demonstration in this module that a topic carries discrete messages, not a continuous connection. Cause it yourself rather than reading about it.",
                config: {
                  type: "GUIDED",
                  goal: {
                    body: "Get turtle_driver.py running with a steady circle, then deliberately slow it past the one-second window and watch the turtle stutter.",
                  },
                  steps: [
                    {
                      title: "Run it as written",
                      content: {
                        body: "Close teleop first. Run the driver alongside turtlesim and confirm the turtle traces a steady, continuous circle.",
                      },
                    },
                    {
                      title: "Slow the timer past the window",
                      content: {
                        body: "Stop the driver, change 0.5 to 2.0 in the create_timer call, and run it again.",
                        visuals: [
                          {
                            kind: "CODE",
                            data: {
                              language: "python",
                              code: "self.create_timer(2.0, self.on_timer)",
                            },
                          },
                        ],
                      },
                    },
                    {
                      title: "Explain what you see",
                      content: {
                        body: "The turtle should now move, stop, move, stop — in a visible rhythm. In one sentence, using Lesson 1's one-second number, say why. Then change the timer back to 0.5 before moving on.",
                      },
                    },
                  ],
                },
              },
            },
            {
              type: "IMAGE",
              data: {
                src: "/courses/ros2-fundamentals/module-6-publisher-anatomy.png",
                alt: "A node box labelled turtle_driver containing three parameter tags — type, name, queue — feeding into a create_publisher call, then spin, then a timer branch to timer_callback which builds and publishes a Twist. An arrow labelled /turtle1/cmd_vel exits the node box and trails off into open space with no destination box.",
                caption:
                  "create_publisher only declares intent. Nothing leaves the node until timer_callback actually calls publish().",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Now look at your own node from the outside. With the driver running, ros2 topic info /turtle1/cmd_vel reports Publisher count: 1 — and that publisher is your script. The tooling doesn't mark it as different from teleop, because there is nothing to mark. Every inspection command from Module 4 and Lesson 2 now works on code you wrote yourself.",
              },
            },
            {
              type: "CODE",
              data: {
                language: "cpp",
                filename: "the same publisher in C++ (read only)",
                code: "#include \"rclcpp/rclcpp.hpp\"\n#include \"geometry_msgs/msg/twist.hpp\"\n\nusing namespace std::chrono_literals;\n\nclass TurtleDriver : public rclcpp::Node {\npublic:\n  TurtleDriver() : Node(\"turtle_driver\") {\n    publisher_ = create_publisher<geometry_msgs::msg::Twist>(\"/turtle1/cmd_vel\", 10);\n    timer_ = create_wall_timer(500ms, [this]() { on_timer(); });\n  }\n\nprivate:\n  void on_timer() {\n    auto msg = geometry_msgs::msg::Twist();\n    msg.linear.x = 2.0;\n    msg.angular.z = 1.8;\n    publisher_->publish(msg);\n  }\n  rclcpp::Publisher<geometry_msgs::msg::Twist>::SharedPtr publisher_;\n  rclcpp::TimerBase::SharedPtr timer_;\n};\n\nint main(int argc, char ** argv) {\n  rclcpp::init(argc, argv);\n  rclcpp::spin(std::make_shared<TurtleDriver>());\n  rclcpp::shutdown();\n}",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Not something you're expected to write, and this course stays in Python throughout. Read it for one reason: create_publisher, a message object, a timer, and a publish call are all there, in the same order, with the same arguments. The concept transfers completely; only the syntax changes.\n\nThat's Module 5 Lesson 2's language independence, seen from the inside this time — a Python node and a C++ node talk over the same topic with no bridge, because neither one is calling the other's functions.",
              },
            },
            {
              type: "FILE",
              data: {
                href: "/courses/ros2-fundamentals/module-6-turtle-driver.py",
                label: "turtle_driver.py — the finished script",
                description:
                  "The complete driver from this lesson. If you fought a typo, diff against this rather than starting over. Run it with python3, not ros2 run.",
                sizeLabel: "2 KB",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Your node can talk now. It still can't hear anything — it drives the exact same circle whether the turtle is in open space or wedged against the wall.\n\nNext: giving it ears.",
              },
            },
          ],
        },
        {
          slug: "writing-a-subscriber-and-closing-the-loop",
          title: "Writing a Subscriber, and Closing the Loop",
          durationMinutes: 22,
          contentBlocks: [
            {
              type: "TEXT",
              data: {
                body: "Module 5 set this up explicitly: a timer says \"call this every second.\" A subscription says \"call this every time a message arrives on this name.\" Same machinery, same spin doing the calling — only the trigger differs. This lesson is that idea, cashed in.",
              },
            },
            {
              type: "CODE",
              data: {
                language: "python",
                filename: "listener.py",
                code: "import rclpy\nfrom rclpy.node import Node\nfrom turtlesim.msg import Pose\n\n\nclass Listener(Node):\n    def __init__(self):\n        super().__init__(\"listener\")\n        self.subscription = self.create_subscription(\n            Pose, \"/turtle1/pose\", self.pose_callback, 10\n        )\n\n    def pose_callback(self, msg):\n        self.get_logger().info(f\"x={msg.x:.2f} y={msg.y:.2f} theta={msg.theta:.2f}\")\n\n\ndef main():\n    rclpy.init()\n    node = Listener()\n    try:\n        rclpy.spin(node)\n    except KeyboardInterrupt:\n        pass\n    finally:\n        node.destroy_node()\n        rclpy.shutdown()\n\n\nif __name__ == \"__main__\":\n    main()",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Two things worth noticing before you run it. The callback takes the message as its one argument — you never call pose_callback yourself, ROS 2 hands it the message when one arrives. And log lines only appear while turtlesim is actually running: close turtlesim and the listener goes quiet, with no error, no warning, no exit.\n\nA subscriber with nothing publishing to it is a completely valid, completely silent program — and that silence is indistinguishable from a bug. You're about to cause that exact silence on purpose, so you meet it under controlled conditions rather than the first time it happens by accident.",
              },
            },
            {
              type: "EXERCISE",
              exercise: {
                title: "Cause the silence, then rule it out",
                instructions:
                  "This walks a real failure deliberately rather than presenting it as a mystery — the skill is establishing whether data exists before you doubt your own code, which Module 4's echo habit already taught you once.",
                config: {
                  type: "GUIDED",
                  goal: {
                    body: "Introduce a one-character typo into listener.py's topic name, watch it go silent, diagnose it using only the tools from this module, then fix it and confirm the fix.",
                  },
                  steps: [
                    {
                      title: "Cause the silence on purpose",
                      content: {
                        body: "Change the subscribed name from /turtle1/pose to /turtle/pose — drop the 1. Run it alongside turtlesim. Confirm: no error, no warning, no exit. It just sits there, silent.",
                      },
                    },
                    {
                      title: "Establish whether the data exists at all",
                      content: {
                        body: "In a second terminal, before touching your own code, check whether turtlesim is actually publishing anything.",
                        visuals: [
                          {
                            kind: "CODE",
                            data: {
                              language: "bash",
                              code: "ros2 topic echo /turtle1/pose",
                            },
                          },
                        ],
                      },
                    },
                    {
                      title: "Interrogate your own node, not the topic",
                      content: {
                        body: "You should have seen a steady stream in step 2, which rules out the publisher. Now check what your node believes it's subscribed to, and compare that string character by character against ros2 topic list.",
                        visuals: [
                          {
                            kind: "CODE",
                            data: { language: "bash", code: "ros2 node info /listener" },
                          },
                        ],
                      },
                    },
                    {
                      title: "Fix it and confirm the fix, not just the symptom",
                      content: {
                        body: "Correct the string back to /turtle1/pose, restart, and use ros2 node info again to confirm the name it lists now matches ros2 topic list exactly — rather than relying on log lines resuming as your only evidence, which would be checking the symptom instead of the cause.",
                      },
                    },
                  ],
                },
              },
            },
            {
              type: "IMAGE",
              data: {
                src: "/courses/ros2-fundamentals/module-6-two-triggers.png",
                alt: "A spin() box at the top with two symmetric branches below it: one labelled \"every 0.5 seconds\" leading to timer_callback(), the other labelled \"message arrives on /turtle1/pose\" leading to pose_callback(msg).",
                caption:
                  "A timer firing and a message arriving are both just triggers — spin() is the thing that notices either one and calls your code.",
              },
            },
            {
              type: "CALLOUT",
              data: {
                variant: "TIP",
                title: "Keep callbacks fast",
                body: "rclpy.spin runs your callbacks one at a time by default, so a callback that takes a second stops everything else in that node for a second — including a timer that was supposed to be publishing on schedule. The symptom is a node that mysteriously stops sending; the cause is almost never where people look first.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Now combine both halves, and name what the combination actually is: a node with both a subscription and a publisher is the standard shape of nearly every real ROS 2 node. Read something, decide something, write something. Sensor in, command out. A battery monitor and a full path planner are both this same shape, just at very different scales.",
              },
            },
            {
              type: "CODE",
              data: {
                language: "python",
                filename: "turtle_loop.py",
                code: "import rclpy\nfrom rclpy.node import Node\nfrom geometry_msgs.msg import Twist\nfrom turtlesim.msg import Pose\n\n\nclass TurtleLoop(Node):\n    LEFT_EDGE = 1.5\n    RIGHT_EDGE = 9.5\n\n    def __init__(self):\n        super().__init__(\"turtle_loop\")\n        self.direction = 1.0\n        self.publisher_ = self.create_publisher(Twist, \"/turtle1/cmd_vel\", 10)\n        self.subscription = self.create_subscription(\n            Pose, \"/turtle1/pose\", self.on_pose, 10\n        )\n\n    def on_pose(self, msg):\n        if msg.x < self.LEFT_EDGE or msg.x > self.RIGHT_EDGE:\n            self.direction *= -1.0\n\n        cmd = Twist()\n        cmd.linear.x = 2.0\n        cmd.angular.z = 1.0 * self.direction\n        self.publisher_.publish(cmd)\n\n\ndef main():\n    rclpy.init()\n    node = TurtleLoop()\n    try:\n        rclpy.spin(node)\n    except KeyboardInterrupt:\n        pass\n    finally:\n        node.destroy_node()\n        rclpy.shutdown()\n\n\nif __name__ == \"__main__\":\n    main()",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Run this one alone — no driver, no teleop, nothing else. The turtle patrols back and forth near the left and right edges on its own, reversing direction each time on_pose decides it's gotten close enough.\n\nHere's what makes this different from every program you've written so far in this course, or possibly at all: the node's behaviour is now determined by data it did not produce and cannot predict in advance. Nothing in the file says which way the turtle will turn next — that's a control loop, at the smallest size one can be.",
              },
            },
            {
              type: "IMAGE",
              data: {
                src: "/courses/ros2-fundamentals/module-6-closed-loop.png",
                alt: "Two boxes, /turtlesim and your node turtle_loop, joined by two curved arrows forming a ring — /turtle1/pose flowing from turtlesim to your node, /turtle1/cmd_vel flowing back — with the decision \"past the wall? turn the other way\" marked inside your node.",
                caption:
                  "turtlesim only reports position. Your node only decides, based on what it was just told. The patrolling behaviour belongs to the cycle, not to either half of it.",
              },
            },
            {
              type: "FILE",
              data: {
                href: "/courses/ros2-fundamentals/module-6-turtle-loop.py",
                label: "turtle_loop.py — the finished script",
                description:
                  "The subscribe-decide-publish loop from this lesson, reversing near the left and right edges only. Staying inside all four edges is the independent exercise below — there's deliberately no answer key for that part.",
                sizeLabel: "2.5 KB",
              },
            },
            {
              type: "EXERCISE",
              exercise: {
                title: "Keep the turtle inside a box",
                instructions:
                  "Goal only, no procedure. Every element you need is already in this lesson.",
                config: {
                  type: "INDEPENDENT",
                  goal: {
                    body: "Extend turtle_loop.py so the turtle stays inside all four edges of the window, not just the left and right ones — turning away as it approaches any edge, not only two of them.",
                  },
                  successCriteria: [
                    "The turtle never reaches any of the four edges of the turtlesim window, left and right, top and bottom.",
                    "The decision still lives entirely in the pose callback — no timer, no second subscription.",
                    "You can explain in one sentence what \"approaching an edge\" means in terms of x, y and theta.",
                  ],
                  hints: [
                    "turtlesim's window is roughly 11 units square. You already have thresholds for x — you need the same idea for y.",
                    "Reversing angular.z alone was enough for left/right, because the turtle was already travelling mostly along x. Approaching a top or bottom edge needs the turtle to actually turn toward the centre, not just flip its spin.",
                    "You don't need theta to detect an edge — only to decide which way is \"toward the middle.\" Comparing the turtle's x and y against the window's centre point is enough to pick a turn direction.",
                  ],
                },
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Every diagram in this module so far has had exactly one publisher and one subscriber. Real systems don't — and the difference is not a detail. That's next.",
              },
            },
          ],
        },
        {
          slug: "many-publishers-many-subscribers",
          title: "Many Publishers, Many Subscribers",
          durationMinutes: 24,
          contentBlocks: [
            {
              type: "TEXT",
              data: {
                body: "Every diagram in this module has had one publisher and, mostly, one subscriber. A real robot has a dozen nodes, and topics with several of each. Both directions scale — but they do not scale the same way, and only one of them is safe by default.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Many subscribers is the easy case. Each one receives its own copy. The publisher's code, cost and behaviour never change, and adding a subscriber can't break an existing one.\n\nYou've actually been doing this since Module 4 without being told: ros2 topic echo /turtle1/cmd_vel was a second subscriber on that topic, running alongside turtlesim, and neither one ever noticed the other.",
              },
            },
            {
              type: "CALLOUT",
              data: {
                variant: "INFO",
                title: "You tested this by accident, twice",
                body: "That's Lesson 1's fan-out claim, and every time you've run echo on a live topic you've added a subscriber to a running system and changed nothing about it. That's exactly why echo is safe to run against a robot that's actually working — it can only ever be one more copy, never a second voice.",
              },
            },
            {
              type: "IMAGE",
              data: {
                src: "/courses/ros2-fundamentals/module-6-fanout-echo.png",
                alt: "The publisher turtle_driver with two arrows to two subscribers of equal standing — /turtlesim and a terminal running ros2 topic echo — both labelled /turtle1/cmd_vel, with an annotation that neither subscriber is aware of the other.",
                caption:
                  "echo is not a special debugging channel. It's an ordinary subscriber, which is precisely why attaching one to a running system is safe.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Many publishers is the case that bites. ROS 2 permits it and does not arbitrate between them. Messages from every publisher arrive at a subscriber interleaved in arrival order, and the subscriber has no way to tell which publisher any given message came from — a message doesn't carry a sender.\n\nOn a command topic like cmd_vel, that means two things are steering one robot, and whichever message arrived most recently simply wins.",
              },
            },
            {
              type: "CODE",
              data: {
                language: "bash",
                filename: "publish-from-the-command-line.sh",
                code: "ros2 topic pub --rate 2 /turtle1/cmd_vel geometry_msgs/msg/Twist \"{linear: {x: 2.0}, angular: {z: 1.8}}\"\n\npublishing #1: geometry_msgs.msg.Twist(linear=geometry_msgs.msg.Vector3(x=2.0, y=0.0, z=0.0), angular=geometry_msgs.msg.Vector3(x=0.0, y=0.0, z=1.8))\npublishing #2: geometry_msgs.msg.Twist(linear=geometry_msgs.msg.Vector3(x=2.0, y=0.0, z=0.0), angular=geometry_msgs.msg.Vector3(x=0.0, y=0.0, z=1.8))",
                caption:
                  "Illustrative output. A publisher with no code behind it at all — the command line is publishing directly. --rate 2 matters here: at exactly --rate 1 the publish interval and turtlesim's one-second expiry are the same number, and whether the turtle glides or stutters would come down to scheduling luck rather than anything you can reason about.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "This earns its place beyond a demonstration: ros2 topic pub lets you exercise a subscriber before the node meant to feed it even exists. Bringing a robot up one link at a time — drive the motors from the command line, confirm they respond, then connect the real planner — is standard practice, and this is the command that does the first part.",
              },
            },
            {
              type: "CODE",
              data: {
                language: "bash",
                filename: "two-publishers.sh",
                code: "# with turtle_driver.py still running from Lesson 3, in another terminal:\nros2 topic info /turtle1/cmd_vel\n\nType: geometry_msgs/msg/Twist\nPublisher count: 2\nSubscription count: 1",
                caption:
                  "Illustrative output. The count is the whole diagnostic here — nothing else about the system looks unusual.",
              },
            },
            {
              type: "EXERCISE",
              exercise: {
                title: "Debugging challenge: the fight over cmd_vel",
                instructions:
                  "Nothing is broken here, and no program is misconfigured — read the hints in order rather than jumping to the answer.",
                config: {
                  type: "DEBUGGING",
                  scenario: {
                    body: "Your driver from Lesson 3 is running, and the turtle is tracing its steady circle. You decide to steer manually as well, so you start turtle_teleop_key in another terminal without stopping the driver.\n\nNow the turtle moves erratically — mostly still circling, occasionally jerking in the direction you pressed, largely ignoring the arrow keys. Both terminals look completely healthy. Neither has printed anything unusual.\n\nWhat's happening, and how would you confirm it before changing anything?",
                  },
                  hints: [
                    "Don't restart anything and don't edit any code yet. Ask the narrowest possible question first — how many things are currently publishing to that topic?",
                    "Publisher count: 2, and ROS 2 considers both of them entirely legitimate. So what does turtlesim do when two independent streams of commands arrive on the same name?",
                    "Run ros2 topic echo /turtle1/cmd_vel and read the sequence rather than the individual values — your driver's identical message, twice a second, forever, with an occasional keypress dropped in between. Now recall how long a single command survives from Lesson 1, and work out how long your keypress stays in effect against a publisher sending every half-second.",
                  ],
                  rootCause: {
                    body: "Two publishers are sending to one topic with no arbitration between them. turtlesim simply acts on whichever message arrived most recently, and it has no way to tell the two publishers apart — a message carries no sender.\n\nYour driver publishes every half-second, so any keypress you make gets overwritten within 500 milliseconds — which is exactly why the arrow keys feel mostly ignored rather than completely dead. The symptom is a precise, predictable consequence of the rate you chose back in Lesson 3, not a malfunction.",
                  },
                  solution: {
                    body: "Decide which node should own the topic, and stop the other one. A real alternative exists too — remapping one publisher onto a different topic name so both can run without conflicting — and remapping in general belongs to Module 9.",
                    visuals: [
                      {
                        kind: "CODE",
                        data: {
                          language: "bash",
                          code: "# stop turtle_teleop_key, then confirm:\nros2 topic info /turtle1/cmd_vel\n\nType: geometry_msgs/msg/Twist\nPublisher count: 1\nSubscription count: 1",
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
                body: "Here's the rule worth carrying past this module: many subscribers is free. Many publishers on a command topic is a design decision that needs a reason.\n\nReal systems that genuinely need several sources of motion commands — teleoperation, autonomous navigation, an emergency stop — don't just let them all publish freely. They put one node in front that chooses between the sources and publishes the winner, so exactly one thing is ever writing to the topic the robot actually obeys.",
              },
            },
            {
              type: "EXERCISE",
              exercise: {
                title: "Run a three-node system and account for every count",
                instructions:
                  "Goal only, no procedure. Every command you need appeared earlier in this module.",
                config: {
                  type: "INDEPENDENT",
                  goal: {
                    body: "Run turtlesim, your Lesson 3 driver, and your Lesson 4 listener all at the same time. Then, using ros2 topic info on both /turtle1/cmd_vel and /turtle1/pose, account for every publisher and subscriber count the system reports — naming which of the three nodes is responsible for each one — and predict what each number will become before you stop any given node.",
                  },
                  successCriteria: [
                    "You can name, for /turtle1/cmd_vel, exactly which node is the publisher and which is the subscriber, and the counts match what you predicted.",
                    "You can name, for /turtle1/pose, exactly which node is the publisher and which is the subscriber, and the counts match what you predicted.",
                    "Stopping the listener changes /turtle1/pose's subscription count and nothing else — you predicted that before doing it, not after.",
                    "Stopping the driver changes /turtle1/cmd_vel's publisher count and nothing else — same requirement.",
                  ],
                  hints: [
                    "Three nodes, two topics — but not every node touches every topic. Start by listing, for each node, which topics it actually publishes or subscribes to, before you touch ros2 topic info at all.",
                    "ros2 topic info on both topics gives you four numbers total. All four are explainable from the three nodes' code — nothing in this exercise is coincidental.",
                  ],
                },
              },
            },
            {
              type: "QUIZ",
              quiz: {
                title: "Module 6 Check: Topics, Publishers, and Subscribers",
                description:
                  "Six questions on the model, the type contract, and what happens with more than one of either. The explanations carry the teaching — read them even when you're confident.",
                questions: [
                  {
                    type: "SINGLE_CHOICE",
                    prompt:
                      "You press an arrow key in teleop once and release it. The turtle moves for about a second and stops, even though nothing sent a stop command. Why?",
                    options: [
                      { id: "silence", label: "Teleop published one message; turtlesim discards a command older than one second and zeroes the velocity" },
                      { id: "explicit-stop", label: "Teleop published a second message telling the turtle to stop" },
                      { id: "friction", label: "Turtlesim simulates friction, so the turtle naturally slows down" },
                      { id: "bug", label: "This is a bug in turtlesim that happens to look intentional" },
                    ],
                    correctOptionIds: ["silence"],
                    explanation:
                      "Silence means stop. One message buys up to one second of motion; after that turtlesim treats the last command as stale and zeroes the velocity itself. That's a safety property, not an accident — a subscriber that kept obeying a stale command forever would drive a real robot on after its publisher crashed or a link dropped.",
                  },
                  {
                    type: "SINGLE_CHOICE",
                    prompt:
                      "Your node calls publish() on a topic that no other node has subscribed to. What happens?",
                    options: [
                      { id: "succeeds", label: "It returns immediately and succeeds, exactly as it would with ten subscribers" },
                      { id: "errors", label: "It raises an error, since there's nothing to receive the message" },
                      { id: "blocks", label: "It blocks until a subscriber appears" },
                      { id: "queues", label: "It queues the message until someone subscribes, then delivers it" },
                    ],
                    correctOptionIds: ["succeeds"],
                    explanation:
                      "Publishing is one-way and returns nothing — it never tells you whether anyone was listening, because a topic is not a function call. If you need to know whether something happened and get an answer back, you need a service, which is Module 7.",
                  },
                  {
                    type: "SINGLE_CHOICE",
                    prompt:
                      "A node you wrote is subscribed to a topic and logging nothing at all. Which command tells you whether anything is publishing to that topic in the first place?",
                    options: [
                      { id: "topic-info", label: "ros2 topic info <topic> — read the publisher count" },
                      { id: "topic-echo", label: "ros2 topic echo <topic>" },
                      { id: "node-list", label: "ros2 node list" },
                      { id: "topic-list", label: "ros2 topic list" },
                    ],
                    correctOptionIds: ["topic-info"],
                    explanation:
                      "topic info's publisher count answers exactly this. echo answers a related but different question — is data flowing right now — and a topic can have a perfectly healthy publisher that simply hasn't sent anything yet, so the two commands aren't interchangeable. node info is the third piece: it tells you what your own node believes it subscribed to, which is where a typo like Lesson 4's shows up.",
                  },
                  {
                    type: "SINGLE_CHOICE",
                    prompt:
                      "Two nodes are both publishing Twist messages to /turtle1/cmd_vel at the same time. The turtle moves erratically. Whose commands is turtlesim actually following?",
                    options: [
                      { id: "most-recent", label: "Whichever message arrived most recently — there's no arbitration and no way to tell the publishers apart" },
                      { id: "first-started", label: "Whichever node started publishing first" },
                      { id: "averaged", label: "ROS 2 averages the two commands together" },
                      { id: "higher-rate", label: "Whichever node is publishing at the higher rate, exclusively" },
                    ],
                    correctOptionIds: ["most-recent"],
                    explanation:
                      "ROS 2 permits multiple publishers on one topic and does not merge, queue, or prioritise between them — a message carries no sender, so the subscriber can't distinguish where any given message came from. Systems that genuinely need several legitimate command sources put one node in front to choose between them, rather than letting all of them publish freely.",
                  },
                  {
                    type: "TRUE_FALSE",
                    prompt:
                      "Two nodes using the same topic name will exchange data as long as the name matches, regardless of the message types they each use.",
                    correctAnswer: false,
                    explanation:
                      "False. Name and type must both match, and a mismatch produces no error, no warning, and no connection whatsoever — which is why ros2 topic list -t and ros2 interface show both matter. The type is part of a topic's identity, exactly as much as the name is.",
                  },
                  {
                    type: "SINGLE_CHOICE",
                    prompt:
                      "Your publisher uses a timer with a 2-second period instead of the 0.5 seconds from Lesson 3. The turtle now moves in short bursts with visible pauses between them. Is this a bug in your code?",
                    options: [
                      { id: "not-a-bug", label: "No — the publish rate is slower than turtlesim's one-second command timeout, so each command expires before its replacement arrives" },
                      { id: "race-condition", label: "Yes — this indicates a race condition between the timer and spin" },
                      { id: "queue-full", label: "Yes — the publisher's send queue has filled up and is dropping messages" },
                      { id: "network", label: "No — this is normal network jitter and can be ignored" },
                    ],
                    correctOptionIds: ["not-a-bug"],
                    explanation:
                      "This is Lesson 1's timeout, met again from the publishing side: the rate is a design decision your code has to satisfy, not an incantation to copy. Stuttering at anything slower than one second isn't a malfunction — it's the exact behaviour the timeout is supposed to produce, and the fix is choosing a faster rate, not debugging the node.",
                  },
                ],
              },
            },
            {
              type: "TEXT",
              data: {
                body: "That's the module. A topic is a name carrying one-way, many-to-many streams of discrete messages, with nothing in the middle to start or blame — and silence means stop (Lesson 1). Every topic has a type as well as a name, both must match, and any topic can be interrogated cold from the terminal (Lesson 2). You wrote a publisher and drove the turtle with teleop closed, and learned the publish rate is a design decision (Lesson 3). A subscription is a callback with a different trigger, and a node doing both is a control loop (Lesson 4). Many subscribers is free; many publishers on a command topic is a conflict with no arbitration (this lesson).\n\nEverything in this module was one-way. You published and hoped; you subscribed and waited. Nothing you wrote could ever ask a question and get an answer back.\n\nNow think about /spawn, which you met back in Module 4 without using it: put a second turtle on the screen, at these coordinates, with this name — and tell me whether it worked. That's not a stream. Doing it over a topic would mean publishing a request and then subscribing to some other topic hoping a reply turns up, with no way to know which request the reply even belonged to. Module 7 is services: the mechanism for asking and actually being answered.",
              },
            },
          ],
        },
      ],
    },
  ],
  /// Robotics Hardware & Sensors course (Stage 1 schema validation — see
  /// docs/hardware/STAGE_1_SCHEMA_PLAN.md). One lesson per device,
  /// deliberately thin: real curriculum design is Stage 3/4/5's job. This
  /// exists so SPEC_TABLE/DEVICE_CARD have somewhere real to render, with
  /// specs pulled from HARDWARE_DEVICES above rather than invented here.
  "robotics-hardware-and-sensors": [
    // Modules 0-3 (Stage 7, docs/hardware/STAGE_3_MODULES_0_TO_3_DESIGN.md,
    // as corrected by Stage 4). Inserted before the Stage 1 device-fixture
    // sections below so they display first, matching course order.
    {
      title: "Module 0 — Course Onboarding",
      summary:
        "What this course covers, what it costs, how to stay safe, and why USB power is a real failure mode — before any setup begins.",
      lessons: [
        {
          slug: "welcome-prerequisites-what-youll-build",
          title: "Welcome, Prerequisites & What You'll Build",
          durationMinutes: 12,
          contentBlocks: [
            {
              type: "TEXT",
              data: {
                body: "This course teaches you to evaluate, set up, integrate, and debug real robotics hardware — not a simulation, not a theory course. Every command you'll run has been verified against a real upstream source; every claim about a device's specs or driver support is cited, not assumed.",
              },
            },
            {
              type: "CALLOUT",
              data: {
                variant: "WARNING",
                title: "Hard prerequisite",
                body: "This course assumes Ubuntu 24.04 with ROS 2 Jazzy already installed and working (e.g. from the ROS 2 Fundamentals course's Module 3). Nothing here re-teaches that installation — if ros2 topic list doesn't run on your machine right now, stop and complete that first.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "The two launch devices, honestly framed: the RPLIDAR A2 is an actively-maintained LiDAR with an officially released Jazzy driver — the \"everything works as documented\" case. The Orbbec Astra Pro is a legacy depth camera whose only working Jazzy path is a small community fork. You will learn to evaluate hardware support, not just follow steps for hardware that already works perfectly.",
              },
            },
            {
              type: "IMAGE",
              data: {
                src: "/hardware/module-0-capstone-preview.svg",
                alt: "Two-branch flow diagram: Orbbec Astra Pro produces RGB and depth data over a fixed 60-degree cone; RPLIDAR A2 produces LaserScan data over a full 360 degrees; both feed into one combined Robot Perception box.",
                caption: "Where this course is headed — neither sensor alone gives a robot the full picture.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Roadmap: Modules 0–3 build the mental models every device in this course plugs into — hardware safety, the five-branch hardware model, sensor concepts grounded in real numbers, and the generic ROS 2 data pipeline. Modules 4–5 apply all of that to the RPLIDAR A2 and Orbbec Astra Pro specifically, with full physical setup, first-run, and real debugging.",
              },
            },
          ],
        },
        {
          slug: "hardware-safety",
          title: "Hardware Safety",
          durationMinutes: 8,
          contentBlocks: [
            {
              type: "TEXT",
              data: {
                body: "The RPLIDAR's laser is rated Class 1 — confirmed directly from Slamtec's own official spec page. Class 1 means safe under normal operating conditions, including direct viewing. That said, \"Class 1\" is not a license for carelessness: as a matter of general practice, don't stare into any laser source at close range.",
              },
            },
            {
              type: "IMAGE",
              data: {
                src: "/hardware/rplidar-a2-laser-safety-class1.svg",
                alt: "A laser safety icon labelled Class 1, with text confirming it is safe under normal operating conditions, plus a warning box noting this is not a license for carelessness.",
                caption: "A real, checkable safety rating — not a marketing claim.",
              },
            },
            {
              type: "CALLOUT",
              data: {
                variant: "WARNING",
                title: "ESD (electrostatic discharge)",
                body: "Both devices have exposed circuit boards near their connectors. Discharge static — touch a grounded metal object — before handling either unit, especially in dry conditions.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Safe handling specifics: the RPLIDAR's rotating head should never be forced or held stationary while powered. The Astra Pro's depth-sensing emitter and lenses should not be touched directly — fingerprints and dust degrade the structured-light pattern this course later teaches you to reason about.",
              },
            },
            {
              type: "CALLOUT",
              data: {
                variant: "DANGER",
                title: "Power sequencing",
                body: "Never hot-plug or unplug USB while colcon build or a driver process is actively writing to the device.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "None of this is exotic — these are consumer-grade devices — but robotics hardware safety habits should start now, not after the first mistake.",
              },
            },
          ],
        },
        {
          slug: "bill-of-materials",
          title: "The Bill of Materials: What This Course Costs You",
          durationMinutes: 10,
          contentBlocks: [
            {
              type: "TEXT",
              data: {
                body: "This course requires two real devices, a powered USB hub, and a native Ubuntu 24.04 machine. Approximate total: $265–$545.",
              },
            },
            {
              // The TEXT block renders as plain literal text with no
              // markdown parsing, by deliberate XSS-avoidance design
              // (`text-block.tsx`, §29) — a pipe-table string would render
              // as raw "| Item | ... |" text, not an actual table. CODE's
              // <pre> preserves whitespace/alignment instead, which is a
              // more honest fit than asking TEXT to do something it never
              // supported.
              type: "CODE",
              data: {
                filename: "Bill of Materials",
                code:
                  "Item              Approx. cost   Note\n" +
                  "----------------  -------------  --------------------------------------------------\n" +
                  "RPLIDAR A2        $150-$320      Confirm the exact sub-model (A2M7/A2M8/A2M12)\n" +
                  "                                 before buying -- Module 2 explains why it matters.\n" +
                  "Orbbec Astra Pro  $100-$200      Secondhand/reseller only -- see the callout below.\n" +
                  "Powered USB hub   $15-$25        Not optional -- Lesson 4 explains why.\n" +
                  "Cables            included       Or a USB-C hub if your machine lacks full-size\n" +
                  "                                 USB-A ports.",
              },
            },
            {
              type: "CALLOUT",
              data: {
                variant: "WARNING",
                title: "The Astra Pro specifically",
                body: "Orbbec no longer sells this exact model new — its own product page returns a 404 as of this course's own research. You will be buying secondhand or from a reseller's remaining stock. Budget extra time for sourcing, not just extra money.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "What's deliberately not required: no robot chassis, no motor controller. This course teaches sensor data, not building a physical robot platform.",
              },
            },
            { type: "DEVICE_CARD", deviceSlug: "rplidar-a2" },
            { type: "DEVICE_CARD", deviceSlug: "orbbec-astra-pro" },
            {
              type: "EXERCISE",
              exercise: {
                title: "Build Your Own Sourcing Checklist",
                instructions:
                  "Before buying anything, work through the three checks below.",
                config: {
                  type: "GUIDED",
                  goal: {
                    body: "Confirm you know exactly what you're buying and where it will plug in, before spending any money.",
                  },
                  steps: [
                    {
                      title: "Choose your RPLIDAR A2 sub-model",
                      content: {
                        body: "Record which sub-model (A2M7, A2M8, or A2M12) you're targeting and why — price, availability, or range needs. You'll confirm this again against the physical label once the unit arrives.",
                      },
                    },
                    {
                      title: "Identify an Astra Pro source",
                      content: {
                        body: "Find at least one real listing for an Orbbec Astra Pro (not \"Astra Pro Plus\") and record its condition — new old stock, refurbished, or used.",
                      },
                    },
                    {
                      title: "Confirm your USB setup",
                      content: {
                        body: "Check whether your machine has enough free full-size USB-A ports for both devices plus the powered hub, or note the adapter you'll need.",
                      },
                    },
                  ],
                },
              },
            },
          ],
        },
        {
          slug: "usb-fundamentals-power-budgets",
          title:
            'USB Fundamentals: Power Budgets and the "Device Not Detected" Failure Mode',
          durationMinutes: 14,
          contentBlocks: [
            {
              type: "TEXT",
              data: {
                body: "USB carries power and data over the same connector. Every port has a real power budget — often ~500 mA–900 mA on a standard laptop USB port, shared further if downstream of an unpowered hub — and every plugged-in device draws against it.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Neither of this course's two devices is power-trivial. The RPLIDAR A2's motor alone draws a continuous 450–600 mA, confirmed from Slamtec's own datasheet. The Astra Pro draws power across two simultaneous USB identities from one housing — the depth engine and the RGB camera enumerate and power up independently. Running both devices on unpowered ports at once is a real, specific way to exceed a laptop's power budget, not a hypothetical.",
              },
            },
            {
              type: "IMAGE",
              data: {
                src: "/hardware/usb-power-budget.svg",
                alt: "A budget bar showing a typical unpowered USB port's ~500-900 mA budget, with the RPLIDAR's 450-600 mA draw and the Astra Pro's additional two-identity draw stacked against it, approaching and then exceeding the budget line.",
                caption: "These two specific devices, together, are a realistic way to hit a real limit.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "The diagnostic signature to recognize: a device that enumerates intermittently, drops out only when a second device is also plugged in, or a camera stream that stutters/drops while a LiDAR spins nearby — these are power symptoms, not driver bugs. This course teaches you to check power before touching software — the first rung of the diagnostic ladder every device module reuses.",
              },
            },
            {
              type: "CALLOUT",
              data: {
                variant: "TIP",
                body: "This is exactly why the BOM includes a powered USB hub, not as a nice-to-have: it supplies its own power source, not just the host's limited budget.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Now that you know what to watch for physically, the last piece is how this course's own debugging and assessment format works.",
              },
            },
            {
              type: "EXERCISE",
              exercise: {
                title: "Read Your Own USB Bus",
                instructions:
                  "This doesn't require the course's own hardware — a real, immediately practicable skill you can build right now.",
                config: {
                  type: "GUIDED",
                  goal: {
                    body: "Practice reading lsusb and dmesg output — the exact skill both Module 3 and every device module reuse.",
                  },
                  steps: [
                    {
                      title: "Plug in any USB device you already have",
                      content: {
                        body: "A mouse, keyboard, or flash drive works fine — you don't need this course's own hardware for this exercise.",
                      },
                    },
                    {
                      title: "Run lsusb and dmesg",
                      content: {
                        body: "Run lsusb to see the device listed, then dmesg | tail to see the kernel's own log of it being detected.",
                        visuals: [
                          {
                            kind: "CODE",
                            data: { language: "bash", code: "lsusb\ndmesg | tail" },
                          },
                        ],
                      },
                    },
                    {
                      title: "Identify the vendor:product ID pair",
                      content: {
                        body: "Find the idVendor:idProduct pair in the output — this is the exact same identifier scheme both the RPLIDAR and Astra Pro use, and udev rules match on later in this course.",
                      },
                    },
                  ],
                },
              },
            },
          ],
        },
        {
          slug: "how-the-hardware-lab-works",
          title: "How the Hardware Lab Works",
          durationMinutes: 8,
          contentBlocks: [
            {
              type: "TEXT",
              data: {
                body: "This course has no simulation or rosbag-replay fallback track. Every hands-on exercise from Module 4 onward assumes the learner has the real device in hand.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "The debugging-exercise format: a broken scenario is presented, hints are revealed one at a time on request, and the full solution — plus, often, a deeper root-cause explanation — only appears after, never immediately. This is the same format used throughout the ROS 2 Fundamentals course.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "The quiz format: questions test diagnosis and decision-making using this course's own real devices and numbers, not abstract recall. Expect questions shaped like \"given this real symptom, what do you check next,\" not \"define resolution.\"",
              },
            },
            {
              type: "CALLOUT",
              data: {
                variant: "INFO",
                body: "You already did a real diagnostic exercise in the previous lesson without realizing it — reading lsusb/dmesg output is exactly the skill this format is built around.",
              },
            },
            {
              type: "QUIZ",
              quiz: {
                title: "Module 0 Check: Course Onboarding",
                description:
                  "Scenario and diagnostic questions on the BOM, safety, and USB power — not recall.",
                questions: [
                  {
                    type: "SINGLE_CHOICE",
                    prompt:
                      "You've found an Astra Pro listed by a reseller for $90, with no manufacturer support page. Before buying, what should you check first?",
                    explanation:
                      "Evaluating driver support before buying is a real robotics-engineering skill this course teaches directly, not an afterthought.",
                    options: [
                      {
                        id: "a",
                        label:
                          "Whether a working Jazzy driver path exists and its confidence level",
                      },
                      { id: "b", label: "Whether the price is the lowest available" },
                      { id: "c", label: "Whether the reseller offers free shipping" },
                      { id: "d", label: "Whether the box is the original retail packaging" },
                    ],
                    correctOptionIds: ["a"],
                  },
                  {
                    type: "MULTIPLE_CHOICE",
                    prompt:
                      "Which of these are part of this course's exact BOM? Select all that apply.",
                    explanation:
                      "A robot chassis is explicitly out of scope — this course teaches sensor data, not building a physical robot platform.",
                    options: [
                      { id: "a", label: "RPLIDAR A2" },
                      { id: "b", label: "Orbbec Astra Pro" },
                      { id: "c", label: "Powered USB hub" },
                      { id: "d", label: "A robot chassis" },
                    ],
                    correctOptionIds: ["a", "b", "c"],
                  },
                  {
                    type: "SINGLE_CHOICE",
                    prompt:
                      "You plug both devices into your laptop's built-in ports with no hub, and the Astra Pro's depth stream keeps cutting out whenever the RPLIDAR is also running. What's the most likely cause?",
                    explanation:
                      "The RPLIDAR's continuous 450–600 mA motor draw plus the Astra Pro's two simultaneous USB identities is a realistic way to exceed an unpowered port's budget — exactly why the BOM includes a powered hub.",
                    options: [
                      {
                        id: "a",
                        label: "Combined power draw exceeding the port/bus power budget",
                      },
                      { id: "b", label: "A corrupted driver installation" },
                      { id: "c", label: "The RPLIDAR's laser interfering with the camera" },
                      { id: "d", label: "An outdated ROS 2 version" },
                    ],
                    correctOptionIds: ["a"],
                  },
                  {
                    type: "TRUE_FALSE",
                    prompt:
                      "The Orbbec Astra Pro can currently be purchased new, directly from Orbbec's own store.",
                    explanation:
                      "Orbbec's own product page for this exact model returns a 404 — confirmed directly during this course's own research, not assumed.",
                    correctAnswer: false,
                  },
                ],
              },
            },
          ],
        },
      ],
    },
    {
      title: "Module 1 — Robotics Hardware Fundamentals",
      summary:
        "The five-branch model every piece of robot hardware fits into — sensors, actuators, computation, communication, power.",
      lessons: [
        {
          slug: "what-makes-up-a-robot",
          title: "What Makes Up a Robot?",
          durationMinutes: 10,
          contentBlocks: [
            {
              type: "TEXT",
              data: {
                body: "Before looking at any specific sensor, it helps to see the whole robot it plugs into.",
              },
            },
            {
              type: "IMAGE",
              data: {
                src: "/hardware/robot-five-branch-model.svg",
                alt: "A radial diagram with ROBOT at the center and five labeled branches radiating outward: Sensors, Actuators, Computation, Communication, and Power, each with a one-phrase generic example.",
                caption: "Every piece of hardware this course covers fits at least one of exactly five branches.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Walking each branch with one concrete, general example: sensors = anything that measures the world (a camera, a LiDAR); actuators = anything that acts on the world (wheels, an arm); computation = where decisions get made (an onboard computer); communication = how the pieces talk to each other (USB, a network); power = what keeps everything running (a battery, a USB port's own supply).",
              },
            },
            {
              type: "CALLOUT",
              data: {
                variant: "INFO",
                body: "If you've taken the ROS 2 Fundamentals course, \"communication\" here is the same concept as \"the graph\" — nodes are how software pieces talk; this module is about the hardware underneath that.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Where do this course's own two devices fit? Both are sensors — but that single word hides real differences worth naming precisely.",
              },
            },
          ],
        },
        {
          slug: "sensors-and-actuators",
          title: "Sensors and Actuators: Reading the World vs. Acting on It",
          durationMinutes: 9,
          contentBlocks: [
            {
              type: "TEXT",
              data: {
                body: "The core distinction: a sensor turns the physical world into data; an actuator turns data — a decision — into physical motion or action. Neither this course's RPLIDAR nor its Astra Pro is an actuator — both are sensors, which already tells you something about this course's own scope.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Naming the two launch devices as sensor types, not yet their specs: the RPLIDAR is a ranging sensor (measures distance). The Astra Pro is a combined imaging + ranging sensor (color video and depth, from two genuinely separate sensing paths in one housing — a fact Module 2/3 will ground in real numbers).",
              },
            },
            { type: "DEVICE_CARD", deviceSlug: "rplidar-a2" },
            { type: "DEVICE_CARD", deviceSlug: "orbbec-astra-pro" },
            {
              type: "TEXT",
              data: {
                body: "One concrete actuator counter-example, purely for contrast, since this course teaches no actuators directly: a drive motor. You won't set up a motor in this course, but recognizing the difference matters when you read about a robot that has both.",
              },
            },
            {
              type: "CALLOUT",
              data: {
                variant: "TIP",
                body: "A single physical device can straddle categories — the Astra Pro alone produces two different kinds of sensor data. Don't assume \"one housing\" means \"one sensor.\"",
              },
            },
          ],
        },
        {
          slug: "computation-communication-power",
          title: "Computation, Communication & Power: The Systems Around the Sensors",
          durationMinutes: 11,
          contentBlocks: [
            {
              type: "TEXT",
              data: {
                body: "Your own Ubuntu 24.04 machine running ROS 2 Jazzy is the \"computation\" branch for this course — nothing exotic, but worth naming explicitly.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Communication has two layers this course cares about: the physical layer (USB/serial, moving raw bytes between a device and the host — Module 0's subject) and the ROS 2 layer (nodes publishing/subscribing to topics — Module 3's subject). Naming both now prevents conflating them later.",
              },
            },
            {
              type: "IMAGE",
              data: {
                src: "/hardware/robot-five-branch-model-populated.svg",
                alt: "The same five-branch ROBOT diagram, now filled in with this course's own concrete instances: RPLIDAR A2 and Astra Pro as sensors, the learner's Ubuntu/ROS 2 machine as computation, USB and ROS 2 topics as communication, the USB port budget as power, and actuators marked as not used in this course.",
                caption: "The abstract model, populated with this course's own real instances.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Power, recapped in context: Module 0 showed you why power matters with real numbers. Here's where it sits in the whole picture — it isn't a side concern, it's one of the five branches every robot needs.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "You now have the full five-branch picture, with this course's own two devices already placed inside it. Module 2 goes deeper into what makes a sensor good or bad at its job.",
              },
            },
            {
              type: "EXERCISE",
              exercise: {
                title: "Classify the Hardware",
                instructions:
                  "Classify each item into one or more of the five branches, with a one-sentence justification each.",
                config: {
                  type: "INDEPENDENT",
                  goal: {
                    body: "Given RPLIDAR A2, Astra Pro, a drive motor, your own Ubuntu PC, a USB cable, and a battery pack — classify each into sensors/actuators/computation/communication/power.",
                  },
                  successCriteria: [
                    "Correctly places both launch devices as sensors, not actuators",
                    "Correctly identifies the drive motor as an actuator",
                    "Correctly places the Ubuntu PC as computation",
                    "Correctly places the USB cable as communication (and recognizes it also carries power)",
                  ],
                  hints: [
                    "Some items are intentionally a little ambiguous — a USB cable carries both data and power. Reasoning about why is more valuable than picking one 'correct' box.",
                  ],
                },
              },
            },
            {
              type: "QUIZ",
              quiz: {
                title: "Module 1 Check: The Five-Branch Model",
                description: "Scenario-weighted questions on classifying real hardware.",
                questions: [
                  {
                    type: "SINGLE_CHOICE",
                    prompt:
                      "A robot's onboard computer, running Ubuntu and ROS 2, belongs to which branch of the five-part model?",
                    options: [
                      { id: "a", label: "Sensors" },
                      { id: "b", label: "Computation" },
                      { id: "c", label: "Communication" },
                      { id: "d", label: "Power" },
                    ],
                    correctOptionIds: ["b"],
                  },
                  {
                    type: "SINGLE_CHOICE",
                    prompt:
                      "The RPLIDAR's motor draws power continuously even while the robot itself is standing still. Which two branches does this single fact connect?",
                    explanation:
                      "A sensor's own operation has a real power cost, independent of whatever the robot's actuators are doing — exactly the fact Module 0 grounded with real current-draw numbers.",
                    options: [
                      { id: "a", label: "Sensors and Power" },
                      { id: "b", label: "Actuators and Communication" },
                      { id: "c", label: "Computation and Communication" },
                      { id: "d", label: "Sensors and Actuators" },
                    ],
                    correctOptionIds: ["a"],
                  },
                  {
                    type: "MULTIPLE_CHOICE",
                    prompt: "Which of the following are sensors, not actuators? Select all that apply.",
                    explanation:
                      "A drive motor is included as a contrasting actuator example.",
                    options: [
                      { id: "a", label: "RPLIDAR A2" },
                      { id: "b", label: "Orbbec Astra Pro" },
                      { id: "c", label: "A drive motor" },
                    ],
                    correctOptionIds: ["a", "b"],
                  },
                  {
                    type: "SINGLE_CHOICE",
                    prompt:
                      "A learner says: 'The Astra Pro is one sensor, so it belongs entirely in one place in this model.' What's the issue with that claim?",
                    explanation:
                      "\"One housing\" does not mean \"one sensing path\" — previewed here and grounded with real specs in Module 2.",
                    options: [
                      {
                        id: "a",
                        label:
                          "A single device can straddle categories — the Astra Pro produces two genuinely separate kinds of sensor data from one housing",
                      },
                      { id: "b", label: "The Astra Pro is actually an actuator, not a sensor" },
                      { id: "c", label: "The claim is entirely correct" },
                      { id: "d", label: "The Astra Pro belongs in the power branch" },
                    ],
                    correctOptionIds: ["a"],
                  },
                ],
              },
            },
          ],
        },
      ],
    },
    {
      title: "Module 2 — Understanding Robotic Sensors",
      summary:
        "Accuracy, precision, resolution, range, frequency, noise, latency, field of view — every concept grounded in this course's own two devices' real numbers.",
      lessons: [
        {
          slug: "range-resolution-field-of-view",
          title: "Range, Resolution, and Field of View",
          durationMinutes: 13,
          contentBlocks: [
            {
              type: "TEXT",
              data: {
                body: "Range, defined then grounded immediately: the RPLIDAR A2's measuring range is 0.2–16 m (A2M7) or 0.2–12 m (A2M8/A2M12); the Astra Pro's depth range is 0.6–8.0 m, with only 0.6–5.0 m rated as optimal. Range and optimal range are not the same claim — a device's datasheet distinguishing them is itself informative.",
              },
            },
            {
              type: "SPEC_TABLE",
              deviceSlug: "rplidar-a2",
              specKeys: ["measuring_range", "angular_range"],
            },
            {
              type: "TEXT",
              data: {
                body: "Resolution, grounded: the RPLIDAR's angular resolution is 0.225° (A2M7/A2M12) or 0.45° (A2M8) — smaller means finer detail per 360° sweep. The Astra Pro's depth resolution is up to VGA (640×480). These are different kinds of resolution (angular vs. spatial) — worth naming explicitly since both devices use the same word for genuinely different measurements.",
              },
            },
            {
              type: "SPEC_TABLE",
              deviceSlug: "rplidar-a2",
              specKeys: ["angular_resolution"],
            },
            {
              type: "TEXT",
              data: {
                body: "Field of view, grounded and directly contrasted: the RPLIDAR sees the full 360° around itself every sweep; the Astra Pro sees a fixed 60° horizontal × 49.5° vertical cone. This is the sharpest, most visual contrast between the two devices' fundamental design.",
              },
            },
            {
              type: "IMAGE",
              data: {
                src: "/hardware/sensor-fov-contrast.svg",
                alt: "A top-down diagram showing the RPLIDAR A2's full 360-degree circular field of view next to the Orbbec Astra Pro's fixed 60-degree wedge, drawn at the same scale.",
                caption: "Not just different numbers — different shapes of sensing coverage.",
              },
            },
            {
              type: "CALLOUT",
              data: {
                variant: "TIP",
                body: "Neither 'more range' nor 'wider FOV' is unconditionally better — Lesson 4 asks you to actually choose between these two devices for a specific job.",
              },
            },
          ],
        },
        {
          slug: "accuracy-precision-noise",
          title: "Accuracy, Precision, and Noise",
          durationMinutes: 14,
          contentBlocks: [
            {
              type: "TEXT",
              data: {
                body: "Definitions, kept precise: accuracy = how close a reading is to the true value; precision = how consistent repeated readings are with each other, whether or not they're accurate. A sensor can be precise but inaccurate — consistently wrong by the same amount — a genuinely common real-world case worth naming explicitly, since the two words are often used interchangeably in casual speech.",
              },
            },
            {
              type: "IMAGE",
              data: {
                src: "/hardware/accuracy-precision-quadrants.svg",
                alt: "A four-quadrant target diagram: accurate and precise (tightly clustered on the bullseye), precise but not accurate (tightly clustered off-center), accurate but not precise (scattered around the bullseye), and neither (scattered off-center).",
                caption: "Two independent properties, not two words for the same idea.",
              },
            },
            {
              type: "SPEC_TABLE",
              deviceSlug: "rplidar-a2",
              specKeys: ["range_resolution"],
            },
            {
              type: "TEXT",
              data: {
                body: "Turn the tolerance into a concrete number, the way a robotics engineer actually would: at 10 m, ≤1% means readings are accurate to roughly ±10 cm; at 15 m — inside the coarser ≤2% band — that widens to roughly ±30 cm. The tolerance isn't a single flat number across the whole range — it gets coarser exactly where the range table shows the sensor operating furthest from its strongest signal return, a real, published confirmation of the general \"accuracy degrades with distance\" intuition, not just an assumption.",
              },
            },
            {
              type: "CALLOUT",
              data: {
                variant: "INFO",
                body: "The Astra Pro's specification data gathered for this course does not include a separately published accuracy or precision tolerance — common for consumer-grade depth cameras, whose datasheets often report only range and resolution. A missing spec is itself something to notice when evaluating hardware — and the RPLIDAR example above shows the difference: when a real tolerance exists, use it directly; don't reach for an indirect proxy out of habit.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "The Astra Pro's indirect evidence, kept, now correctly scoped to a device that actually needs it: its datasheet rates 0.6–8.0 m as its range but only 0.6–5.0 m as optimal — a real, if qualitative, signal that accuracy/noise characteristics degrade before the sensor's absolute range limit is reached, used here only because a direct figure genuinely isn't available.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Noise, connected to both examples: noise is what causes that degradation — small random variations in a reading that grow larger as a sensor operates closer to its physical limits (longer range, dimmer/farther light return, weaker reflection). The RPLIDAR's widening tolerance band is published evidence of exactly this; the Astra Pro's optimal-range cutoff is the same phenomenon without a number attached.",
              },
            },
            {
              type: "CALLOUT",
              data: {
                variant: "TIP",
                body: "The evaluation heuristic, sharpened: always look for a direct tolerance figure first (like the RPLIDAR's range resolution). Only fall back to an indirect signal (like an 'optimal' range cutoff) when a datasheet genuinely doesn't publish one — and recognize that fallback for what it is, not a substitute of equal strength.",
              },
            },
          ],
        },
        {
          slug: "frequency-latency-data-rate",
          title: "Frequency, Latency, and Data Rate",
          durationMinutes: 12,
          contentBlocks: [
            {
              type: "TEXT",
              data: {
                body: "Frequency, grounded: the RPLIDAR's rotation speed is 10 Hz by default, adjustable 5–15 Hz; the Astra Pro streams RGB and depth up to 30 FPS each. Higher frequency means fresher data sooner, at a real cost — more data to process per second.",
              },
            },
            {
              type: "SPEC_TABLE",
              deviceSlug: "rplidar-a2",
              specKeys: ["rotation_speed"],
            },
            {
              type: "TEXT",
              data: {
                body: "Latency, distinguished from frequency explicitly — a common confusion: frequency is how often new data arrives; latency is how long any single reading takes to become available after the physical event it measures. A sensor can be high-frequency and still have meaningful latency.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Data rate, introduced via the RPLIDAR's sample rate: 8,000 samples/sec (A2M8) or 16,000 samples/sec (A2M7/A2M12) — more samples per second at the same rotation speed means finer angular resolution per sweep, tying directly back to Lesson 1.",
              },
            },
            {
              type: "SPEC_TABLE",
              deviceSlug: "rplidar-a2",
              specKeys: ["sample_rate"],
            },
            {
              type: "CALLOUT",
              data: {
                variant: "WARNING",
                title: "Teaching Point: The Baud Rate Trap",
                body: "The RPLIDAR's serial output interface has its own throughput number, separate from its scan rate — and it is not uniform even within the A2 family. A2M8 defaults to 115200 bps; A2M7 and A2M12 default to 256000 bps — confirmed directly from Slamtec's own official spec table. Using the wrong SKU's launch file produces a specific, real symptom: the device still shows up in lsusb, the port still opens, but scan data is garbled or absent.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Why this belongs in a sensor concepts module, not just a setup guide: baud rate is a concrete instance of \"data rate\" that you can now recognize the general shape of — a communication channel has its own throughput limit and configuration, separate from whatever the sensor itself is physically capable of. This same shape recurs for any future serial or bus-connected device.",
              },
            },
            {
              type: "IMAGE",
              data: {
                src: "/hardware/rplidar-a2-baud-sample-rate-comparison.svg",
                alt: "A three-column comparison card for A2M7, A2M8, and A2M12, showing each sub-model's serial baud rate, sample rate, and angular resolution — A2M8 highlighted in a different color to show its 115200 bps baud rate differs from the other two's 256000 bps.",
                caption: "\"The A2\" is not one configuration — the exact sub-model label determines two real, different numbers.",
              },
            },
          ],
        },
        {
          slug: "multi-stream-sensors-fov-range-tradeoff",
          title: "Multi-Stream Sensors and the Field-of-View/Range Tradeoff",
          durationMinutes: 12,
          contentBlocks: [
            {
              type: "TEXT",
              data: {
                body: "Recap-and-reframe: the Astra Pro isn't \"one sensor with a lot of specs\" — it's two independent sensing paths (UVC RGB camera; OpenNI2 structured-light depth engine) sharing one housing, confirmed by two independent sources agreeing on distinct USB identities (2bc5:0403 depth, 2bc5:0501 RGB). Each path has its own resolution, its own frame rate, and — per Lesson 2 — potentially its own noise characteristics.",
              },
            },
            { type: "DEVICE_CARD", deviceSlug: "orbbec-astra-pro" },
            {
              type: "TEXT",
              data: {
                body: "The applied comparison, using real numbers from all three prior lessons at once: for a task like \"detect a person walking 6 meters away, indoors,\" the Astra Pro's optimal depth range (0.6–5 m) already excludes that distance, while the RPLIDAR's 0.2–12/16 m range comfortably includes it — even though the Astra Pro is the \"richer\" sensor by data type (color + depth vs. distance-only).",
              },
            },
            {
              type: "CALLOUT",
              data: {
                variant: "TIP",
                body: "The general lesson underneath the specific example: \"richer data\" and \"better fit for this job\" are different questions — evaluate range/FOV/frequency against the actual task, not against which sensor sounds more capable.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "You can now read a sensor's specifications and reason about fitness for a task. Module 3 shows what happens after the sensor measures something — how that measurement actually becomes a ROS 2 message a robot can use.",
              },
            },
            {
              type: "EXERCISE",
              exercise: {
                title: "Choose the Right Sensor",
                instructions:
                  "For each scenario, choose RPLIDAR, Astra Pro, or both, and justify the choice with at least one concrete spec.",
                config: {
                  type: "INDEPENDENT",
                  goal: {
                    body: "Given three task scenarios — detecting a person 6 m away indoors; building a detailed 3D model of a small object 1 m away; mapping a room's walls for navigation — choose the right sensor(s) for each and justify with a real number.",
                  },
                  successCriteria: [
                    "Each justification cites a real number from Lessons 1–3 (range, FOV, resolution, or frequency), not a vague 'it's better at that'",
                    "Correctly identifies the RPLIDAR as primary for the 6 m detection task",
                    "Correctly identifies the Astra Pro as primary for the close-range 3D modeling task",
                  ],
                  hints: [
                    "Point back to the specific lesson/spec relevant to each scenario — Lesson 1's range/FOV table is the place to start.",
                  ],
                },
              },
            },
            {
              type: "QUIZ",
              quiz: {
                title: "Module 2 Check: Sensor Concepts",
                description:
                  "Scenario and diagnostic questions grounded in this course's own real, published specifications.",
                questions: [
                  {
                    type: "SINGLE_CHOICE",
                    prompt:
                      "You're choosing a primary sensor to detect a person 6 meters away, indoors. The Astra Pro's optimal depth range is 0.6–5 m; the RPLIDAR A2M8's range is 0.2–12 m. Which should be primary, and why?",
                    explanation:
                      "This is the exact reasoning Lesson 4 walked through — range and FOV should be matched to the task, not assumed from which sensor 'sounds' more capable.",
                    options: [
                      {
                        id: "a",
                        label:
                          "The RPLIDAR — 6 m falls outside the Astra Pro's optimal range but well inside the RPLIDAR's",
                      },
                      { id: "b", label: "The Astra Pro — it has richer color + depth data" },
                      { id: "c", label: "Either works equally well" },
                      { id: "d", label: "Neither — 6 m is out of range for both" },
                    ],
                    correctOptionIds: ["a"],
                  },
                  {
                    type: "SINGLE_CHOICE",
                    prompt:
                      "An A2M8 unit is connected, powered, and spinning. lsusb shows the device, and the udev symlink /dev/rplidar exists. But the ROS 2 driver reports garbled range values instead of clean scan data. What should be checked next?",
                    explanation:
                      "This is the Baud Rate Trap from Lesson 3 — the device 'looks' fully connected, but the serial configuration doesn't match the physical unit.",
                    options: [
                      {
                        id: "a",
                        label:
                          "Whether the launch file matches the unit's actual baud rate (A2M8 defaults to 115200 bps)",
                      },
                      { id: "b", label: "Whether the udev rule needs to be reinstalled" },
                      { id: "c", label: "Whether the USB cable is faulty" },
                      { id: "d", label: "Whether the laser needs recalibration" },
                    ],
                    correctOptionIds: ["a"],
                  },
                  {
                    type: "TRUE_FALSE",
                    prompt:
                      "The Astra Pro's RGB image and depth image must have identical resolution and frame rate, since they come from the same physical unit.",
                    explanation:
                      "They're two independent sensing paths, confirmed by two separate USB identities — each with its own resolution/frame-rate defaults, not a shared spec.",
                    correctAnswer: false,
                  },
                  {
                    type: "SINGLE_CHOICE",
                    prompt:
                      "The RPLIDAR A2's range resolution is published as ≤1% of range up to 12 m. At a true distance of 10 m, roughly what reading error should you expect?",
                    explanation:
                      "This is a direct application of a real published tolerance — 1% of 10 m is 0.1 m.",
                    options: [
                      { id: "a", label: "Roughly ±10 cm" },
                      { id: "b", label: "Roughly ±1 cm" },
                      { id: "c", label: "Roughly ±1 m" },
                      { id: "d", label: "No error — the sensor is perfectly accurate" },
                    ],
                    correctOptionIds: ["a"],
                  },
                  {
                    type: "SINGLE_CHOICE",
                    prompt:
                      "A sensor's datasheet lists a maximum range but no separately published accuracy or precision figure — like the Astra Pro. What's the most reasonable conclusion?",
                    explanation:
                      "Exactly the reasoning Lesson 2 modeled — but as the fallback case, used only because the Astra Pro genuinely has no direct tolerance figure, unlike the RPLIDAR.",
                    options: [
                      {
                        id: "a",
                        label:
                          "This is common for consumer-grade sensors; look for indirect signals like a stated 'optimal' range, and don't assume accuracy right up to the maximum",
                      },
                      { id: "b", label: "The sensor is unreliable and should not be used" },
                      { id: "c", label: "The datasheet is incomplete and cannot be trusted at all" },
                      { id: "d", label: "Accuracy can be assumed to match the resolution figure" },
                    ],
                    correctOptionIds: ["a"],
                  },
                  {
                    type: "MULTIPLE_CHOICE",
                    prompt:
                      "Which of the following correctly pairs a concept with this course's own real example? Select all that apply.",
                    explanation:
                      "The Astra Pro distractor is false — no published numeric accuracy tolerance was found for that device, unlike the RPLIDAR.",
                    options: [
                      {
                        id: "a",
                        label: "Angular resolution — RPLIDAR's 0.225°/0.45° per-SKU difference",
                      },
                      {
                        id: "b",
                        label: "Field of view — RPLIDAR's 360° vs. Astra Pro's 60°×49.5° cone",
                      },
                      {
                        id: "c",
                        label: "Accuracy — RPLIDAR's published ≤1%/≤2% of range tolerance",
                      },
                      { id: "d", label: "Accuracy — a published numeric tolerance for the Astra Pro" },
                    ],
                    correctOptionIds: ["a", "b", "c"],
                  },
                ],
              },
            },
          ],
        },
      ],
    },
    {
      title: "Module 3 — Hardware-to-ROS-2 Data Pipeline",
      summary:
        "The generic driver→node→topic→message→QoS pipeline, then grounded in both real devices' actual seeded topic and QoS data.",
      lessons: [
        {
          slug: "the-generic-pipeline",
          title: "The Generic Pipeline: From Physical World to ROS 2 Topic",
          durationMinutes: 11,
          contentBlocks: [
            {
              type: "TEXT",
              data: {
                body: "The chain, stated once, plainly, with no device attached yet: a physical event happens in the world; a sensor turns it into a signal; the signal becomes digital data; a driver turns that data into something a computer program understands; a ROS 2 node wraps that into a topic, publishing a stream of typed messages; QoS settings govern how reliably those messages are delivered; finally, an application (RViz2, or a robot's own decision-making) consumes them.",
              },
            },
            {
              type: "IMAGE",
              data: {
                src: "/hardware/hardware-ros2-generic-pipeline.svg",
                alt: "A ten-stage horizontal flow diagram with generic, device-agnostic icons: Physical World, Sensor, Signal, Digital Data, Driver, ROS 2 Node, Topic, Message, QoS, and Application, connected by arrows.",
                caption: "This is the shape of every device pipeline this course will ever show, before any specific device fills it in.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Why each stage exists, one sentence each: the driver exists because raw hardware signals aren't yet software-shaped; the node exists because ROS 2 needs a consistent way to expose that data to the rest of the system; the topic/message pair exists so any number of other programs can consume the same data without coordinating with the driver directly; QoS exists because \"delivered\" can mean different things depending on what the data is for.",
              },
            },
            {
              type: "CALLOUT",
              data: {
                variant: "INFO",
                body: "This exact chain applies to any sensor this course ever adds — a LiDAR, a camera, an IMU, anything. The next two lessons ground it in this course's own two real devices; a future device's lesson will ground it the same way, not replace this model.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Now watch this exact chain happen for real, starting with the RPLIDAR.",
              },
            },
          ],
        },
        {
          slug: "grounding-the-pipeline-rplidar",
          title: "Grounding the Pipeline: RPLIDAR's /scan, From Motor to Message",
          durationMinutes: 12,
          contentBlocks: [
            {
              type: "TEXT",
              data: {
                body: "Walk the generic chain from Lesson 1, now filled in stage by stage for the RPLIDAR: physical world (an object in the room) → sensor (the spinning laser head) → signal (reflected light, timed) → digital data (a distance value per angle) → driver (rplidar_ros) → ROS 2 node (rplidar_node) → topic (/scan) → message (sensor_msgs/msg/LaserScan) → QoS (RELIABLE) → application (RViz2).",
              },
            },
            {
              type: "IMAGE",
              data: {
                src: "/hardware/rplidar-a2-data-pipeline.svg",
                alt: "A six-stage horizontal pipeline: Hardware (RPLIDAR A2) to Driver (rplidar_ros) to ROS 2 Node (rplidar_node) to Topic (/scan, RELIABLE QoS) to Message (sensor_msgs/msg/LaserScan) to Visualization (RViz2, no QoS override needed), connected by arrows.",
                caption: "Every hop confirmed from the driver's own source, not assumed.",
              },
            },
            {
              type: "SPEC_TABLE",
              deviceSlug: "rplidar-a2",
              specKeys: ["serial_baudrate", "usb_bridge_chip", "publisher_qos"],
            },
            {
              type: "TEXT",
              data: {
                body: "The QoS fact, stated with its own weight rather than buried in the table: the driver's own source publishes /scan with rclcpp::QoS(KeepLast(10)), whose default reliability is RELIABLE — confirmed by reading the driver's source, not assumed from a general \"sensors use best-effort\" rule of thumb. RViz2's default LaserScan subscription is also RELIABLE, so no override is needed — a specific, falsifiable claim, not folklore.",
              },
            },
            {
              type: "CALLOUT",
              data: {
                variant: "INFO",
                body: "Notice this pipeline includes a serial stage — the driver reading raw UART data at a specific baud rate — before any ROS 2 concept even appears. This is exactly the stage the Baud Rate Trap (Module 2 Lesson 3) breaks.",
              },
            },
          ],
        },
        {
          slug: "grounding-the-pipeline-astra-pro",
          title: "Grounding the Pipeline: The Astra Pro's Two Parallel Pipelines",
          durationMinutes: 12,
          contentBlocks: [
            {
              type: "TEXT",
              data: {
                body: "Direct callback to Module 2 Lesson 4: the Astra Pro isn't one pipeline, it's two, running in parallel from one housing — the RGB/UVC path and the OpenNI2 depth path — each independently instantiating the Lesson 1 generic chain.",
              },
            },
            { type: "DEVICE_CARD", deviceSlug: "orbbec-astra-pro" },
            {
              type: "SPEC_TABLE",
              deviceSlug: "orbbec-astra-pro",
            },
            {
              type: "TEXT",
              data: {
                body: "Walking both chains explicitly, side by side: RGB path — UVC sensor → USB identity 2bc5:0501 → astra_camera_node → topic /camera/color/camera_info (sensor_msgs/msg/CameraInfo); depth path — OpenNI2 sensor → USB identity 2bc5:0403 → the same node → /camera/depth/camera_info (also sensor_msgs/msg/CameraInfo) plus /camera/depth_registered/points (sensor_msgs/msg/PointCloud2).",
              },
            },
            {
              type: "CALLOUT",
              data: {
                variant: "INFO",
                body: "Why two camera_info topics? Each sensing path has its own physical camera intrinsics (focal length, distortion) — a single combined topic would incorrectly imply the RGB and depth sensors share one set of intrinsics, which they don't.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "One node, two independent pipelines converging into it: worth naming explicitly that \"one ROS 2 node\" doesn't imply \"one pipeline\" any more than \"one housing\" implied \"one sensor\" back in Module 2.",
              },
            },
            {
              type: "IMAGE",
              data: {
                src: "/hardware/orbbec-astra-pro-data-pipeline.svg",
                alt: "Two horizontal pipeline chains — RGB/UVC sensor and OpenNI2 depth sensor — converging into a single shared astra_camera_node box, then diverging again into their own separate topics: /camera/color/camera_info for RGB, and /camera/depth/camera_info plus /camera/depth_registered/points for depth.",
                caption: "Parallelism, not just linearity, is a real pipeline shape this course's own hardware demonstrates.",
              },
            },
          ],
        },
        {
          slug: "qos-why-reliability-settings-matter",
          title: "QoS: Why Reliability Settings Matter",
          durationMinutes: 13,
          contentBlocks: [
            {
              type: "TEXT",
              data: {
                body: "Generalize Lesson 2's specific fact: QoS reliability is a real compatibility contract, not a cosmetic setting. A RELIABLE subscriber (like RViz2's default) cannot receive data from a BEST_EFFORT publisher — the subscription simply never connects, with no error message pointing at QoS as the cause.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Why this matters especially for future devices: the RPLIDAR happens to publish RELIABLE, matching RViz2's default, so a learner who never hits a mismatch here might assume QoS \"just works.\" A future sensor driver using SensorDataQoS() (BEST_EFFORT, common for high-rate sensor data) would silently fail to display in a default-configured RViz2 — worth knowing before hitting it for the first time on an unfamiliar device.",
              },
            },
            {
              type: "IMAGE",
              data: {
                src: "/hardware/qos-compatibility.svg",
                alt: "Two side-by-side diagrams: a RELIABLE publisher connecting successfully to a RELIABLE subscriber with a solid line, versus a BEST_EFFORT publisher failing to connect to a RELIABLE subscriber, shown with a broken line.",
                caption: "This failure mode looks identical to \"nothing is happening,\" but has a specific, checkable cause.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Reintroduce the diagnostic ladder, explicitly as a device-agnostic tool this module hands off complete: connection → power → OS detection → driver → node → topic → data → visualization. Every later device module reuses this exact ladder rather than inventing a new one.",
              },
            },
            {
              type: "CALLOUT",
              data: {
                variant: "TIP",
                body: "QoS mismatches live at the 'topic → data' rung — everything below it (connection, power, driver, node, topic existing) can be completely healthy while QoS alone blocks the data from ever reaching an application. This is precisely why the ladder has more than one rung after 'topic.'",
              },
            },
            {
              type: "EXERCISE",
              exercise: {
                title: "Diagnose Without the Device",
                instructions:
                  "A deliberately device-agnostic debugging scenario — the same reasoning applies to any future sensor.",
                config: {
                  type: "DEBUGGING",
                  scenario: {
                    body: "A sensor's ROS 2 node is confirmed running (ros2 node list shows it), but ros2 topic echo on its expected topic shows nothing.",
                  },
                  hints: [
                    "Confirm the topic actually exists first (ros2 topic list) — a node running doesn't guarantee it's publishing yet.",
                    "If the topic exists but echo still shows nothing, suspect QoS incompatibility before suspecting the driver.",
                    "Check both the publisher's and your subscriber's QoS reliability settings: ros2 topic info <topic> --verbose",
                  ],
                  solution: {
                    body: "Running ros2 topic info <topic> --verbose reveals the publisher's QoS reliability differs from your subscriber's — most often a BEST_EFFORT publisher against a RELIABLE subscriber. Matching the subscriber's reliability to the publisher's (or vice versa) resolves it.",
                    visuals: [
                      {
                        kind: "CODE",
                        data: { language: "bash", code: "ros2 topic info <topic> --verbose" },
                      },
                    ],
                  },
                  rootCause: {
                    body: "This symptom is so easy to misdiagnose as \"the driver isn't working\" precisely because the driver is, in fact, running correctly — QoS incompatibility is a silent connection failure, not a data-content failure, and produces no error message pointing at QoS as the cause.",
                  },
                },
              },
            },
            {
              type: "QUIZ",
              quiz: {
                title: "Module 3 Check: The Hardware-to-ROS-2 Pipeline",
                description:
                  "Scenario and diagnostic questions on the generic pipeline, QoS, and the diagnostic ladder.",
                questions: [
                  {
                    type: "SINGLE_CHOICE",
                    prompt:
                      "In the driver → node → topic → message chain, what is the driver's specific job?",
                    explanation:
                      "Publishing the topic is the node's job, using data the driver has already produced.",
                    options: [
                      {
                        id: "a",
                        label: "Turning raw hardware signal/data into a form the ROS 2 node can work with",
                      },
                      { id: "b", label: "Publishing the ROS 2 topic" },
                      { id: "c", label: "Rendering the data in RViz2" },
                      { id: "d", label: "Defining the message type" },
                    ],
                    correctOptionIds: ["a"],
                  },
                  {
                    type: "SINGLE_CHOICE",
                    prompt:
                      "The RPLIDAR's /scan topic publishes with RELIABLE QoS. Suppose a different, future sensor's driver instead used BEST_EFFORT QoS, and RViz2 subscribes with its default RELIABLE setting. What would you expect?",
                    explanation:
                      "This is a real QoS compatibility rule, not a rare edge case — and it's exactly why the RPLIDAR's own RELIABLE default was worth confirming from source rather than assuming.",
                    options: [
                      {
                        id: "a",
                        label:
                          "RViz2 would not receive any data — a RELIABLE subscriber cannot connect to a BEST_EFFORT publisher",
                      },
                      { id: "b", label: "RViz2 would receive the data, just delayed" },
                      { id: "c", label: "RViz2 would crash" },
                      { id: "d", label: "RViz2 would automatically switch to BEST_EFFORT" },
                    ],
                    correctOptionIds: ["a"],
                  },
                  {
                    type: "SINGLE_CHOICE",
                    prompt:
                      "For the Astra Pro, why are /camera/color/camera_info and /camera/depth/camera_info two separate topics instead of one?",
                    explanation:
                      "Combining them into one topic would incorrectly imply shared intrinsics.",
                    options: [
                      {
                        id: "a",
                        label:
                          "The RGB and depth sensors are two independent sensing paths, each with its own physical camera intrinsics",
                      },
                      { id: "b", label: "ROS 2 requires every stream to have its own camera_info topic" },
                      { id: "c", label: "It's a naming convention with no technical reason" },
                      { id: "d", label: "The depth sensor doesn't actually have intrinsics" },
                    ],
                    correctOptionIds: ["a"],
                  },
                  {
                    type: "TRUE_FALSE",
                    prompt:
                      "A device's ROS 2 message type (e.g. sensor_msgs/msg/LaserScan) is fixed by ROS 2 itself and cannot vary between drivers for similar devices.",
                    explanation:
                      "The driver's author chooses which standard (or custom) message type best fits the data — ROS 2 provides common types as a shared vocabulary, but doesn't mandate which driver uses which.",
                    correctAnswer: false,
                  },
                  {
                    type: "SINGLE_CHOICE",
                    prompt:
                      "ros2 node list shows a sensor's node running, but ros2 topic echo on its expected topic shows nothing, and the topic does appear in ros2 topic list. Per the diagnostic ladder, what should be checked next?",
                    explanation:
                      "Exactly the reasoning built in this module's own debugging exercise — a topic existing doesn't guarantee your subscriber can actually receive from it.",
                    options: [
                      {
                        id: "a",
                        label:
                          "QoS compatibility between the publisher and your subscriber (ros2 topic info <topic> --verbose)",
                      },
                      { id: "b", label: "Whether the USB cable is faulty" },
                      { id: "c", label: "Whether the driver package needs to be reinstalled" },
                      { id: "d", label: "Whether the topic name is spelled correctly" },
                    ],
                    correctOptionIds: ["a"],
                  },
                ],
              },
            },
          ],
        },
      ],
    },
    {
      title: "RPLIDAR A2",
      summary:
        "A 360° 2D laser scanner and its verified path onto ROS 2 Jazzy.",
      lessons: [
        // Section A — reuses the Stage 1 fixture's slug (rplidar-a2-overview)
        // rather than abandoning it, since seedCurricula never deletes a
        // lesson that disappears from this array. The pipeline IMAGE that
        // used to live here has moved to Section H, where the design
        // actually places it.
        {
          slug: "rplidar-a2-overview",
          title: "RPLIDAR A2 — Introduction",
          durationMinutes: 8,
          contentBlocks: [
            {
              type: "TEXT",
              data: {
                body: "A robot that can't see walls coming is a robot that crashes into them. LiDAR is one of the two ways this course teaches you to give a robot that sense — the other being the Astra Pro's depth camera.",
              },
            },
            { type: "DEVICE_CARD", deviceSlug: "rplidar-a2" },
            {
              type: "TEXT",
              data: {
                body: "A 2D LiDAR, at a high level, is a spinning laser rangefinder that measures distance in every direction around itself, 360 degrees per rotation, many times a second.",
              },
            },
            {
              type: "CALLOUT",
              data: {
                variant: "INFO",
                body: "You already know this device's real range (0.2-16 m depending on sub-model) and its 360-degree field of view from Module 2 Lesson 1. This module goes from those numbers to a working sensor on your desk.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Why this course leads with confidence framing, not just specs: this device is actively maintained, rated HIGH confidence, and officially released for Jazzy — the everything-works-as-documented case this course needed at least one of, in contrast to the legacy Astra Pro.",
              },
            },
          ],
        },
        {
          slug: "rplidar-a2-how-it-works",
          title: "How It Works",
          durationMinutes: 10,
          contentBlocks: [
            {
              type: "TEXT",
              data: {
                body: "Imagine a laser pointer mounted next to a tiny camera, both spinning together. The laser marks a dot on nearby surfaces; the camera watches exactly where that dot lands, and simple geometry converts where the dot landed into how far away it is.",
              },
            },
            {
              type: "IMAGE",
              data: {
                src: "/hardware/rplidar-a2-working-principle.svg",
                alt: "A side-view diagram showing a fixed laser emitter and receiver pair, with laser lines drawn to a near object and a far object, and the reflected angle at the receiver visibly different between the two — distance is inferred from the angle, not a time delay.",
                caption: "Every arrow above is real geometry, not a black box.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "This is triangulation, not time-of-flight — the device measures the angle a reflected laser spot lands on an internal sensor relative to the emitter's fixed position, not how long light takes to return. Quoted directly from Slamtec's own product page: \"RPLIDAR A2 adopts laser triangulation ranging principle, and with high-speed RPVision3.0 range engine, it measures distance data 8000 times per second.\"",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Practical consequence: triangulation is why this device is affordable and low-power enough for a course budget, and why its published range-resolution tolerance coarsens at longer range (1% up to 12 m, 2% from 12-16 m) — the same triangulation geometry that makes this device cheap also makes fine angular differences harder to resolve at distance. The full accuracy discussion, including the plus-or-minus 10 cm and plus-or-minus 30 cm worked calculation, already lives in Module 2 Lesson 2 — this section only connects that already-taught number back to the working principle that causes it.",
              },
            },
            {
              type: "CALLOUT",
              data: {
                variant: "TIP",
                body: "The unit uses a brushless motor, not a belt drive, confirmed on Slamtec's own product page — this is why it spins quietly and doesn't wear out the way a belt-driven scanner would.",
              },
            },
          ],
        },
        {
          slug: "rplidar-a2-hardware-understanding",
          title: "Hardware Understanding",
          durationMinutes: 8,
          contentBlocks: [
            {
              type: "TEXT",
              data: {
                body: "Component walkthrough: the rotating head (laser emitter plus angle-sensing receiver) spins continuously — never force it or hold it stationary while powered. The base and motor housing contains the brushless motor. The USB-to-serial adapter board carries the CP2102 bridge chip and is what you actually hold and plug in. The model and serial label is the single most setup-critical label on the device.",
              },
            },
            {
              type: "IMAGE",
              data: {
                src: "/hardware/rplidar-a2-annotated-hardware.svg",
                alt: "An annotated diagram of the RPLIDAR A2 pointing out the rotating head assembly, the base and motor housing, the model and serial label, the USB-to-serial adapter board, and the connecting cable.",
                caption: "Match this against your own unit before Section F's physical setup.",
              },
            },
            {
              type: "CALLOUT",
              data: {
                variant: "WARNING",
                body: "Class 1 laser, safe under normal operating conditions — but never force the rotating head, matching Module 0 Lesson 2's own safety content.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Before connecting anything, know exactly which numbers apply to your unit — that starts with reading the label this section just pointed at.",
              },
            },
          ],
        },
        {
          slug: "rplidar-a2-specifications",
          title: "Specifications",
          durationMinutes: 9,
          contentBlocks: [
            { type: "SPEC_TABLE", deviceSlug: "rplidar-a2" },
            {
              type: "CALLOUT",
              data: {
                variant: "INFO",
                body: "The range-resolution row above is the one Module 2 Lesson 2 uses as its direct worked accuracy example (1% of range up to 12 m; 2% from 12-16 m) — cross-referenced there in full, not re-derived here.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "The per-SKU differences, named explicitly once more before Sections F and G need them operationally: A2M7 and A2M12 both use 256000 bps and 0.225-degree angular resolution; A2M8 uses 115200 bps and 0.45-degree angular resolution. This is not a uniform A2 configuration.",
              },
            },
          ],
        },
        {
          slug: "rplidar-a2-real-applications",
          title: "Real Applications",
          durationMinutes: 7,
          contentBlocks: [
            {
              type: "TEXT",
              data: {
                body: "A 0.2-16 m range and 360-degree coverage at 10 Hz is exactly the shape of data SLAM algorithms are built to consume — a fresh full-room sweep ten times a second.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Navigation uses this data to avoid obstacles in real time. SLAM builds a map while localizing within it. Mapping builds a static map for later use. Localization finds the robot's own position in a known map. This course doesn't re-teach SLAM or navigation in depth — that's out of scope — but this is where this device's data feeds into those systems.",
              },
            },
            {
              type: "CALLOUT",
              data: {
                variant: "TIP",
                body: "This module doesn't build a SLAM system — it gets you to clean scan data. What you do with that data next is where a dedicated navigation or SLAM course would pick up.",
              },
            },
          ],
        },
        {
          slug: "rplidar-a2-physical-setup",
          title: "Physical Setup",
          durationMinutes: 8,
          contentBlocks: [
            {
              type: "TEXT",
              data: {
                body: "Direct callback to Module 0 Lesson 4's power-budget lesson: this device draws a continuous 450-600 mA. Plug it into the powered USB hub from the course bill of materials, not a bare laptop port, especially once the Astra Pro is also connected.",
              },
            },
            {
              type: "CALLOUT",
              data: {
                variant: "WARNING",
                body: "Confirm the sub-model before connecting anything else. Read the label — A2M7, A2M8, or A2M12 — since Section G's exact commands depend on getting this right first.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Physical connection: adapter board to USB, via the hub, with the cable secured so the rotating head isn't obstructed. Place the unit upright on a stable, flat surface — the profile's scan-field flatness tolerance is a mechanical spec, not a big constraint, but a flat surface removes it as a variable entirely.",
              },
            },
            {
              type: "IMAGE",
              data: {
                src: "/hardware/rplidar-a2-connection-diagram.svg",
                alt: "A left-to-right connection diagram: RPLIDAR A2 unit to cable to USB-serial adapter board to powered USB hub.",
                caption: "Every hop is a physical connection, not yet software — Section G confirms the OS sees it.",
              },
            },
          ],
        },
        {
          slug: "rplidar-a2-ubuntu-setup",
          title: "Ubuntu Setup",
          durationMinutes: 12,
          contentBlocks: [
            {
              type: "TEXT",
              data: {
                body: "Why this device's install is the easy case in this course: officially released for Jazzy, no source build, directly contrasted against the Astra Pro, which needs one.",
              },
            },
            {
              type: "CODE",
              data: {
                language: "bash",
                code: "sudo apt install ros-jazzy-rplidar-ros",
                caption:
                  "Expected: apt resolves and installs ros-jazzy-rplidar-ros from the official Jazzy package index, no compilation step, no error. Failure: \"E: Unable to locate package ros-jazzy-rplidar-ros\" means the ROS 2 apt repository itself isn't configured — a Module 0 prerequisite problem, not an RPLIDAR-specific one.",
              },
            },
            {
              type: "CALLOUT",
              data: {
                variant: "INFO",
                body: "Udev is the Linux subsystem that names and sets device permissions on plug-in, already introduced in the Astra Pro's own Ubuntu Setup section. Same tool, same reason: without a rule, this device would get a shifting auto-assigned name like /dev/ttyUSB0 instead of the stable /dev/rplidar the rule below creates.",
              },
            },
            {
              type: "CODE",
              data: {
                language: "bash",
                code: 'echo \'KERNEL=="ttyUSB*", ATTRS{idVendor}=="10c4", ATTRS{idProduct}=="ea60", MODE:="0777", SYMLINK+="rplidar"\' \\\n  | sudo tee /etc/udev/rules.d/rplidar.rules\nsudo udevadm control --reload-rules && sudo udevadm trigger',
                caption:
                  "Expected: the tee command echoes the rule line back; the udevadm commands produce no output on success. Failure: if the device was already plugged in before this step, the symlink may not appear until unplug/replug.",
              },
            },
            {
              type: "CODE",
              data: {
                language: "bash",
                code: 'dmesg | grep -i "cp210\\|ttyUSB"',
                caption:
                  "Expected: a line mentioning cp210x (the Silicon Labs USB-UART bridge driver) and a ttyUSBn assignment with a recent timestamp. Failure: no matching lines means the OS never saw the device — check the physical connection and USB power before assuming a software problem.",
              },
            },
            {
              type: "CODE",
              data: {
                language: "bash",
                code: "ls -l /dev | grep rplidar",
                caption:
                  "Expected: a symlink line, rplidar pointing at ttyUSBn. Failure: ttyUSBn exists but no rplidar symlink means the udev rule didn't apply — re-run udevadm control --reload-rules && udevadm trigger, or unplug/replug.",
              },
            },
          ],
        },
        {
          slug: "rplidar-a2-ros2-integration",
          title: "ROS 2 Integration",
          durationMinutes: 12,
          contentBlocks: [
            {
              type: "TEXT",
              data: {
                body: "Direct callback to Module 3 Lesson 2, which already traced this exact pipeline. This section doesn't re-teach the six-stage chain — it fills in what that lesson didn't need: the full parameter table and the services.",
              },
            },
            {
              type: "IMAGE",
              data: {
                src: "/hardware/rplidar-a2-data-pipeline.svg",
                alt: "A six-stage horizontal pipeline: Hardware (RPLIDAR A2) to Driver (rplidar_ros) to ROS 2 Node (rplidar_node) to Topic (/scan, RELIABLE QoS) to Message (sensor_msgs/msg/LaserScan) to Visualization (RViz2, no QoS override needed), connected by arrows.",
                caption:
                  "Every hop confirmed from the driver's own source. Reused as-is from Module 3 Lesson 2 — this device's pipeline hasn't changed.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "The parameter table's most important finding: the node's own compiled-in default baud rate is 1,000,000 bps, matching no A2 sub-model. The correct value only ever comes from whichever launch file is actually used. The frame_id default, laser_frame, similarly differs from what every A2 launch file actually sets, which is laser.",
              },
            },
            {
              type: "CODE",
              data: {
                language: "cpp",
                code: 'this->get_parameter_or<int>("serial_baudrate", serial_baudrate, 1000000/*256000*/);\n//ros run for A1 A2, change to 256000 if A3',
                caption:
                  "Read this literally: the comment says to change to 256000 for A3, implying 256000 is fine for A1/A2 by default. The actual default value beside it is 1000000. The comment and the code disagree with each other. This is real, current, unfixed source, not a hypothetical example.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "The two motor-control services are genuinely new content this module adds beyond Module 3: stop_motor and start_motor, both std_srvs/srv/Empty. A ROS 2 service is a different communication pattern than the topics Module 3 already covered — instead of a continuous stream a node publishes and anyone can subscribe to, like the scan topic, a service is a direct, one-off request and response call: you call it, it does something once, and returns. These two exist precisely because stopping the motor isn't a stream of data, it's a single command. Demonstrated live in the next section.",
              },
            },
            {
              type: "CODE",
              data: {
                language: "bash",
                code: "ros2 service list | grep motor",
                caption:
                  "Expected: two lines, /stop_motor and /start_motor, once the node from Section I is running. Failure: no output means the node isn't running yet or crashed at startup — check Section J's ladder from the top.",
              },
            },
          ],
        },
        {
          slug: "rplidar-a2-practical-demo",
          title: "Practical Demo",
          durationMinutes: 14,
          contentBlocks: [
            {
              type: "TEXT",
              data: {
                body: "The full launch sequence, already set up through the udev step in Section G — this is the final step.",
              },
            },
            {
              type: "CODE",
              data: {
                language: "bash",
                code: "ros2 launch rplidar_ros view_rplidar_a2m8_launch.py",
                caption:
                  "Swap a2m8 for a2m7 or a2m12 per Section F's confirmed sub-model. Expected: the terminal logs the RPLidar serial number, firmware version, and a health status of OK, then RViz2 opens automatically with a live LaserScan display — no manual QoS configuration needed, since the publisher's RELIABLE default already matches RViz2's default subscription. Failure: covered in full in Section J.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Guided observation: arrange two or three distinct objects, such as a box, a chair leg, and a wall corner, at different distances around the sensor before checking the data below.",
              },
            },
            {
              type: "CODE",
              data: {
                language: "bash",
                code: "ros2 topic echo /scan --once",
                caption:
                  "Expected: one full LaserScan message, with angle_min, angle_max, and the ranges array populated with real distance values matching the arranged scene. Failure: an empty or hanging command means the topic isn't publishing — return to Section J.",
              },
            },
            {
              type: "CODE",
              data: {
                language: "bash",
                code: "ros2 service call /stop_motor std_srvs/srv/Empty",
                caption:
                  "Expected: the physical head visibly stops spinning within about a second, and the call returns immediately with an empty response. Failure: the head doesn't stop — a rare SDK or firmware-level issue, not a typical setup mistake.",
              },
            },
            {
              type: "CODE",
              data: {
                language: "bash",
                code: "ros2 service call /start_motor std_srvs/srv/Empty",
                caption:
                  "Expected: the head resumes spinning and scan data resumes publishing.",
              },
            },
            {
              type: "CALLOUT",
              data: {
                variant: "TIP",
                body: "You just controlled real hardware state, motor on and off, from the command line, independent of killing and restarting the whole node — a practical demonstration in the fullest sense, not just watching data.",
              },
            },
          ],
        },
        {
          slug: "rplidar-a2-debugging",
          title: "Debugging",
          durationMinutes: 16,
          contentBlocks: [
            {
              type: "TEXT",
              data: {
                body: "Every failure mode below is real, sourced from this device's actual driver code, a real closed GitHub issue, or the official README's own text, not invented for this exercise. The ladder tells you where to look; the exact signature tells you what you'll see when you're looking in the right place.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Connection rung: is the cable seated, and is this the right unit for the launch file you're about to run? An unlisted sub-model such as A2M6 has no dedicated launch file at all, confirmed via a real closed issue on the driver's own repository. Signature: no error, just no matching launch file to run.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Power rung: is the port supplying enough current for a continuous 450-600 mA draw? A real failure is insufficient USB power, Module 0 Lesson 4's own worked example, now literally this device. Signature, logged as a warning: Failed to start motor, followed by an error code.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "OS detection rung: does dmesg or ls /dev show the device at all? A real failure is the udev rule not being installed or reloaded. Signature: /dev/ttyUSB0 works directly but /dev/rplidar gives no such file or directory — the device exists, the expected path doesn't.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Driver rung, the richest one for this device, with three distinct real failures. First, the Baud Rate Trap: a wrong SKU launch file, or bypassing the launch file entirely and relying on the node's own 1,000,000 bps default. Signature: the terminal repeats an operation timeout error, SL_RESULT_OPERATION_TIMEOUT, because the device-info handshake fails when the bytes are framed at the wrong rate, before any scan data would even begin. Second, channel_type accidentally left off serial, a real risk given the same package also supports TCP and UDP-connected models. Signature: an error naming the ip address and tcp port it tried to connect to. Third, serial port permission denied. Signature: an error saying it cannot bind to the specified serial port. The official README's own chmod 777 workaround is documented as not always sufficient by a real user report, which is exactly why this course's udev-rule path is primary.",
              },
            },
            {
              type: "IMAGE",
              data: {
                src: "/hardware/rplidar-a2-baud-sample-rate-comparison.svg",
                alt: "A three-column comparison card for A2M7, A2M8, and A2M12, showing each sub-model's serial baud rate, sample rate, and angular resolution, with A2M8 highlighted differently to show its 115200 bps baud rate differs from the other two's 256000 bps, plus a callout explaining the Baud Rate Trap.",
                caption:
                  "Reused from Module 2 Lesson 3 — the exact same per-SKU numbers behind the Baud Rate Trap above.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Node rung: did the node start, but reject something at initialization? Real failures include an internal device-side fault, whose own error text tells you to reboot the device to retry, and an invalid manual scan_mode override, whose error message prints the driver's own list of actually-supported modes, a rare self-diagnosing error worth calling out as a model of what a good error message does.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Topic rung: does the scan topic exist? If the node started, with the previous rungs all clear, but no topic appears, something failed silently between node startup and the first publish — return to the Node rung's log output rather than assuming a topic-layer problem.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Data rung: does echoing the scan topic once return a real, populated message? A real failure is a physical or cable disconnect mid-operation. Signature: a logged message saying the connection was lost, and scan data stops — a live, zero-risk demonstrable failure, since you can just unplug the cable mid-scan to see it.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Visualization rung: does RViz2 render the scan? For this device, this rung needs no special QoS handling, since RELIABLE matches RELIABLE by default. If data is confirmed good on the previous rung but RViz2 shows nothing, check the Displays panel's topic subscription and Fixed Frame setting — a configuration issue at the visualization layer itself, not upstream.",
              },
            },
            {
              type: "CALLOUT",
              data: {
                variant: "INFO",
                body: "One real failure doesn't fit cleanly on the live ladder at all: the official README's own setup instructions contain a typo, a misspelled folder name in the udev-rule step. This is a documentation bug, not a system failure — if you followed the upstream README directly instead of this course's own sequence and hit a no-such-file-or-directory error on that exact line, the problem is the README, not your environment.",
              },
            },
            {
              type: "IMAGE",
              data: {
                src: "/hardware/rplidar-a2-troubleshooting-flowchart.svg",
                alt: "A troubleshooting flowchart walking the eight-rung diagnostic ladder — connection, power, OS detection, driver, node, topic, data, visualization — each box showing this device's real failure modes and exact logged signatures, with the stop_motor and start_motor services shown as a side-branch off the node rung labeled as a control surface not on the data path, and the Baud Rate Trap labeled at its precise sub-stage, the device-info handshake before scan data begins.",
                caption: "Debugging this device is a sequence of checkable rungs with real signatures, not a mystery.",
              },
            },
            {
              type: "EXERCISE",
              exercise: {
                title: "Diagnose the Wrong Launch File",
                instructions:
                  "A real, progressive-hint debugging scenario built on the Baud Rate Trap.",
                config: {
                  type: "DEBUGGING",
                  scenario: {
                    body: "You've connected your RPLIDAR A2M8, installed the package and udev rule, and confirmed dmesg shows the device and /dev/rplidar exists. You run ros2 launch rplidar_ros view_rplidar_a2m12_launch.py, having grabbed the wrong launch file by mistake. RViz2 opens, but the terminal shows a repeating error instead of a clean startup, and no scan ever appears.",
                  },
                  hints: [
                    "The device is detected by the OS and has the right permissions — those rungs are all clear. The problem is further down the ladder. What's the next rung, and what command checks it?",
                    "Look at the exact terminal text, not just that it's broken. Is there a specific error string repeating? What does it mention?",
                    "SL_RESULT_OPERATION_TIMEOUT means the initial device-info handshake never got a valid reply, which happens when the bytes the driver reads don't parse as valid data. What single launch parameter controls how those bytes are framed?",
                  ],
                  solution: {
                    body: "The A2M12 launch file sets serial_baudrate to 256000, but this is a real A2M8 unit, which communicates at 115200. Re-launch with view_rplidar_a2m8_launch.py instead.",
                  },
                  rootCause: {
                    body: "The RPLIDAR A2 family is not one uniform configuration — A2M7 and A2M12 both default to 256000 bps, while A2M8 defaults to 115200 bps. The node's own internal default, 1,000,000 bps, doesn't match any of them either — the correct value only ever comes from choosing the launch file that matches the physical label on the unit.",
                  },
                },
              },
            },
          ],
        },
        {
          slug: "rplidar-a2-quiz-check",
          title: "Module Check",
          durationMinutes: 10,
          contentBlocks: [
            {
              type: "QUIZ",
              quiz: {
                title: "RPLIDAR A2 Module Check",
                description:
                  "Scenario and diagnostic questions, including two spot-what's-wrong items using real artifacts from the profile.",
                questions: [
                  {
                    type: "SINGLE_CHOICE",
                    prompt:
                      "dmesg shows the device, /dev/rplidar exists, and the launch command runs — but the terminal repeats an operation-timeout error and no scan data ever appears. What's the most likely cause?",
                    explanation:
                      "This exact signature means the device-info handshake failed before scan data would even start — the Baud Rate Trap.",
                    options: [
                      {
                        id: "a",
                        label:
                          "The launch file's serial baud rate doesn't match this unit's actual sub-model",
                      },
                      { id: "b", label: "The udev rule needs to be reinstalled" },
                      { id: "c", label: "The USB cable is faulty" },
                      { id: "d", label: "RViz2 needs a manual QoS override" },
                    ],
                    correctOptionIds: ["a"],
                  },
                  {
                    type: "SINGLE_CHOICE",
                    prompt:
                      'Spot what\'s wrong: this->get_parameter_or<int>("serial_baudrate", serial_baudrate, 1000000/*256000*/); followed by the comment //ros run for A1 A2, change to 256000 if A3. What\'s actually wrong here?',
                    explanation:
                      "This is real, current source, confirmed by direct fetch, not a hypothetical teaching example.",
                    options: [
                      {
                        id: "a",
                        label:
                          "The comment implies the default is fine for A1/A2 and only needs changing for A3, but the literal default value is 1000000, which matches none of the A1/A2/A3 baud rates — the comment and the code disagree",
                      },
                      { id: "b", label: "Nothing — this is correct for A2M8" },
                      { id: "c", label: "The syntax is invalid C++" },
                      { id: "d", label: "The parameter name is spelled incorrectly" },
                    ],
                    correctOptionIds: ["a"],
                  },
                  {
                    type: "SHORT_ANSWER",
                    prompt:
                      "Spot what's wrong: the official README's udev-rule setup step says to run \"cd src/rpldiar_ros/\" before sourcing the create_udev_rules.sh script. What's wrong with it, specifically?",
                    explanation:
                      "A learner following the upstream README literally would get a no-such-file-or-directory error here — a documentation bug, not an environment problem.",
                    acceptedAnswers: [
                      "typo in the folder name",
                      "rpldiar_ros is misspelled, should be rplidar_ros",
                      "wrong directory name",
                      "misspelled directory",
                    ],
                  },
                  {
                    type: "SINGLE_CHOICE",
                    prompt:
                      "You call the stop_motor service and the physical head keeps spinning, while the scan topic is still publishing normally. What does this tell you?",
                    explanation:
                      "This isn't a common beginner failure, and treating it as one would send a learner down the wrong diagnostic path.",
                    options: [
                      {
                        id: "a",
                        label:
                          "The driver's software state has diverged from the physical hardware's actual state — a rare SDK or firmware-level issue, not a typical setup mistake",
                      },
                      { id: "b", label: "The service call syntax was wrong" },
                      { id: "c", label: "The motor is permanently damaged" },
                      { id: "d", label: "This is expected normal behavior" },
                    ],
                    correctOptionIds: ["a"],
                  },
                  {
                    type: "TRUE_FALSE",
                    prompt:
                      "The RPLIDAR A2's publisher uses best-effort QoS, so RViz2 needs a manual QoS override to display scan data.",
                    explanation:
                      "Confirmed directly from source: the publisher uses RELIABLE reliability, matching RViz2's own default subscription. No override needed.",
                    correctAnswer: false,
                  },
                  {
                    type: "SINGLE_CHOICE",
                    prompt:
                      "Which ROS 2 services does this device's driver expose beyond the scan topic?",
                    explanation:
                      "Worth including since Module 3's own coarse-grained pipeline diagram doesn't show these, making this an easy assumption to get wrong.",
                    options: [
                      { id: "a", label: "stop_motor and start_motor" },
                      { id: "b", label: "None — only the scan topic exists" },
                      { id: "c", label: "calibrate and reset" },
                      { id: "d", label: "pause and resume" },
                    ],
                    correctOptionIds: ["a"],
                  },
                  {
                    type: "SINGLE_CHOICE",
                    prompt:
                      "A learner has an A2M6-labeled unit and can't find a matching launch file in the package. What should they conclude?",
                    explanation:
                      "Not a mistake the learner made — a real gap in the package's own coverage, confirmed via a real, still-unresolved GitHub issue.",
                    options: [
                      {
                        id: "a",
                        label:
                          "This is a real, known gap — they'll need to adapt an existing launch file's parameters by hand rather than assume full SKU coverage",
                      },
                      { id: "b", label: "The A2M6 doesn't actually work with this driver at all" },
                      { id: "c", label: "They should install a different ROS 2 distro" },
                      { id: "d", label: "The A2M6 uses the same launch file as A2M8, unlabeled" },
                    ],
                    correctOptionIds: ["a"],
                  },
                ],
              },
            },
          ],
        },
        {
          slug: "rplidar-a2-practical-challenge",
          title: "Practical Challenge",
          durationMinutes: 20,
          contentBlocks: [
            {
              type: "TEXT",
              data: {
                body: "Detect obstacles around your robot using the LiDAR: write or run something that reports when an object comes within a chosen distance threshold in any direction, using real scan data.",
              },
            },
            {
              type: "EXERCISE",
              exercise: {
                title: "Real-Time Obstacle Detection",
                instructions:
                  "An open-ended practical challenge — no step-by-step instructions.",
                config: {
                  type: "INDEPENDENT",
                  goal: {
                    body: "Using the live scan topic, detect when any object enters a chosen distance threshold, such as one meter, anywhere in the 360-degree scan, and report it. A printed message is sufficient — no robot motion required.",
                  },
                  successCriteria: [
                    "Correctly subscribes to the scan topic and reads the ranges array",
                    "Correctly threshold-checks against a chosen distance, ignoring infinite or out-of-range values rather than treating them as very close",
                    "Demonstrates the detection live by moving an object toward and away from the sensor and observing the report change accordingly",
                    "Can explain, if asked, which LaserScan fields were used and why",
                  ],
                  hints: [
                    "Run ros2 interface show sensor_msgs/msg/LaserScan to inspect the message shape directly rather than guessing field names.",
                    "The ranges array's order corresponds to angle_min plus the index times angle_increment, not an arbitrary order.",
                  ],
                },
              },
            },
          ],
        },
      ],
    },
    {
      title: "Orbbec Astra Pro",
      summary:
        "An RGB-D camera with a confirmed but unofficial path onto ROS 2 Jazzy.",
      lessons: [
        {
          slug: "orbbec-astra-pro-overview",
          title: "Orbbec Astra Pro — Introduction",
          durationMinutes: 10,
          contentBlocks: [
            {
              type: "TEXT",
              data: {
                body: "The RPLIDAR module ended with a device that just works — official package, officially released, HIGH confidence. This module is the opposite case on purpose: a device whose only working Jazzy path is a small community fork. That's not a flaw in this course's design — it's the more common real-world situation, and learning to evaluate it is the point.",
              },
            },
            { type: "DEVICE_CARD", deviceSlug: "orbbec-astra-pro" },
            {
              type: "TEXT",
              data: {
                body: "An RGB-D camera reports both an ordinary color image and, separately, a distance value for every pixel — \"RGB\" plus \"D\" (depth). Where the RPLIDAR answers one question well (how far, in every direction), this device answers two different questions at once, over a much smaller field of view.",
              },
            },
            {
              type: "CALLOUT",
              data: {
                variant: "INFO",
                body: "This course rated the RPLIDAR HIGH confidence because an official, buildfarm-released package exists. This device is rated MEDIUM because its only working path is a small, single-maintainer, unmerged fork. Every individual claim in this module is still traced to a real source, the same as the RPLIDAR's — the confidence is lower because the source itself is less institutionally backed, not because the facts are less verified.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "The driver landscape, stated directly rather than discovered mid-setup: Orbbec's own actively-maintained driver, OrbbecSDK_ROS2, does not support this exact device — only newer, similarly-named models. This course uses yosefl20/ros2_astra_camera, branch jazzy, instead. Knowing this now, before Section G, is the whole point of stating legacy status honestly up front.",
              },
            },
          ],
        },
        {
          slug: "orbbec-astra-pro-hardware-understanding",
          title: "Hardware Understanding",
          durationMinutes: 12,
          contentBlocks: [
            {
              type: "TEXT",
              data: {
                body: "Four physical components make up this device. RGB lens: an ordinary color camera, a UVC device in its own right. IR projector: emits the invisible structured-light pattern. IR receiver: captures the pattern's distortion, paired with the projector as the OpenNI2 depth engine. Housing: one enclosure for all three optical elements.",
              },
            },
            {
              type: "IMAGE",
              data: {
                src: "/hardware/orbbec-astra-pro-annotated-hardware.svg",
                alt: "An annotated front view of the Orbbec Astra Pro housing, labeling the IR projector, RGB lens, IR receiver, housing, and captive cable, with a warning callout about confirming the label reads exactly Astra Pro.",
                caption: "Two sensors, one housing — every component here is referenced again operationally in Sections F–J.",
              },
            },
            {
              type: "CALLOUT",
              data: {
                variant: "WARNING",
                body: "The single most important label on this device: it must read exactly \"Astra Pro,\" not \"Astra Pro Plus\" or any other variant. This isn't a cosmetic difference — Orbbec's modern, actively-maintained driver supports the Plus model but not this one. Confirm the label before doing anything else in this module.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "One nuance worth knowing before Section F needs it operationally: this device has one physical captive cable, but it enumerates as two separate USB identities at the OS level. The physical cable count (one) does not match the logical device count (two). Keep this in mind for Section G's very first verification command.",
              },
            },
          ],
        },
        {
          slug: "orbbec-astra-pro-how-it-works",
          title: "How It Works",
          durationMinutes: 12,
          contentBlocks: [
            {
              type: "TEXT",
              data: {
                body: "This device is really two devices sharing one housing — an ordinary color camera, and a separate depth-sensing system that projects an invisible infrared pattern and watches how it distorts across surfaces at different distances, the same way two eyes infer depth by comparing slightly different views.",
              },
            },
            {
              type: "IMAGE",
              data: {
                src: "/hardware/orbbec-astra-pro-working-principle.svg",
                alt: "A side-view diagram showing an IR projector emitting a pattern toward near and far objects, an IR receiver capturing the distorted pattern, and a separate RGB light path drawn as a visually distinct system into the same housing.",
                caption: "Two genuinely separate optical systems, not one sensor producing two outputs.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Structured light, simplified technical: an infrared projector emits a fixed, known pattern; an infrared receiver captures how that pattern lands on the scene; because the projector-to-receiver geometry is fixed and known, any local shift in the pattern reveals distance at that point — the same triangulation-family idea as the RPLIDAR's laser method, applied across a whole 2D field at once instead of one scanning point.",
              },
            },
            {
              type: "CALLOUT",
              data: {
                variant: "TIP",
                body: "The RPLIDAR scans one direction at a time, 360° per rotation. This device measures an entire 2D field simultaneously, but only within its fixed 60°×49.5° cone. Same underlying triangulation idea, genuinely different coverage shape — Module 2 Lesson 1 already drew this exact contrast.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "The practical consequence, load-bearing for this whole module: because RGB and depth are two independent sensing systems, they can be enabled and disabled independently, and their data only becomes spatially aligned through explicit processing — not automatically, just because both come from one housing. Section D's specification table has a real, published example of exactly this — read it carefully.",
              },
            },
          ],
        },
        {
          slug: "orbbec-astra-pro-specifications",
          title: "Specifications",
          durationMinutes: 10,
          contentBlocks: [
            { type: "SPEC_TABLE", deviceSlug: "orbbec-astra-pro" },
            {
              type: "CALLOUT",
              data: {
                variant: "WARNING",
                body: "A fully working, error-free, publishing point cloud on /camera/depth_registered/points does not guarantee the depth and color data are actually pixel-aligned. The depth_registration parameter — which controls real hardware/SDK-level alignment — defaults to false in this device's own launch file, even though the topic name contains the word \"registered.\" The name comes from a topic remap (depth/color/points to depth_registered/points); the alignment itself is a separate, independently-defaulted setting. If you need a genuinely aligned RGB-D point cloud, you must explicitly set depth_registration:=true — nothing about the topic's name or the absence of any error will tell you this.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Why this matters practically, not just as trivia: a learner building a perception pipeline that assumes color and depth line up pixel-for-pixel — \"the object at pixel (320, 240) in the color image is this far away, per the depth image at the same pixel\" — gets silently wrong answers with default settings. No crash, no error, just quietly incorrect data.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "The per-stream FOV/resolution picture, connected back to how it works: RGB up to 1280×960 at lower FPS, or 640×480 @ 30 FPS — this fork's own launch default, the number a learner actually sees. Depth up to VGA (640×480) @ 30 FPS. Both fixed within the shared 60°×49.5° cone.",
              },
            },
          ],
        },
        {
          slug: "orbbec-astra-pro-real-applications",
          title: "Real Applications",
          durationMinutes: 8,
          contentBlocks: [
            {
              type: "TEXT",
              data: {
                body: "Where the RPLIDAR answers \"is something there, and how far,\" this device additionally answers \"what is it\" (via RGB) and \"what shape is it\" (via depth) — richer data, over a much smaller field of view and shorter effective range than the RPLIDAR.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Object perception: recognize what's in the scene, using RGB. Robot manipulation: a depth-aware gripper needs to know exact distance to an object, not just \"something is near.\" Obstacle detection: depth alone, within the optimal 0.6–5 m range. Human interaction: RGB for recognition, depth for real-world scale. 3D sensing: the registered point cloud, when actually enabled — a direct callback to the specifications section's finding.",
              },
            },
            {
              type: "CALLOUT",
              data: {
                variant: "TIP",
                body: "The capstone, once it's built to reflect the full device catalog, will combine this device's close-range richness with the RPLIDAR's long-range 360° coverage — neither sensor alone gives a robot the full picture.",
              },
            },
          ],
        },
        {
          slug: "orbbec-astra-pro-physical-setup",
          title: "Physical Setup",
          durationMinutes: 8,
          contentBlocks: [
            {
              type: "CALLOUT",
              data: {
                variant: "WARNING",
                body: "Direct callback to Hardware Understanding: confirm the label reads \"Astra Pro\" before proceeding — this is Setup Step 0 in substance.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Direct callback to Module 0's power-budget lesson, now doubly relevant: this device alone presents two simultaneous USB identities drawing power from one cable. Connect it to the course's powered USB hub, not a bare laptop port — especially once the RPLIDAR is also connected for the capstone.",
              },
            },
            {
              type: "IMAGE",
              data: {
                src: "/hardware/orbbec-astra-pro-connection-diagram.svg",
                alt: "A left-to-right connection diagram: Astra Pro housing to powered USB hub to Ubuntu host, with an inset showing the single cable logically splitting into two USB identities once it reaches the host.",
                caption: "One cable, one hub — the logical split into two identities happens at the host, not the cable.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Physical connection: captive cable to USB, via the hub. Housing placed with a clear, unobstructed view of the intended scene — no further physical assembly required. Unlike the RPLIDAR, this device has no moving parts to keep clear.",
              },
            },
          ],
        },
        {
          slug: "orbbec-astra-pro-ubuntu-setup",
          title: "Ubuntu Setup",
          durationMinutes: 20,
          contentBlocks: [
            {
              type: "CALLOUT",
              data: {
                variant: "WARNING",
                body: "Gotcha #1: clone the fork, and the jazzy branch specifically — the upstream repo's master branch is unfixed and will not build.",
              },
            },
            {
              type: "CODE",
              data: {
                language: "bash",
                code: "cd ~/ros2_ws/src\ngit clone -b jazzy https://github.com/yosefl20/ros2_astra_camera.git",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Expected output: a normal git clone log ending in \"done.\" What failure looks like: cloning without -b jazzy silently checks out the repo's default branch (master) instead — no error at clone time, but the build fails later.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Native dependencies, confirmed directly from the fork's own README.MD. The README itself still says galactic throughout, a stale artifact addressed honestly below, not silently corrected.",
              },
            },
            {
              type: "CODE",
              data: {
                language: "bash",
                code: "sudo apt install libgflags-dev ros-jazzy-image-geometry ros-jazzy-camera-info-manager \\\n  ros-jazzy-image-transport ros-jazzy-image-publisher libgoogle-glog-dev libusb-1.0-0-dev libeigen3-dev\ngit clone https://github.com/libuvc/libuvc.git\ncd libuvc && mkdir build && cd build\ncmake .. && make -j4\nsudo make install && sudo ldconfig",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Expected output: apt installs cleanly; libuvc's cmake/make/install sequence completes with no errors — libuvc has no ROS/apt package, the one genuinely source-built native dependency this device needs, unlike the RPLIDAR's fully apt-installable path. What failure looks like: a missing libusb-1.0-0-dev produces a cmake configuration error naming libusb specifically — install it and re-run cmake.",
              },
            },
            {
              type: "CALLOUT",
              data: {
                variant: "INFO",
                body: "Stale-artifact finding, surfaced honestly, not corrected away: the fork's own README additionally instructs extracting a separate openNISdk_ROS2_xxx.tar.gz archive into the workspace. This appears to be a stale instruction from before the OpenNI2 redistributable binaries were vendored directly into the repository. This course's own sequence has no such step, on purpose — that omission was confirmed correct, not an oversight.",
              },
            },
            {
              type: "CODE",
              data: {
                language: "bash",
                code: "cd ~/ros2_ws\nrosdep install --from-paths src --ignore-src -y\ncolcon build --event-handlers console_direct+ --cmake-args -DCMAKE_BUILD_TYPE=Release",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Expected output: rosdep resolves cv_bridge/image_geometry from Jazzy's own official release; colcon build completes with no errors. What failure looks like: \"fatal error: cv_bridge/cv_bridge.h: No such file or directory\" means the master branch was cloned instead of jazzy — the earlier clone step's failure mode surfacing here instead.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "What a udev rule actually is, before running one: udev is the Linux subsystem that names and sets permissions on devices as they're plugged in. Without a rule, a device gets an auto-assigned name that can shift between reboots, and may default to permissions only root can use. This device needs two such entries in one rule file, one per USB identity.",
              },
            },
            {
              type: "CODE",
              data: {
                language: "bash",
                code: "cd ~/ros2_ws/src/ros2_astra_camera/astra_camera/scripts\nsudo bash install.sh\nsudo udevadm control --reload-rules && sudo udevadm trigger",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Expected output: no output on success. What failure looks like: covered fully in the debugging lesson — this step's failure surfaces later, as a permission error when the driver actually tries to open a device.",
              },
            },
            {
              type: "CODE",
              data: {
                language: "bash",
                code: "lsusb | grep 2bc5",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Expected output: two lines — product 0403 (depth/OpenNI2) and product 0501 (RGB/UVC), both vendor 2bc5. What failure looks like: one line means a cable or hub power problem — check that before suspecting the driver.",
              },
            },
            {
              type: "CALLOUT",
              data: {
                variant: "WARNING",
                body: "Gotcha #2, before first launch. Stock Ubuntu 24.04 blocks real-time priority for non-root users by default, and the launch fails without this — confirmed by a real user's run. Honestly flagged, not overstated: this requirement could not be traced to a specific line in the fork's own C++ source — it lives in the closed/vendored OpenNI2 binary, not this fork's own code — stated as a real-user-confirmed fact, not a source-line-confirmed one.",
              },
            },
            {
              type: "CODE",
              data: {
                language: "bash",
                code: 'echo "$USER    -   rtprio   99" | sudo tee /etc/security/limits.d/99-ros2-rt.conf',
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Log out and back in (or reboot) for the limit to take effect.",
              },
            },
            {
              type: "CODE",
              data: {
                language: "bash",
                filename: "clear a stale semaphore before a re-launch attempt",
                code: "ros2 run astra_camera clean_shm_node",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Confirmed as the actual registered executable directly from the fork's CMakeLists.txt — not the earlier typo'd cleanup_shm_node. What a hang (not clearing this) looks like: covered in the debugging lesson — checkable directly via ls /dev/shm | grep astra, the semaphore's real name, astra_device_sem.",
              },
            },
            {
              type: "CODE",
              data: {
                language: "bash",
                code: "ros2 launch astra_camera astra_pro.launch.xml",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Not astra_pro_plus.launch.xml, which targets a different product.",
              },
            },
          ],
        },
        {
          slug: "orbbec-astra-pro-ros2-integration",
          title: "ROS 2 Integration",
          durationMinutes: 16,
          contentBlocks: [
            {
              type: "TEXT",
              data: {
                body: "The architecture, stated precisely, not simplified into \"two nodes\": this device runs as one ROS 2 node, astra_camera_node, package astra_camera, under namespace /camera — a prefix ROS 2 adds in front of every one of this node's topic and service names (/camera/color/image_raw, not just /color/image_raw), so a second camera on the same robot can run under a different prefix without its topics colliding with this one's. Internally, the node is composed of two independent driver components — an OBCameraNode class handling the OpenNI2 depth/IR path, and a separate UVCCameraDriver class handling the RGB path. Two USB identities, two driver classes, one ROS 2 process — precise language matters here, because the debugging lesson's paths follow the driver-component split, not a node-count split.",
              },
            },
            {
              type: "IMAGE",
              data: {
                src: "/hardware/orbbec-astra-pro-dual-driver-pipeline.svg",
                alt: "A pipeline diagram showing two parallel driver-component chains, UVCCameraDriver and OBCameraNode, both running inside one shared astra_camera_node boundary box, converging from two USB identities and diverging into their own topic outputs, with a depth_registration: false (default) label on the point-cloud output.",
                caption: "One process, two internal driver components — both true at once, neither simplified away.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "The depth/OpenNI2 surface: /camera/depth/image_raw plus /camera/depth/camera_info; /camera/ir/image_raw plus /camera/ir/camera_info, when enable_ir (default true); /camera/depth_registered/points (sensor_msgs/msg/PointCloud2, via the launch file's own topic remap) when enable_point_cloud (default true).",
              },
            },
            {
              type: "CALLOUT",
              data: {
                variant: "WARNING",
                body: "Forward-reference, not a repeat, of the specifications lesson's finding: the point cloud topic above is named depth_registered because of a topic remap, not because depth_registration is on by default — it isn't. Full explanation in the specifications lesson; this is where you'll actually pass depth_registration:=true if you need it, in the practical demo lesson.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "The RGB/UVC surface, kept visually distinct: /camera/color/image_raw plus /camera/color/camera_info, when enable_color and use_uvc_camera (both default true) — sourced from uvc_vendor_id/uvc_product_id defaults 0x2bc5/0x0501, confirmed two independent ways: the launch file's own defaults, and the udev rules file's astrauvc symlink entry for the same product ID.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Per-stream QoS, a genuinely more granular surface than the RPLIDAR's single fixed publisher: color_qos, depth_qos, ir_qos, and their camera_info counterparts are each independently configurable — default \"default,\" left unset, which defers to whatever reliability/history settings the underlying ROS 2 middleware itself defaults to, the same RELIABLE-by-default behavior Module 3 already established for the RPLIDAR's own publisher, rather than a per-stream override this device sets deliberately.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Frame IDs: base camera_link — confirmed as the node's own compiled-in default, which is why RViz2's Fixed Frame must be set to this exact string in the practical demo lesson. Depth: camera_depth_frame / optical camera_depth_optical_frame. IR: camera_infra1_frame / optical camera_infra1_optical_frame.",
              },
            },
            {
              type: "CALLOUT",
              data: {
                variant: "INFO",
                body: "A small, honestly-flagged naming inconsistency, in the same spirit as the RPLIDAR module's stale-comment callout: every other optical-frame constant follows camera_<stream>_optical_frame except color, which is camera_optical_color_frame — \"optical\" and \"color\" swapped relative to the pattern. Harmless, but a real, source-confirmed instance of reading the actual constants file catching things a summary wouldn't.",
              },
            },
          ],
        },
        {
          slug: "orbbec-astra-pro-practical-demo",
          title: "Practical Demo",
          durationMinutes: 14,
          contentBlocks: [
            {
              type: "TEXT",
              data: {
                body: "The full launch, matching the Ubuntu setup lesson exactly — already executed through the semaphore cleanup step. This is the final step.",
              },
            },
            {
              type: "CODE",
              data: {
                language: "bash",
                code: "ros2 launch astra_camera astra_pro.launch.xml",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Expected output: an astra_camera_node starts under /camera, publishing color, depth, IR, and a point cloud. What failure looks like: covered fully in the debugging lesson.",
              },
            },
            {
              type: "CALLOUT",
              data: {
                variant: "WARNING",
                body: "Gotcha #3, the last of the three, immediately after launch, before anything else: in RViz2, set Fixed Frame to camera_link manually. It does not default there. Skipping this produces a blank RViz2 window with no error explaining why.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Guided viewing: add the RGB Image display (/camera/color/image_raw), the Depth Image display (/camera/depth/image_raw), and the PointCloud2 display (/camera/depth_registered/points) — a room with a few distinct objects at varying depths.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "The depth_registration demonstration, made concrete, not just described: with the point cloud already visible (default depth_registration:=false), note in RViz2 whether the point cloud's colors look correctly placed on the 3D geometry or subtly offset — with a wide field-of-view scene and objects at different depths, a misalignment is visible once you know to look for it. Then:",
              },
            },
            {
              type: "CODE",
              data: {
                language: "bash",
                code: "ros2 launch astra_camera astra_pro.launch.xml depth_registration:=true",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Expected output: the same point cloud, now with color properly aligned to the 3D structure. This is the live version of the specifications lesson's callout — the same topic name, the same lack of any error either way, a real visual difference only the parameter controls.",
              },
            },
            {
              type: "CALLOUT",
              data: {
                variant: "TIP",
                body: "You just watched a single boolean parameter change data correctness with zero change in error output either way. This is the single strongest argument in this entire course for reading parameters, not just topic names.",
              },
            },
          ],
        },
        {
          slug: "orbbec-astra-pro-debugging",
          title: "Debugging",
          durationMinutes: 18,
          contentBlocks: [
            {
              type: "TEXT",
              data: {
                body: "The RPLIDAR module walked one linear ladder, because that device has one data path. This device genuinely has two — confirmed by two separate USB identities and two separate driver classes. Debugging it means first figuring out which path is broken, then walking that path's own ladder.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Shared rungs, before the fork, both paths depend on these. Connection/Setup: correct fork, jazzy branch. Failure: cloned master. Signature: cv_bridge.h not found at build time. OS detection: both USB identities visible. Command: lsusb | grep 2bc5. Failure: one line instead of two — cable/hub power problem, not a driver problem. rtprio: granted before first launch. Failure: launch fails; not traceable to this fork's own source, a real-user-confirmed requirement, stated as such.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Path 1: RGB/UVC — diverges here, with two distinct real failures, each with its own exact signature, both confirmed directly from uvc_camera_driver.cpp. Device not found: the UVC device never enumerates, uvc_find_device exhausts its 100 retries. Signature — a thrown exception, the node visibly crashes: \"Find device error <reason>\". Permission denied: device enumerates, but the udev rule hasn't been applied or reloaded. Signature: \"Permission denied opening /dev/bus/usb/%03d/%03d\" — note this references the raw USB bus path, not /dev/ttyUSBn, a genuinely different permission surface than the RPLIDAR's serial port. Distinguishing them: the first is a crash with a \"device not found\" message; the second is a logged error with the specific word \"Permission\" in it, referencing exact bus/device numbers. Different exact text, different root cause — don't guess, read which one you actually got.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Path 2: depth/OpenNI2 — diverges here, with its own distinct failure family. Semaphore hang: relaunching after an unclean kill without clearing it. Signature: silent hang, no error — directly checkable via ls /dev/shm | grep astra, not just inferred. depth_registration silently defaulting to false while assuming an aligned point cloud. Signature: no error at all — the point cloud publishes correctly-shaped data that is simply not aligned to color. The sharpest, quietest failure this entire course has produced — no crash, no log line, just a wrong assumption about a default.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Rungs after the fork, shared again: node startup (ros2 node list shows astra_camera_node); topics (ros2 topic list under /camera/...); data (ros2 topic echo, per-topic); visualization (RViz2 — Fixed Frame must be camera_link manually; if data is confirmed good but RViz2 shows nothing, this is almost always the cause).",
              },
            },
            {
              type: "CALLOUT",
              data: {
                variant: "INFO",
                body: "One artifact that isn't on either live path: the fork's own README instructs sourcing /opt/ros/galactic/setup.bash throughout and describes a stale manual OpenNI2-tarball step this repository no longer needs. Neither is a system failure — both are documentation debt a learner following the upstream README directly, not this course, would hit.",
              },
            },
            {
              type: "IMAGE",
              data: {
                src: "/hardware/orbbec-astra-pro-troubleshooting-flowchart.svg",
                alt: "A branch-and-rejoin troubleshooting flowchart: shared rungs at the top, an explicit fork into two labeled paths, RGB/UVC and depth/OpenNI2, each showing its own real failures and exact signatures, rejoining at shared node/topic/data/visualization rungs. The depth_registration failure is marked with a check mark and no error, instead of the warning icon every other failure gets.",
                caption: "This device's failures split into two real families, and one produces no error signal at all.",
              },
            },
            {
              type: "EXERCISE",
              exercise: {
                title: "Diagnose the Missing Color Stream",
                instructions:
                  "A real, progressive-hint debugging scenario built on the RGB path's two-distinct-errors distinction.",
                config: {
                  type: "DEBUGGING",
                  scenario: {
                    body: "Both USB identities show in lsusb | grep 2bc5. You run ros2 launch astra_camera astra_pro.launch.xml. The depth image and point cloud both work fine in RViz2. But the color image never appears, and the terminal shows a repeating error you don't recognize.",
                  },
                  hints: [
                    "Depth is working, so the node itself started and the shared rungs (connection, OS detection, rtprio) are all fine. The problem is specific to one of the two driver components — which one, given what's missing?",
                    "Look at the exact error text. Does it mention a device not being found, or something about permission?",
                    "If it specifically says 'Permission denied opening /dev/bus/usb/...', that's not the same failure as the device never being found at all — what does a permission error, specifically, usually mean about a step you may have skipped or that didn't take effect?",
                  ],
                  solution: {
                    body: "The udev rule for the RGB/UVC identity (0501) either wasn't applied or wasn't reloaded after being applied — re-run sudo udevadm control --reload-rules && sudo udevadm trigger, or unplug/replug the device so it re-enumerates under the now-active rule.",
                  },
                  rootCause: {
                    body: "The RGB and depth paths are two independent driver components with two independent USB identities — one can fail while the other works perfectly, and the udev rule installed in the Ubuntu setup lesson covers both identities in one file, but a rule not yet reloaded (versus not yet written) produces exactly this 'one works, one doesn't, with a permission-specific error' symptom.",
                  },
                },
              },
            },
          ],
        },
        {
          slug: "orbbec-astra-pro-quiz-check",
          title: "Module Check",
          durationMinutes: 12,
          contentBlocks: [
            {
              type: "QUIZ",
              quiz: {
                title: "Orbbec Astra Pro Module Check",
                description:
                  "Scenario and diagnostic questions, led by the depth_registration finding as its own marquee item.",
                questions: [
                  {
                    type: "SINGLE_CHOICE",
                    prompt:
                      "You launch the Astra Pro driver. The node starts with no errors, and /camera/depth_registered/points publishes a real, correctly-shaped point cloud in RViz2 — no crash, no warning, nothing in the log. Later, a teammate points out the colors in the point cloud don't actually match the 3D shapes they're painted onto. What's actually wrong?",
                    explanation:
                      "This is the sharpest failure mode either device profile has produced — zero error signal, a topic name that implies behavior a separate, independently-defaulted parameter doesn't actually deliver.",
                    options: [
                      {
                        id: "a",
                        label:
                          "depth_registration defaults to false — the point cloud topic is named depth_registered/points because of a topic remap, not because hardware/SDK-level color-depth alignment is active. It must be explicitly set to true",
                      },
                      { id: "b", label: "The RGB and depth streams are running at different frame rates" },
                      { id: "c", label: "RViz2 needs a manual QoS override to render color correctly" },
                      { id: "d", label: "The point cloud topic itself is corrupted" },
                    ],
                    correctOptionIds: ["a"],
                  },
                  {
                    type: "SINGLE_CHOICE",
                    prompt:
                      "Both USB identities appear in lsusb | grep 2bc5. The terminal shows \"Permission denied opening /dev/bus/usb/003/012\". What's the most likely fix?",
                    explanation:
                      "The device enumerating in lsusb and the udev rule actually being active are two different things.",
                    options: [
                      {
                        id: "a",
                        label:
                          "Re-apply/reload the udev rule (sudo udevadm control --reload-rules && sudo udevadm trigger), or unplug and replug the device so it re-enumerates under the now-active rule",
                      },
                      { id: "b", label: "Reinstall the entire ros2_astra_camera package from scratch" },
                      { id: "c", label: "Switch to a different USB cable" },
                      { id: "d", label: "Downgrade to the master branch" },
                    ],
                    correctOptionIds: ["a"],
                  },
                  {
                    type: "SHORT_ANSWER",
                    prompt:
                      "Spot what's wrong: a learner buys a depth camera whose box and printed label both read \"Astra Pro Plus.\" They follow this module's exact setup sequence (the yosefl20/ros2_astra_camera fork, astra_pro.launch.xml). What's wrong with this plan, specifically?",
                    explanation:
                      "This is the module's own central disambiguation — the two products share a confusingly similar name but different driver support entirely.",
                    acceptedAnswers: [
                      "wrong device/model",
                      "Astra Pro Plus is a different product than Astra Pro",
                      "the launch file and driver path in this module target the plain Astra Pro, not the Plus model",
                    ],
                  },
                  {
                    type: "TRUE_FALSE",
                    prompt:
                      "This device runs as two separate ROS 2 nodes — one for the RGB camera, one for the depth camera.",
                    explanation:
                      "One node (astra_camera_node), internally composed of two driver components (OBCameraNode, UVCCameraDriver) — stated precisely rather than simplified.",
                    correctAnswer: false,
                  },
                  {
                    type: "SINGLE_CHOICE",
                    prompt:
                      "A previous launch was killed uncleanly. The next launch attempt produces no error at all, but also never finishes starting. What should you check?",
                    explanation:
                      "A stale semaphore blocks startup with no log line — this is checkable directly, not just inferred.",
                    options: [
                      {
                        id: "a",
                        label:
                          "Whether a stale semaphore is blocking startup — check ls /dev/shm | grep astra and run ros2 run astra_camera clean_shm_node before relaunching",
                      },
                      { id: "b", label: "ros2 run astra_camera cleanup_shm_node" },
                      { id: "c", label: "Whether the udev rule needs reinstalling" },
                      { id: "d", label: "Whether the USB cable is faulty" },
                    ],
                    correctOptionIds: ["a"],
                  },
                  {
                    type: "SINGLE_CHOICE",
                    prompt:
                      "Real-time priority (rtprio) must be granted before this device's first launch on stock Ubuntu 24.04. Where in this fork's own C++ source is that requirement enforced?",
                    explanation:
                      "An honesty check, not a trick — this module states this limit directly rather than fabricating a plausible-sounding source citation.",
                    options: [
                      {
                        id: "a",
                        label:
                          "It isn't traceable to this fork's own source — the requirement comes from the closed/vendored OpenNI2 binary, confirmed only by a real user's reported run, not by reading a specific line of this repository's own code",
                      },
                      { id: "b", label: "In the OBCameraNode constructor, which checks getpriority() directly" },
                      { id: "c", label: "In the CMakeLists.txt build configuration" },
                      { id: "d", label: "In the udev rules file itself" },
                    ],
                    correctOptionIds: ["a"],
                  },
                ],
              },
            },
          ],
        },
        {
          slug: "orbbec-astra-pro-practical-challenge",
          title: "Practical Challenge",
          durationMinutes: 25,
          contentBlocks: [
            {
              type: "TEXT",
              data: {
                body: "Detect and visualize the distance of an object at different positions, using real depth data from this device.",
              },
            },
            {
              type: "EXERCISE",
              exercise: {
                title: "Live Distance Detection",
                instructions:
                  "An open-ended, independent challenge using this device's own genuine capability: depth at a specific distance.",
                config: {
                  type: "INDEPENDENT",
                  goal: {
                    body: "Using the live /camera/depth/image_raw topic (or the point cloud, your choice), report the distance to whatever is directly in front of the camera's center, and demonstrate the reported distance changing as an object is moved closer and farther, within the device's optimal 0.6–5.0 m range.",
                  },
                  successCriteria: [
                    "Correctly subscribes to a depth-bearing topic and extracts a real distance value, not a placeholder",
                    "Explicitly reasons about the image's center pixel (or an equivalent point in the point cloud) rather than an arbitrary one",
                    "Demonstrates the value changing live as an object moves, and can explain what happens (and why) if the object moves outside the 0.6–5.0 m optimal range",
                    "If using the point cloud specifically: can state whether depth_registration was left at its default and, if so, correctly predicts that color alignment (not raw distance accuracy) is what would be affected by that choice",
                  ],
                  hints: [
                    "Run ros2 interface show sensor_msgs/msg/Image to inspect the depth image's actual encoding rather than assuming a format.",
                    "Depth images typically encode distance in millimeters as 16-bit values, not directly as meters.",
                  ],
                },
              },
            },
          ],
        },
      ],
    },
  ],
  // Hands-On Robotics Projects (docs/robotics-projects/IMPLEMENTATION_PLAN.md).
  // Populated section-by-section, foundation section first — Module 0 only
  // for now; Projects 1-4 follow in the same dependency order once this
  // section is validated, per the plan's own risk mitigation.
  "hands-on-robotics-projects": [
    {
      title: "Module 0 — Lab Zero",
      summary:
        "Shared infrastructure every later project depends on: workspace, sensor bring-up, robot_description, robot_bringup, and resolving the use_ekf question for this specific rig.",
      lessons: [
        {
          slug: "welcome-prerequisites-what-youll-build",
          title: "Welcome, Prerequisites & What You'll Build",
          durationMinutes: 12,
          contentBlocks: [
            {
              type: "CALLOUT",
              data: {
                variant: "WARNING",
                title: "Validation status",
                body: "THEORETICALLY DESIGNED, NOT PHYSICALLY VALIDATED. Every command, code sample, and \"expected result\" in this module is written to be correct against current ROS 2 Jazzy conventions and the architecture finalized across this course's design phases. None of it has been run on a physical robot yet. Wherever this course says \"you should see,\" it means a prediction, not a report of something observed. Physical validation happens later, on real hardware — not by reading this lesson.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Before you build a single robot behavior, you need a robot that reliably talks to its own sensors. Module 0 exists to do that once, carefully, so that every project after this one can simply assume a working LiDAR, a working camera, a working base, and a correct 3D model of how they're all positioned relative to each other.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Every real robotics team goes through exactly this step before writing any application logic — it's often called \"bring-up\" or \"platform integration,\" and it's where a surprising amount of real-world robotics engineering time actually goes. Skipping it, or doing it sloppily, is the single most common reason a team's \"smart\" robot behavior mysteriously fails: not because the algorithm is wrong, but because a sensor was misconfigured, a coordinate frame was flipped, or nothing was watching for a driver that silently stopped publishing.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "By the end of Module 0, your robot will not do anything \"smart\" yet. It will: spin up its RPLIDAR S3 and publish real distance readings on /scan; spin up its Intel RealSense D435i and publish color images (and IMU data) on their respective topics; spin up its standalone IMU (once you've identified exactly what it is); confirm its existing base driver accepts /cmd_vel and reports /odom, and that it has a safety cutoff if commands stop arriving; publish a complete, correct TF tree describing where every sensor sits relative to the robot's body; and bring all of the above up with one launch command.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "You will build two ROS 2 packages that every later project depends on: robot_description (the robot's 3D model and coordinate frames) and robot_bringup (the one launch file that starts everything).",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Knowledge prerequisites: a Linux terminal, basic ROS 2 concepts (nodes, topics, publishers/subscribers, launch files), and basic Python. No prior URDF/xacro or TF experience is required — both are introduced from first principles in this module.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Hardware prerequisites: an NVIDIA Jetson (Orin family) with the robot's RPLIDAR S3, Intel RealSense D435i, and standalone IMU connected; the robot's existing custom base driver, already running or startable; and a workspace where the robot's wheels can be lifted clear of the ground for this module's motor tests.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Software prerequisites: ROS 2 Jazzy Jalisco, assumed already installed and working — this module still runs a lightweight sanity check rather than assuming that blindly; colcon, rosdep, and xacro; rplidar_ros and realsense2_camera, installed in this module; and robot_localization, installed alongside and used conditionally.",
              },
            },
          ],
        },
        {
          slug: "lab-safety-check",
          title: "Lab Safety Check",
          durationMinutes: 5,
          contentBlocks: [
            {
              type: "CALLOUT",
              data: {
                variant: "DANGER",
                title: "Complete this checklist before powering any motor test",
                body: "Robot wheels are lifted clear of the ground, or the robot is secured on a stand, for every motor-related test in this module.\nLiDAR, camera, and IMU cables are routed clear of the wheels before any powered test.\nYou (or a lab partner) have a hand on the power switch, or the terminal running any motion command is immediately Ctrl+C-able, during every test.\nA second person is present specifically for the /cmd_vel watchdog test — this is the first time in the course the robot moves under command, and it is expected to move briefly and then stop on its own.\nThe battery is sufficiently charged for a full bring-up session — a brownout mid-test can look exactly like a software bug and waste real debugging time.",
              },
            },
          ],
        },
        {
          slug: "project-architecture-and-data-flow",
          title: "Project Architecture & Data Flow",
          durationMinutes: 10,
          contentBlocks: [
            {
              type: "TEXT",
              data: {
                body: "Module 0 builds two packages. robot_description is the robot's 3D model and TF tree: its URDF/xacro files (base, LiDAR, camera, IMU) and a desk-test launch file that requires no hardware. robot_bringup is the one launch surface every project uses: it includes robot_description, launches rplidar_ros and realsense2_camera, launches the standalone IMU driver, and conditionally launches robot_localization's ekf_node depending on the use_ekf argument.",
              },
            },
            {
              type: "CODE",
              data: {
                language: "text",
                filename: "Component breakdown",
                code:
                  "Component                    What it does                                              Topics                          Message types\n" +
                  "----------------------------  ---------------------------------------------------------  ------------------------------  --------------------------------\n" +
                  "robot_state_publisher         Reads the URDF, broadcasts static geometric relationships   /tf, /tf_static                 tf2_msgs/msg/TFMessage\n" +
                  "rplidar_ros driver node       Talks to the RPLIDAR S3, converts raw scans to ROS msgs     /scan                           sensor_msgs/msg/LaserScan\n" +
                  "realsense2_camera node        Talks to the D435i, exposes RGB/depth/IMU streams           /camera/color/image_raw, etc.   sensor_msgs/msg/Image, /Imu\n" +
                  "Standalone IMU driver         Talks to the standalone IMU (driver TBD)                    /imu/data_raw                   sensor_msgs/msg/Imu\n" +
                  "ekf_node (conditional)        Fuses wheel odometry + standalone IMU into a corrected pose /odometry/filtered             nav_msgs/msg/Odometry\n" +
                  "Existing base driver          Converts /cmd_vel into wheel motion, reports distance moved /cmd_vel (in), /odom (out)     geometry_msgs/Twist, nav_msgs/Odometry",
              },
            },
            {
              type: "CODE",
              data: {
                language: "text",
                filename: "Data flow, once everything is running",
                code:
                  "PHYSICAL SENSORS (LiDAR, camera, standalone IMU, base encoders)\n" +
                  "        ↓\n" +
                  "Individual driver nodes (rplidar_ros, realsense2_camera, IMU driver,\n" +
                  "existing base driver)\n" +
                  "        ↓\n" +
                  "Raw topics (/scan, /camera/..., /imu/data_raw, /odom)\n" +
                  "        ↓\n" +
                  "robot_state_publisher (static frames) + base driver or ekf_node\n" +
                  "(dynamic odom→base_link frame, per the use_ekf resolution)\n" +
                  "        ↓\n" +
                  "COMPLETE TF TREE: odom → base_link → {laser_link, camera_link, imu_link}\n" +
                  "        ↓\n" +
                  "Available to every later project — nothing project-specific has\n" +
                  "happened yet",
              },
            },
          ],
        },
        {
          slug: "workspace-and-environment-setup",
          title: "Workspace & Environment Setup",
          durationMinutes: 12,
          contentBlocks: [
            {
              type: "CODE",
              data: {
                language: "bash",
                filename: "Step 1 — Create the workspace",
                code: "mkdir -p ~/robot_projects_ws/src\ncd ~/robot_projects_ws",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "What this does: creates the top-level ROS 2 workspace and its src/ directory, where every package for the entire course will live.\n\nWhy it's required: colcon (ROS 2's build tool) expects this exact layout — a workspace root containing a src/ folder — to know what to build.\n\nWhat it receives / produces: receives nothing; produces an empty directory structure.\n\nIf it fails: mkdir failing here almost always means a permissions issue on your home directory — check ls -ld ~ and confirm you own it.",
              },
            },
            {
              type: "CODE",
              data: {
                language: "bash",
                filename: "Step 2 — Environment sanity check",
                code: "printenv ROS_DISTRO\nros2 doctor\nros2 topic list",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "What this does: confirms ROS 2 Jazzy is actually the active distribution in your shell, and that the ROS 2 daemon can start and respond.\n\nWhy it's required: everything else in this module assumes Jazzy is correctly sourced — catching a bad environment now is far cheaper than debugging it three commands into a driver launch.\n\nWhat success looks like: printenv ROS_DISTRO prints jazzy; ros2 doctor reports no critical issues; ros2 topic list runs without error (an empty or near-empty list is fine at this point).\n\nIf it fails: if ROS_DISTRO is empty, you likely haven't sourced ROS 2 — run source /opt/ros/jazzy/setup.bash and add it to ~/.bashrc.",
              },
            },
            {
              type: "CALLOUT",
              data: {
                variant: "WARNING",
                title: "Troubleshooting — libzstd1 dependency conflict (Ubuntu 24.04 arm64)",
                body: "If you see an error like \"ros-jazzy-ros-base : Depends: ... libzstd1 (< ...) but ... is to be installed\", this is a confirmed, still-open packaging mismatch between Ubuntu's security-update channel and the ROS 2 Jazzy binaries (tracked upstream at ros2/ros2#1789). Use the version number from your own error message, not a copy-pasted one — Ubuntu's update channel shifts over time, so a fixed version string here would already be stale.",
              },
            },
            {
              type: "CODE",
              data: {
                language: "bash",
                filename: "libzstd1 fix",
                code:
                  "apt-cache policy libzstd1                             # read the exact conflicting versions\nsudo apt-get install libzstd1=<version-the-error-names>\nsudo apt-mark hold libzstd1                            # stop a later upgrade from re-breaking it\nsudo apt install ros-jazzy-ros-base                    # retry",
              },
            },
          ],
        },
        {
          slug: "sensor-bring-up-rplidar-s3-and-d435i",
          title: "Sensor Bring-Up: RPLIDAR S3 & D435i",
          durationMinutes: 18,
          contentBlocks: [
            {
              type: "TEXT",
              data: {
                body: "Each sensor's driver is a maintained, ready-made ROS 2 package — you install/clone it, you don't write it. Each one is verified at two separate layers: hardware first, then ROS, so a failure at either layer is easy to isolate.",
              },
            },
            {
              type: "CODE",
              data: {
                language: "bash",
                filename: "Step 3 — Install the driver packages",
                code:
                  "sudo apt install ros-jazzy-rplidar-ros ros-jazzy-robot-localization \\\n                 python3-colcon-common-extensions python3-rosdep\ncd ~/robot_projects_ws/src\ngit clone -b ros2-master https://github.com/realsenseai/realsense-ros.git",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "What this does: installs rplidar_ros and robot_localization as prebuilt binaries via apt, and clones realsense-ros from source on the Jazzy-supported ros2-master branch, keeping you on a version matched to your exact D435i firmware.\n\nWhat success looks like: all apt commands complete without error; the git clone produces a realsense-ros/ directory under src/.\n\nIf it fails: an apt failure here is most likely the libzstd1 conflict above — apply that fix and retry. A git clone failure is almost always a network issue.",
              },
            },
            {
              type: "CODE",
              data: {
                language: "bash",
                filename: "Step 4 — RPLIDAR S3: Hardware Checkpoint",
                code: "ls /dev/serial/by-id/\ngroups $USER",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "What this does: confirms the LiDAR enumerates as a serial device the OS can see, and that your user account has permission to access it (via the dialout group).\n\nWhat success looks like: a device path appears under /dev/serial/by-id/; dialout appears in your groups list.\n\nIf it fails: no device path means a cable/power issue — check the physical connection before touching ROS at all. Missing dialout group membership: sudo usermod -aG dialout $USER, then log out and back in.\n\nBefore continuing, check the RPLIDAR S3's actual serial baudrate against its datasheet — copy-pasting an older A-series tutorial's baudrate is a common silent-failure point.",
              },
            },
            {
              type: "CODE",
              data: {
                language: "bash",
                filename: "Step 5 — RPLIDAR S3: ROS 2 Checkpoint",
                code:
                  "ros2 launch rplidar_ros rplidar_s3_launch.py\n\n# in a second terminal, once the above is running:\nros2 topic hz /scan\nros2 topic echo /scan --once",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "What this does: starts the official S3 driver launch file, then checks that /scan is actually publishing at a steady rate with sane data.\n\nWhat success looks like: topic hz reports a steady, non-zero rate; topic echo --once shows a ranges array full of real distance values (not all zeros, not all inf).\n\nIf it fails: if the node starts but /scan never appears, double check serial_port and serial_baudrate in the launch arguments against Step 4's findings.",
              },
            },
            {
              type: "CODE",
              data: {
                language: "bash",
                filename: "Step 6 — D435i: Hardware Checkpoint (before any ROS node runs)",
                code: "lsusb | grep -i intel\nrealsense-viewer",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "What this does: confirms the camera enumerates over USB, then opens Intel's own viewer tool to visually confirm the RGB, depth, and IMU streams are all live — entirely outside of ROS.\n\nWhy this order matters: Jetson Orin Nano + JetPack 6.0 systems have reported cases of the D435i failing to be detected at the USB/kernel level — a hardware issue, not a ROS or Jazzy issue. Checking this first means a failure here is never mistaken for a ROS driver bug.\n\nWhat success looks like: lsusb shows an Intel RealSense device; realsense-viewer shows live RGB, depth, and motion (IMU) data.\n\nIf it fails: try a different USB3 port/cable — the D435i needs full USB3 bandwidth for all three streams simultaneously.",
              },
            },
            {
              type: "CODE",
              data: {
                language: "bash",
                filename: "Step 7 — D435i: ROS 2 Checkpoint",
                code:
                  "cd ~/robot_projects_ws\ncolcon build --packages-select realsense2_camera realsense2_camera_msgs realsense2_description\nsource install/setup.bash\nros2 launch realsense2_camera rs_launch.py enable_gyro:=true enable_accel:=true\n\n# second terminal:\nros2 topic list | grep camera\nros2 topic hz /camera/color/image_raw\nros2 topic hz /camera/imu",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "What success looks like: camera topics appear in the topic list; both image_raw and imu publish at a steady rate.\n\nIf it fails: if /camera/imu never appears despite enable_gyro/enable_accel being set — if you changed unite_imu_method dynamically at runtime, gyro/accel must be re-enabled for the change to take effect. Relaunch cleanly rather than reconfiguring live.",
              },
            },
          ],
        },
        {
          slug: "sensor-bring-up-standalone-imu-and-cmd-vel-watchdog",
          title: "Sensor Bring-Up: Standalone IMU & the /cmd_vel Watchdog",
          durationMinutes: 15,
          contentBlocks: [
            {
              type: "CODE",
              data: {
                language: "bash",
                filename: "Step 8 — Standalone IMU: Identification and Bring-Up",
                code: "lsusb\ndmesg | tail -20    # after plugging the IMU in",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "What this does: identifies the IMU's make/model from its USB descriptor or kernel log message. Then, in order: check for (a) an official ROS 2 Jazzy driver package for that exact model, (b) a maintained community package, (c) whether it's already riding on the same microcontroller/serial link as the base driver, in which case no separate driver is needed at all. Only if none of these apply do you write a minimal custom publisher.\n\nWhat success looks like: ros2 topic echo /imu/data_raw --once shows populated orientation, angular_velocity, and linear_acceleration fields — not all zero, which is a common silent IMU driver failure.",
              },
            },
            {
              type: "CODE",
              data: {
                language: "bash",
                filename: "Step 9 — Existing Base Driver: Both Checkpoints",
                code: "ros2 node list\nros2 topic info /cmd_vel\nros2 topic hz /odom",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "What success looks like: the base driver's node appears in the node list; /cmd_vel shows at least one subscriber once something publishes to it; /odom publishes at a steady rate.",
              },
            },
            {
              type: "CALLOUT",
              data: {
                variant: "DANGER",
                title: "Safety-critical watchdog test — second person required",
                body: "Wheels lifted. In one terminal, publish a nonzero /cmd_vel for a couple of seconds, then Ctrl+C WITHOUT sending a zero-velocity message first. The wheels must stop shortly after you Ctrl+C, on their own. If the wheels keep spinning on the last commanded velocity indefinitely, this is a stop-ship finding: the base driver has no command-timeout safety behavior. Do not proceed to any project's floor tests until this is fixed — every later project's safety plan assumes this protection exists.",
              },
            },
            {
              type: "CODE",
              data: {
                language: "bash",
                filename: "Watchdog test command",
                code:
                  "# Wheels lifted. In one terminal:\nros2 topic pub --rate 10 /cmd_vel geometry_msgs/msg/Twist \\\n  \"{linear: {x: 0.1}, angular: {z: 0.0}}\"\n# Let it run for ~2 seconds, then Ctrl+C WITHOUT sending a zero-velocity message first.",
              },
            },
          ],
        },
        {
          slug: "building-robot-description",
          title: "Building robot_description",
          durationMinutes: 25,
          contentBlocks: [
            {
              type: "TEXT",
              data: {
                body: "Unlike the drivers you just brought up, this package is authored by you — it's the course's own shared infrastructure.",
              },
            },
            {
              type: "CODE",
              data: {
                language: "bash",
                filename: "Step 10 — Create the package",
                code:
                  "cd ~/robot_projects_ws/src\nros2 pkg create robot_description --build-type ament_cmake\nmkdir -p robot_description/urdf robot_description/launch robot_description/rviz robot_description/meshes",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Step 11 — write the URDF/xacro files. base.urdf.xacro defines the robot's body and wheels; lidar/camera/imu each add one sensor frame, fixed to base_link at a mount offset. robot.urdf.xacro assembles them. None of the sensors move relative to the chassis, so a fixed joint is correct for each — only the wheels use continuous, since they actually rotate.",
              },
            },
            {
              type: "CODE",
              data: {
                language: "xml",
                filename: "robot_description/urdf/base.urdf.xacro",
                code: ROBOT_DESCRIPTION_BASE_XACRO,
              },
            },
            {
              type: "CALLOUT",
              data: {
                variant: "WARNING",
                title: "ASSUMED — VERIFY ON ROBOT",
                body: "Every dimension above (base_length, wheel_separation, etc.) is a placeholder. Measure your actual chassis and update these values before trusting any visualization or, later, Nav2's footprint configuration.",
              },
            },
            {
              type: "CODE",
              data: {
                language: "xml",
                filename: "robot_description/urdf/lidar.urdf.xacro",
                code: ROBOT_DESCRIPTION_LIDAR_XACRO,
              },
            },
            {
              type: "CODE",
              data: {
                language: "xml",
                filename: "robot_description/urdf/camera.urdf.xacro",
                code: ROBOT_DESCRIPTION_CAMERA_XACRO,
              },
            },
            {
              type: "CODE",
              data: {
                language: "xml",
                filename: "robot_description/urdf/imu.urdf.xacro",
                code: ROBOT_DESCRIPTION_IMU_XACRO,
              },
            },
            {
              type: "CODE",
              data: {
                language: "xml",
                filename: "robot_description/urdf/robot.urdf.xacro",
                code: ROBOT_DESCRIPTION_ROBOT_XACRO,
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Step 12 — replace package.xml and CMakeLists.txt.",
              },
            },
            {
              type: "CODE",
              data: {
                language: "xml",
                filename: "robot_description/package.xml",
                code: ROBOT_DESCRIPTION_PACKAGE_XML,
              },
            },
            {
              type: "CODE",
              data: {
                language: "cmake",
                filename: "robot_description/CMakeLists.txt",
                code: ROBOT_DESCRIPTION_CMAKELISTS,
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Step 13 — write the desk-test launch file.",
              },
            },
            {
              type: "CODE",
              data: {
                language: "python",
                filename: "robot_description/launch/display.launch.py",
                code: ROBOT_DESCRIPTION_DISPLAY_LAUNCH_PY,
              },
            },
            {
              type: "CODE",
              data: {
                language: "bash",
                filename: "Step 14 — Build and desk-test",
                code:
                  "cd ~/robot_projects_ws\ncolcon build --packages-select robot_description\nsource install/setup.bash\nros2 launch robot_description display.launch.py",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "The first time you run this, RViz will open with no saved configuration. Add a RobotModel display and a TF display manually (set the Fixed Frame to base_link), confirm you can see the chassis, wheels, and all three sensor frames, then File → Save Config As → save it to robot_description/rviz/robot_description.rviz so future launches load it automatically.\n\nWhat success looks like: RViz shows the robot's shape with laser_link, camera_link, and imu_link all visibly offset from base_link in sensible positions, and no disconnected/orphan frames.\n\nIf it fails: a xacro processing error will appear in the terminal, not RViz — read the reported line number. A frame that doesn't appear where expected usually means a mount-offset value in one of the sensor xacro files needs correcting against your actual measurements.",
              },
            },
          ],
        },
        {
          slug: "building-robot-bringup",
          title: "Building robot_bringup",
          durationMinutes: 25,
          contentBlocks: [
            {
              type: "CODE",
              data: {
                language: "bash",
                filename: "Step 15 — Create the package",
                code:
                  "cd ~/robot_projects_ws/src\nros2 pkg create robot_bringup --build-type ament_python\nmkdir -p robot_bringup/launch robot_bringup/config",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Step 16 — write the config files.",
              },
            },
            {
              type: "CODE",
              data: {
                language: "yaml",
                filename: "robot_bringup/config/rplidar_s3.yaml",
                code: ROBOT_BRINGUP_RPLIDAR_S3_YAML,
              },
            },
            {
              type: "CODE",
              data: {
                language: "yaml",
                filename: "robot_bringup/config/realsense.yaml",
                code: ROBOT_BRINGUP_REALSENSE_YAML,
              },
            },
            {
              type: "CODE",
              data: {
                language: "yaml",
                filename: "robot_bringup/config/standalone_imu.yaml",
                code: ROBOT_BRINGUP_STANDALONE_IMU_YAML,
              },
            },
            {
              type: "CODE",
              data: {
                language: "yaml",
                filename: "robot_bringup/config/ekf.yaml",
                code: ROBOT_BRINGUP_EKF_YAML,
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Step 17 — write sensors_only.launch.py, plus robot_description/launch/description.launch.py (a thin robot_state_publisher-only wrapper, added to robot_description, not robot_bringup). No joint_state_publisher_gui here — on the real robot there's no reason to fake wheel joint angles with a GUI slider. robot_state_publisher will simply use identity transforms for the two continuous wheel joints, which is fine: the sensor frames that actually matter for real data — laser_link, camera_link, imu_link — are all fixed joints and are published correctly regardless.",
              },
            },
            {
              type: "CODE",
              data: {
                language: "python",
                filename: "robot_bringup/launch/sensors_only.launch.py",
                code: ROBOT_BRINGUP_SENSORS_ONLY_LAUNCH_PY,
              },
            },
            {
              type: "CODE",
              data: {
                language: "python",
                filename: "robot_description/launch/description.launch.py",
                code: ROBOT_DESCRIPTION_LAUNCH_PY,
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Step 18 — write bringup.launch.py.",
              },
            },
            {
              type: "CODE",
              data: {
                language: "python",
                filename: "robot_bringup/launch/bringup.launch.py",
                code: ROBOT_BRINGUP_BRINGUP_LAUNCH_PY,
              },
            },
            {
              type: "CODE",
              data: {
                language: "bash",
                filename: "Step 19 — Full integration test",
                code:
                  "cd ~/robot_projects_ws\ncolcon build\nsource install/setup.bash\nros2 launch robot_bringup bringup.launch.py use_ekf:=false",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "What success looks like: /scan, /camera/color/image_raw, /camera/imu, and /imu/data_raw are all simultaneously live; no node crashes over a sustained ~2 minute run; the full TF tree renders in RViz with no gaps.",
              },
            },
          ],
        },
        {
          slug: "resolving-use-ekf",
          title: "Resolving use_ekf",
          durationMinutes: 10,
          contentBlocks: [
            {
              type: "CODE",
              data: {
                language: "bash",
                filename: "Resolving use_ekf",
                code:
                  "ros2 launch robot_bringup bringup.launch.py use_ekf:=false\n\n# second terminal:\nros2 run tf2_ros tf2_echo odom base_link",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "If a transform prints: your base driver already broadcasts odom→base_link itself (Configuration A). Leave use_ekf's default at false and document this as a settled fact about your robot in robot_bringup's README.\n\nIf nothing prints (or an error/timeout occurs): nothing is broadcasting that transform yet (Configuration B). Relaunch with use_ekf:=true, re-run the same tf2_echo command, and confirm a transform now appears — sourced from ekf_node. Update the launch file's default to true and document this instead.\n\nEither way, this is now a fact about your specific robot, not an open design question — Projects 3 and 4 will rely on whatever you find here.",
              },
            },
          ],
        },
        {
          slug: "how-to-run-expected-results-and-checkpoints",
          title: "How to Run, Expected Results & Verification Checkpoints",
          durationMinutes: 10,
          contentBlocks: [
            {
              type: "CODE",
              data: {
                language: "bash",
                filename: "Terminal 1",
                code: "ros2 launch robot_bringup bringup.launch.py use_ekf:=<your resolved value>",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Why this terminal exists: starts every sensor driver and (if needed) the EKF, all at once, matching what every later project will do. What should appear: startup logs from rplidar_ros, realsense2_camera, the standalone IMU driver, robot_state_publisher, and (if use_ekf:=true) ekf_node — no errors, no repeated restarts.",
              },
            },
            {
              type: "CODE",
              data: {
                language: "bash",
                filename: "Terminal 2",
                code: "rviz2",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Why this terminal exists: lets you see the TF tree and, optionally, add a LaserScan display to watch /scan visually. What should appear: a complete robot model with all sensor frames, and (if you add a LaserScan display) a ring of points matching your room's walls.",
              },
            },
            {
              type: "CALLOUT",
              data: {
                variant: "INFO",
                title: "Expected results",
                body: "ros2 doctor / ROS_DISTRO / apt install all clean (or the libzstd workaround applied).\nEvery sensor passes both its hardware checkpoint and its ROS checkpoint.\nThe /cmd_vel watchdog test shows the robot stopping on its own.\nrobot_description's desk-test launch shows a complete TF tree.\nuse_ekf is resolved to a documented value for this specific rig.\nrobot_bringup's full launch runs everything simultaneously without crashing for at least a 2-minute sustained run.",
              },
            },
            {
              type: "CALLOUT",
              data: {
                variant: "INFO",
                title: "Verification checkpoints",
                body: "HARDWARE: does each sensor enumerate at the OS level (lsusb / device nodes) BEFORE any ROS command is run?\nROS 2: does each driver node start and appear in ros2 node list without error?\nDATA: does each topic publish at a steady rate with sane, non-zero values?\nTF: does the complete tree render in RViz with no orphan/disconnected frames?\nSAFETY: does the robot stop on its own when /cmd_vel publishing is killed mid-motion?\nINTEGRATION: does bringup.launch.py start everything together and stay stable for a sustained run?",
              },
            },
          ],
        },
        {
          slug: "module-0-quiz",
          title: "Module 0 Quiz",
          durationMinutes: 10,
          contentBlocks: [
            {
              type: "QUIZ",
              quiz: {
                title: "Project Understanding",
                questions: [
                  {
                    type: "SHORT_ANSWER",
                    prompt:
                      "Why does Module 0 build robot_description and robot_bringup before any project-specific code?",
                    acceptedAnswers: [
                      "so every later project can assume a working sensor and TF stack",
                      "avoid rebuilding hardware bring-up each project",
                    ],
                    explanation:
                      "So every later project can assume a working, already-verified sensor and TF stack instead of re-deriving hardware bring-up from scratch each time — the single biggest lever for course quality per the course's executive strategy.",
                  },
                  {
                    type: "SHORT_ANSWER",
                    prompt:
                      "What is the difference in responsibility between robot_description and robot_bringup?",
                    acceptedAnswers: [
                      "description defines geometry and frames, bringup launches the drivers",
                    ],
                    explanation:
                      "robot_description defines the robot's static geometry and coordinate frames (what the robot looks like and how its parts relate). robot_bringup is the launch surface that starts the actual hardware drivers and, conditionally, the EKF — it uses robot_description's model but doesn't define it.",
                  },
                ],
              },
            },
            {
              type: "QUIZ",
              quiz: {
                title: "Concept",
                questions: [
                  {
                    type: "SHORT_ANSWER",
                    prompt:
                      "Why are the sensor joints in the URDF fixed while the wheel joints are continuous?",
                    acceptedAnswers: [
                      "sensors don't move relative to the chassis, wheels rotate",
                    ],
                    explanation:
                      "The sensors don't move relative to the chassis, so their transform to base_link never changes — fixed is correct. The wheels physically rotate, so continuous allows an unbounded rotation angle.",
                  },
                  {
                    type: "SHORT_ANSWER",
                    prompt: "What does the use_ekf launch argument actually decide?",
                    acceptedAnswers: [
                      "whether ekf_node or the base driver owns odom to base_link",
                    ],
                    explanation:
                      "Whether robot_localization's ekf_node fuses wheel odometry with the standalone IMU and owns the odom→base_link TF broadcast (Configuration B), or whether the existing base driver already broadcasts that transform itself and no fusion node is needed (Configuration A).",
                  },
                ],
              },
            },
            {
              type: "QUIZ",
              quiz: {
                title: "Data Flow",
                questions: [
                  {
                    type: "SHORT_ANSWER",
                    prompt:
                      "Trace the path of a single LiDAR measurement from the physical sensor to the /scan topic. Which node performs the conversion?",
                    acceptedAnswers: ["rplidar_ros driver node"],
                    explanation:
                      "Physical S3 → serial data → rplidar_ros driver node (converts serial protocol into a sensor_msgs/msg/LaserScan message) → published on /scan.",
                  },
                ],
              },
            },
            {
              type: "QUIZ",
              quiz: {
                title: "Debugging",
                questions: [
                  {
                    type: "SHORT_ANSWER",
                    prompt:
                      "ros2 topic list shows /camera/color/image_raw, but ros2 topic hz /camera/color/image_raw shows nothing publishing. What do you check next, and why?",
                    acceptedAnswers: [
                      "re-check the hardware checkpoint with realsense-viewer",
                    ],
                    explanation:
                      "A topic existing means a node has advertised it, but nothing publishing means either the camera isn't actually delivering frames (check realsense-viewer again — the Hardware Checkpoint) or the node is stalled. Since the hardware layer was already isolated, re-run it first before assuming a ROS-level bug — this is exactly why the two-step checkpoint pattern exists.",
                  },
                ],
              },
            },
          ],
        },
        {
          slug: "can-you-build-it-yourself",
          title: "Can You Build It Yourself?",
          durationMinutes: 20,
          contentBlocks: [
            {
              type: "EXERCISE",
              exercise: {
                title: "Recreate robot_bringup's sensors_only.launch.py",
                instructions:
                  "Recreate robot_bringup's sensors_only.launch.py from a blank package, without copying this course's code.",
                config: {
                  type: "INDEPENDENT",
                  goal: {
                    body:
                      "Recreate robot_bringup's sensors_only.launch.py from a blank package, without copying this document's code.",
                  },
                  successCriteria: [
                    "ros2 pkg create with the correct build type",
                    "The official rplidar_ros and realsense2_camera launch file names (find them yourself via ros2 pkg prefix and browsing the installed share directory, not by looking them up in the lesson)",
                    "A working robot_state_publisher include from your own robot_description",
                    "Confirm your version passes every checkpoint from the Verification Checkpoints lesson",
                  ],
                },
              },
            },
          ],
        },
      ],
    },
    {
      title: "Project 1 — Obstacle Avoidance",
      summary:
        "A reactive robot that watches its front field of view with the RPLIDAR S3 and turns away from anything that gets too close.",
      lessons: [
        {
          slug: "overview-prerequisites-and-lab-safety-check",
          title: "Overview, Prerequisites & Lab Safety Check",
          durationMinutes: 12,
          contentBlocks: [
            {
              type: "CALLOUT",
              data: {
                variant: "WARNING",
                title: "Validation status",
                body: "THEORETICALLY DESIGNED, NOT PHYSICALLY VALIDATED.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "A robot that drives forward on its own, continuously watching a cone of space directly ahead of it with its LiDAR, and turns away from anything that gets too close — choosing whichever side has more open space, then resuming forward motion once the way is clear.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "This is the same core pattern behind a robot vacuum's collision avoidance, a warehouse AMR's safety-zone stop, and the lowest layer of almost every mobile robot's safety architecture — a fast, simple, sensor-driven reflex that runs independently of whatever higher-level task the robot is doing.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "What the robot will do: move forward at a conservative speed; if an obstacle enters its front field of view within a safe distance, stop or turn toward the clearer side; resume forward motion once clear; and always stop if its LiDAR data goes stale.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "What you'll build: one new ROS 2 package, obstacle_avoidance_bot, containing a single node that subscribes to /scan and publishes /cmd_vel — built entirely on top of Module 0's robot_bringup.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Prerequisites — Knowledge: completed Module 0; basic Python; comfortable reading a sensor_msgs/msg/LaserScan message's fields.\n\nHardware: RPLIDAR S3 (only) + the existing base driver — the camera and both IMUs are not required for this project, explained in the next lesson.\n\nSoftware: Module 0's robot_bringup and robot_description packages, already built.",
              },
            },
            {
              type: "CALLOUT",
              data: {
                variant: "DANGER",
                title: "Lab Safety Check",
                body: "Wheels lifted or the robot on a stand for every test before the first floor test (Step 10).\nLiDAR cable routed clear of the wheels before any floor test.\nlinear_speed capped at ≤ 0.15 m/s for every floor test — no exceptions.\nTest area cleared of fragile objects; use a soft, disposable object as the test obstacle.\nA person available to physically intervene throughout every floor test.\nscan_timeout_sec's safety stop (Step 9) must be confirmed working BEFORE the first floor test — this is a hard prerequisite, not optional.\nBattery charge sufficient for the full test session.",
              },
            },
          ],
        },
        {
          slug: "project-architecture-and-data-flow",
          title: "Project Architecture & Data Flow",
          durationMinutes: 8,
          contentBlocks: [
            {
              type: "TEXT",
              data: {
                body: "Hardware used: RPLIDAR S3 and the existing base driver only. The RealSense D435i and both IMUs are explicitly not used — this project makes its decision purely from /scan, with no need for the robot's position history or orientation.",
              },
            },
            {
              type: "CODE",
              data: {
                language: "text",
                filename: "Data flow",
                code:
                  "PHYSICAL ENVIRONMENT\n" +
                  "   (obstacles in the room)\n" +
                  "        ↓\n" +
                  "RPLIDAR S3 → rplidar_ros driver node → /scan (sensor_msgs/msg/LaserScan)\n" +
                  "        ↓\n" +
                  "obstacle_avoidance_node\n" +
                  "   ├── Front FOV Filter        (param: front_fov_degrees)\n" +
                  "   ├── Nearest-Obstacle Distance in front slice\n" +
                  "   ├── Left/Right Clearance Comparison  (param: side_clearance_fov_degrees)\n" +
                  "   └── Decision: FORWARD / TURN_LEFT / TURN_RIGHT / STOP\n" +
                  "        ↓\n" +
                  "/cmd_vel (geometry_msgs/msg/Twist)\n" +
                  "        ↓\n" +
                  "existing base driver → motors → ROBOT MOTION\n" +
                  "        ↓\n" +
                  "(motion changes what the LiDAR sees next → loop continues)",
              },
            },
            {
              type: "CODE",
              data: {
                language: "text",
                filename: "Component breakdown",
                code:
                  "Component               What it does                    Inputs   Outputs             Topic      Message type\n" +
                  "-----------------------  ------------------------------  -------  ------------------  ---------  --------------------------\n" +
                  "obstacle_avoidance_node  Filters, evaluates, decides     /scan    Velocity command    /cmd_vel   geometry_msgs/msg/Twist",
              },
            },
          ],
        },
        {
          slug: "building-the-node-minimal-to-fov-filter",
          title: "Building the Node: From Minimal to Front-FOV Filter",
          durationMinutes: 20,
          contentBlocks: [
            {
              type: "CODE",
              data: {
                language: "bash",
                filename: "Step 1 — Create the package",
                code:
                  "cd ~/robot_projects_ws/src\nros2 pkg create obstacle_avoidance_bot --build-type ament_python \\\n  --dependencies rclpy sensor_msgs geometry_msgs\nmkdir -p obstacle_avoidance_bot/config obstacle_avoidance_bot/launch",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "What success looks like: the package directory exists with package.xml listing rclpy, sensor_msgs, geometry_msgs as dependencies.\n\nIf it fails: a missing --dependencies entry just means you'll add it to package.xml by hand afterward — not fatal, just extra editing.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Step 2 — minimal node, verify it runs.",
              },
            },
            {
              type: "CODE",
              data: {
                language: "python",
                filename: "obstacle_avoidance_bot/obstacle_avoidance_bot/obstacle_avoidance_node.py (Step 2)",
                code: OBSTACLE_AVOIDANCE_NODE_MINIMAL,
              },
            },
            {
              type: "CODE",
              data: {
                language: "bash",
                filename: "Build and run",
                code:
                  "cd ~/robot_projects_ws\ncolcon build --packages-select obstacle_avoidance_bot\nsource install/setup.bash\nros2 run obstacle_avoidance_bot obstacle_avoidance_node",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "What success looks like: the log message appears; ros2 node list (in a second terminal) shows /obstacle_avoidance_node.\n\nIf it fails: a ModuleNotFoundError almost always means the entry point in setup.py doesn't match the file/class path exactly — check spelling and the colon syntax.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Step 3 — subscribe to /scan, verify data arrives. Run with robot_bringup's sensors active in another terminal first.",
              },
            },
            {
              type: "CODE",
              data: {
                language: "python",
                filename: "Step 3 addition",
                code: OBSTACLE_AVOIDANCE_STEP3_SUBSCRIBE,
              },
            },
            {
              type: "TEXT",
              data: {
                body: "What success looks like: log lines with a real, non-zero angle_increment and a non-trivial len(msg.ranges) (typically several hundred to over a thousand points for the S3).\n\nIf it fails: no log output at all means /scan isn't being published — go back to Module 0's Checkpoint for the LiDAR, not this node.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Step 4 — front-FOV filter (observation only).",
              },
            },
            {
              type: "CODE",
              data: {
                language: "python",
                filename: "Step 4 addition — helper",
                code: OBSTACLE_AVOIDANCE_STEP4_FOV_FILTER,
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Replace the callback's body with a call using front_fov_degrees = 30.0 (hardcoded for now, parameterized in Step 7):",
              },
            },
            {
              type: "CODE",
              data: {
                language: "python",
                filename: "Step 4 addition — callback",
                code: OBSTACLE_AVOIDANCE_STEP4_CALLBACK,
              },
            },
            {
              type: "TEXT",
              data: {
                body: "What success looks like: the logged distance decreases as you manually move an object closer to the front of the (stationary) robot, and increases as you move it away.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Step 5 — obstacle distance comparison (still observation only).",
              },
            },
            {
              type: "CODE",
              data: {
                language: "python",
                filename: "Step 5 addition",
                code: OBSTACLE_AVOIDANCE_STEP5_CALLBACK,
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Step 6 — left/right clearance comparison (still observation only).",
              },
            },
            {
              type: "CODE",
              data: {
                language: "python",
                filename: "Step 6 addition",
                code: OBSTACLE_AVOIDANCE_STEP6_CLEARANCE,
              },
            },
          ],
        },
        {
          slug: "publishing-commands-parameters-and-safety-timer",
          title: "Publishing Commands, Parameters & the Safety Timer",
          durationMinutes: 20,
          contentBlocks: [
            {
              type: "TEXT",
              data: {
                body: "Step 7 — publish /cmd_vel, add parameters and the safety timer. Full node, replacing everything above.",
              },
            },
            {
              type: "CODE",
              data: {
                language: "python",
                filename: "obstacle_avoidance_bot/obstacle_avoidance_bot/obstacle_avoidance_node.py",
                code: OBSTACLE_AVOIDANCE_NODE_FULL,
              },
            },
            {
              type: "CALLOUT",
              data: {
                variant: "WARNING",
                title: "A note on the FOV index math",
                body: "This simple index-math approach assumes the front FOV plus both side-clearance zones stay within the scan's angle_min/angle_max without wrapping past ±π — true for the default values above, but revisit this if you significantly widen front_fov_degrees or side_clearance_fov_degrees.",
              },
            },
            {
              type: "CODE",
              data: {
                language: "yaml",
                filename: "obstacle_avoidance_bot/config/obstacle_avoidance.yaml",
                code: OBSTACLE_AVOIDANCE_CONFIG_YAML,
              },
            },
            {
              type: "CODE",
              data: {
                language: "python",
                filename: "obstacle_avoidance_bot/launch/obstacle_avoidance.launch.py",
                code: OBSTACLE_AVOIDANCE_LAUNCH_PY,
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Update obstacle_avoidance_bot/package.xml to add <exec_depend>robot_bringup</exec_depend>, then build.",
              },
            },
            {
              type: "CODE",
              data: {
                language: "bash",
                filename: "Build",
                code: "cd ~/robot_projects_ws\ncolcon build --packages-select obstacle_avoidance_bot\nsource install/setup.bash",
              },
            },
            {
              type: "CODE",
              data: {
                language: "bash",
                filename: "Step 8 — Test with wheels lifted",
                code: "ros2 launch obstacle_avoidance_bot obstacle_avoidance.launch.py\n\n# second terminal:\nros2 topic echo /cmd_vel",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "What success looks like: with an object presented in front, angular.z is nonzero with the sign matching the actual clearer side; with the object removed, linear.x matches linear_speed and angular.z is 0.0.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Step 9 — confirm the safety stop. With the node running and wheels lifted, physically disconnect the LiDAR. What success looks like: within scan_timeout_sec, an ERROR log appears and /cmd_vel goes to all-zero.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Step 10 — first floor test. Low speed, supervised, per the Lab Safety Check.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Path C — Modify Existing (closing challenge): change front_fov_degrees from 30° to 60° and observe how much earlier the robot reacts to an obstacle approaching from a wider angle; swap the left/right tie-breaking rule (currently \"prefer left when equal\") to \"prefer right when equal\" and confirm the change in a symmetric-obstacle test; add a visualization marker (visualization_msgs/msg/Marker) showing the front FOV cone in RViz — not required for the core project, but a good exercise in extending a working node without breaking it.",
              },
            },
          ],
        },
        {
          slug: "how-to-run-expected-results-and-checkpoints",
          title: "How to Run, Expected Results & Verification Checkpoints",
          durationMinutes: 8,
          contentBlocks: [
            {
              type: "CODE",
              data: {
                language: "bash",
                filename: "Terminal 1",
                code: "ros2 launch obstacle_avoidance_bot obstacle_avoidance.launch.py",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Why: this single launch includes robot_bringup AND starts this project's own node, exactly matching Module 0's \"no project ever hand-launches a driver directly\" rule. What should appear: bringup logs, then \"obstacle_avoidance_node started: front_fov_degrees=30.0, ...\"",
              },
            },
            {
              type: "CODE",
              data: {
                language: "bash",
                filename: "Terminal 2",
                code: "ros2 topic echo /cmd_vel",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Why: lets you watch the exact commands being sent before or instead of trusting the physical robot's motion by eye.\n\nTerminal 3 (optional): rviz2, with a LaserScan display added — visually confirms what the robot \"sees\" at the moment it makes each decision.",
              },
            },
            {
              type: "CALLOUT",
              data: {
                variant: "INFO",
                title: "Expected results",
                body: "ros2 node list shows /obstacle_avoidance_node alongside the robot_bringup nodes.\nros2 topic hz /cmd_vel shows steady publishing once the node is running.\nPresenting an object in front produces a STOP or TURN log line and a matching nonzero angular.z on /cmd_vel.\nRemoving the object returns the robot to FORWARD (linear.x = linear_speed).\nDisconnecting the LiDAR produces the safety-stop ERROR log and a zeroed /cmd_vel within scan_timeout_sec.",
              },
            },
            {
              type: "CALLOUT",
              data: {
                variant: "INFO",
                title: "Verification checkpoints",
                body: "HARDWARE: is the RPLIDAR S3 connected and spinning?\nROS 2: does ros2 launch rplidar_ros rplidar_s3_launch.py start cleanly and appear in ros2 node list?\nDATA: does ros2 topic hz /scan show a steady rate with sane values?\nALGORITHM: does the node correctly log OBSTACLE/CLEAR and the correct turn direction when an object is manually presented on either side?\nCONTROL: with wheels lifted, does /cmd_vel match the logged decision, including correct sign on angular.z?\nPHYSICAL ROBOT: on the floor at low speed, does the robot repeatably avoid a real obstacle without collision across multiple trials, only after the checkpoints above have already passed?",
              },
            },
          ],
        },
        {
          slug: "project-1-quiz",
          title: "Project 1 Quiz",
          durationMinutes: 10,
          contentBlocks: [
            {
              type: "QUIZ",
              quiz: {
                title: "Project Understanding",
                questions: [
                  {
                    type: "SHORT_ANSWER",
                    prompt: "Why does this project not need the D435i camera or either IMU?",
                    acceptedAnswers: [
                      "purely reactive on current scan, no need for position history",
                    ],
                    explanation:
                      "The decision loop is purely reactive on the current /scan — it has no need for the robot's position history (no IMU/odometry) or visual data (no camera). Adding them would add hardware dependency and complexity with no benefit to this specific behavior.",
                  },
                ],
              },
            },
            {
              type: "QUIZ",
              quiz: {
                title: "Concept",
                questions: [
                  {
                    type: "SHORT_ANSWER",
                    prompt:
                      "Why is front_fov_degrees implemented using angle_min/angle_increment index math instead of a hardcoded array slice?",
                    acceptedAnswers: [
                      "angle increment can differ between lidar models or scan modes",
                    ],
                    explanation:
                      "angle_increment (and therefore how many array indices correspond to a given angular width) can differ between LiDAR models or scan modes. Hardcoding indices silently breaks if either changes; computing indices from the message's own fields does not.",
                  },
                  {
                    type: "SHORT_ANSWER",
                    prompt:
                      "What does the stop_distance parameter do that obstacle_distance alone doesn't?",
                    acceptedAnswers: [
                      "harder closer threshold that fully stops the robot",
                    ],
                    explanation:
                      "It provides a harder, closer threshold at which the robot fully stops rather than merely turning — separating \"start reacting\" from \"danger, halt now\" as two distinct thresholds.",
                  },
                ],
              },
            },
            {
              type: "QUIZ",
              quiz: {
                title: "Data Flow",
                questions: [
                  {
                    type: "SHORT_ANSWER",
                    prompt:
                      "If linear_speed is changed in obstacle_avoidance.yaml, which file(s) need to be rebuilt for the change to take effect?",
                    acceptedAnswers: ["none, yaml is read at launch time"],
                    explanation:
                      "None need rebuilding — YAML parameter files are read at launch time, not compiled. Just relaunch (colcon build is only needed after changing the Python node's code or setup.py).",
                  },
                ],
              },
            },
            {
              type: "QUIZ",
              quiz: {
                title: "Debugging",
                questions: [
                  {
                    type: "SHORT_ANSWER",
                    prompt:
                      "/scan is confirmed publishing correctly via ros2 topic hz, but the robot never turns even when an object is placed directly in front of it. What do you check next?",
                    acceptedAnswers: [
                      "check the front fov index math against a known object placement",
                    ],
                    explanation:
                      "Check whether the front FOV angle math is actually indexing the correct part of the ranges array — e.g., print i_start/i_end for a known object placement and confirm they land where expected. This isolates a logic bug in the node from a data problem already ruled out by the LiDAR check.",
                  },
                ],
              },
            },
          ],
        },
        {
          slug: "can-you-build-it-yourself",
          title: "Can You Build It Yourself?",
          durationMinutes: 30,
          contentBlocks: [
            {
              type: "EXERCISE",
              exercise: {
                title: "Build the obstacle avoidance robot without the tutorial",
                instructions:
                  "Build the obstacle avoidance robot without following the step-by-step tutorial above.",
                config: {
                  type: "INDEPENDENT",
                  goal: {
                    body:
                      "Build the obstacle avoidance robot without following the step-by-step tutorial above.",
                  },
                  successCriteria: [
                    "Create your own workspace and package.",
                    "Subscribe to /scan.",
                    "Select a front field of view via a parameter, not a hardcoded value.",
                    "Detect an obstacle within a configurable distance.",
                    "Decide a turn direction by comparing left/right clearance.",
                    "Publish /cmd_vel.",
                    "Add a safety stop for stale /scan data.",
                    "Test safely: wheels lifted first, low speed on the floor second.",
                  ],
                },
              },
            },
          ],
        },
      ],
    },
    {
      title: "Project 2 — Visual Object Tracking",
      summary:
        "A robot that finds a calibrated colored object with its camera, keeps it centered by turning toward it, and stops — deliberately, not by searching — when it disappears from view.",
      lessons: [
        {
          // Project 1's lesson of the same title already uses the slug
          // "overview-prerequisites-and-lab-safety-check" within this same
          // course. `findLessonNavigation` (features/learning/navigation.ts)
          // resolves a lesson URL by slug across ALL of a course's
          // sections, first match wins — an unqualified reuse here would
          // make this lesson permanently unreachable by direct URL,
          // silently rendering Project 1's lesson instead. Prefixed to stay
          // unique without touching Project 1's already-verified slug.
          slug: "project-2-overview-prerequisites-and-lab-safety-check",
          title: "Overview, Prerequisites & Lab Safety Check",
          durationMinutes: 12,
          contentBlocks: [
            {
              type: "CALLOUT",
              data: {
                variant: "WARNING",
                title: "Validation status",
                body: "THEORETICALLY DESIGNED, NOT PHYSICALLY VALIDATED.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "A robot that finds a specific colored object using its camera, keeps that object centered in view by turning toward it, and moves forward while the object stays roughly centered — a simple \"follow me\" behavior built entirely from a single RGB image stream.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Color-based visual tracking is the simplest member of a family of techniques used everywhere from warehouse robots following a colored floor marker, to camera-based ball-tracking in robotics competitions, to the first working prototype most computer-vision engineers build before moving to a learned object detector. It teaches the full perception → decision → actuation loop using nothing but classical image processing — no machine learning model required.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "What the robot will do: continuously watch its camera feed for a calibrated target color; when found, turn toward it and move forward; when it's centered, drive straight; when it disappears from view, stop — deliberately, not by spinning to search for it again.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "What you'll build: one new package, visual_tracking_bot, containing two pieces: the tracking node itself (color_tracker_node), and a small standalone calibration utility (hsv_calibrator) used once per lighting setup to determine the color thresholds — kept as a separate tool rather than folded into the tracking node, since calibration and tracking are genuinely different tasks with different lifetimes.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Prerequisites — Knowledge: completed Module 0 and Project 1; basic Python; no prior OpenCV experience required — HSV color space and contour detection are introduced from first principles.\n\nHardware: Intel RealSense D435i (RGB stream only) + the existing base driver. The RPLIDAR S3 is not used in this project.\n\nSoftware: Module 0's robot_bringup/robot_description, already built; python3-opencv installed via apt — this matters more here than anywhere else in the course so far.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "This project has a fundamentally different risk profile than Project 1. Project 1 had its own obstacle sensor as a safety net, independent of its primary task. This project has no obstacle sensing running at all — the LiDAR is still physically present and even publishing /scan via robot_bringup, but nothing in this project reads it. If the robot turns toward something the camera doesn't recognize as the target, there is no algorithmic fallback to stop it.",
              },
            },
            {
              type: "CALLOUT",
              data: {
                variant: "DANGER",
                title: "Lab Safety Check",
                body: "The floor-test area must be COMPLETELY clear in EVERY direction the robot could possibly turn toward — not just along the target object's path — because this project cannot detect or react to any obstacle that isn't the specific tracked color.\nLost-target behavior is a deliberate design decision: on losing the target, the robot STOPS after target_lost_timeout_sec. It does NOT spin or search. A blind spin-search would be a real collision risk specifically because this project has no obstacle sensing to catch a bad guess.\nWheels lifted for all of Step 11 and Checkpoint 5 — verify turning direction before any floor test, exactly as in Project 1.\nlinear_speed capped at ≤ 0.15 m/s for every floor test, same as Project 1 — with the added note that this project's proportional steering can produce continuously varying turn rates, so watch that max_angular_speed is actually being respected, not just angular_gain trusted blindly.\nCamera and any debug-viewing laptop/cable kept clear of the wheels.\nA person available to physically intervene throughout every floor test, positioned to step into the robot's path if it turns toward an unexpected direction — no sensor will catch that before it happens.\nRe-run the HSV calibration procedure if the test session's lighting differs from when hsv_lower/hsv_upper were last set — a stale calibration is a software-correctness issue that manifests as physically unpredictable turning, not just a vision bug.\nBattery charge sufficient for the full test session.",
              },
            },
          ],
        },
        {
          // Same cross-section slug-collision reasoning as the lesson
          // above: both Module 0 and Project 1 already use
          // "project-architecture-and-data-flow" within this course.
          slug: "project-2-architecture-and-data-flow",
          title: "Project Architecture & Data Flow",
          durationMinutes: 8,
          contentBlocks: [
            {
              type: "TEXT",
              data: {
                body: "Hardware used: Intel RealSense D435i (RGB stream only) and the existing base driver. Not used: RPLIDAR S3, the D435i's own depth stream, either IMU, /odom — this project's control loop depends only on the current camera frame, with no need for position history or orientation, exactly as established in Phase 4's scoping check.",
              },
            },
            {
              type: "CODE",
              data: {
                language: "text",
                filename: "Data flow",
                code:
                  "PHYSICAL ENVIRONMENT\n" +
                  "   (colored target object moves within camera view)\n" +
                  "        ↓\n" +
                  "Intel RealSense D435i → realsense2_camera_node → /camera/color/image_raw\n" +
                  "        ↓\n" +
                  "color_tracker_node\n" +
                  "   ├── cv_bridge: ROS Image → OpenCV BGR frame\n" +
                  "   ├── BGR → HSV conversion\n" +
                  "   ├── Color Mask                (params: hsv_lower, hsv_upper — calibrated)\n" +
                  "   ├── Contour Detection → largest contour ≥ min_contour_area\n" +
                  "   ├── Centroid Calculation (cx, cy)\n" +
                  "   ├── Compare cx to image-center ± centroid_deadzone_px\n" +
                  "   └── Decision: TURN_LEFT / TURN_RIGHT / FORWARD\n" +
                  "       — or, after target_lost_timeout_sec with no detection: STOP\n" +
                  "        ↓\n" +
                  "/cmd_vel → existing base driver → motors → ROBOT MOTION\n" +
                  "        ↓\n" +
                  "(motion re-centers the object in view → loop continues)",
              },
            },
            {
              type: "CODE",
              data: {
                language: "text",
                filename: "Component breakdown",
                code:
                  "Component                                               What it does                                              Inputs                    Outputs                                  Topic                                  Message type\n" +
                  "-------------------------------------------------------  --------------------------------------------------------  ------------------------  ---------------------------------------  -------------------------------------  ------------------------------------------------\n" +
                  "color_tracker_node                                      Detects and steers toward the calibrated color            /camera/color/image_raw  Velocity command, optional debug image  /cmd_vel, /color_tracker/debug_image  geometry_msgs/msg/Twist, sensor_msgs/msg/Image\n" +
                  "hsv_calibrator (utility, not part of the running robot)  Interactive tool to find hsv_lower/hsv_upper under current lighting  /camera/color/image_raw  Printed parameter values (to your terminal, for you to copy)  —  —",
              },
            },
          ],
        },
        {
          slug: "the-hsv-calibration-tool",
          title: "The HSV Calibration Tool",
          durationMinutes: 22,
          contentBlocks: [
            {
              type: "CODE",
              data: {
                language: "bash",
                filename: "Step 1 — Create the package",
                code:
                  "cd ~/robot_projects_ws/src\nros2 pkg create visual_tracking_bot --build-type ament_python \\\n  --dependencies rclpy sensor_msgs geometry_msgs cv_bridge\nmkdir -p visual_tracking_bot/config visual_tracking_bot/launch",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "What success looks like: package directory exists with the four dependencies listed in package.xml.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Step 2 — minimal node, verify it runs.",
              },
            },
            {
              type: "CODE",
              data: {
                language: "python",
                filename: "visual_tracking_bot/visual_tracking_bot/color_tracker_node.py (Step 2)",
                code: COLOR_TRACKER_NODE_MINIMAL,
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Add the entry point to setup.py (shown in full in Step 10). Build and run:",
              },
            },
            {
              type: "CODE",
              data: {
                language: "bash",
                filename: "Build and run",
                code:
                  "cd ~/robot_projects_ws\ncolcon build --packages-select visual_tracking_bot\nsource install/setup.bash\nros2 run visual_tracking_bot color_tracker_node",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "What success looks like: the log message appears, and /color_tracker_node shows up in ros2 node list.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Step 3 — subscribe to /camera/color/image_raw, verify data arrives. Before running this step, apply Module 0's two-step hardware-then-ROS checkpoint for the D435i exactly as established there — lsusb/realsense-viewer first, then the ROS driver check — rather than repeating that procedure here.",
              },
            },
            {
              type: "CODE",
              data: {
                language: "python",
                filename: "Step 3 addition",
                code: COLOR_TRACKER_STEP3_SUBSCRIBE,
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Run with robot_bringup active in another terminal first. What success looks like: log lines showing the image's actual height/width/encoding, read from the message fields — never assume a fixed resolution in code, since it's configured in robot_bringup/config/realsense.yaml, not hardcoded here.\n\nIf it fails: no log output means /camera/color/image_raw isn't publishing — go back to Module 0's D435i checkpoints, not this node.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Step 4 — cv_bridge conversion.",
              },
            },
            {
              type: "CODE",
              data: {
                language: "python",
                filename: "Step 4 addition",
                code: COLOR_TRACKER_STEP4_CV_BRIDGE,
              },
            },
            {
              type: "TEXT",
              data: {
                body: "What success looks like: frame.shape logs as (height, width, 3), matching Step 3's reported dimensions, with no exception raised.",
              },
            },
            {
              type: "CALLOUT",
              data: {
                variant: "WARNING",
                title: "Troubleshooting — cv_bridge / OpenCV version mismatch",
                body: "This is the exact point in the course where Phase 3's flagged risk becomes real: if imgmsg_to_cv2 raises an import or runtime error mentioning OpenCV, it almost always means Python's cv2 module and the OpenCV build ros-jazzy-cv-bridge was compiled against don't match. The fix is prevention, not patching: install OpenCV only via apt, and never run pip install opencv-python (or opencv-python-headless) alongside it on the same system. If you've already mixed the two, uninstall the pip package and confirm the import resolves to the apt-installed version before continuing.",
              },
            },
            {
              type: "CODE",
              data: {
                language: "bash",
                filename: "cv_bridge / OpenCV fix",
                code:
                  "sudo apt install python3-opencv\npip uninstall opencv-python opencv-python-headless\npython3 -c \"import cv2; print(cv2.__version__)\"  # confirm this resolves to the apt-installed version",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Step 5 — calibrate HSV thresholds. Standalone tool, run once per lighting setup — a separate file, never merged into the tracking node.",
              },
            },
            {
              type: "CODE",
              data: {
                language: "python",
                filename: "visual_tracking_bot/visual_tracking_bot/hsv_calibrator.py",
                code: HSV_CALIBRATOR_FULL,
              },
            },
            {
              type: "CODE",
              data: {
                language: "bash",
                filename: "Run the calibrator",
                code: "ros2 run visual_tracking_bot hsv_calibrator",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "What this does: shows a live camera feed, a live binary mask, and six trackbars — adjust them until the mask shows your target object as a clean white blob and everything else as black, under your current, actual lab lighting.\n\nWhat success looks like: pressing 'p' logs a line like \"hsv_lower: [0, 120, 70]   hsv_upper: [10, 255, 255]\" — copy those exact numbers into config/color_tracker.yaml.\n\nIf it fails: if no window appears at all, you're likely running this over SSH without X11 forwarding — either run it with a display attached directly, or forward X11 (ssh -X).\n\nRe-run this any time lighting changes materially — this is a documented re-calibration trigger, not a one-time setup step.",
              },
            },
          ],
        },
        {
          slug: "building-the-tracking-node",
          title: "Building the Tracking Node",
          durationMinutes: 24,
          contentBlocks: [
            {
              type: "TEXT",
              data: {
                body: "Step 6 — apply the mask, publish a debug view.",
              },
            },
            {
              type: "CODE",
              data: {
                language: "python",
                filename: "Step 6 addition",
                code: COLOR_TRACKER_STEP6_MASK_DEBUG,
              },
            },
            {
              type: "TEXT",
              data: {
                body: "(self.hsv_lower/self.hsv_upper and self.debug_pub are introduced properly in Step 10's full listing — this step is shown in isolation to keep the incremental build visible.)",
              },
            },
            {
              type: "CODE",
              data: {
                language: "bash",
                filename: "View the debug mask",
                code: "ros2 run rqt_image_view rqt_image_view",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Select /color_tracker/debug_image. What success looks like: a clean white blob where your target object is, black everywhere else — visually confirming the calibration before any motion logic is added.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Step 7 — contour detection and centroid (observation only).",
              },
            },
            {
              type: "CODE",
              data: {
                language: "python",
                filename: "Step 7 addition",
                code: COLOR_TRACKER_STEP7_CONTOUR_CENTROID,
              },
            },
            {
              type: "TEXT",
              data: {
                body: "What success looks like: the logged centroid tracks the object smoothly as you move it by hand in front of the camera, and disappears (no log line) when the object is removed.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Step 8 — steering decision (still observation only).",
              },
            },
            {
              type: "CODE",
              data: {
                language: "python",
                filename: "Step 8 addition",
                code: COLOR_TRACKER_STEP8_STEERING_DECISION,
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Step 9 — lost-target tracking.",
              },
            },
            {
              type: "CODE",
              data: {
                language: "python",
                filename: "Step 9 addition",
                code: COLOR_TRACKER_STEP9_LOST_TARGET,
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Step 10 — publish /cmd_vel, full node with parameters and safety timer. Replacing everything above.",
              },
            },
            {
              type: "CODE",
              data: {
                language: "python",
                filename: "visual_tracking_bot/visual_tracking_bot/color_tracker_node.py",
                code: COLOR_TRACKER_NODE_FULL,
              },
            },
            {
              type: "CODE",
              data: {
                language: "yaml",
                filename: "visual_tracking_bot/config/color_tracker.yaml",
                code: COLOR_TRACKER_CONFIG_YAML,
              },
            },
            {
              type: "CODE",
              data: {
                language: "python",
                filename: "visual_tracking_bot/setup.py",
                code: VISUAL_TRACKING_BOT_SETUP_PY,
              },
            },
            {
              type: "CODE",
              data: {
                language: "python",
                filename: "visual_tracking_bot/launch/visual_tracking.launch.py",
                code: VISUAL_TRACKING_LAUNCH_PY,
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Update visual_tracking_bot/package.xml to add <exec_depend>robot_bringup</exec_depend>, then build.",
              },
            },
            {
              type: "CODE",
              data: {
                language: "bash",
                filename: "Build",
                code: "cd ~/robot_projects_ws\ncolcon build --packages-select visual_tracking_bot\nsource install/setup.bash",
              },
            },
          ],
        },
        {
          slug: "testing-how-to-run-and-checkpoints",
          title: "Testing, How to Run & Verification Checkpoints",
          durationMinutes: 12,
          contentBlocks: [
            {
              type: "CODE",
              data: {
                language: "bash",
                filename: "Step 11 — Test with wheels lifted",
                code: "ros2 launch visual_tracking_bot visual_tracking.launch.py\n\n# second terminal:\nros2 topic echo /cmd_vel",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Move the calibrated object left/right by hand in front of the camera. What success looks like: angular.z's sign matches the direction the object needs the robot to turn, magnitude never exceeds max_angular_speed, and it returns to 0.0 when the object sits within centroid_deadzone_px of center. Remove the object entirely and confirm /cmd_vel goes to all-zero within target_lost_timeout_sec.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Step 12 — first floor test. Low speed, fully cleared path in every direction, supervised.",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Path C — Modify Existing (closing challenge): re-calibrate for a different colored object than the one you started with, without re-reading this document's steps — use only hsv_calibrator's own on-screen instructions; change centroid_deadzone_px to 10 and observe whether the robot starts oscillating (small, rapid left-right corrections), then explain why in terms of the dead-zone's purpose; add a second color range (e.g., handle a target color that wraps around HSV's hue boundary near 0°/180°, which needs two inRange masks OR'd together) as a stretch exercise.",
              },
            },
            {
              type: "CODE",
              data: {
                language: "bash",
                filename: "Terminal 1 — once, per lighting setup",
                code: "ros2 run visual_tracking_bot hsv_calibrator",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Why: determines hsv_lower/hsv_upper for the current lighting; copy the printed values into config/color_tracker.yaml, then close this tool — it is not run alongside the tracking node.",
              },
            },
            {
              type: "CODE",
              data: {
                language: "bash",
                filename: "Terminal 2",
                code: "ros2 launch visual_tracking_bot visual_tracking.launch.py",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Why: brings up robot_bringup's sensors and starts color_tracker_node, exactly matching the \"no project hand-launches a driver\" rule. What should appear: bringup logs, then \"color_tracker_node started\".",
              },
            },
            {
              type: "CODE",
              data: {
                language: "bash",
                filename: "Terminal 3",
                code: "ros2 run rqt_image_view rqt_image_view",
              },
            },
            {
              type: "TEXT",
              data: {
                body: "Viewing /color_tracker/debug_image. Why: lets you see exactly what the node sees and decides, without needing to interpret raw /cmd_vel numbers alone.\n\nTerminal 4 (optional): ros2 topic echo /cmd_vel — confirms the exact commanded velocity at any instant.",
              },
            },
            {
              type: "CALLOUT",
              data: {
                variant: "INFO",
                title: "Expected results",
                body: "ros2 node list shows /color_tracker_node alongside the robot_bringup nodes.\n/color_tracker/debug_image shows a clean, isolated mask/annotated frame under current lighting (re-run calibration if it doesn't).\nPresenting the object left/right produces correctly-signed angular.z on /cmd_vel, capped at max_angular_speed.\nCentering the object returns angular.z to 0.0 with linear.x at max_linear_speed.\nRemoving the object produces a WARN log and a zeroed /cmd_vel within target_lost_timeout_sec.",
              },
            },
            {
              type: "CALLOUT",
              data: {
                variant: "INFO",
                title: "Verification checkpoints",
                body: "HARDWARE: does lsusb/realsense-viewer show the D435i's RGB stream live, BEFORE any ROS node is started?\nROS 2: does realsense2_camera_node start cleanly, and does /camera/color/image_raw appear in ros2 topic list?\nDATA: does ros2 topic hz /camera/color/image_raw show a steady rate, and does the cv_bridge conversion complete without throwing across a sustained run (not just once)?\nALGORITHM: under the lab's ACTUAL current lighting, does the calibrated mask isolate the target with minimal noise (checked visually via /color_tracker/debug_image), and does the computed centroid stay stable when the object is held still?\nCONTROL: with wheels lifted, does /cmd_vel show correctly signed, correctly capped angular.z as the object moves, returning to zero within the dead-zone?\nPHYSICAL ROBOT: on the floor at low speed, in a fully cleared area, does the robot smoothly follow a slowly-moved object without oscillating, and does it stop (not spin) within target_lost_timeout_sec when the object is removed?",
              },
            },
          ],
        },
        {
          slug: "project-2-quiz",
          title: "Project 2 Quiz",
          durationMinutes: 10,
          contentBlocks: [
            {
              type: "QUIZ",
              quiz: {
                title: "Project Understanding",
                questions: [
                  {
                    type: "SHORT_ANSWER",
                    prompt:
                      "Why is the HSV calibration tool a separate script from the tracking node, rather than one combined program?",
                    acceptedAnswers: [
                      "different tasks with different lifetimes",
                    ],
                    explanation:
                      "Calibration and tracking are different tasks with different lifetimes — calibration is run once (or occasionally, when lighting changes) by a human adjusting sliders interactively, while tracking runs continuously and autonomously with no human input. Combining them would force the tracking node to carry GUI/trackbar code it never needs while actually running the robot.",
                  },
                ],
              },
            },
            {
              type: "QUIZ",
              quiz: {
                title: "Concept",
                questions: [
                  {
                    type: "SHORT_ANSWER",
                    prompt:
                      "Why does the mask isolation step use HSV color space instead of the camera's native BGR/RGB?",
                    acceptedAnswers: [
                      "hsv separates hue from brightness and saturation",
                    ],
                    explanation:
                      "HSV separates a color's hue from its brightness and saturation, so a threshold range can be built around \"what color is this\" largely independent of lighting intensity — a BGR/RGB threshold would need to account for brightness changes directly in every channel, which is far harder to tune robustly.",
                  },
                  {
                    type: "SHORT_ANSWER",
                    prompt: "What does min_contour_area protect against?",
                    acceptedAnswers: [
                      "small noisy blobs being mistaken for the target",
                    ],
                    explanation:
                      "Small, noisy blobs in the mask (stray pixels matching the color range by coincidence, or small reflections) being mistaken for the actual target — filtering by a minimum area ensures only a plausibly object-sized region is tracked.",
                  },
                ],
              },
            },
            {
              type: "QUIZ",
              quiz: {
                title: "Data Flow",
                questions: [
                  {
                    // Audit (docs/robotics-projects/IMPLEMENTATION_PLAN.md
                    // §5.1, "Project 2 | Data Flow | 1"): the source stem is
                    // already a yes/no question ("does the node's code need
                    // to change?"), and the source answer opens with "No." —
                    // a clean TRUE_FALSE fit, format-adapted from the plan's
                    // original SHORT_ANSWER assumption, nothing invented.
                    type: "TRUE_FALSE",
                    prompt:
                      "If the D435i's resolution is changed in robot_bringup/config/realsense.yaml, does color_tracker_node's code need to change?",
                    correctAnswer: false,
                    explanation:
                      "No — the node reads frame.shape from the actual incoming frame at runtime rather than hardcoding a resolution, so it adapts automatically. This is the same discipline as Module 0's FOV index-math fix, applied to image dimensions instead of scan angles.",
                  },
                ],
              },
            },
            {
              type: "QUIZ",
              quiz: {
                title: "Debugging",
                questions: [
                  {
                    // Audit (IMPLEMENTATION_PLAN.md §5.1, "Project 2 |
                    // Debugging | 1"): the source stem names all three
                    // options verbatim ("image processing, centroid math,
                    // or the publisher"), and the source answer names the
                    // correct one and explains why — a clean SINGLE_CHOICE
                    // fit, nothing invented.
                    type: "SINGLE_CHOICE",
                    prompt:
                      "The /color_tracker/debug_image mask preview shows the target object cleanly isolated as a white blob, but the robot doesn't move at all. Which layer do you check first?",
                    options: [
                      { id: "a", label: "Image processing" },
                      { id: "b", label: "Centroid math" },
                      { id: "c", label: "The publisher" },
                    ],
                    correctOptionIds: ["c"],
                    explanation:
                      "Check the publisher layer first, specifically whether /cmd_vel is actually being published at all (ros2 topic hz /cmd_vel) and whether anything is subscribed to it (ros2 topic info /cmd_vel). A clean mask already proves image processing is working; the next thing downstream in the pipeline — and the cheapest to check — is whether a Twist message is leaving the node at all, before assuming a subtler bug in the centroid or steering math.",
                  },
                  {
                    type: "SHORT_ANSWER",
                    prompt:
                      "The robot tracks correctly indoors near a window during the day, but loses the target entirely in the evening under artificial light. What's the most likely cause, and what's the fix?",
                    acceptedAnswers: [
                      "stale hsv calibration for the current lighting, re-run hsv_calibrator",
                    ],
                    explanation:
                      "The HSV calibration was performed under different lighting than the current test — natural daylight and artificial lighting produce different color casts. The fix is re-running hsv_calibrator under the current lighting, exactly as the Lab Safety Check names as a required trigger, not re-tuning the tracking node's logic.",
                  },
                ],
              },
            },
          ],
        },
        {
          // Same cross-section slug-collision reasoning: both Module 0 and
          // Project 1 already use "can-you-build-it-yourself" within this
          // course.
          slug: "project-2-can-you-build-it-yourself",
          title: "Can You Build It Yourself?",
          durationMinutes: 30,
          contentBlocks: [
            {
              type: "EXERCISE",
              exercise: {
                title:
                  "Re-calibrate and re-verify the tracker for a new colored object",
                instructions:
                  "Re-calibrate and re-verify the tracker for a NEW colored object, without following this document's steps verbatim.",
                config: {
                  type: "INDEPENDENT",
                  goal: {
                    body:
                      "Re-calibrate and re-verify the tracker for a NEW colored object, without following this document's steps verbatim.",
                  },
                  successCriteria: [
                    "Choose a different-colored object than the one you calibrated first.",
                    "Run hsv_calibrator and determine new hsv_lower/hsv_upper values using only its own on-screen instructions.",
                    "Update config/color_tracker.yaml and relaunch.",
                    "Confirm Checkpoint 4 (mask isolation, centroid stability) passes for the new object before attempting Checkpoint 5 or any floor test.",
                    "Test safely: wheels lifted first, low speed on a fully cleared floor second.",
                  ],
                },
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
  {
    slug: "robotics-hardware-and-sensors",
    title: "Robotics Hardware & Sensors: From Components to ROS 2 Integration",
    subtitle:
      "Real robotics hardware — evaluated, connected, configured, and integrated with ROS 2, not just described.",
    description:
      "A scalable robotics hardware knowledge library and practical lab, starting with the RPLIDAR A2 and Orbbec Astra Pro on ROS 2 Jazzy and Ubuntu 24.04. Every driver claim is verified against upstream sources rather than assumed, and legacy hardware is taught openly rather than hidden.",
    status: "DRAFT",
    visibility: "PUBLIC",
  },
  {
    slug: "hands-on-robotics-projects",
    title: "Hands-On Robotics Projects with ROS 2: From Sensors to Autonomous Robots",
    subtitle:
      "Build, run, and debug four real robotics projects on one physical rig — obstacle avoidance to autonomous navigation.",
    description:
      "A project-first, lab-first ROS 2 Jazzy course built on one fixed rig (Jetson, RPLIDAR S3, Intel RealSense D435i, a custom differential-drive base): reactive obstacle avoidance, visual object tracking, SLAM mapping, and Nav2 autonomous navigation, each incrementally built, run, and verified with an explicit hardware-then-ROS checkpoint discipline. Every lesson distinguishes theoretically designed content from physically validated content — nothing here is claimed as proven until it has actually run on the real robot.",
    // DRAFT, not PUBLISHED: every lesson's own validation banner says
    // "not physically validated" — publishing the course live while every
    // banner disclaims it would be a mixed signal to a real learner. Flip
    // to PUBLISHED once Phase 6 (docs/robotics-projects/
    // PHASE_6_PHYSICAL_VALIDATION_CHECKLIST.md) substantially passes.
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

  const student = await prisma.user.upsert({
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

  // The Robotics Hardware & Sensors course is DRAFT — same as
  // ros2-fundamentals — so a signed-in-but-unenrolled visitor gets "course
  // not found" (§12: DRAFT/PUBLIC is instructor-preview-only, and course
  // visibility gates *finding* the course before enrollment can even
  // happen). ros2-fundamentals, typescript-foundations and
  // web-accessibility-in-practice already carry a real Enrollment row for
  // this student in the dev database, which is what actually makes them
  // reachable and is why they "just work" while this course didn't — not
  // a difference in course status or any code path. Enrolling here too
  // closes that gap the same way, as real seed data instead of a manual
  // row that only exists until someone resets the database.
  const roboticsHardwareCourse = await prisma.course.findUnique({
    where: { slug: "robotics-hardware-and-sensors" },
    select: { id: true },
  });
  if (roboticsHardwareCourse) {
    await prisma.enrollment.upsert({
      where: {
        userId_courseId: { userId: student.id, courseId: roboticsHardwareCourse.id },
      },
      update: {},
      create: {
        userId: student.id,
        courseId: roboticsHardwareCourse.id,
        status: "ACTIVE",
      },
    });
  }

  // Devices must exist before seedCurricula, since SPEC_TABLE/DEVICE_CARD
  // blocks reference them by slug; homeSectionId is resolved in a second
  // pass afterward, since the section a device lives in doesn't exist
  // until seedCurricula creates it.
  await seedHardwareDevices(prisma);
  await seedCurricula(prisma);
  await seedHardwareDeviceHomeSections(prisma);

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
 * Hardware devices (Robotics Hardware & Sensors course, Stage 1). Upserts
 * the device row plus its specs/topics as a full replace-on-update — specs
 * and topics have no independent identity worth preserving across reseeds
 * (unlike, say, `LessonProgress`), so `deleteMany` + `createMany` is
 * simpler and safer than diffing than trying to match old rows to new
 * ones by content.
 */
async function seedHardwareDevices(prisma: PrismaClient): Promise<void> {
  for (const device of HARDWARE_DEVICES) {
    const record = await prisma.hardwareDevice.upsert({
      where: { slug: device.slug },
      update: {
        name: device.name,
        manufacturer: device.manufacturer,
        category: device.category,
        summary: device.summary,
        heroImageSrc: device.heroImageSrc ?? null,
        heroImageAlt: device.heroImageAlt ?? null,
        driverPackage: device.driverPackage,
        driverRepoUrl: device.driverRepoUrl,
        rosDistroCompat: device.rosDistroCompat,
        supportStatus: device.supportStatus,
        supportStatusNote: device.supportStatusNote ?? null,
      },
      create: {
        slug: device.slug,
        name: device.name,
        manufacturer: device.manufacturer,
        category: device.category,
        summary: device.summary,
        heroImageSrc: device.heroImageSrc ?? null,
        heroImageAlt: device.heroImageAlt ?? null,
        driverPackage: device.driverPackage,
        driverRepoUrl: device.driverRepoUrl,
        rosDistroCompat: device.rosDistroCompat,
        supportStatus: device.supportStatus,
        supportStatusNote: device.supportStatusNote ?? null,
      },
      select: { id: true },
    });

    await prisma.hardwareDeviceSpec.deleteMany({ where: { deviceId: record.id } });
    await prisma.hardwareDeviceSpec.createMany({
      data: device.specs.map((spec) => ({ ...spec, deviceId: record.id })),
    });

    await prisma.hardwareDeviceTopic.deleteMany({ where: { deviceId: record.id } });
    await prisma.hardwareDeviceTopic.createMany({
      data: device.topics.map((topic, index) => ({
        ...topic,
        deviceId: record.id,
        sortOrder: index,
      })),
    });
  }
}

/**
 * Second pass, after `seedCurricula` has created the sections: point each
 * device's `homeSectionId` at the section that actually teaches it. Split
 * from `seedHardwareDevices` because of that ordering dependency, not
 * because it's conceptually a separate step.
 */
async function seedHardwareDeviceHomeSections(prisma: PrismaClient): Promise<void> {
  for (const device of HARDWARE_DEVICES) {
    const course = await prisma.course.findUnique({
      where: { slug: device.homeCourseSlug },
      select: { id: true },
    });
    if (!course) {
      continue;
    }

    const section = await prisma.section.findFirst({
      where: { courseId: course.id, title: device.homeSectionTitle },
      select: { id: true },
    });
    if (!section) {
      continue;
    }

    await prisma.hardwareDevice.update({
      where: { slug: device.slug },
      data: { homeSectionId: section.id },
    });
  }
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

      // `position` is set here on both branches — including on an existing
      // row — so that re-running the seed after the array order changes
      // (e.g. new sections inserted earlier in CURRICULA) actually moves
      // already-created sections to match. Lessons two levels below already
      // do this (`position: lessonIndex` in the upsert's `update`); sections
      // not doing the same was an inconsistency, not a deliberate choice —
      // nothing here preserves a human's manual drag-and-drop reorder, since
      // this array is the declared source of truth for seeded curricula.
      const sectionId = existing
        ? (
            await prisma.section.update({
              where: { id: existing.id },
              data: { title: section.title, summary: section.summary, position: index },
              select: { id: true },
            })
          ).id
        : (
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

  if (block.type === "SPEC_TABLE" || block.type === "DEVICE_CARD") {
    const device = await prisma.hardwareDevice.findUnique({
      where: { slug: block.deviceSlug },
      select: { id: true },
    });
    if (!device) {
      throw new Error(
        `seedContentBlock: no HardwareDevice with slug "${block.deviceSlug}" — ` +
          `seedHardwareDevices must run before seedCurricula.`
      );
    }

    const data: Prisma.InputJsonValue | typeof Prisma.JsonNull =
      block.type === "SPEC_TABLE" && block.specKeys
        ? { specKeys: block.specKeys }
        : Prisma.JsonNull;

    if (existing) {
      await prisma.lessonContentBlock.update({
        where: { id: existing.id },
        data: { type: block.type, hardwareDeviceId: device.id, data },
      });
    } else {
      await prisma.lessonContentBlock.create({
        data: { lessonId, position, type: block.type, hardwareDeviceId: device.id, data },
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
