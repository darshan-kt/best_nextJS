import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading placeholder for a catalogue entry.
 *
 * Mirrors the real card's structure so the layout does not jump when
 * content arrives (§26 — layout shift is a performance defect, not a
 * cosmetic one). `aria-hidden` keeps the placeholder out of the
 * accessibility tree; the live region announcing "loading" belongs to the
 * grid, not to each individual tile (§24).
 */
export function CourseCardSkeleton() {
  return (
    <Card size="sm" className="h-full" aria-hidden="true">
      <CardHeader className="gap-2">
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-4 w-2/5" />
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-11/12" />
        <Skeleton className="h-3 w-3/5" />
      </CardContent>

      <CardFooter className="border-t border-border pt-3 pb-(--card-spacing)">
        <Skeleton className="h-3 w-24" />
      </CardFooter>
    </Card>
  );
}

/** The loading state for a full page of results. */
export function CourseGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      role="status"
      aria-label="Loading courses"
    >
      {Array.from({ length: count }, (_, index) => (
        <CourseCardSkeleton key={index} />
      ))}
    </div>
  );
}
