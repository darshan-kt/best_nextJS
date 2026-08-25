"use client";

import { useEffect } from "react";

import { ErrorState } from "@/components/shared/error-state";

/**
 * Catalogue error boundary (§28).
 *
 * Must be a Client Component — React needs an interactive boundary to
 * offer `reset()`, which re-runs the failed server render in place rather
 * than making the user reload the page.
 *
 * The message is deliberately generic. The user is told what to do next;
 * the actual error goes to the server logs, where it is useful without
 * leaking internals such as connection strings or stack traces (§29).
 */
export default function CoursesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Structured logging replaces this once observability is wired up in
    // Milestone 12. `digest` is the id that correlates this render with
    // the full server-side stack trace.
    console.error("[catalog] failed to render course catalogue", {
      digest: error.digest,
      message: error.message,
    });
  }, [error]);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-6 py-12 sm:px-10 sm:py-16">
      <header className="flex flex-col gap-2">
        <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Courses
        </h1>
      </header>

      <ErrorState
        title="We couldn't load the catalogue"
        description="Something went wrong on our side. Your place in the catalogue hasn't been lost — try again in a moment."
        onRetry={reset}
      />
    </div>
  );
}
