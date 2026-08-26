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
   * Canonical origin of the deployment. Auth.js infers this correctly in
   * local development and on Vercel (which sets its own `VERCEL` env var
   * Auth.js auto-detects), so it is optional there — but nowhere else.
   * Confirmed the hard way running a production build outside Vercel
   * (Milestone 12, `pnpm start` locally): without this set, every sign-in
   * fails with Auth.js's `UntrustedHost` error, because production mode
   * does not extend `localhost`'s automatic trust to an arbitrary
   * production Host header. See the production check below.
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

  /**
   * Backing store for `src/server/rate-limit` (§29, Milestone 12).
   * Optional in development/test, where the in-memory limiter is fine for
   * a single local process — see the production check below for why it
   * stops being optional there.
   */
  REDIS_URL: z.url("REDIS_URL must be a valid URL").optional(),
});

const envSchemaWithProductionChecks = envSchema.superRefine((data, ctx) => {
  // A production deployment that runs more than one instance or
  // concurrent execution environment — which is any realistic production
  // deployment, not a hypothetical one — makes the in-memory rate limiter
  // silently ineffective: each process only ever sees its own traffic, so
  // the configured limit is multiplied by however many instances are
  // running, or simply doesn't apply under serverless/Lambda concurrency.
  // Refusing to boot without `REDIS_URL` in production turns that failure
  // mode from "auth throttling quietly does nothing" into a startup error
  // that's impossible to miss.
  if (data.NODE_ENV === "production" && !data.REDIS_URL) {
    ctx.addIssue({
      code: "custom",
      path: ["REDIS_URL"],
      message:
        "REDIS_URL is required in production — the in-memory rate limiter " +
        "is only correct for a single instance, and production runs more " +
        "than one. See src/server/rate-limit/redis.ts.",
    });
  }

  // `process.env.VERCEL` (not part of the schema above — it's a platform-
  // injected marker, not application config) is what Auth.js itself keys
  // its automatic host-trust off of. Anywhere else in production, an
  // unset AUTH_URL is not a "works differently" edge case — it's sign-in
  // failing outright for every user, confirmed by actually running a
  // production build outside Vercel.
  if (
    data.NODE_ENV === "production" &&
    !data.AUTH_URL &&
    !process.env.VERCEL
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["AUTH_URL"],
      message:
        "AUTH_URL is required in production outside Vercel — without it, " +
        "Auth.js rejects every request with an UntrustedHost error. Set it " +
        "to this deployment's canonical origin (e.g. https://example.com).",
    });
  }
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

  const result = envSchemaWithProductionChecks.safeParse(process.env);

  if (!result.success) {
    throw new Error(
      `Invalid environment configuration:\n${formatIssues(result.error)}\n\n` +
        "See .env.example for the required variables."
    );
  }

  return result.data;
}

export const env: Env = parseEnv();
