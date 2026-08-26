import Link from "next/link";
import { SearchX } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/shared/page-shell";

/**
 * Global 404 (§28, Milestone 12). Next.js renders this for any unmatched
 * route, and any route that calls `notFound()` from `next/navigation`.
 *
 * Mirrors `forbidden.tsx`'s layout deliberately — both are "you can't stay
 * here" boundaries and should read as the same family, not two designs
 * for the same kind of dead end (§21).
 */
export default function NotFound() {
  return (
    <PageShell width="focus" centered className="items-center gap-6 text-center">
      <div
        className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground"
        aria-hidden="true"
      >
        <SearchX className="size-6" />
      </div>

      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-title-sm font-semibold text-balance text-foreground">
          Page not found
        </h1>
        <p className="text-body-sm text-pretty text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist or may have
          moved.
        </p>
      </div>

      <Button asChild>
        <Link href="/dashboard">Back to dashboard</Link>
      </Button>
    </PageShell>
  );
}
