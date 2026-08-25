import { z } from "zod";

/**
 * Single source of truth for environment configuration (§30).
 *
 * Every environment variable the application depends on is declared and
 * validated here. Application code must import `env` from this module
 * rather than reading `process.env` directly, so that a missing or
 * malformed value fails loudly at startup instead of surfacing as an
 * undefined value deep inside a request.
 *
 * Keep this schema in sync with `.env.example`.
 */
const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  /** PostgreSQL connection string used by Prisma. */
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL is required")
    .refine(
      (value) =>
        value.startsWith("postgresql://") || value.startsWith("postgres://"),
      "DATABASE_URL must be a PostgreSQL connection string"
    ),
});

export type Env = z.infer<typeof envSchema>;

function formatIssues(error: z.ZodError<unknown>): string {
  return error.issues
    .map((issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`)
    .join("\n");
}

function parseEnv(): Env {
  // This module reads server-only configuration. Importing it from a
  // Client Component would both fail validation and risk leaking secrets
  // into the browser bundle, so make that mistake obvious immediately.
  if (typeof window !== "undefined") {
    throw new Error(
      "src/config/env.ts is server-only and must not be imported from client code."
    );
  }

  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    throw new Error(
      `Invalid environment configuration:\n${formatIssues(result.error)}\n\n` +
        "See .env.example for the required variables."
    );
  }

  return result.data;
}

export const env: Env = parseEnv();
