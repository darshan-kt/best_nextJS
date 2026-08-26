import { geminiProvider } from "./providers/gemini-provider";
import type { AIProvider } from "./provider";

/**
 * The single place a provider is chosen (§15) — mirrors
 * `server/rate-limit/index.ts`'s same role for `RateLimiter`. Swapping to a
 * paid provider is changing this one line, once a second `providers/*.ts`
 * file exists.
 */
export const aiProvider: AIProvider = geminiProvider;

export type { AIProvider, ChatRole, ChatTurn, StreamResponseArgs } from "./provider";
