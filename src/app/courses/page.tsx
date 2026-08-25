import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, SearchX } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { getCurrentActor } from "@/features/auth/session";
import { CatalogSearch } from "@/features/courses/components/catalog-search";
import { CourseCard } from "@/features/courses/components/course-card";
import { CourseGridSkeleton } from "@/features/courses/components/course-card-skeleton";
import { listCatalogCourses } from "@/features/courses/queries";
import {
  catalogHref,
  parseCatalogSearchParams,
  type CatalogSearchParams,
} from "@/features/courses/search-params";

export const metadata: Metadata = {
  title: "Courses · LMS Platform",
  description: "Browse the course catalogue.",
};

/**
 * The course catalogue (§44, Milestone 4).
 *
 * Open to everyone, signed in or not: discovery is what turns a visitor
 * into a learner, and requiring an account to see what is on offer would
 * be a product mistake. Access is still a policy decision, not an absence
 * of one — see `features/courses/queries.ts`, where every row is checked
 * through `can()`.
 *
 * Rendering strategy (§7): the page shell — heading, search field — is
 * rendered and sent immediately, while the database query streams in
 * behind a Suspense boundary. No data is fetched on the client, so there
 * is no request waterfall and no loading spinner that only starts after
 * hydration.
 */
export default async function CoursesPage({
  searchParams,
}: PageProps<"/courses">) {
  const params = parseCatalogSearchParams(await searchParams);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-6 py-12 sm:px-10 sm:py-16">
      <header className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Courses
          </h1>
          <p className="max-w-2xl text-muted-foreground">
            Browse the catalogue and find something to learn next.
          </p>
        </div>

        <CatalogSearch query={params.q} />
      </header>

      {/*
        Keyed on the active search so that changing it remounts the
        boundary and shows skeletons again, rather than leaving the
        previous page's results on screen while the new query runs.
      */}
      <Suspense
        key={`${params.q ?? ""}:${params.page}`}
        fallback={<CourseGridSkeleton />}
      >
        <CatalogResults params={params} />
      </Suspense>
    </div>
  );
}

/**
 * The data-dependent half of the page, split out so that everything above
 * it can be sent to the browser before the query finishes.
 *
 * Errors thrown here — a database that is down, for instance — propagate
 * to `error.tsx` rather than being caught and rendered inline, so that the
 * boundary can offer a real retry (§28).
 */
async function CatalogResults({ params }: { params: CatalogSearchParams }) {
  const actor = await getCurrentActor();
  const { courses, hasMore } = await listCatalogCourses({
    actor,
    query: params.q,
    page: params.page,
  });

  if (courses.length === 0) {
    return <CatalogEmptyState params={params} />;
  }

  return (
    <section className="flex flex-col gap-8" aria-label="Course catalogue">
      <ul className="grid list-none gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {courses.map((course) => (
          <li key={course.id} className="flex">
            <CourseCard course={course} />
          </li>
        ))}
      </ul>

      <CatalogPagination params={params} hasMore={hasMore} />
    </section>
  );
}

/**
 * Empty states (§28).
 *
 * "No courses exist yet" and "your search matched nothing" are different
 * situations for the user and get different copy and different actions.
 * A single generic message would leave a searcher unsure whether the
 * catalogue is empty or their query was too narrow.
 */
function CatalogEmptyState({ params }: { params: CatalogSearchParams }) {
  if (params.q) {
    return (
      <EmptyState
        icon={<SearchX className="size-6" aria-hidden="true" />}
        title={`No courses match “${params.q}”`}
        description="Try a shorter or more general search term."
        action={
          <Button asChild variant="outline" size="sm">
            <Link href={catalogHref({})}>Clear search</Link>
          </Button>
        }
      />
    );
  }

  // Page 2+ of a catalogue that has since shrunk: not really "empty", just
  // past the end. Offer the way back rather than claiming there is nothing.
  if (params.page > 1) {
    return (
      <EmptyState
        icon={<BookOpen className="size-6" aria-hidden="true" />}
        title="Nothing on this page"
        description="There are fewer courses than there used to be."
        action={
          <Button asChild variant="outline" size="sm">
            <Link href={catalogHref({})}>Back to the first page</Link>
          </Button>
        }
      />
    );
  }

  return (
    <EmptyState
      icon={<BookOpen className="size-6" aria-hidden="true" />}
      title="No courses published yet"
      description="The catalogue is being built. Published courses will appear here as soon as they are ready."
    />
  );
}

/**
 * Previous/next navigation.
 *
 * Deliberately not numbered pages: that needs a `COUNT(*)` over the whole
 * catalogue on every request, and `hasMore` already answers the only
 * question this UI asks. Numbered pages can come back if the product ever
 * needs them (§39).
 */
function CatalogPagination({
  params,
  hasMore,
}: {
  params: CatalogSearchParams;
  hasMore: boolean;
}) {
  const hasPrevious = params.page > 1;

  if (!hasPrevious && !hasMore) {
    return null;
  }

  return (
    <nav
      className="flex items-center justify-between gap-4 border-t border-border pt-6"
      aria-label="Catalogue pages"
    >
      {hasPrevious ? (
        <Button asChild variant="outline" size="sm">
          <Link href={catalogHref({ q: params.q, page: params.page - 1 })}>
            Previous
          </Link>
        </Button>
      ) : (
        <span />
      )}

      <span className="text-sm text-muted-foreground" aria-current="page">
        Page {params.page}
      </span>

      {hasMore ? (
        <Button asChild variant="outline" size="sm">
          <Link href={catalogHref({ q: params.q, page: params.page + 1 })}>
            Next
          </Link>
        </Button>
      ) : (
        <span />
      )}
    </nav>
  );
}
