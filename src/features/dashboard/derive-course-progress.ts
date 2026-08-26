/**
 * Per-course progress derivation for the student dashboard (§44, Milestone
 * 9). Pure and framework-free, like `learning/navigation.ts` beside it — no
 * Prisma, no request — so it is unit-testable without a database and reused
 * identically wherever "how far has this learner gotten" needs answering.
 *
 * "Continue learning" targets the first incomplete lesson in curriculum
 * order. There is no `lastAccessedAt` anywhere in the schema, and this is
 * the only reading of "continue" that doesn't require guessing at one —
 * every LMS that lacks a resume-position defaults to this.
 */

export interface CourseProgressLesson {
  id: string;
  slug: string;
}

export interface CourseProgressDerivation {
  completedLessonCount: number;
  totalLessonCount: number;
  /** Null when every published lesson is complete, or there are none. */
  nextLessonSlug: string | null;
}

export function deriveCourseProgress(
  lessons: readonly CourseProgressLesson[],
  completedLessonIds: ReadonlySet<string>
): CourseProgressDerivation {
  const totalLessonCount = lessons.length;
  const completedLessonCount = lessons.filter((lesson) =>
    completedLessonIds.has(lesson.id)
  ).length;
  const nextLesson = lessons.find(
    (lesson) => !completedLessonIds.has(lesson.id)
  );

  return {
    completedLessonCount,
    totalLessonCount,
    nextLessonSlug: nextLesson?.slug ?? null,
  };
}
