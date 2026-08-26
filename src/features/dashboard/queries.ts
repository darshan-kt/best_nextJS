import type { Actor } from "@/features/auth/policy";
import type { EnrollmentStatus } from "@/db/generated/enums";
import { getPublishedLessonsForCourses } from "@/features/courses/queries";
import { getEnrollmentsForUser } from "@/features/enrollment/queries";
import { getCompletedLessonIdsByEnrollments } from "@/features/progress/queries";
import { deriveCourseProgress } from "./derive-course-progress";

/**
 * The student dashboard's read (application layer, §5, §44 Milestone 9).
 *
 * Every enrolled course, with its progress, in three queries total —
 * `getEnrollmentsForUser`, `getPublishedLessonsForCourses`, and
 * `getCompletedLessonIdsByEnrollments` — regardless of how many courses the
 * student is enrolled in. None of them loop per-enrollment; the per-course
 * assembly below is in-memory `Map` lookups, not additional round trips
 * (§26, §42).
 *
 * `actor` rather than a bare `userId`: this only ever renders one person's
 * own enrollments (there is no "view someone else's dashboard" concept),
 * so ownership is structural — `getEnrollmentsForUser(actor.id)` cannot
 * return another user's row — and there is nothing for `can()` to gate
 * here, the same reasoning `getEnrollment` already uses.
 */

export interface CourseDashboardEntry {
  enrollmentId: string;
  courseSlug: string;
  courseTitle: string;
  courseSubtitle: string | null;
  status: EnrollmentStatus;
  completedLessonCount: number;
  totalLessonCount: number;
  nextLessonSlug: string | null;
}

export async function getStudentDashboard(
  actor: Actor
): Promise<CourseDashboardEntry[]> {
  const enrollments = await getEnrollmentsForUser(actor.id);

  if (enrollments.length === 0) {
    return [];
  }

  const [lessonsByCourseId, completedByEnrollmentId] = await Promise.all([
    getPublishedLessonsForCourses(enrollments.map((e) => e.course.id)),
    getCompletedLessonIdsByEnrollments(enrollments.map((e) => e.id)),
  ]);

  const entries = enrollments.map((enrollment): CourseDashboardEntry => {
    const lessons = lessonsByCourseId.get(enrollment.course.id) ?? [];
    const completedLessonIds =
      completedByEnrollmentId.get(enrollment.id) ?? new Set<string>();

    const { completedLessonCount, totalLessonCount, nextLessonSlug } =
      deriveCourseProgress(lessons, completedLessonIds);

    return {
      enrollmentId: enrollment.id,
      courseSlug: enrollment.course.slug,
      courseTitle: enrollment.course.title,
      courseSubtitle: enrollment.course.subtitle,
      status: enrollment.status,
      completedLessonCount,
      totalLessonCount,
      // A CANCELLED or fully-complete enrollment has no "continue" target —
      // the card renders a Review/Browse action instead (see
      // `CourseProgressCard`), not a link into the player.
      nextLessonSlug: enrollment.status === "ACTIVE" ? nextLessonSlug : null,
    };
  });

  // CANCELLED enrollments sort to the bottom — nothing left to act on, so
  // they shouldn't compete with active/completed courses for the top of
  // the list. `Array.prototype.sort` is a stable sort (guaranteed by the
  // spec since ES2019), so this only moves CANCELLED entries; the
  // enrolledAt-desc order `getEnrollmentsForUser` already applied is
  // preserved within each group.
  return entries.sort(
    (a, b) => Number(a.status === "CANCELLED") - Number(b.status === "CANCELLED")
  );
}
