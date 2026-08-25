import { env } from "@/config/env";
import { MemoryRateLimiter } from "./memory";
import type { RateLimiter } from "./types";

export type {
  RateLimitResult,
  RateLimitRule,
  RateLimiter,
} from "./types";

/**
 * The single place an implementation is chosen. Callers depend on the
 * `RateLimiter` interface, so introducing a Redis-backed limiter means
 * editing this file and nothing else.
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
  globalForRateLimit.rateLimiter ?? new MemoryRateLimiter();

if (env.NODE_ENV !== "production") {
  globalForRateLimit.rateLimiter = rateLimiter;
}
