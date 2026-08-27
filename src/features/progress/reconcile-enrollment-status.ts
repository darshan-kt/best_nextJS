import { prisma } from "@/db/client";

/**
 * Use case: keep `Enrollment.status` consistent with actual progress (§5,
 * application layer).
 *
 * `COMPLETED` was originally written once, by `markLessonComplete`, and
 * never revisited — that file carried the note "one-way in this milestone:
 * nothing un-marks a lesson, so nothing needs to move an enrollment back
 * out of COMPLETED either." True only while a course's published-lesson
 * count is fixed. It isn't: the ROS 2 course lands module by module, so a
 * learner who finished every lesson at 3/3 kept a `COMPLETED` status (and
 * a "Completed" badge) while their real progress had become 3/6.
 *
 * So completion is treated here as a *derived* property with a single
 * definition — `completed >= total, total > 0` — rather than a latch. This
 * module owns that definition; `markLessonComplete` and the reconciliation
 * script both defer to it instead of each re-deciding what "complete"
 * means (§34).
 *
 * `CANCELLED` is never produced or overwritten. Cancelling is a
 * deliberate act by a person, not something derived from a lesson count,
 * and reviving a cancelled enrollment because its course happens to be
 * fully read would be wrong.
 */

export type ReconcilableStatus = "ACTIVE" | "COMPLETED" | "CANCELLED";

export interface ReconcileOutcome {
  enrollmentId: string;
  previousStatus: ReconcilableStatus;
  status: ReconcilableStatus;
  completedLessonCount: number;
  totalLessonCount: number;
  /** True exactly when this call wrote to the row. */
  changed: boolean;
}

/**
 * The rule itself, with no I/O — the part worth reading and unit-testing.
 *
 * `totalLessonCount > 0` is required, not incidental. The previous
 * `completed >= total` comparison made a course with no published lessons
 * vacuously complete (`0 >= 0`), which would now be reachable by the
 * reconciliation pass below in a way it never was from `markLessonComplete`
 * (you cannot mark a lesson complete in a course that has none).
 */
export function deriveEnrollmentStatus(
  current: ReconcilableStatus,
  completedLessonCount: number,
  totalLessonCount: number
): ReconcilableStatus {
  if (current === "CANCELLED") {
    return "CANCELLED";
  }

  return totalLessonCount > 0 && completedLessonCount >= totalLessonCount
    ? "COMPLETED"
    : "ACTIVE";
}

/**
 * Progress counted against *currently published* lessons only.
 *
 * Deliberately not `count({ where: { enrollmentId } })`, which is what
 * `markLessonComplete` used to do: that counts every `LessonProgress` row
 * the enrollment has ever accumulated, including rows for lessons since
 * unpublished or moved. Compared against a published-only total, it can
 * report more completions than the course has lessons.
 */
async function countCompletedPublishedLessons(
  enrollmentId: string,
  courseId: string
): Promise<number> {
  return prisma.lessonProgress.count({
    where: {
      enrollmentId,
      lesson: { isPublished: true, section: { courseId } },
    },
  });
}

async function countPublishedLessons(courseId: string): Promise<number> {
  return prisma.lesson.count({
    where: { isPublished: true, section: { courseId } },
  });
}

function completedAtFor(
  status: ReconcilableStatus,
  existing: Date | null
): Date | null {
  if (status !== "COMPLETED") {
    // Clearing this matters: a `completedAt` left behind on an enrollment
    // that is no longer complete is a timestamp asserting something untrue,
    // and it is the field any future certificate or analytics work would
    // trust.
    return null;
  }

  return existing ?? new Date();
}

/**
 * Reconcile one enrollment. Returns `null` when the enrollment does not
 * exist — a caller asking about a row that isn't there gets an answer, not
 * a thrown error (§28), matching `markLessonComplete`'s own shape.
 */
export async function reconcileEnrollmentStatus(
  enrollmentId: string
): Promise<ReconcileOutcome | null> {
  const enrollment = await prisma.enrollment.findUnique({
    where: { id: enrollmentId },
    select: { id: true, courseId: true, status: true, completedAt: true },
  });

  if (!enrollment) {
    return null;
  }

  const [completedLessonCount, totalLessonCount] = await Promise.all([
    countCompletedPublishedLessons(enrollment.id, enrollment.courseId),
    countPublishedLessons(enrollment.courseId),
  ]);

  return applyReconciliation(enrollment, completedLessonCount, totalLessonCount);
}

async function applyReconciliation(
  enrollment: {
    id: string;
    status: ReconcilableStatus;
    completedAt: Date | null;
  },
  completedLessonCount: number,
  totalLessonCount: number
): Promise<ReconcileOutcome> {
  const status = deriveEnrollmentStatus(
    enrollment.status,
    completedLessonCount,
    totalLessonCount
  );
  const completedAt = completedAtFor(status, enrollment.completedAt);

  const changed =
    status !== enrollment.status ||
    completedAt?.getTime() !== enrollment.completedAt?.getTime();

  if (changed) {
    await prisma.enrollment.update({
      where: { id: enrollment.id },
      data: { status, completedAt },
    });
  }

  return {
    enrollmentId: enrollment.id,
    previousStatus: enrollment.status,
    status,
    completedLessonCount,
    totalLessonCount,
    changed,
  };
}

/**
 * Reconcile every enrollment in one course — the entry point for "this
 * course's content changed."
 *
 * Batched rather than looping `reconcileEnrollmentStatus` per enrollment:
 * the published-lesson total is one value for the whole course, and the
 * per-enrollment completion counts come back in a single `groupBy`. That
 * keeps this at a constant three queries plus one write per *changed* row,
 * instead of the 2N reads a naive loop would issue (§10, §26) — which
 * matters because this runs on every content change, against a course
 * that may have many thousands of enrollments.
 */
export async function reconcileCourseEnrollments(
  courseId: string
): Promise<ReconcileOutcome[]> {
  const [enrollments, totalLessonCount] = await Promise.all([
    prisma.enrollment.findMany({
      where: { courseId },
      select: { id: true, status: true, completedAt: true },
    }),
    countPublishedLessons(courseId),
  ]);

  if (enrollments.length === 0) {
    return [];
  }

  const grouped = await prisma.lessonProgress.groupBy({
    by: ["enrollmentId"],
    where: {
      enrollmentId: { in: enrollments.map((row) => row.id) },
      lesson: { isPublished: true, section: { courseId } },
    },
    _count: { _all: true },
  });

  const completedByEnrollment = new Map(
    grouped.map((row) => [row.enrollmentId, row._count._all])
  );

  const outcomes: ReconcileOutcome[] = [];

  for (const enrollment of enrollments) {
    outcomes.push(
      await applyReconciliation(
        enrollment,
        completedByEnrollment.get(enrollment.id) ?? 0,
        totalLessonCount
      )
    );
  }

  return outcomes;
}
