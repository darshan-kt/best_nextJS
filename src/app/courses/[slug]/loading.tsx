import { Skeleton } from "@/components/ui/skeleton";
import { PageShell } from "@/components/shared/page-shell";

/**
 * Loading UI for the course detail route (§28). Mirrors the real page's
 * structure — including the restyled header's actual heights — so the
 * layout does not shift when content arrives.
 */
export default function CourseDetailLoading() {
  return (
    <PageShell width="narrow" className="gap-10" aria-hidden="true">
      <Skeleton className="h-control-sm w-32" />

      <div className="flex flex-col gap-4">
        <Skeleton className="h-9 w-3/4 sm:h-11" />
        <Skeleton className="h-7 w-2/3" />
        <Skeleton className="h-5 w-64" />
      </div>

      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-11/12" />
      </div>

      <Skeleton className="h-24 w-full rounded-xl" />

      <div className="flex flex-col gap-4">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    </PageShell>
  );
}
