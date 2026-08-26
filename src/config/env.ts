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

  /**
   * Secret used to sign and encrypt session tokens. Generate with
   * `openssl rand -base64 32`. A short secret materially weakens every
   * session in the system, so the length floor is enforced here rather
   * than trusted to convention.
   */
  AUTH_SECRET: z
    .string()
    .min(32, "AUTH_SECRET must be at least 32 characters"),

  /**
   * Canonical origin of the deployment, used to build callback URLs.
   * Auth.js infers this correctly on Vercel and in local development, so
   * it is optional; set it explicitly behind a proxy or custom domain.
   */
  AUTH_URL: z.url("AUTH_URL must be a valid URL").optional(),

  /**
   * Sign-in throttling (§29). Exposed as configuration because the right
   * thresholds differ by environment — a shared corporate egress IP needs
   * a far higher per-IP allowance than a consumer deployment.
   *
   * `coerce` because environment variables are always strings.
   */
  AUTH_RATE_LIMIT_WINDOW_SECONDS: z.coerce
    .number()
    .int()
    .positive()
    .default(900),

  /** Failed attempts per account before that account is throttled. */
  AUTH_RATE_LIMIT_MAX_PER_ACCOUNT: z.coerce
    .number()
    .int()
    .positive()
    .default(5),

  /** Failed attempts per client IP before that address is throttled. */
  AUTH_RATE_LIMIT_MAX_PER_IP: z.coerce.number().int().positive().default(20),

  /**
   * Course AI assistant (§15, §16, Milestone 10).
   *
   * `GEMINI_API_KEY` belongs only to `features/ai/providers/gemini-provider.ts`
   * — the one file in the app allowed to import the Google GenAI SDK. Every
   * other caller reaches the assistant through the vendor-neutral
   * `AIProvider` interface in `features/ai/provider.ts`, so swapping in a
   * paid provider later is a new provider file and a one-line change here,
   * not a rewrite of the chat feature.
   */
  GEMINI_API_KEY: z.string().min(1, "GEMINI_API_KEY is required"),

  /** Overridable without a code change as Google's free-tier lineup moves. */
  GEMINI_MODEL: z.string().min(1).default("gemini-2.5-flash"),

  /**
   * Chat rate limiting (§29). A model call costs real money (or, on a free
   * tier, real quota) per message, unlike the auth attempts this same
   * `RateLimiter` interface already throttles — so this bounds worst-case
   * spend per student rather than defending against brute force.
   */
  CHAT_RATE_LIMIT_WINDOW_SECONDS: z.coerce
    .number()
    .int()
    .positive()
    .default(3600),

  /** Messages per student allowed inside the window. */
  CHAT_RATE_LIMIT_MAX_PER_USER: z.coerce.number().int().positive().default(30),
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
