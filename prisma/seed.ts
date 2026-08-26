import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/db/generated/client";
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

/// Curriculum for a couple of courses (§11: Course → Section → Lesson).
/// Not every seeded course gets one — a course with an empty curriculum is
/// a state the detail page has to render, so leaving some empty keeps that
/// path exercised.
interface SeedLesson {
  slug: string;
  title: string;
  durationMinutes: number;
  isPublished?: boolean;
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
        },
        {
          slug: "inference",
          title: "Inference: what you can leave unwritten",
          durationMinutes: 18,
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
        await prisma.lesson.upsert({
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
        });
      }
    }
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
