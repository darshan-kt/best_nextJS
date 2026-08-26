import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MemoryRateLimiter } from "./memory";
import type { RateLimitRule } from "./types";

/**
 * `MemoryRateLimiter` gates both sign-in throttling (§29) and chat rate
 * limiting (§29, Milestone 10), and had no test anywhere before this file —
 * Milestone 11 closes that gap. It's pure in-memory (no `@/config/env` or
 * `@/db/client` import), so this is a plain unit test.
 */

const RULE: RateLimitRule = { limit: 3, windowMs: 1_000 };

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(0);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("MemoryRateLimiter — check / recordFailure", () => {
  it("allows failures up to one below the limit, then blocks on the limit-th", async () => {
    const limiter = new MemoryRateLimiter();

    const first = await limiter.recordFailure("key", RULE);
    expect(first).toEqual({ allowed: true, remaining: 2, retryAfterMs: 0 });

    const second = await limiter.recordFailure("key", RULE);
    expect(second).toEqual({ allowed: true, remaining: 1, retryAfterMs: 0 });

    // The limit-th failure is itself the one that reports the key as
    // blocked — there is no extra "free" attempt beyond the configured
    // limit before blocking kicks in.
    const third = await limiter.recordFailure("key", RULE);
    expect(third).toEqual({ allowed: false, remaining: 0, retryAfterMs: 1_000 });
  });

  it("blocks once the limit is reached, and stops extending the block on further attempts", async () => {
    const limiter = new MemoryRateLimiter();

    await limiter.recordFailure("key", RULE);
    await limiter.recordFailure("key", RULE);
    await limiter.recordFailure("key", RULE);

    const blocked = await limiter.recordFailure("key", RULE);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterMs).toBe(1_000);

    // Advancing time without hitting the window boundary: still blocked,
    // and the block does not get pushed further out by the extra attempt
    // (an attacker cycling requests must not be able to extend a victim's
    // lockout indefinitely).
    vi.setSystemTime(500);
    const stillBlocked = await limiter.recordFailure("key", RULE);
    expect(stillBlocked.allowed).toBe(false);
    expect(stillBlocked.retryAfterMs).toBe(500);
  });

  it("check() reports status without consuming budget", async () => {
    const limiter = new MemoryRateLimiter();

    await limiter.recordFailure("key", RULE);
    const before = await limiter.check("key", RULE);
    expect(before).toEqual({ allowed: true, remaining: 2, retryAfterMs: 0 });

    // Calling check() again changes nothing — it must not itself count as
    // an attempt.
    const again = await limiter.check("key", RULE);
    expect(again).toEqual(before);
  });

  it("uses a sliding window: failures age out individually, not all at once", async () => {
    const limiter = new MemoryRateLimiter();

    await limiter.recordFailure("key", RULE); // t=0
    vi.setSystemTime(400);
    await limiter.recordFailure("key", RULE); // t=400
    vi.setSystemTime(800);
    const third = await limiter.recordFailure("key", RULE); // t=800 — hits the limit
    expect(third.allowed).toBe(false);

    // A fixed window would clear everything the instant the first window
    // (t=1000) ends, letting a full new burst through at once. Here only
    // the t=0 failure has aged out by t=1001 (cutoff is 1) — the t=400 and
    // t=800 ones haven't — so only one slot has freed up, not all three.
    // `check()` is used from here on since it doesn't mutate state, keeping
    // the aging-out story legible.
    vi.setSystemTime(1_001);
    const oneSlotFreed = await limiter.check("key", RULE);
    expect(oneSlotFreed).toEqual({ allowed: true, remaining: 1, retryAfterMs: 0 });

    // By t=1401 the t=400 failure has also aged out (cutoff is 401),
    // leaving only the t=800 one — two slots free now.
    vi.setSystemTime(1_401);
    const twoSlotsFreed = await limiter.check("key", RULE);
    expect(twoSlotsFreed).toEqual({ allowed: true, remaining: 2, retryAfterMs: 0 });
  });

  it("tracks keys independently", async () => {
    const limiter = new MemoryRateLimiter();

    await limiter.recordFailure("a", RULE);
    await limiter.recordFailure("a", RULE);
    await limiter.recordFailure("a", RULE);
    const aBlocked = await limiter.recordFailure("a", RULE);
    expect(aBlocked.allowed).toBe(false);

    const bStatus = await limiter.check("b", RULE);
    expect(bStatus).toEqual({ allowed: true, remaining: 3, retryAfterMs: 0 });
  });
});

describe("MemoryRateLimiter — reset", () => {
  it("clears recorded failures for a key, e.g. after a successful sign-in", async () => {
    const limiter = new MemoryRateLimiter();

    await limiter.recordFailure("key", RULE);
    await limiter.recordFailure("key", RULE);
    await limiter.reset("key");

    const status = await limiter.check("key", RULE);
    expect(status).toEqual({ allowed: true, remaining: 3, retryAfterMs: 0 });
  });
});

describe("MemoryRateLimiter — maxKeys eviction", () => {
  it("evicts the least-recently-active key once the tracked-key ceiling is reached", async () => {
    // A tiny ceiling makes the eviction path exercisable without actually
    // tracking 10,000 keys — the mechanism (evict the oldest-newest-entry
    // key once full) doesn't depend on the ceiling's size.
    const limiter = new MemoryRateLimiter(2);

    await limiter.recordFailure("first", RULE);
    vi.setSystemTime(100);
    await limiter.recordFailure("second", RULE);
    expect(limiter.size()).toBe(2);

    // A third distinct key forces an eviction rather than growing the map
    // unboundedly (the memory-exhaustion vector the class's own comment
    // describes).
    vi.setSystemTime(200);
    await limiter.recordFailure("third", RULE);
    expect(limiter.size()).toBe(2);

    // "first" was the least recently active and should be the one evicted
    // — it now behaves like a brand-new key.
    const firstAfterEviction = await limiter.check("first", RULE);
    expect(firstAfterEviction).toEqual({
      allowed: true,
      remaining: 3,
      retryAfterMs: 0,
    });
  });
});
