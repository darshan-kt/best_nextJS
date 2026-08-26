import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { RedisRateLimiter } from "./redis";
import type { RateLimitRule } from "./types";

/**
 * `RedisRateLimiter` is the implementation `MemoryRateLimiter`'s own doc
 * comment and the `RateLimiter` interface were built for a swap to
 * (Milestone 3), and the one production actually runs (Milestone 12) —
 * see `./index.ts`. It needs a real Redis, so it lives in the integration
 * tier (`pnpm db:up` starts one — see docker-compose.yml) rather than the
 * plain unit-test suite, the same reason DB-touching tests live there.
 *
 * Unlike `memory.test.ts`, this can't use fake timers: the sliding window
 * is enforced by Redis's own clock inside a Lua script, not by anything
 * this process controls. Windows here are short (100–400ms) and tests
 * that need to observe expiry really wait for it, in exchange for not
 * needing to fake time across a network round trip.
 */

if (!process.env.REDIS_URL) {
  throw new Error(
    "REDIS_URL is not set. This test needs a real Redis — see " +
      ".env.example (`pnpm db:up` starts one)."
  );
}

const redisUrl = process.env.REDIS_URL;
let limiter: RedisRateLimiter;

beforeAll(() => {
  limiter = new RedisRateLimiter(redisUrl);
});

afterAll(async () => {
  // No shared fixture data to clean up — every test below uses its own
  // unique key, and each key's own PEXPIRE clears it out on its own.
  await limiter.reset("unused-key-forces-a-clean-quit-path");
});

function uniqueKey(label: string): string {
  return `test:${label}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
}

const RULE: RateLimitRule = { limit: 3, windowMs: 400 };

describe("RedisRateLimiter — check / recordFailure", () => {
  it("allows failures up to one below the limit, then blocks on the limit-th", async () => {
    const key = uniqueKey("basic");

    const first = await limiter.recordFailure(key, RULE);
    expect(first).toEqual({ allowed: true, remaining: 2, retryAfterMs: 0 });

    const second = await limiter.recordFailure(key, RULE);
    expect(second).toEqual({ allowed: true, remaining: 1, retryAfterMs: 0 });

    const third = await limiter.recordFailure(key, RULE);
    expect(third).toEqual({ allowed: true, remaining: 0, retryAfterMs: 0 });

    // The limit-th failure above still succeeded (count went 0->1->2->3,
    // reaching but not exceeding `limit`); this fourth one is the first
    // that's actually blocked — matching MemoryRateLimiter's semantics.
    const fourth = await limiter.recordFailure(key, RULE);
    expect(fourth.allowed).toBe(false);
    expect(fourth.remaining).toBe(0);
    expect(fourth.retryAfterMs).toBeGreaterThan(0);
    expect(fourth.retryAfterMs).toBeLessThanOrEqual(RULE.windowMs);
  });

  it("does not extend the block when further attempts arrive while already blocked", async () => {
    const key = uniqueKey("no-extend");

    await limiter.recordFailure(key, RULE);
    await limiter.recordFailure(key, RULE);
    await limiter.recordFailure(key, RULE);

    const blocked = await limiter.recordFailure(key, RULE);
    expect(blocked.allowed).toBe(false);

    await new Promise((resolve) => setTimeout(resolve, 100));

    // If the extra attempt had added another entry, retryAfterMs would
    // have gone up rather than down over this 100ms wait.
    const stillBlocked = await limiter.recordFailure(key, RULE);
    expect(stillBlocked.allowed).toBe(false);
    expect(stillBlocked.retryAfterMs).toBeLessThan(blocked.retryAfterMs);
  });

  it("check() reports status without consuming budget", async () => {
    const key = uniqueKey("check-no-mutate");

    await limiter.recordFailure(key, RULE);
    const before = await limiter.check(key, RULE);
    expect(before).toEqual({ allowed: true, remaining: 2, retryAfterMs: 0 });

    const again = await limiter.check(key, RULE);
    expect(again).toEqual(before);
  });

  it("uses a sliding window: entries age out and the key becomes fresh again", async () => {
    const key = uniqueKey("sliding-window");
    const rule: RateLimitRule = { limit: 1, windowMs: 200 };

    const first = await limiter.recordFailure(key, rule);
    expect(first.allowed).toBe(true);

    const blocked = await limiter.recordFailure(key, rule);
    expect(blocked.allowed).toBe(false);

    await new Promise((resolve) => setTimeout(resolve, 250));

    const afterExpiry = await limiter.check(key, rule);
    expect(afterExpiry).toEqual({ allowed: true, remaining: 1, retryAfterMs: 0 });
  });

  it("tracks keys independently", async () => {
    const keyA = uniqueKey("a");
    const keyB = uniqueKey("b");

    await limiter.recordFailure(keyA, RULE);
    await limiter.recordFailure(keyA, RULE);
    await limiter.recordFailure(keyA, RULE);
    const aBlocked = await limiter.recordFailure(keyA, RULE);
    expect(aBlocked.allowed).toBe(false);

    const bStatus = await limiter.check(keyB, RULE);
    expect(bStatus).toEqual({ allowed: true, remaining: 3, retryAfterMs: 0 });
  });

  it("two concurrent recordFailure calls at the limit boundary never both succeed", async () => {
    // The failure mode a Lua-script-per-operation design exists to rule
    // out: two racing requests both reading "count < limit" before either
    // writes, letting more than `limit` failures through. `Promise.all`
    // fires both requests over the wire before either resolves.
    const key = uniqueKey("race");
    const rule: RateLimitRule = { limit: 1, windowMs: 400 };

    const [a, b] = await Promise.all([
      limiter.recordFailure(key, rule),
      limiter.recordFailure(key, rule),
    ]);

    const allowedCount = [a, b].filter((r) => r.allowed).length;
    expect(allowedCount).toBe(1);
  });
});

describe("RedisRateLimiter — reset", () => {
  it("clears recorded failures for a key, e.g. after a successful sign-in", async () => {
    const key = uniqueKey("reset");

    await limiter.recordFailure(key, RULE);
    await limiter.recordFailure(key, RULE);
    await limiter.reset(key);

    const status = await limiter.check(key, RULE);
    expect(status).toEqual({ allowed: true, remaining: 3, retryAfterMs: 0 });
  });
});
