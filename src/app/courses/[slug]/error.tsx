"use client";

import { useEffect } from "react";

import { ErrorState } from "@/components/shared/error-state";
import { PageShell } from "@/components/shared/page-shell";

/**
 * Course detail error boundary (§28).
 *
 * The message stays generic; the detail goes to the server logs, where it
 * is useful without leaking internals to the user (§29). `digest`
 * correlates this render with the full server-side stack trace.
 */
export default function CourseDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[course-detail] failed to render course", {
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
