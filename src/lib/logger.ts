/**
 * Structured logging (§28, §29 — Milestone 12).
 *
 * A thin wrapper around `console`, not an observability platform: it exists
 * so every call site emits one JSON line with a level and a timestamp
 * instead of a free-form string, which is what lets a platform log
 * aggregator (Vercel, CloudWatch, etc.) filter and query logs instead of
 * grepping them. Swapping in a real sink (Sentry, Datadog, ...) later means
 * changing the `write` function in this one file, not every call site.
 *
 * Deliberately isomorphic — no server-only guard like `src/config/env.ts`.
 * Client Component error boundaries (`app/error.tsx`) need to report a
 * client-side error the same way a Server Component does, and neither side
 * carries anything sensitive here.
 */

type LogLevel = "info" | "warn" | "error";
type LogFields = Record<string, unknown>;

function write(level: LogLevel, message: string, fields?: LogFields): void {
  const line = JSON.stringify({
    level,
    message,
    time: new Date().toISOString(),
    ...fields,
  });

  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.info(line);
  }
}

export const logger = {
  info: (message: string, fields?: LogFields) => write("info", message, fields),
  warn: (message: string, fields?: LogFields) => write("warn", message, fields),
  error: (message: string, fields?: LogFields) => write("error", message, fields),
};
