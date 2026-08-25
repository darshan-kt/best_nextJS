import { PrismaPg } from "@prisma/adapter-pg";

import { env } from "@/config/env";
import { PrismaClient } from "@/db/generated/client";

/**
 * Shared Prisma Client instance (infrastructure layer, §5).
 *
 * Next.js clears the module registry on every hot reload in development,
 * which would otherwise open a new connection pool per reload until the
 * database refuses connections. Caching the instance on `globalThis`
 * keeps a single pool across reloads. In production the module is
 * evaluated once, so the cache is bypassed.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: env.DATABASE_URL }),
    log:
      env.NODE_ENV === "development"
        ? ["query", "warn", "error"]
        : ["warn", "error"],
  });
}

export const prisma: PrismaClient =
  globalForPrisma.prisma ?? createPrismaClient();

if (env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
