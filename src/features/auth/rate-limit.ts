import { headers } from "next/headers";

import { env } from "@/config/env";
import { rateLimiter, type RateLimitRule } from "@/server/rate-limit";

/**
 * Sign-in throttling policy (§29).
 *
 * Two independent limits, because they defend against different attacks:
 *
 *   * per-account — one account being brute-forced, possibly from many
 *     addresses. This is the load-bearing limit: an attacker chooses which
 *     account to attack but cannot forge which account a request targets.
 *
 *   * per-IP — one host spraying many accounts, which the per-account
 *     limit would never notice because each account sees only one or two
 *     failures.
 *
 * Only failures are counted, and a success clears both counters. Counting
 * successes would throttle ordinary users; leaving the IP counter set
 * after a success would gradually lock out everyone sharing an office or
 * NAT address.
 */

const WINDOW_MS = env.AUTH_RATE_LIMIT_WINDOW_SECONDS * 1000;

const ACCOUNT_RULE: RateLimitRule = {
  limit: env.AUTH_RATE_LIMIT_MAX_PER_ACCOUNT,
  windowMs: WINDOW_MS,
};

const IP_RULE: RateLimitRule = {
  limit: env.AUTH_RATE_LIMIT_MAX_PER_IP,
  windowMs: WINDOW_MS,
};

function accountKey(email: string): string {
  return `signin:account:${email.toLowerCase()}`;
}

function ipKey(ip: string): string {
  return `signin:ip:${ip}`;
}

/**
 * Best-effort client address.
 *
 * SECURITY: `x-forwarded-for` is supplied by the client and is trivially
 * forged unless a reverse proxy you control overwrites it. Next.js exposes
 * no remote-address API to Server Actions, so there is no un-spoofable
 * source available here.
 *
 * The consequence is deliberate and worth stating plainly: treat the
 * per-IP limit as defence in depth, not as a guarantee. The per-account
 * limit is what actually stops a brute-force attack, and it cannot be
 * evaded this way.
 *
 * Returns null when no address can be determined, in which case the per-IP
 * limit is skipped rather than lumping every such request under a shared
 * "unknown" bucket — that bucket would otherwise become a way for one
 * attacker to lock out unrelated users.
 */
async function getClientIp(): Promise<string | null> {
  const headerList = await headers();

  // Leftmost entry is the original client when a trusted proxy appends;
  // it is also the part an attacker controls when one does not.
  const forwarded = headerList.get("x-forwarded-for");

  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();

    if (first) {
      return first;
    }
  }

  return headerList.get("x-real-ip")?.trim() || null;
}

export interface SignInThrottleState {
  blocked: boolean;
  retryAfterMs: number;
}

const NOT_BLOCKED: SignInThrottleState = { blocked: false, retryAfterMs: 0 };

/**
 * Checks both limits without consuming budget.
 *
 * Called before the password is verified so that a throttled request never
 * reaches scrypt — otherwise the defence would itself become a CPU
 * exhaustion vector, which is the opposite of the point.
 */
export async function checkSignInAllowed(
  email: string
): Promise<SignInThrottleState> {
  const ip = await getClientIp();

  const [accountResult, ipResult] = await Promise.all([
    rateLimiter.check(accountKey(email), ACCOUNT_RULE),
    ip
      ? rateLimiter.check(ipKey(ip), IP_RULE)
      : Promise.resolve({ allowed: true, remaining: 0, retryAfterMs: 0 }),
  ]);

  if (accountResult.allowed && ipResult.allowed) {
    return NOT_BLOCKED;
  }

  return {
    blocked: true,
    retryAfterMs: Math.max(accountResult.retryAfterMs, ipResult.retryAfterMs),
  };
}

/** Records a failed sign-in against both the account and the client IP. */
export async function recordSignInFailure(email: string): Promise<void> {
  const ip = await getClientIp();

  await Promise.all([
    rateLimiter.recordFailure(accountKey(email), ACCOUNT_RULE),
    ip
      ? rateLimiter.recordFailure(ipKey(ip), IP_RULE)
      : Promise.resolve(undefined),
  ]);
}

/** Clears both counters after a successful sign-in. */
export async function clearSignInAttempts(email: string): Promise<void> {
  const ip = await getClientIp();

  await Promise.all([
    rateLimiter.reset(accountKey(email)),
    ip ? rateLimiter.reset(ipKey(ip)) : Promise.resolve(undefined),
  ]);
}

/**
 * Human-readable retry advice. Rounded up to whole units so it never says
 * "try again in 0 minutes".
 */
export function formatRetryAfter(retryAfterMs: number): string {
  const seconds = Math.ceil(retryAfterMs / 1000);

  if (seconds < 60) {
    return `${seconds} second${seconds === 1 ? "" : "s"}`;
  }

  const minutes = Math.ceil(seconds / 60);

  return `${minutes} minute${minutes === 1 ? "" : "s"}`;
}
