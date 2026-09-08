import { defineConfig, devices } from "@playwright/test";

/**
 * Milestone 11 e2e setup — previously greenfield (Playwright is pinned in
 * CLAUDE.md §2 but had no config anywhere in the repo). `e2e/` and this
 * file's location are Playwright's own defaults, not a project convention
 * — CLAUDE.md names e2e scenarios but doesn't prescribe a directory.
 *
 * Runs against a production build (`pnpm build && pnpm start`), not
 * `next dev`: specs should exercise real build output, not dev-only
 * behavior like Fast Refresh. Requires the dev database seeded first
 * (`pnpm db:seed`) — specs authenticate as the seeded student.
 */
/**
 * The origin the suite runs against.
 *
 * Configurable because `reuseExistingServer` will happily adopt WHATEVER is
 * already listening on the port and say nothing about it. During the Phase 1G
 * course rewrite that silently pointed two consecutive verification runs at a
 * `docker compose` container serving an older build, so a fix that was really
 * in the working tree looked like it had failed. `E2E_PORT=3100 pnpm test:e2e`
 * is the escape hatch when something else owns 3000.
 */
const PORT = process.env.E2E_PORT ?? "3000";
const ORIGIN = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: {
    baseURL: ORIGIN,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "pnpm build && pnpm start",
    url: ORIGIN,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    // Auth.js validates the request Host against a trusted origin in
    // production mode (`next start`) — `next dev` special-cases localhost,
    // which is why this was never needed before. A real deployment sets
    // this from its actual origin; this is the e2e-run equivalent.
    env: { ...process.env, AUTH_URL: ORIGIN, PORT },
  },
});
