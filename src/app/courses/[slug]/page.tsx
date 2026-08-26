import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Clock,
  GraduationCap,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageShell } from "@/components/shared/page-shell";
import { SIGN_IN_PATH } from "@/features/auth/config";
import { can } from "@/features/auth/policy";
import { getCurrentActor } from "@/features/auth/session";
import { CurriculumOutline } from "@/features/courses/components/curriculum-outline";
import { getCourseWithCurriculum } from "@/features/courses/queries";
import { EnrollButton } from "@/features/enrollment/components/enroll-button";
import { getEnrollment } from "@/features/enrollment/queries";
import { CourseProgress } from "@/features/progress/components/course-progress";
import { getCompletedLessonIds } from "@/features/progress/queries";

/**
 * Course detail (§44, Milestone 5).
 *
 * Renders three distinct states — anonymous, signed in but not enrolled,
 * and enrolled — from a single server render. None of them is a
 * client-side branch: what a visitor may do is decided on the server by
 * `can()`, and the markup follows from that decision rather than the other
 * way round (§12).
 */

/**
 * `generateMetadata` and the component both need this, and Next.js calls
 * them separately. `cache()` collapses that into one query per request.
 */
const loadPage = cache(async (slug: string) => {
  const actor = await getCurrentActor();
  const course = await getCourseWithCurriculum(slug, actor);

  if (!course) {
    return null;
  }

  const enrollment = await getEnrollment(actor?.id ?? null, course.id);

  return { actor, course, enrollment };
});

export async function generateMetadata({
  params,
}: PageProps<"/courses/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const data = await loadPage(slug);

  if (!data) {
    return { title: "Course not found · LMS Platform" };
  }

  return {
    title: `${data.course.title} · LMS Platform`,
    description: data.course.subtitle ?? undefined,
  };
}

export default async function CourseDetailPage({
  params,
}: PageProps<"/courses/[slug]">) {
  const { slug } = await params;
  const data = await loadPage(slug);

  // Missing and forbidden collapse into the same response, so slug probing
  // cannot reveal which private courses exist (§29).
  if (!data) {
    notFound();
  }

  const { actor, course, enrollment } = data;

  // The single authorization decision behind everything below.
  const canLearn = can(actor, {
    type: "course:learn",
    course: course.policySubject,
    enrollment,
  });

  const isEnrolled =
    enrollment?.status === "ACTIVE" || enrollment?.status === "COMPLETED";

  // `progress:view` is the same ownership-and-liveness check `markLessonComplete`
  // gates on — an instructor or moderator previewing the course has no
  // enrollment row and therefore no progress to view, regardless of `canLearn`.
  const canViewProgress = can(actor, { type: "progress:view", enrollment });
  const completedLessonIds = canViewProgress
    ? await getCompletedLessonIds(enrollment?.id ?? null)
    : new Set<string>();

  return (
    <PageShell width="narrow" className="gap-10">
      <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit">
        <Link href="/courses">
          <ArrowLeft aria-hidden="true" />
          All courses
        </Link>
      </Button>

      <header className="flex flex-col gap-4">
        {isEnrolled ? (
          <Badge variant="accent" className="w-fit">
            <CheckCircle2 aria-hidden="true" />
            {enrollment?.status === "COMPLETED" ? "Completed" : "Enrolled"}
          </Badge>
        ) : null}

        <h1 className="font-heading text-title text-balance text-foreground sm:text-title-lg">
          {course.title}
        </h1>

        {course.subtitle ? (
          <p className="text-lede text-pretty text-muted-foreground">
            {course.subtitle}
          </p>
        ) : null}

        <dl className="flex flex-wrap items-center gap-x-6 gap-y-2 text-body-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <dt className="sr-only">Instructor</dt>
            <GraduationCap className="size-4" aria-hidden="true" />
            <dd>{course.instructor.name ?? "The course team"}</dd>
          </div>

          <div className="flex items-center gap-1.5">
            <dt className="sr-only">Lessons</dt>
            <BookOpen className="size-4" aria-hidden="true" />
            <dd>
              {course.lessonCount}{" "}
              {course.lessonCount === 1 ? "lesson" : "lessons"}
            </dd>
          </div>

          {course.totalDurationMinutes > 0 ? (
            <div className="flex items-center gap-1.5">
              <dt className="sr-only">Total length</dt>
              <Clock className="size-4" aria-hidden="true" />
              <dd>{Math.round(course.totalDurationMinutes / 60)} hours</dd>
            </div>
          ) : null}
        </dl>
      </header>

      {course.description ? (
        <p className="max-w-2xl text-pretty text-body leading-relaxed text-foreground">
          {course.description}
        </p>
      ) : null}

      <EnrollmentPanel
        slug={course.slug}
        signedIn={actor !== null}
        canLearn={canLearn}
        isEnrolled={isEnrolled}
        completedLessonCount={completedLessonIds.size}
        totalLessonCount={course.lessonCount}
      />

      <section className="flex flex-col gap-4">
        <h2 className="font-heading text-title-sm font-semibold text-foreground">
          Curriculum
        </h2>

        <CurriculumOutline
          sections={course.sections}
          unlocked={canLearn}
          completedLessonIds={completedLessonIds}
        />
      </section>
    </PageShell>
  );
}

/**
 * The call to action, which differs by viewer (§28 — every state a user
 * can be in gets deliberate treatment, not a disabled button).
 *
 * A `Card` rather than a hand-rolled `rounded-xl bg-muted/40 ring-1
 * ring-foreground/10` div — that combination was written fresh on this
 * page and matched nothing else that carries a border and a muted fill
 * (§21).
 */
function EnrollmentPanel({
  slug,
  signedIn,
  canLearn,
  isEnrolled,
  completedLessonCount,
  totalLessonCount,
}: {
  slug: string;
  signedIn: boolean;
  canLearn: boolean;
  isEnrolled: boolean;
  completedLessonCount: number;
  totalLessonCount: number;
}) {
  // Enrolled learners, and the instructors and moderators who reach the
  // material without enrolling, all get the same entry point.
  if (canLearn) {
    return (
      <Card className="bg-muted/40">
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-body-sm text-muted-foreground">
              {isEnrolled
                ? "You have full access to this course."
                : "You can preview this course as its instructor or a moderator."}
            </p>

            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link href={`/courses/${slug}/learn`}>Continue learning</Link>
            </Button>
          </div>

          {/* Only a learner's own enrollment has progress to show — an
              instructor or moderator previewing the course has none. */}
          {isEnrolled ? (
            <CourseProgress
              completed={completedLessonCount}
              total={totalLessonCount}
            />
          ) : null}
        </CardContent>
      </Card>
    );
  }

  // Signed out. The button is a link to sign-in rather than a disabled
  // control: the visitor can act on it, and they come back here afterwards.
  if (!signedIn) {
    return (
      <Card className="bg-muted/40">
        <CardContent className="flex flex-col gap-4">
          <p className="text-body-sm text-muted-foreground">
            Sign in to enroll and start learning.
          </p>

          <Button asChild size="lg" className="w-full sm:w-fit">
            <Link
              href={`${SIGN_IN_PATH}?callbackUrl=${encodeURIComponent(`/courses/${slug}`)}`}
            >
              Sign in to enroll
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-muted/40">
      <CardContent className="flex flex-col gap-4">
        <p className="text-body-sm text-muted-foreground">
          Enroll to unlock every lesson in this course.
        </p>

        <EnrollButton slug={slug} />
      </CardContent>
    </Card>
  );
}
