import type { CurriculumLesson, CurriculumSection } from "@/features/courses/queries";

/**
 * Curriculum-order lesson navigation (§11).
 *
 * Pure and framework-free by design: no Prisma, no request context. The
 * player already holds the full curriculum from `getCourseWithCurriculum`
 * (needed for the outline anyway), so prev/next is a lookup over data
 * that's already in memory rather than a second database round trip.
 */

/** Sections → lessons, in the same order the curriculum outline renders. */
export function flattenLessons(
  sections: CurriculumSection[]
): CurriculumLesson[] {
  return sections.flatMap((section) => section.lessons);
}

export interface LessonNavigation {
  current: CurriculumLesson;
  /** 1-based position for display ("Lesson 3 of 12"). */
  position: number;
  total: number;
  previous: CurriculumLesson | null;
  next: CurriculumLesson | null;
}

/**
 * Locates a lesson by slug and returns its neighbours.
 *
 * Returns `null` when the slug isn't in this course's published curriculum
 * at all — the caller treats that as "lesson not found" (§26).
 *
 * `lessons` is already scoped to one course (the caller flattens a single
 * course's curriculum), and `Lesson.slug` is enforced unique per course at
 * the database level (`@@unique([courseId, slug])`) — matching the flat,
 * course-scoped lesson player route (`/courses/[slug]/learn/[lessonSlug]`,
 * no section segment). `findIndex` can therefore only ever match at most
 * one lesson; it is not resolving a collision, there being none possible.
 */
export function findLessonNavigation(
  lessons: CurriculumLesson[],
  currentSlug: string
): LessonNavigation | null {
  const index = lessons.findIndex((lesson) => lesson.slug === currentSlug);

  if (index === -1) {
    return null;
  }

  return {
    current: lessons[index],
    position: index + 1,
    total: lessons.length,
    previous: index > 0 ? lessons[index - 1] : null,
    next: index < lessons.length - 1 ? lessons[index + 1] : null,
  };
}
