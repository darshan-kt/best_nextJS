import { afterEach, describe, expect, it } from "vitest";

import { prisma } from "@/db/client";
import type { Actor } from "@/features/auth/policy";
import { resetDb } from "@/test/reset-db";
import { enrollStudentInCourse } from "./enroll-student";

/**
 * `enrollStudentInCourse` is the write-side counterpart to the read-side
 * access checks `course-access.test.ts` already covers — untested before
 * Milestone 11. Touches real Postgres via an idempotent upsert.
 *
 * Note on the `FORBIDDEN` failure reason: `course:enroll` in `can()` is
 * `return isOpenForSelfEnrollment(course)` — the exact same predicate the
 * `NOT_OPEN` check above it already tests, kept duplicated on purpose (see
 * `enroll-student.ts`'s comment on why domain validity and permission stay
 * separate checks even though they agree today). That means `FORBIDDEN` is
 * not reachable through this function as currently written; there is no
 * actor-shaped input that makes `course:enroll` disagree with
 * `isOpenForSelfEnrollment`. Not tested here for that reason, not because
 * it was overlooked.
 */

afterEach(async () => {
  await resetDb();
});

let n = 0;

async function createInstructor() {
  n += 1;
  return prisma.user.create({
    data: { email: `instructor-${n}@test.local`, name: "Instructor" },
  });
}

async function createStudent() {
  n += 1;
  const user = await prisma.user.create({
    data: { email: `student-${n}@test.local`, name: "Student" },
  });
  const actor: Actor = { id: user.id, roles: ["STUDENT"] };
  return { user, actor };
}

describe("enrollStudentInCourse", () => {
  it("creates a new ACTIVE enrollment for an open course", async () => {
    const instructor = await createInstructor();
    const course = await prisma.course.create({
      data: {
        slug: `course-${++n}`,
        title: "Open course",
        status: "PUBLISHED",
        visibility: "PUBLIC",
        instructorId: instructor.id,
        publishedAt: new Date(),
      },
    });
    const { actor } = await createStudent();

    const result = await enrollStudentInCourse({
      actor,
      courseSlug: course.slug,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.created).toBe(true);
    expect(result.enrollment.status).toBe("ACTIVE");

    const row = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: actor.id, courseId: course.id } },
    });
    expect(row?.status).toBe("ACTIVE");
  });

  it("is idempotent: enrolling again returns the existing row with created: false", async () => {
    const instructor = await createInstructor();
    const course = await prisma.course.create({
      data: {
        slug: `course-${++n}`,
        title: "Open course",
        status: "PUBLISHED",
        visibility: "PUBLIC",
        instructorId: instructor.id,
        publishedAt: new Date(),
      },
    });
    const { actor } = await createStudent();

    const first = await enrollStudentInCourse({ actor, courseSlug: course.slug });
    const second = await enrollStudentInCourse({ actor, courseSlug: course.slug });

    expect(first.ok && second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    expect(second.created).toBe(false);
    expect(second.enrollment.id).toBe(first.enrollment.id);

    const rows = await prisma.enrollment.findMany({
      where: { userId: actor.id, courseId: course.id },
    });
    expect(rows).toHaveLength(1);
  });

  it("reactivates a CANCELLED enrollment rather than leaving it cancelled", async () => {
    const instructor = await createInstructor();
    const course = await prisma.course.create({
      data: {
        slug: `course-${++n}`,
        title: "Open course",
        status: "PUBLISHED",
        visibility: "PUBLIC",
        instructorId: instructor.id,
        publishedAt: new Date(),
      },
    });
    const { user, actor } = await createStudent();
    await prisma.enrollment.create({
      data: {
        userId: user.id,
        courseId: course.id,
        status: "CANCELLED",
        completedAt: null,
      },
    });

    const result = await enrollStudentInCourse({
      actor,
      courseSlug: course.slug,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.enrollment.status).toBe("ACTIVE");

    const row = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: actor.id, courseId: course.id } },
    });
    expect(row?.status).toBe("ACTIVE");
    expect(row?.completedAt).toBeNull();
  });

  it("returns NOT_FOUND for a nonexistent course slug", async () => {
    const { actor } = await createStudent();

    const result = await enrollStudentInCourse({
      actor,
      courseSlug: "does-not-exist",
    });

    expect(result).toEqual({ ok: false, reason: "NOT_FOUND" });
  });

  it("returns NOT_FOUND (not NOT_OPEN) for a private course the actor cannot see — masking existence", async () => {
    const instructor = await createInstructor();
    const course = await prisma.course.create({
      data: {
        slug: `course-${++n}`,
        title: "Private course",
        status: "DRAFT",
        visibility: "PRIVATE",
        instructorId: instructor.id,
      },
    });
    const { actor } = await createStudent();

    const result = await enrollStudentInCourse({
      actor,
      courseSlug: course.slug,
    });

    expect(result).toEqual({ ok: false, reason: "NOT_FOUND" });
  });

  it("returns NOT_OPEN for a course the actor can see but that isn't accepting enrollments", async () => {
    const instructor = await createInstructor();
    const course = await prisma.course.create({
      data: {
        slug: `course-${++n}`,
        title: "Archived course",
        status: "ARCHIVED",
        visibility: "PUBLIC",
        instructorId: instructor.id,
        publishedAt: new Date(),
      },
    });
    // A moderator can view any course (course:view), including an archived
    // one — but visibility is not the same question as whether it accepts
    // enrollments, per the comment on `isOpenForSelfEnrollment`.
    const moderatorUser = await prisma.user.create({
      data: { email: `moderator-${++n}@test.local`, name: "Moderator" },
    });
    const moderator: Actor = { id: moderatorUser.id, roles: ["MODERATOR"] };

    const result = await enrollStudentInCourse({
      actor: moderator,
      courseSlug: course.slug,
    });

    expect(result).toEqual({ ok: false, reason: "NOT_OPEN" });
  });
});
