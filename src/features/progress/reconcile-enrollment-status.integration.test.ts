import { afterEach, describe, expect, it } from "vitest";

import { prisma } from "@/db/client";
import { resetDb } from "@/test/reset-db";
import {
  deriveEnrollmentStatus,
  reconcileCourseEnrollments,
  reconcileEnrollmentStatus,
} from "./reconcile-enrollment-status";

/**
 * Regression cover for the stale-`COMPLETED` bug found while implementing
 * ROS 2 Module 1: a learner who finished a 3-lesson course kept a
 * `COMPLETED` enrollment (and a "Completed" badge) after the course grew to
 * 6 lessons, because completion was written once and never revisited.
 *
 * Fixtures are built directly via Prisma, matching
 * `mark-lesson-complete.integration.test.ts` beside it rather than
 * `prisma/seed.ts` (dev-only data).
 */

afterEach(async () => {
  await resetDb();
});

let counter = 0;

async function createCourseWithLessons(lessonCount: number) {
  const n = ++counter;

  const instructor = await prisma.user.create({
    data: { email: `reconcile-instructor-${n}@test.local`, name: "Instructor" },
  });

  const course = await prisma.course.create({
    data: {
      slug: `reconcile-course-${n}`,
      title: `Reconcile Course ${n}`,
      status: "PUBLISHED",
      visibility: "PUBLIC",
      instructorId: instructor.id,
      publishedAt: new Date(),
    },
  });

  const section = await prisma.section.create({
    data: { courseId: course.id, title: "Section 1", position: 0 },
  });

  const lessons = [];
  for (let i = 1; i <= lessonCount; i += 1) {
    lessons.push(
      await prisma.lesson.create({
        data: {
          sectionId: section.id,
          courseId: course.id,
          slug: `lesson-${i}`,
          title: `Lesson ${i}`,
          position: i,
          isPublished: true,
        },
      })
    );
  }

  const student = await prisma.user.create({
    data: { email: `reconcile-student-${n}@test.local`, name: "Student" },
  });

  return { course, section, lessons, student };
}

/** Adds `count` further published lessons, i.e. the course grows. */
async function addLessons(sectionId: string, courseId: string, from: number, count: number) {
  const added = [];
  for (let i = from; i < from + count; i += 1) {
    added.push(
      await prisma.lesson.create({
        data: {
          sectionId,
          courseId,
          slug: `lesson-${i}`,
          title: `Lesson ${i}`,
          position: i,
          isPublished: true,
        },
      })
    );
  }
  return added;
}

describe("deriveEnrollmentStatus", () => {
  it("is COMPLETED only when every published lesson is done", () => {
    expect(deriveEnrollmentStatus("ACTIVE", 3, 3)).toBe("COMPLETED");
    expect(deriveEnrollmentStatus("ACTIVE", 2, 3)).toBe("ACTIVE");
    expect(deriveEnrollmentStatus("COMPLETED", 3, 6)).toBe("ACTIVE");
  });

  it("never derives completion for a course with no published lessons", () => {
    // The old `completed >= total` comparison made this vacuously true.
    expect(deriveEnrollmentStatus("ACTIVE", 0, 0)).toBe("ACTIVE");
  });

  it("leaves CANCELLED alone in both directions", () => {
    expect(deriveEnrollmentStatus("CANCELLED", 3, 3)).toBe("CANCELLED");
    expect(deriveEnrollmentStatus("CANCELLED", 0, 3)).toBe("CANCELLED");
  });
});

describe("reconcileEnrollmentStatus", () => {
  it("downgrades a COMPLETED enrollment when the course grows (3/3 → 3/6)", async () => {
    // Exactly the case found in the ROS 2 course: Module 0 finished at
    // 3/3, then Module 1 landed and made the course 6 lessons long.
    const { course, section, lessons, student } =
      await createCourseWithLessons(3);

    const enrollment = await prisma.enrollment.create({
      data: {
        userId: student.id,
        courseId: course.id,
        status: "COMPLETED",
        completedAt: new Date(),
      },
    });

    for (const lesson of lessons) {
      await prisma.lessonProgress.create({
        data: { enrollmentId: enrollment.id, lessonId: lesson.id },
      });
    }

    await addLessons(section.id, course.id, 4, 3);

    const outcome = await reconcileEnrollmentStatus(enrollment.id);

    expect(outcome).toMatchObject({
      previousStatus: "COMPLETED",
      status: "ACTIVE",
      completedLessonCount: 3,
      totalLessonCount: 6,
      changed: true,
    });

    const after = await prisma.enrollment.findUnique({
      where: { id: enrollment.id },
    });
    expect(after?.status).toBe("ACTIVE");
    expect(after?.completedAt).toBeNull();
  });

  it("restores COMPLETED once the added lessons are finished too", async () => {
    const { course, section, lessons, student } =
      await createCourseWithLessons(3);

    const enrollment = await prisma.enrollment.create({
      data: { userId: student.id, courseId: course.id, status: "ACTIVE" },
    });

    const added = await addLessons(section.id, course.id, 4, 3);
    for (const lesson of [...lessons, ...added]) {
      await prisma.lessonProgress.create({
        data: { enrollmentId: enrollment.id, lessonId: lesson.id },
      });
    }

    const outcome = await reconcileEnrollmentStatus(enrollment.id);

    expect(outcome).toMatchObject({
      status: "COMPLETED",
      completedLessonCount: 6,
      totalLessonCount: 6,
      changed: true,
    });
    const after = await prisma.enrollment.findUnique({
      where: { id: enrollment.id },
    });
    expect(after?.completedAt).not.toBeNull();
  });

  it("reports no change when status already matches progress", async () => {
    const { course, lessons, student } = await createCourseWithLessons(2);
    const enrollment = await prisma.enrollment.create({
      data: { userId: student.id, courseId: course.id, status: "ACTIVE" },
    });
    await prisma.lessonProgress.create({
      data: { enrollmentId: enrollment.id, lessonId: lessons[0].id },
    });

    const outcome = await reconcileEnrollmentStatus(enrollment.id);

    expect(outcome).toMatchObject({ status: "ACTIVE", changed: false });
  });

  it("ignores progress against lessons that are no longer published", async () => {
    const { course, lessons, student } = await createCourseWithLessons(3);
    const enrollment = await prisma.enrollment.create({
      data: {
        userId: student.id,
        courseId: course.id,
        status: "COMPLETED",
        completedAt: new Date(),
      },
    });
    for (const lesson of lessons) {
      await prisma.lessonProgress.create({
        data: { enrollmentId: enrollment.id, lessonId: lesson.id },
      });
    }

    // Unpublishing a lesson removes it from both sides of the comparison,
    // so a learner who finished everything stays complete at 2/2 rather
    // than counting 3 completions against a 2-lesson course.
    await prisma.lesson.update({
      where: { id: lessons[2].id },
      data: { isPublished: false },
    });

    const outcome = await reconcileEnrollmentStatus(enrollment.id);

    expect(outcome).toMatchObject({
      status: "COMPLETED",
      completedLessonCount: 2,
      totalLessonCount: 2,
    });
  });

  it("returns null for an enrollment that does not exist", async () => {
    expect(await reconcileEnrollmentStatus("does-not-exist")).toBeNull();
  });
});

describe("reconcileCourseEnrollments", () => {
  it("corrects every affected enrollment and leaves CANCELLED untouched", async () => {
    const { course, section, lessons, student } =
      await createCourseWithLessons(3);

    const finished = await prisma.enrollment.create({
      data: {
        userId: student.id,
        courseId: course.id,
        status: "COMPLETED",
        completedAt: new Date(),
      },
    });
    for (const lesson of lessons) {
      await prisma.lessonProgress.create({
        data: { enrollmentId: finished.id, lessonId: lesson.id },
      });
    }

    const quitter = await prisma.user.create({
      data: { email: `reconcile-quitter-${counter}@test.local`, name: "Quit" },
    });
    const cancelled = await prisma.enrollment.create({
      data: {
        userId: quitter.id,
        courseId: course.id,
        status: "CANCELLED",
        completedAt: null,
      },
    });
    for (const lesson of lessons) {
      await prisma.lessonProgress.create({
        data: { enrollmentId: cancelled.id, lessonId: lesson.id },
      });
    }

    await addLessons(section.id, course.id, 4, 3);

    const outcomes = await reconcileCourseEnrollments(course.id);
    expect(outcomes).toHaveLength(2);

    const byId = new Map(outcomes.map((o) => [o.enrollmentId, o]));
    expect(byId.get(finished.id)).toMatchObject({
      status: "ACTIVE",
      completedLessonCount: 3,
      totalLessonCount: 6,
      changed: true,
    });
    expect(byId.get(cancelled.id)).toMatchObject({
      status: "CANCELLED",
      changed: false,
    });

    expect(
      (await prisma.enrollment.findUnique({ where: { id: cancelled.id } }))
        ?.status
    ).toBe("CANCELLED");
  });

  it("is a no-op for a course nobody is enrolled in", async () => {
    const { course } = await createCourseWithLessons(2);
    expect(await reconcileCourseEnrollments(course.id)).toEqual([]);
  });
});
