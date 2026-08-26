import { Skeleton } from "@/components/ui/skeleton";
import { PageShell } from "@/components/shared/page-shell";
import { CourseGridSkeleton } from "@/features/courses/components/course-card-skeleton";

/**
 * Route-level loading UI (§28).
 *
 * Shown when the user *navigates to* /courses, before the page's own
 * Suspense boundary exists. Once on the page, searching and paging are
 * covered by the boundary inside `page.tsx`, which keeps the header and
 * search field on screen instead of replacing them.
 *
 * The placeholder heights track the real header's type steps — the h1 is
 * `text-title`/`sm:text-title-lg`, so the block is sized to match rather
 * than to the `h-9` it used to guess at, which shifted the grid down when
 * the real heading arrived (§26).
 */
export default function CoursesLoading() {
  return (
    <PageShell>
      <header className="flex flex-col gap-6" aria-hidden="true">
        <div className="flex flex-col gap-3">
          <Skeleton className="h-9 w-56 sm:h-11" />
          <Skeleton className="h-6 w-96 max-w-full" />
        </div>

        {/* Mirrors the search row: field plus submit button, both at the
            shared control height. */}
        <div className="flex w-full max-w-xl items-center gap-2">
          <Skeleton className="h-control flex-1" />
          <Skeleton className="h-control w-24" />
        </div>
      </header>

      <CourseGridSkeleton />
    </PageShell>
  );
}
