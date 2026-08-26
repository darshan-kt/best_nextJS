import { afterEach, describe, expect, it } from "vitest";

import { prisma } from "@/db/client";
import type { Actor } from "@/features/auth/policy";
import { resetDb } from "@/test/reset-db";
import { markLessonComplete } from "./mark-lesson-complete";

/**
 * `markLessonComplete` touches real Postgres (upsert, count, a conditional
 * `Enrollment` update) and had no test before Milestone 11 — see the plan's
 * test-coverage audit. Fixtures are built directly via Prisma, matching
 * `course-access.test.ts`'s style, not `prisma/seed.ts` (dev-only data).
 */

afterEach(async () => {
  await resetDb();
});

let userCounter = 0;

async function createStudentAndCourse(options?: { lessonCount?: number }) {
  const n = ++userCounter;
  const lessonCount = options?.lessonCount ?? 1;

  const instructor = await prisma.user.create({
    data: { email: `instructor-${n}@test.local`, name: "Instructor" },
  });

  const course = await prisma.course.create({
    data: {
      slug: `course-${n}`,
      title: `Course ${n}`,
      status: "PUBLISHED",
      visibility: "PUBLIC",
      instructorId: instructor.id,
      publishedAt: new Date(),
    },
  });

  const section = await prisma.section.create({
    data: { courseId: course.id, title: "Section 1", position: 1 },
  });

  const lessons = [];
  for (let i = 1; i <= lessonCount; i += 1) {
    lessons.push(
      await prisma.lesson.create({
        data: {
          sectionId: section.id,
          slug: `lesson-${i}`,
          title: `Lesson ${i}`,
          position: i,
          isPublished: true,
        },
      })
    );
  }

  const student = await prisma.user.create({
    data: { email: `student-${n}@test.local`, name: "Student" },
  });

  const actor: Actor = { id: student.id, roles: ["STUDENT"] };

  return { course, lessons, student, actor };
}

describe("markLessonComplete", () => {
  it("upserts a LessonProgress row and reports the course-level count", async () => {
    const { course, lessons, student, actor } = await createStudentAndCourse();
    await prisma.enrollment.create({
      data: { userId: student.id, courseId: course.id, status: "ACTIVE" },
    });

    const result = await markLessonComplete({
      actor,
      courseSlug: course.slug,
      lessonSlug: lessons[0].slug,
    });

    expect(result).toEqual({
      ok: true,
      completedLessonCount: 1,
      totalLessonCount: 1,
      courseCompleted: true,
    });

    const progress = await prisma.lessonProgress.findMany({
      where: { lessonId: lessons[0].id },
    });
    expect(progress).toHaveLength(1);
  });

  it("flips the enrollment to COMPLETED once every published lesson is done", async () => {
    const { course, lessons, student, actor } = await createStudentAndCourse();
    await prisma.enrollment.create({
      data: { userId: student.id, courseId: course.id, status: "ACTIVE" },
    });

    const result = await markLessonComplete({
      actor,
      courseSlug: course.slug,
      lessonSlug: lessons[0].slug,
    });
    expect(result.ok && result.courseCompleted).toBe(true);

    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: student.id, courseId: course.id } },
    });
    expect(enrollment?.status).toBe("COMPLETED");
    expect(enrollment?.completedAt).not.toBeNull();
  });

  it("does not flip to COMPLETED while lessons remain", async () => {
    const { course, lessons, student, actor } = await createStudentAndCourse({
      lessonCount: 2,
    });
    await prisma.enrollment.create({
      data: { userId: student.id, courseId: course.id, status: "ACTIVE" },
    });

    const result = await markLessonComplete({
      actor,
      courseSlug: course.slug,
      lessonSlug: lessons[0].slug,
    });

    expect(result).toEqual({
      ok: true,
      completedLessonCount: 1,
      totalLessonCount: 2,
      courseCompleted: false,
    });

    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: student.id, courseId: course.id } },
    });
    expect(enrollment?.status).toBe("ACTIVE");
  });

  it("is idempotent: marking an already-complete lesson again does not duplicate or error", async () => {
    const { course, lessons, student, actor } = await createStudentAndCourse();
    await prisma.enrollment.create({
      data: { userId: student.id, courseId: course.id, status: "ACTIVE" },
    });

    await markLessonComplete({
      actor,
      courseSlug: course.slug,
      lessonSlug: lessons[0].slug,
    });
    const second = await markLessonComplete({
      actor,
      courseSlug: course.slug,
      lessonSlug: lessons[0].slug,
    });

    expect(second).toEqual({
      ok: true,
      completedLessonCount: 1,
      totalLessonCount: 1,
      courseCompleted: true,
    });
  });

  it("returns NOT_FOUND for a nonexistent lesson slug", async () => {
    const { course, student, actor } = await createStudentAndCourse();
    await prisma.enrollment.create({
      data: { userId: student.id, courseId: course.id, status: "ACTIVE" },
    });

    const result = await markLessonComplete({
      actor,
      courseSlug: course.slug,
      lessonSlug: "does-not-exist",
    });

    expect(result).toEqual({ ok: false, reason: "NOT_FOUND" });
  });

  it("returns FORBIDDEN when the actor has no enrollment at all", async () => {
    const { course, lessons, actor } = await createStudentAndCourse();

    const result = await markLessonComplete({
      actor,
      courseSlug: course.slug,
      lessonSlug: lessons[0].slug,
    });

    expect(result).toEqual({ ok: false, reason: "FORBIDDEN" });
  });

  it("returns FORBIDDEN for a cancelled enrollment", async () => {
    const { course, lessons, student, actor } = await createStudentAndCourse();
    await prisma.enrollment.create({
      data: { userId: student.id, courseId: course.id, status: "CANCELLED" },
    });

    const result = await markLessonComplete({
      actor,
      courseSlug: course.slug,
      lessonSlug: lessons[0].slug,
    });

    expect(result).toEqual({ ok: false, reason: "FORBIDDEN" });
  });
});
