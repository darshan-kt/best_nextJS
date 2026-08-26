/**
 * Runs before every `*.integration.test.ts` file (see
 * `vitest.integration.config.mts`).
 *
 * Overrides `DATABASE_URL` to `TEST_DATABASE_URL` *before* any test file
 * imports `@/config/env` or `@/db/client` — both read `process.env` at
 * module-load time, so this has to happen first. `TEST_DATABASE_URL` must
 * point at a genuinely separate Postgres *database*, not merely a
 * different `?schema=` on the same one: `@prisma/adapter-pg` connects via
 * a plain `pg.Pool`, which does not honor the `schema` query-string
 * parameter, so two URLs differing only by `?schema=` silently resolve to
 * the same `public` schema — confirmed the hard way when this file's
 * schema-only version let integration tests' cleanup step truncate real
 * dev data twice. The guard below exists specifically so that mistake
 * fails loudly instead of silently again.
 */

// The test runner is not the Prisma CLI, so nothing has loaded `.env` yet
// (same situation `prisma/seed.ts` documents).
try {
  process.loadEnvFile();
} catch {
  // No `.env` file — fine in CI, where these are supplied directly.
}

if (!process.env.TEST_DATABASE_URL) {
  throw new Error(
    "TEST_DATABASE_URL is not set. Integration tests need a dedicated " +
      "Postgres database — see .env.example."
  );
}

// The one check standing between a test run and truncating real dev data:
// refuse to proceed if TEST_DATABASE_URL and DATABASE_URL name the same
// database (a `?schema=` difference does NOT count as separation — see
// the comment above). Compares path only, not query string, on purpose.
const testDbName = new URL(process.env.TEST_DATABASE_URL).pathname;
const devDbName = process.env.DATABASE_URL
  ? new URL(process.env.DATABASE_URL).pathname
  : null;
if (devDbName && testDbName === devDbName) {
  throw new Error(
    `TEST_DATABASE_URL and DATABASE_URL both point at database ` +
      `"${testDbName}" — integration tests would run destructive cleanup ` +
      `against real dev data. TEST_DATABASE_URL must name a separate ` +
      `Postgres database (see .env.example).`
  );
}

process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
