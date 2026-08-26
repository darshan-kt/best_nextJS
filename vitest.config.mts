import { fileURLToPath } from "node:url";
import { configDefaults, defineConfig } from "vitest/config";

/**
 * Minimal Vitest setup.
 *
 * No jsdom, no coverage thresholds, no React testing utilities: everything
 * here exercises pure functions or in-memory state, and adding
 * infrastructure it does not use would be dependency weight nobody asked
 * for (§40). DB-touching tests are a separate tier — see
 * `vitest.integration.config.mts` — excluded here so `pnpm test` never
 * needs a live Postgres. `*.integration.test.ts` still matches this file's
 * own `**\/*.test.ts` include glob (it ends in `.test.ts`), so it has to be
 * excluded explicitly, not just left to the other config's `include`.
 */
export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    exclude: [...configDefaults.exclude, "**/*.integration.test.ts"],
    environment: "node",
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
