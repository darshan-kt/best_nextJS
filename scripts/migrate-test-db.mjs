// Migrates the integration-test database before `pnpm test:integration`
// runs (wired as `pretest:integration` in package.json). Not the Prisma
// CLI, so `.env` isn't loaded yet — same situation `prisma/seed.ts` and
// `src/test/integration-setup.ts` are in.
import { execSync } from "node:child_process";

try {
  process.loadEnvFile();
} catch {
  // No `.env` file — fine in CI, where these are supplied directly.
}

if (!process.env.TEST_DATABASE_URL) {
  throw new Error(
    "TEST_DATABASE_URL is not set. See .env.example."
  );
}

execSync("pnpm exec prisma migrate deploy", {
  stdio: "inherit",
  env: { ...process.env, DATABASE_URL: process.env.TEST_DATABASE_URL },
});
