import { env } from "@/config/env";
import { rateLimiter, type RateLimitRule } from "@/server/rate-limit";

/**
 * Chat rate limiting (§29) — the same shared `RateLimiter` sign-in
 * throttling uses (`features/auth/rate-limit.ts`), whose own interface
 * comment names AI chat as an anticipated caller.
 *
 * Per-user only, unlike auth's per-account-plus-per-IP split: every chat
 * request is already authenticated (there is no anonymous chat to defend
 * against), so there is no "many accounts from one IP" attack shape here —
 * this bounds one student's worst-case spend, not a brute-force surface.
 *
 * `recordFailure` consumes budget on every *sent* message here, not on a
 * failure — the interface's naming is auth-shaped, but the sliding-window
 * mechanism underneath is exactly "N events per window" regardless of what
 * the event is, which is why this wraps it under its own, correctly-named
 * functions rather than calling the raw method at the call site.
 */

const RULE: RateLimitRule = {
  limit: env.CHAT_RATE_LIMIT_MAX_PER_USER,
  windowMs: env.CHAT_RATE_LIMIT_WINDOW_SECONDS * 1000,
};

function chatKey(userId: string): string {
  return `chat:user:${userId}`;
}

export interface ChatThrottleState {
  blocked: boolean;
  retryAfterMs: number;
}

/** Checks without consuming budget — used before any model call is made. */
export async function checkChatAllowed(userId: string): Promise<ChatThrottleState> {
  const result = await rateLimiter.check(chatKey(userId), RULE);
  return { blocked: !result.allowed, retryAfterMs: result.retryAfterMs };
}

/** Consumes one message's worth of budget for this student. */
export async function consumeChatBudget(userId: string): Promise<ChatThrottleState> {
  const result = await rateLimiter.recordFailure(chatKey(userId), RULE);
  return { blocked: !result.allowed, retryAfterMs: result.retryAfterMs };
}
