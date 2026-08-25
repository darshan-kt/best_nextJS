import { Skeleton } from "@/components/ui/skeleton";
import { CourseGridSkeleton } from "@/features/courses/components/course-card-skeleton";

/**
 * Route-level loading UI (§28).
 *
 * Shown when the user *navigates to* /courses, before the page's own
 * Suspense boundary exists. Once on the page, searching and paging are
 * covered by the boundary inside `page.tsx`, which keeps the header and
 * search field on screen instead of replacing them.
 */
export default function CoursesLoading() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-6 py-12 sm:px-10 sm:py-16">
      <header className="flex flex-col gap-6" aria-hidden="true">
        <div className="flex flex-col gap-3">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-5 w-80 max-w-full" />
        </div>
        <Skeleton className="h-8 w-full max-w-md" />
      </header>

      <CourseGridSkeleton />
    </div>
  );
}
