import { env } from "@/config/env";
import { MemoryRateLimiter } from "./memory";
import { RedisRateLimiter } from "./redis";
import type { RateLimiter } from "./types";

export type {
  RateLimitResult,
  RateLimitRule,
  RateLimiter,
} from "./types";

/**
 * The single place an implementation is chosen (Milestone 3 designed the
 * `RateLimiter` interface for exactly this — confirmed still true when the
 * Redis swap actually happened in Milestone 12: neither
 * `features/auth/rate-limit.ts` nor `features/chat/rate-limit.ts` needed
 * to change). `REDIS_URL` present means Redis (required in production —
 * see `src/config/env.ts`); its absence in development/test falls back to
 * the in-memory limiter so `pnpm dev` and the unit-test tier don't need a
 * running Redis.
 *
 * Cached on `globalThis` for the same reason the Prisma client is: Next.js
 * discards the module registry on hot reload, and a fresh limiter each
 * time would silently forget every recorded failure — making the limiter
 * appear to work in development while never actually blocking anything.
 */
const globalForRateLimit = globalThis as unknown as {
  rateLimiter: RateLimiter | undefined;
};

export const rateLimiter: RateLimiter =
  globalForRateLimit.rateLimiter ??
  (env.REDIS_URL ? new RedisRateLimiter(env.REDIS_URL) : new MemoryRateLimiter());

if (env.NODE_ENV !== "production") {
  globalForRateLimit.rateLimiter = rateLimiter;
}
