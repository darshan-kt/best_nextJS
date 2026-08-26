import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Integration test config (Milestone 11) — sibling to `vitest.config.mts`,
 * kept separate rather than folded in as a second `include` pattern so
 * `pnpm test` never needs a live Postgres. Anything under
 * `src/**\/*.integration.test.ts` touches the real database (see
 * `src/test/integration-setup.ts`); everything else stays in the plain
 * `*.test.ts` suite.
 */
export default defineConfig({
  test: {
    include: ["src/**/*.integration.test.ts"],
    environment: "node",
    setupFiles: ["./src/test/integration-setup.ts"],
    // Integration tests share one Postgres schema (see reset-db.ts) — run
    // them one file at a time so two files can't race each other's
    // TRUNCATEs.
    fileParallelism: false,
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
