/**
 * AI provider abstraction (§15).
 *
 * Nothing outside `features/ai` may import a vendor SDK. The chat feature's
 * application layer, its Route Handler, and its UI all depend on
 * `AIProvider`, never on `@google/genai` or any other client library
 * directly — so replacing the free Gemini provider with a paid one later
 * (the stated plan for this milestone) is a new file under `providers/`
 * plus a one-line change in `index.ts`, not a rewrite of the chat feature.
 */

export type ChatRole = "user" | "assistant";

export interface ChatTurn {
  role: ChatRole;
  content: string;
}

export interface StreamResponseArgs {
  /** Grounding instructions: who the assistant is, plus the current
   *  course/lesson content it may draw on. Never vendor-specific. */
  systemPrompt: string;
  /** Prior turns in the conversation, oldest first. */
  history: readonly ChatTurn[];
  /** The learner's new message. */
  message: string;
}

export interface AIProvider {
  /** Yields response text incrementally as the model generates it. */
  streamResponse(args: StreamResponseArgs): AsyncIterable<string>;
}
