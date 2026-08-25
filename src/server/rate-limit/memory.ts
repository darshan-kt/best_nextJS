import type {
  RateLimitResult,
  RateLimitRule,
  RateLimiter,
} from "./types";

/**
 * In-process sliding-window rate limiter.
 *
 * Suitable for local development and single-instance deployments. It is
 * explicitly NOT correct across multiple instances or on serverless, where
 * each process keeps its own counters and an attacker effectively gets the
 * limit multiplied by the instance count. Swap in a Redis-backed
 * implementation there — that is what the `RateLimiter` interface is for.
 *
 * A sliding window is used rather than a fixed one because a fixed window
 * lets an attacker send the full allowance at the end of one window and
 * again at the start of the next, doubling the effective limit at the
 * boundary.
 */
export class MemoryRateLimiter implements RateLimiter {
  /** Failure timestamps (ms epoch) per key, oldest first. */
  private readonly hits = new Map<string, number[]>();

  /**
   * Hard ceiling on tracked keys. Without it, an attacker cycling through
   * unique keys (a different fake email each attempt) would grow this map
   * without bound — turning the defence into a memory-exhaustion vector.
   */
  private readonly maxKeys: number;

  constructor(maxKeys = 10_000) {
    this.maxKeys = maxKeys;
  }

  /** Drops timestamps that have aged out of the window. */
  private prune(key: string, windowMs: number, now: number): number[] {
    const cutoff = now - windowMs;
    const recent = (this.hits.get(key) ?? []).filter((at) => at > cutoff);

    if (recent.length === 0) {
      this.hits.delete(key);
    } else {
      this.hits.set(key, recent);
    }

    return recent;
  }

  /**
   * Removes keys whose newest entry is oldest. Map preserves insertion
   * order, but insertion order is not recency order here, so the oldest
   * entry is found by inspecting values rather than taking the first key.
   */
  private evictIfFull(): void {
    if (this.hits.size < this.maxKeys) {
      return;
    }

    let oldestKey: string | null = null;
    let oldestSeen = Infinity;

    for (const [key, timestamps] of this.hits) {
      const newest = timestamps[timestamps.length - 1] ?? 0;

      if (newest < oldestSeen) {
        oldestSeen = newest;
        oldestKey = key;
      }
    }

    if (oldestKey !== null) {
      this.hits.delete(oldestKey);
    }
  }

  private evaluate(
    recent: number[],
    rule: RateLimitRule,
    now: number
  ): RateLimitResult {
    if (recent.length < rule.limit) {
      return {
        allowed: true,
        remaining: rule.limit - recent.length,
        retryAfterMs: 0,
      };
    }

    // Blocked until the oldest recorded failure leaves the window.
    const oldest = recent[0];
    const retryAfterMs = Math.max(0, oldest + rule.windowMs - now);

    return { allowed: false, remaining: 0, retryAfterMs };
  }

  async check(key: string, rule: RateLimitRule): Promise<RateLimitResult> {
    const now = Date.now();
    const recent = this.prune(key, rule.windowMs, now);

    return this.evaluate(recent, rule, now);
  }

  async recordFailure(
    key: string,
    rule: RateLimitRule
  ): Promise<RateLimitResult> {
    const now = Date.now();
    const recent = this.prune(key, rule.windowMs, now);

    // Stop appending once blocked. Otherwise every extra attempt would
    // push the window forward and extend the block indefinitely, which
    // would let an attacker keep a victim's account locked out forever.
    if (recent.length >= rule.limit) {
      return this.evaluate(recent, rule, now);
    }

    if (!this.hits.has(key)) {
      this.evictIfFull();
    }

    recent.push(now);
    this.hits.set(key, recent);

    return this.evaluate(recent, rule, now);
  }

  async reset(key: string): Promise<void> {
    this.hits.delete(key);
  }

  /** Test/diagnostic helper: number of keys currently tracked. */
  size(): number {
    return this.hits.size;
  }
}
