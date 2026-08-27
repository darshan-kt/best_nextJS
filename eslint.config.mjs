import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Agent worktrees are full checkouts nested inside the repo, each with
    // its own generated `.next/`. Without this, linting the main tree walks
    // into them and reports errors in generated files that aren't ours —
    // and the count grows with every worktree left on disk.
    ".claude/worktrees/**",
  ]),
]);

export default eslintConfig;
