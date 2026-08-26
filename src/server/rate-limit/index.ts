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
 *
 * Construction is deferred to first use, not done at module import (found
 * during the ROS 2 course work's Stage 0 build validation): `next build`
 * evaluates a route's full module graph while collecting page data, even
 * for routes that end up rendered dynamically and never pre-rendered.
 * Every route that touches auth or chat imports this module, so
 * constructing a `RedisRateLimiter` here unconditionally meant every
 * build attempted a real connection to whatever `REDIS_URL` happened to
 * be set — including a placeholder build-time value never meant to be
 * reachable. The exported `rateLimiter` below is a thin dispatcher: it
 * has no side effects of its own, so importing it is free, and each
 * method resolves (constructing on the first call) before forwarding.
 */
const globalForRateLimit = globalThis as unknown as {
  rateLimiter: RateLimiter | undefined;
};

let instance: RateLimiter | undefined;

function getRateLimiter(): RateLimiter {
  if (env.NODE_ENV !== "production" && globalForRateLimit.rateLimiter) {
    return globalForRateLimit.rateLimiter;
  }

  if (!instance) {
    instance = env.REDIS_URL
      ? new RedisRateLimiter(env.REDIS_URL)
      : new MemoryRateLimiter();

    if (env.NODE_ENV !== "production") {
      globalForRateLimit.rateLimiter = instance;
    }
  }

  return instance;
}

export const rateLimiter: RateLimiter = {
  check: (key, rule) => getRateLimiter().check(key, rule),
  recordFailure: (key, rule) => getRateLimiter().recordFailure(key, rule),
  reset: (key) => getRateLimiter().reset(key),
};
