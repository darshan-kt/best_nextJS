"use client";

import { useEffect } from "react";

import { logger } from "@/lib/logger";
import { ErrorState } from "@/components/shared/error-state";
import { PageShell } from "@/components/shared/page-shell";

/**
 * Root error boundary (§28, Milestone 12).
 *
 * Catches anything thrown below the root layout that a more specific
 * `error.tsx` (courses, courses/[slug]) doesn't already handle — e.g.
 * `/dashboard`, `/admin`, `/(auth)`. Without this, those routes fell
 * through to Next's default error screen, which is fine in development
 * but exposes a stack trace nobody outside the team should see (§29).
 *
 * Must stay a Client Component: `reset()` re-runs the failed render in
 * place, which only an interactive boundary can offer.
 */
export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error("unhandled route error", {
      scope: "root",
      digest: error.digest,
      message: error.message,
    });
  }, [error]);

  return (
    <PageShell width="focus" centered className="items-center gap-6 text-center">
      <ErrorState
        title="Something went wrong"
        description="We hit a snag loading this page. Nothing you've done has been lost — try again in a moment."
        onRetry={reset}
      />
    </PageShell>
  );
}
