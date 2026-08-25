import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Minimal Vitest setup.
 *
 * Scoped deliberately to the authorization test that accompanies it
 * (§12) — this is not the Milestone 11 testing setup. No jsdom, no
 * coverage thresholds, no React testing utilities: the one test here
 * exercises pure functions, and adding infrastructure it does not use
 * would be dependency weight nobody asked for (§40).
 */
export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
