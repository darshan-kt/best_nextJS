import type { Metadata } from "next";
import Link from "next/link";
import { forbidden, notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PageHeader, PageShell } from "@/components/shared/page-shell";
import { can } from "@/features/auth/policy";
import { requireUser } from "@/features/auth/session";
import { CurriculumOutline } from "@/features/courses/components/curriculum-outline";
import { getCourseWithCurriculum } from "@/features/courses/queries";
import { getEnrollment } from "@/features/enrollment/queries";
import { CourseProgress } from "@/features/progress/components/course-progress";
import { getCompletedLessonIds } from "@/features/progress/queries";

export const metadata: Metadata = {
  title: "Course content · LMS Platform",
};

/**
 * Enrollment-gated course content (§12).
 *
 * The lesson player itself is Milestone 6. What matters here — and what
 * is not scaffolding — is the gate: authentication, then a `can()` check
 * against the actor's real enrollment row, performed on the server before
 * any content is rendered. Milestone 6 replaces what is below the check,
 * not the check itself.
 *
 * The authorization is deliberately not in middleware. Middleware runs
 * before the request reaches the route and has repeatedly proven to be a
 * bypassable place to put an authorization boundary; the authoritative
 * check belongs next to the data access.
 */
export default async function CourseLearnPage({
  params,
}: PageProps<"/courses/[slug]/learn">) {
  const { slug } = await params;

  // Anonymous visitors are redirected to sign in and returned here
  // afterwards, rather than being shown a 403 they cannot act on.
  const actor = await requireUser(`/courses/${slug}/learn`);
  const course = await getCourseWithCurriculum(slug, actor);

  if (!course) {
    notFound();
  }

  const enrollment = await getEnrollment(actor.id, course.id);

  // A signed-in user who is not enrolled gets a real 403. Not a redirect
  // to the detail page — that would hide the fact that the request was
  // refused — and not a rendered "please enroll" screen in place of the
  // content, which would make the boundary a matter of what this component
  // chose to draw.
  if (
    !can(actor, {
      type: "course:learn",
      course: course.policySubject,
      enrollment,
    })
  ) {
    forbidden();
  }

  // Same check `markLessonComplete` gates on — an instructor or moderator
  // reaching this page via the `course:learn` bypass above has no
  // enrollment row and therefore no progress to show.
  const canViewProgress = can(actor, { type: "progress:view", enrollment });
  const completedLessonIds = canViewProgress
    ? await getCompletedLessonIds(enrollment?.id ?? null)
    : new Set<string>();

  return (
    <PageShell width="narrow">
      <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit">
        <Link href={`/courses/${slug}`}>
          <ArrowLeft aria-hidden="true" />
          Course overview
        </Link>
      </Button>

      <PageHeader title={course.title} description="Pick a lesson to begin.">
        {canViewProgress ? (
          <CourseProgress
            completed={completedLessonIds.size}
            total={course.lessonCount}
          />
        ) : null}
      </PageHeader>

      <CurriculumOutline
        sections={course.sections}
        unlocked
        courseSlug={slug}
        completedLessonIds={completedLessonIds}
      />
    </PageShell>
  );
}
