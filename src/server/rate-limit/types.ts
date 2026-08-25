/**
 * Rate limiting abstraction (§29 — infrastructure must not leak into the
 * logic that depends on it).
 *
 * Auth, quiz submission and AI chat all need throttling, and all of them
 * should be able to keep working unchanged when the backing store moves
 * from process memory to Redis. That is the only reason this interface
 * exists.
 *
 * Every method is async even though the in-memory implementation is
 * synchronous: a Redis implementation cannot be, and discovering that
 * after call sites are written would mean changing all of them.
 */

export interface RateLimitRule {
  /** Failures permitted inside the window before requests are refused. */
  limit: number;
  /** Rolling window, in milliseconds. */
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  /** Attempts left before this key is blocked. Zero once blocked. */
  remaining: number;
  /**
   * How long until the caller may retry, in milliseconds. Zero when the
   * request was allowed. Callers should surface this rather than inventing
   * their own retry advice.
   */
  retryAfterMs: number;
}

export interface RateLimiter {
  /**
   * Records one failed attempt against `key` and reports whether the
   * caller is now blocked.
   *
   * Deliberately named for what it does — it mutates state. A method that
   * looked like a pure query but silently consumed budget would be misused.
   */
  recordFailure(key: string, rule: RateLimitRule): Promise<RateLimitResult>;

  /**
   * Reports whether `key` is currently blocked, without consuming budget.
   * Used to reject before doing expensive work such as password hashing.
   */
  check(key: string, rule: RateLimitRule): Promise<RateLimitResult>;

  /** Clears all recorded failures for `key`, e.g. after a success. */
  reset(key: string): Promise<void>;
}
