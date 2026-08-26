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
