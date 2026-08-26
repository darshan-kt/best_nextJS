import { Skeleton } from "@/components/ui/skeleton";
import { PageShell } from "@/components/shared/page-shell";

/**
 * Loading UI for the lesson player (§28). Mirrors the real page's shape —
 * back link, eyebrow, title, a handful of content blocks, and the nav bar
 * — so the layout doesn't jump once content and the authorization check
 * resolve.
 */
export default function LessonPlayerLoading() {
  return (
    <PageShell width="narrow" className="gap-8" aria-hidden="true">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-control-sm w-40" />

        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-9 w-3/4 sm:h-11" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-11/12" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-56 w-full rounded-xl" />
      </div>

      <div className="flex items-center justify-between gap-4 border-t border-border pt-6">
        <Skeleton className="h-control w-28" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-control w-28" />
      </div>
    </PageShell>
  );
}
