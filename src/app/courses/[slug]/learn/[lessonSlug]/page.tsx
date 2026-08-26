import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { forbidden, notFound } from "next/navigation";
import { ArrowLeft, Clock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/shared/page-shell";
import { can } from "@/features/auth/policy";
import { requireUser } from "@/features/auth/session";
import { getCourseWithCurriculum } from "@/features/courses/queries";
import { getEnrollment } from "@/features/enrollment/queries";
import { ChatEntry } from "@/features/chat/components/chat-entry";
import { BlockRenderer } from "@/features/learning/components/block-renderer";
import { LessonNav } from "@/features/learning/components/lesson-nav";
import { findLessonNavigation, flattenLessons } from "@/features/learning/navigation";
import { getLessonContentBlocks } from "@/features/learning/queries";
import { MarkCompleteButton } from "@/features/progress/components/mark-complete-button";
import { getCompletedLessonIds } from "@/features/progress/queries";

/**
 * The lesson player (§44, Milestone 6).
 *
 * Replaces the "pick a lesson" placeholder that stood at this route
 * through Milestone 5. The course-level gate at `/courses/[slug]/learn`
 * is untouched — it still exists to hand a learner into curriculum
 * *browsing*. This route is a separate authorization boundary for
 * curriculum *content*, and re-runs the full check independently:
 * `requireUser` → `getEnrollment` → `can()`, exactly as the parent gate
 * does, rather than assuming a visitor who reached this URL must have
 * passed through it. A bookmarked or shared lesson URL, hit directly, is
 * re-verified the same as a click from the outline (§12).
 *
 * Milestone 7 adds completion: the actor's own enrollment is re-resolved
 * here (same call already made for the `course:learn` check) and gated
 * again through `progress:view` before any completion state is fetched —
 * an instructor or moderator reaching this page via the `course:learn`
 * bypass has no enrollment row and gets no completion UI at all, not a
 * disabled one.
 *
 * Milestone 8 adds real quiz-taking — the same resolved `enrollment` is
 * passed to `BlockRenderer` as `quizContext` so each `QUIZ` block can run
 * its own `quiz:attempt` check without re-querying enrollment itself.
 *
 * Milestone 10 adds the course assistant entry point (`ChatEntry`) beside
 * the back-to-course button — part of this lesson page's persistent chrome,
 * not tied to a specific content block, since it answers questions about
 * the whole course as well as the current lesson. It is not yet wired into
 * the `/learn` curriculum overview or the course detail page; only reachable
 * from within an active lesson.
 *
 * What is explicitly *not* here: no real exercise submission — EXERCISE
 * blocks still render as a labeled placeholder (Milestone 9). No
 * block-level progress — only whole-lesson completion exists (§35; see the
 * `LessonProgress` schema comment). Passing a quiz does not affect lesson
 * completion — the two are deliberately independent this milestone (see
 * `submit-quiz-attempt.ts`).
 */

/**
 * `generateMetadata` and the page component both need this, and Next.js
 * calls them separately. `cache()` collapses that into one query chain per
 * request (mirrors the same fix on `/courses/[slug]/page.tsx`'s `loadPage`).
 */
const loadLesson = cache(async (slug: string, lessonSlug: string) => {
  const actor = await requireUser(`/courses/${slug}/learn/${lessonSlug}`);
  const course = await getCourseWithCurriculum(slug, actor);

  if (!course) {
    return { notFound: true as const };
  }

  const lessons = flattenLessons(course.sections);
  const navigation = findLessonNavigation(lessons, lessonSlug);

  if (!navigation) {
    return { notFound: true as const };
  }

  // Kicked off alongside the enrollment/authorization check rather than
  // after it: content-block content is only ever *used* once `canLearn` is
  // confirmed below, so starting the fetch early costs nothing on the
  // forbidden path (the promise is simply discarded) and saves a round
  // trip on the common, authorized path.
  const blocksPromise = getLessonContentBlocks(navigation.current.id);

  const enrollment = await getEnrollment(actor.id, course.id);
  const canLearn = can(actor, {
    type: "course:learn",
    course: course.policySubject,
    enrollment,
  });

  if (!canLearn) {
    return { forbidden: true as const };
  }

  const blocks = await blocksPromise;

  const canViewProgress = can(actor, { type: "progress:view", enrollment });
  const isCompleted = canViewProgress
    ? (await getCompletedLessonIds(enrollment?.id ?? null)).has(
        navigation.current.id
      )
    : false;

  return {
    actor,
    enrollment,
    course,
    navigation,
    blocks,
    canViewProgress,
    isCompleted,
  };
});

export async function generateMetadata({
  params,
}: PageProps<"/courses/[slug]/learn/[lessonSlug]">): Promise<Metadata> {
  const { slug, lessonSlug } = await params;
  const data = await loadLesson(slug, lessonSlug);

  if ("notFound" in data || "forbidden" in data) {
    return { title: "Course content · LMS Platform" };
  }

  return { title: `${data.navigation.current.title} · LMS Platform` };
}

export default async function LessonPlayerPage({
  params,
}: PageProps<"/courses/[slug]/learn/[lessonSlug]">) {
  const { slug, lessonSlug } = await params;
  const data = await loadLesson(slug, lessonSlug);

  // Lesson-not-found is intentionally distinct from course-not-found (both
  // of which land here via the same `notFound()` boundary): an unpublished
  // or nonexistent lesson slug inside a real course, versus a course that
  // doesn't exist at all. Both render the same 404 — the point of merging
  // them isn't secrecy here the way it is for private courses, it's that
  // neither case has more to say to the visitor than "not found" (§26).
  if ("notFound" in data) {
    notFound();
  }

  // Defense in depth (§12): the parent `/learn` gate already refuses a
  // non-enrolled visitor, so reaching this branch means either that check
  // was bypassed by a direct link, or the visitor's access changed (an
  // enrollment was cancelled) between page loads.
  if ("forbidden" in data) {
    forbidden();
  }

  const { actor, enrollment, course, navigation, blocks, canViewProgress, isCompleted } =
    data;
  const { current, previous, next, position, total } = navigation;

  return (
    <PageShell width="narrow" className="gap-8">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit">
            <Link href={`/courses/${slug}/learn`}>
              <ArrowLeft aria-hidden="true" />
              {course.title}
            </Link>
          </Button>

          <ChatEntry
            actor={actor}
            enrollment={enrollment}
            courseId={course.id}
            courseSlug={slug}
            lessonSlug={lessonSlug}
          />
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-caption text-muted-foreground">
            Lesson {position} of {total}
          </span>

          <h1 className="font-heading text-title text-balance text-foreground sm:text-title-lg">
            {current.title}
          </h1>

          {current.durationMinutes ? (
            <div className="flex items-center gap-1.5 text-body-sm text-muted-foreground">
              <Clock className="size-4" aria-hidden="true" />
              <span>{current.durationMinutes} min</span>
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-6">
        {blocks.length > 0 ? (
          blocks.map((block) => (
            <BlockRenderer
              key={block.id}
              block={block}
              quizContext={{
                actor,
                enrollment,
                courseId: course.id,
                courseSlug: slug,
                lessonSlug,
              }}
            />
          ))
        ) : (
          <p className="text-body-sm text-muted-foreground">
            This lesson doesn&apos;t have any content yet.
          </p>
        )}
      </div>

      {canViewProgress ? (
        <MarkCompleteButton
          courseSlug={slug}
          lessonSlug={lessonSlug}
          completed={isCompleted}
        />
      ) : null}

      <LessonNav
        courseSlug={slug}
        navigation={{ current, previous, next, position, total }}
      />
    </PageShell>
  );
}
