"use client";

import { useEffect } from "react";

import { logger } from "@/lib/logger";
import { ErrorState } from "@/components/shared/error-state";
import { PageShell } from "@/components/shared/page-shell";

/**
 * Course detail error boundary (§28).
 *
 * The message stays generic; the full stack trace is already in the
 * server logs via Next's own automatic server-side logging — this call is
 * a client-side breadcrumb carrying only `digest`, the id that correlates
 * the two (§29).
 */
export default function CourseDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error("failed to render course detail", {
      scope: "course-detail",
      digest: error.digest,
      message: error.message,
    });
  }, [error]);

  return (
    <PageShell width="narrow">
      <ErrorState
        title="We couldn't load this course"
        description="Something went wrong on our side. Please try again in a moment."
        onRetry={reset}
      />
    </PageShell>
  );
}
