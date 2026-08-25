import { defineConfig } from "prisma/config";

// The Prisma CLI runs outside the Next.js runtime, which means nothing has
// loaded `.env` yet. Node 20+ can do this natively, so no `dotenv`
// dependency is required (§40). `.env` is absent in CI/production, where
// the variables are already present in the environment.
try {
  process.loadEnvFile();
} catch {
  // No .env file — fall through to the ambient environment.
}

// Imported after the environment is populated so that validation sees the
// loaded values. This is the same validated schema the application uses,
// so a bad DATABASE_URL fails here too rather than at query time (§30).
const { env } = await import("./src/config/env.js");

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env.DATABASE_URL,
  },
});
