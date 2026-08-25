import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BookOpen } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { getCurrentActor } from "@/features/auth/session";
import { getCourseBySlug } from "@/features/courses/queries";

/**
 * Course detail — the destination every catalogue card points at.
 *
 * Intentionally minimal: curriculum, enrolment and progress belong to
 * Milestone 5. What is here is not scaffolding to be thrown away, though.
 * The load-then-authorize path below — fetch by slug, run `can()`, render
 * 404 on denial — is the shape Milestone 5 builds on, so writing it now
 * costs nothing later. A greyed-out "coming soon" card in the catalogue
 * would have been the throwaway option, and it would have made a finished
 * feature look broken.
 */

/**
 * `generateMetadata` and the component below both need the course, and
 * Next.js calls them separately. `cache()` deduplicates that into a single
 * query per request — without it, every course page would hit the database
 * twice to render one screen (§26).
 */
const loadCourse = cache(async (slug: string) => {
  const actor = await getCurrentActor();

  return getCourseBySlug(slug, actor);
});

export async function generateMetadata({
  params,
}: PageProps<"/courses/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const course = await loadCourse(slug);

  if (!course) {
    return { title: "Course not found · LMS Platform" };
  }

  return {
    title: `${course.title} · LMS Platform`,
    description: course.subtitle ?? undefined,
  };
}

export default async function CourseDetailPage({
  params,
}: PageProps<"/courses/[slug]">) {
  const { slug } = await params;
  const course = await loadCourse(slug);

  // `getCourseBySlug` returns null both for a missing course and for one
  // this viewer may not see, so an unauthorized probe cannot tell the two
  // apart (§29).
  if (!course) {
    notFound();
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-12 sm:px-10 sm:py-16">
      <Button asChild variant="ghost" size="sm" className="w-fit -ml-2">
        <Link href="/courses">
          <ArrowLeft className="size-4" aria-hidden="true" />
          All courses
        </Link>
      </Button>

      <header className="flex flex-col gap-3">
        <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          {course.title}
        </h1>

        {course.subtitle ? (
          <p className="text-lg text-muted-foreground">{course.subtitle}</p>
        ) : null}

        <p className="text-sm text-muted-foreground">
          Taught by {course.instructor.name ?? "the course team"}
        </p>
      </header>

      {course.description ? (
        <p className="max-w-2xl leading-relaxed text-foreground">
          {course.description}
        </p>
      ) : null}

      <EmptyState
        icon={<BookOpen className="size-6" aria-hidden="true" />}
        title="Curriculum coming soon"
        description="Lessons and enrolment for this course are being prepared."
      />
    </div>
  );
}
