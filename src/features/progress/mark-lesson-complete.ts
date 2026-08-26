import { prisma } from "@/db/client";
import { can, type Actor } from "@/features/auth/policy";
import { getCourseWithCurriculum } from "@/features/courses/queries";
import { getEnrollment } from "@/features/enrollment/queries";
import {
  findLessonNavigation,
  flattenLessons,
} from "@/features/learning/navigation";

/**
 * Use case: mark a lesson complete (§5, application layer).
 *
 * Framework-free, like `enrollStudentInCourse` beside it — no `FormData`,
 * no `redirect()`. The Server Action in `actions.ts` is the one adapter
 * over this; that split is what makes the rule here unit-testable without
 * a request and reusable from anywhere else that ever needs it.
 *
 * Returns a discriminated result rather than throwing, for the same
 * reason `enrollStudentInCourse` does: "you can't do that" is an outcome
 * the caller renders, not a fault (§28).
 */

export type MarkLessonCompleteFailureReason = "NOT_FOUND" | "FORBIDDEN";

export interface CourseProgressSummary {
  completedLessonCount: number;
  totalLessonCount: number;
  /** True exactly when this call brought every published lesson to complete. */
  courseCompleted: boolean;
}

export type MarkLessonCompleteResult =
  | ({ ok: true } & CourseProgressSummary)
  | { ok: false; reason: MarkLessonCompleteFailureReason };

interface MarkLessonCompleteArgs {
  actor: Actor;
  courseSlug: string;
  lessonSlug: string;
}

export async function markLessonComplete({
  actor,
  courseSlug,
  lessonSlug,
}: MarkLessonCompleteArgs): Promise<MarkLessonCompleteResult> {
  // "Not found" here mirrors the lesson player's own resolution (§26): a
  // nonexistent course, a nonexistent lesson, and an unpublished lesson
  // all collapse to the same answer, because none of them has more to
  // tell the caller than "there was nothing there to mark."
  const course = await getCourseWithCurriculum(courseSlug, actor);

  if (!course) {
    return { ok: false, reason: "NOT_FOUND" };
  }

  const lessons = flattenLessons(course.sections);
  const navigation = findLessonNavigation(lessons, lessonSlug);

  if (!navigation) {
    return { ok: false, reason: "NOT_FOUND" };
  }

  const enrollment = await getEnrollment(actor.id, course.id);

  // Ownership and liveness both live in `can()`, not here — the same
  // place every other authorization decision in the app is made (§12,
  // §13). Deliberately `progress:mark`, not `course:learn`: an instructor
  // previewing their own course passes `course:learn` but has no
  // enrollment row, and there is nothing valid for a completion record to
  // attach to.
  if (!enrollment || !can(actor, { type: "progress:mark", enrollment })) {
    return { ok: false, reason: "FORBIDDEN" };
  }

  // A real compound-unique upsert — unlike the manual find-then-branch
  // Milestone 6's seed script needed for `Section`/`LessonContentBlock`,
  // `LessonProgress` has an actual natural key. Marking an already-complete
  // lesson complete again lands on the same row rather than erroring or
  // duplicating.
  await prisma.lessonProgress.upsert({
    where: {
      enrollmentId_lessonId: {
        enrollmentId: enrollment.id,
        lessonId: navigation.current.id,
      },
    },
    create: { enrollmentId: enrollment.id, lessonId: navigation.current.id },
    update: {},
  });

  const completedLessonCount = await prisma.lessonProgress.count({
    where: { enrollmentId: enrollment.id },
  });
  const totalLessonCount = course.lessonCount;
  const courseCompleted = completedLessonCount >= totalLessonCount;

  // Activates a status this codebase has carried since Milestone 5
  // (`EnrollmentStatus.COMPLETED`, and the "Completed" badge on the course
  // detail page) without anything ever setting it. One-way in this
  // milestone: nothing un-marks a lesson, so nothing needs to move an
  // enrollment back out of COMPLETED either.
  if (courseCompleted && enrollment.status !== "COMPLETED") {
    await prisma.enrollment.update({
      where: { id: enrollment.id },
      data: { status: "COMPLETED", completedAt: new Date() },
    });
  }

  return { ok: true, completedLessonCount, totalLessonCount, courseCompleted };
}
