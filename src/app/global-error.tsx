"use client";

import { useEffect } from "react";

import { logger } from "@/lib/logger";

/**
 * Last-resort boundary (§28, Milestone 12) — rendered only when the root
 * layout itself throws, which means fonts, `TooltipProvider`, and
 * everything else `app/layout.tsx` sets up cannot be trusted to have run.
 * React requires this file to render its own `<html>`/`<body>` for exactly
 * that reason: it replaces the root layout rather than nesting inside it.
 *
 * Deliberately uses plain inline styles instead of Tailwind classes or
 * shared components (`PageShell`, `ErrorState`) — both assume they're
 * mounted inside the root layout they're standing in for, so depending on
 * them here would let the thing that just failed take this boundary down
 * with it.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error("root layout failed to render", {
      scope: "global",
      digest: error.digest,
      message: error.message,
    });
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          display: "flex",
          minHeight: "100vh",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1.5rem",
          padding: "1.5rem",
          textAlign: "center",
          fontFamily:
            "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          color: "#0a0a0a",
          backgroundColor: "#ffffff",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 600, margin: 0 }}>
            Something went wrong
          </h1>
          <p style={{ margin: 0, maxWidth: "28rem", color: "#525252" }}>
            We hit a problem loading the app. Try reloading the page.
          </p>
        </div>
        <button
          type="button"
          onClick={() => reset()}
          style={{
            padding: "0.5rem 1.25rem",
            borderRadius: "0.5rem",
            border: "1px solid #d4d4d4",
            background: "#ffffff",
            cursor: "pointer",
            font: "inherit",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
