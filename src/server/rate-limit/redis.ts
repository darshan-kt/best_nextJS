import Redis, { type Redis as RedisClient } from "ioredis";

import type { RateLimitResult, RateLimitRule, RateLimiter } from "./types";

declare module "ioredis" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- `Context` is unused here, but interface declaration merging requires matching ioredis's own type parameter name exactly.
  interface RedisCommander<Context> {
    rateLimitCheck(
      key: string,
      now: string,
      windowMs: string,
      limit: string
    ): Promise<[allowed: number, remaining: number, retryAfterMs: number]>;

    rateLimitRecord(
      key: string,
      now: string,
      windowMs: string,
      limit: string
    ): Promise<[allowed: number, remaining: number, retryAfterMs: number]>;
  }
}

/**
 * Shared by both scripts below: trims expired entries from the sorted set,
 * counts what's left, and exposes a `retryAfter()` helper — the piece the
 * two scripts don't share is whether a passing check also writes.
 */
const PRUNE_AND_COUNT = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local windowMs = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])

redis.call('ZREMRANGEBYSCORE', key, '-inf', now - windowMs)
local count = redis.call('ZCARD', key)

local function retryAfter()
  local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
  if not oldest[2] then
    return 0
  end
  local remaining = (tonumber(oldest[2]) + windowMs) - now
  if remaining < 0 then
    return 0
  end
  return remaining
end
`;

/** Read-only: reports status without adding an entry. */
const CHECK_SCRIPT = `${PRUNE_AND_COUNT}
if count >= limit then
  return {0, 0, retryAfter()}
end
return {1, limit - count, 0}
`;

/**
 * Adds an entry only when still under the limit — mirrors
 * `MemoryRateLimiter.recordFailure`'s rule that the attempt which *hits*
 * the limit is itself reported as blocked, and that no attempt beyond the
 * limit extends the block further.
 */
const RECORD_SCRIPT = `${PRUNE_AND_COUNT}
if count >= limit then
  return {0, 0, retryAfter()}
end

local member = now .. '-' .. math.random(0, 1000000000)
redis.call('ZADD', key, now, member)
redis.call('PEXPIRE', key, windowMs)

return {1, limit - count - 1, 0}
`;

/**
 * Redis-backed sliding-window rate limiter — the swap
 * `MemoryRateLimiter`'s own doc comment and the `RateLimiter` interface
 * (`./types.ts`) were built for (Milestone 3). Selected automatically once
 * `REDIS_URL` is set (see `./index.ts`) and required in production
 * (`src/config/env.ts`): a realistic production deployment runs more than
 * one instance or concurrent execution environment, and `MemoryRateLimiter`
 * only sees its own process's traffic — under N instances the effective
 * limit is the configured one multiplied by N; under serverless/Lambda
 * concurrency, N is unbounded, so the limiter would not meaningfully
 * enforce anything at all.
 *
 * Same sliding-window semantics as `MemoryRateLimiter`: a Redis sorted set
 * per key, score = failure timestamp, member = a unique id (so two
 * failures in the same millisecond don't collide and silently overwrite
 * each other). A `PEXPIRE` on every write means abandoned keys clean
 * themselves up on their own — no hand-rolled eviction ceiling needed the
 * way the in-memory version needs one to bound its own memory.
 *
 * Both `check` and `recordFailure` run as a single Lua script (`EVAL`),
 * not several round trips: pruning, counting, and (for `recordFailure`)
 * conditionally adding a member all happen atomically. Without that, two
 * concurrent requests against the same key could both read "count < limit"
 * before either writes, letting more than `limit` attempts through right
 * at the boundary — the one failure mode a rate limiter cannot afford.
 */
export class RedisRateLimiter implements RateLimiter {
  private readonly client: RedisClient;

  constructor(redisUrl: string) {
    this.client = new Redis(redisUrl, {
      // A rate-limit check guards a request that's already in flight — if
      // Redis is genuinely unreachable, failing fast (and letting the
      // caller decide how to degrade) beats retrying for a long time.
      // Commands issued right after construction still queue normally
      // until the initial connection completes — only a real outage after
      // that point hits this ceiling.
      maxRetriesPerRequest: 1,
      // Without this, ioredis opens the socket the moment this class is
      // constructed — before any caller has actually issued a command.
      // `./index.ts` already defers *constructing* this class until first
      // use; this defers the network connection itself the same way, so
      // constructing one (e.g. as part of `next build` evaluating a
      // route's module graph while collecting page data, which doesn't
      // call any rate-limiter method) never touches the network at all.
      lazyConnect: true,
    });

    this.client.defineCommand("rateLimitCheck", {
      numberOfKeys: 1,
      lua: CHECK_SCRIPT,
    });

    this.client.defineCommand("rateLimitRecord", {
      numberOfKeys: 1,
      lua: RECORD_SCRIPT,
    });
  }

  async check(key: string, rule: RateLimitRule): Promise<RateLimitResult> {
    const [allowed, remaining, retryAfterMs] = await this.client.rateLimitCheck(
      key,
      String(Date.now()),
      String(rule.windowMs),
      String(rule.limit)
    );

    return { allowed: allowed === 1, remaining, retryAfterMs };
  }

  async recordFailure(
    key: string,
    rule: RateLimitRule
  ): Promise<RateLimitResult> {
    const [allowed, remaining, retryAfterMs] = await this.client.rateLimitRecord(
      key,
      String(Date.now()),
      String(rule.windowMs),
      String(rule.limit)
    );

    return { allowed: allowed === 1, remaining, retryAfterMs };
  }

  async reset(key: string): Promise<void> {
    await this.client.del(key);
  }
}
