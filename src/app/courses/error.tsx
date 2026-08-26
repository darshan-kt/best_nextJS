"use client";

import { useEffect } from "react";

import { logger } from "@/lib/logger";
import { ErrorState } from "@/components/shared/error-state";
import { PageHeader, PageShell } from "@/components/shared/page-shell";

/**
 * Catalogue error boundary (§28).
 *
 * Must be a Client Component — React needs an interactive boundary to
 * offer `reset()`, which re-runs the failed server render in place rather
 * than making the user reload the page.
 *
 * The message is deliberately generic. The user is told what to do next;
 * the full stack trace is already in the server logs via Next's own
 * automatic server-side logging — this call is a client-side breadcrumb
 * carrying only `digest`, the id that correlates the two (§29).
 *
 * The shell comes from `PageShell`/`PageHeader` rather than being copied
 * from `page.tsx` by hand, so the heading does not sit two pixels off the
 * heading on the page it replaces.
 */
export default function CoursesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error("failed to render course catalogue", {
      scope: "catalog",
      digest: error.digest,
      message: error.message,
    });
  }, [error]);

  return (
    <PageShell>
      <PageHeader title="Courses" />

      <ErrorState
        title="We couldn't load the catalogue"
        description="Something went wrong on our side. Your place in the catalogue hasn't been lost — try again in a moment."
        onRetry={reset}
      />
    </PageShell>
  );
}
