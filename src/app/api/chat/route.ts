import { NextResponse } from "next/server";

import { aiProvider } from "@/features/ai";
import { getCurrentActor } from "@/features/auth/session";
import { appendAssistantMessage, startChatTurn } from "@/features/chat/send-message";
import { sendChatMessageSchema } from "@/features/chat/schemas";

/**
 * Chat streaming endpoint (§31, §16). A Route Handler, not a Server
 * Action: streaming a response body — text arriving incrementally as the
 * model generates it — is exactly what Route Handlers are for, and Server
 * Actions don't stream a growing response the same way.
 *
 * Kept thin per §31: authenticate → validate → `startChatTurn` (the real
 * business logic) → stream the provider's response → persist it. No
 * grounding, authorization, or rate-limit logic lives here.
 */
export async function POST(request: Request): Promise<Response> {
  const actor = await getCurrentActor();
  if (!actor) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = sendChatMessageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { courseSlug, lessonSlug, message } = parsed.data;

  const turn = await startChatTurn({ actor, courseSlug, lessonSlug, message });

  if (!turn.ok) {
    if (turn.reason === "NOT_FOUND") {
      return NextResponse.json({ error: "Course not found." }, { status: 404 });
    }
    if (turn.reason === "RATE_LIMITED") {
      return NextResponse.json(
        { error: "You've reached the message limit for now. Try again shortly." },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil((turn.retryAfterMs ?? 0) / 1000)),
          },
        }
      );
    }
    return NextResponse.json(
      { error: "You don't have access to this course's assistant." },
      { status: 403 }
    );
  }

  const { conversationId, systemPrompt, history } = turn;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();
      let full = "";

      try {
        for await (const chunk of aiProvider.streamResponse({
          systemPrompt,
          history,
          message,
        })) {
          full += chunk;
          controller.enqueue(encoder.encode(chunk));
        }
      } catch (error) {
        // The provider call failed mid-stream (network error, quota
        // exhausted, ...). Whatever text arrived before the failure is
        // still worth keeping — a partial answer is more useful than none
        // — and the client sees a visible note that it was cut short
        // rather than a silently truncated reply (§26, §28).
        console.error("[chat] provider stream failed", error);
        controller.enqueue(
          encoder.encode("\n\n_The assistant's response was interrupted. Please try again._")
        );
      } finally {
        await appendAssistantMessage(conversationId, full);
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
