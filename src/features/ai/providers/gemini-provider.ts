import { GoogleGenAI } from "@google/genai";

import { env } from "@/config/env";
import type { AIProvider, ChatTurn, StreamResponseArgs } from "../provider";

/**
 * Google Gemini implementation of `AIProvider` (§15).
 *
 * The one file in the app allowed to import `@google/genai`. Chosen for
 * this milestone specifically because it has a genuinely free API tier —
 * a paid provider (Anthropic, OpenAI, ...) is the stated future direction,
 * at which point this file gets a sibling, not a rewrite.
 */

const client = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

function toGeminiRole(role: ChatTurn["role"]): "user" | "model" {
  // Gemini's `Content.role` accepts only "user" | "model" — there is no
  // "assistant", unlike the vendor-neutral `ChatTurn` this maps from.
  return role === "assistant" ? "model" : "user";
}

export const geminiProvider: AIProvider = {
  async *streamResponse({
    systemPrompt,
    history,
    message,
  }: StreamResponseArgs): AsyncIterable<string> {
    const contents = [
      ...history.map((turn) => ({
        role: toGeminiRole(turn.role),
        parts: [{ text: turn.content }],
      })),
      { role: "user" as const, parts: [{ text: message }] },
    ];

    const stream = await client.models.generateContentStream({
      model: env.GEMINI_MODEL,
      contents,
      config: { systemInstruction: systemPrompt },
    });

    for await (const chunk of stream) {
      // `text` concatenates every text part of the first candidate;
      // undefined on a chunk that carried no text (e.g. safety metadata
      // only), which is a normal chunk to skip, not an error.
      const text = chunk.text;
      if (text) {
        yield text;
      }
    }
  },
};
