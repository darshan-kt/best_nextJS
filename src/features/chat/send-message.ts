import { prisma } from "@/db/client";
import { can, type Actor } from "@/features/auth/policy";
import type { ChatTurn } from "@/features/ai";
import { getCourseWithCurriculum } from "@/features/courses/queries";
import { getEnrollment } from "@/features/enrollment/queries";
import {
  findLessonNavigation,
  flattenLessons,
} from "@/features/learning/navigation";
import { getLessonContentBlocks } from "@/features/learning/queries";
import { buildGroundingPrompt, type GroundingLessonInfo } from "./context";
import { getConversationMessages, getOrCreateConversation } from "./queries";
import { checkChatAllowed, consumeChatBudget } from "./rate-limit";

/**
 * Use case: send a message to the course assistant (§5, application
 * layer). Split from the streaming itself, which the Route Handler owns —
 * this is everything that happens *before* the model is called:
 * authorization, rate limiting, grounding-context assembly, and persisting
 * the learner's own message. The Route Handler calls this, then streams
 * `aiProvider.streamResponse(...)` using the result, then calls
 * `appendAssistantMessage` once the stream completes.
 *
 * Result-typed rather than throwing, exactly like `submitQuizAttempt`
 * beside it: "you can't do that yet" (rate limited) or "you can't do that"
 * (forbidden) are outcomes the caller renders, not faults (§28).
 */

export type StartChatTurnFailureReason = "NOT_FOUND" | "FORBIDDEN" | "RATE_LIMITED";

export type StartChatTurnResult =
  | {
      ok: true;
      conversationId: string;
      systemPrompt: string;
      history: ChatTurn[];
    }
  | { ok: false; reason: StartChatTurnFailureReason; retryAfterMs?: number };

interface StartChatTurnArgs {
  actor: Actor;
  courseSlug: string;
  lessonSlug?: string;
  message: string;
}

export async function startChatTurn({
  actor,
  courseSlug,
  lessonSlug,
  message,
}: StartChatTurnArgs): Promise<StartChatTurnResult> {
  const course = await getCourseWithCurriculum(courseSlug, actor);
  if (!course) {
    return { ok: false, reason: "NOT_FOUND" };
  }

  // Re-derived fresh, not trusted from anything the client sent — the same
  // shape every other enrollment-gated action in this codebase uses (§12).
  const enrollment = await getEnrollment(actor.id, course.id);
  if (!enrollment || !can(actor, { type: "chat:send", enrollment })) {
    return { ok: false, reason: "FORBIDDEN" };
  }

  // Checked before any expensive work — the lesson-content fetch and the
  // model call — mirrors the sign-in throttle's "check before hashing"
  // reasoning (§29): a throttled request should cost as little as possible.
  const throttle = await checkChatAllowed(actor.id);
  if (throttle.blocked) {
    return { ok: false, reason: "RATE_LIMITED", retryAfterMs: throttle.retryAfterMs };
  }

  let lessonInfo: GroundingLessonInfo | null = null;
  if (lessonSlug) {
    const lessons = flattenLessons(course.sections);
    const navigation = findLessonNavigation(lessons, lessonSlug);

    // A stale or mistyped lesson slug degrades to course-level grounding
    // rather than failing the whole request — the learner is mid-navigation,
    // not sending a malformed request (§26).
    if (navigation) {
      const blocks = await getLessonContentBlocks(navigation.current.id);
      lessonInfo = { title: navigation.current.title, blocks };
    }
  }

  const systemPrompt = buildGroundingPrompt(
    { title: course.title, description: course.description },
    lessonInfo
  );

  const conversation = await getOrCreateConversation(actor.id, course.id);
  const pastMessages = await getConversationMessages(conversation.id);
  const history: ChatTurn[] = pastMessages.map((m) => ({
    role: m.sender === "ASSISTANT" ? "assistant" : "user",
    content: m.content,
  }));

  // The message is recorded, and budget consumed, before the model is
  // called — a provider failure after this point still counted as a real
  // request against the student's limit and left a record of what they
  // asked, rather than silently vanishing.
  await Promise.all([
    prisma.message.create({
      data: { conversationId: conversation.id, sender: "STUDENT", content: message },
    }),
    consumeChatBudget(actor.id),
  ]);

  return { ok: true, conversationId: conversation.id, systemPrompt, history };
}

/**
 * Persists the assistant's completed reply once streaming finishes.
 * A blank result (an empty stream — a provider error mid-response, say)
 * is not recorded: an empty assistant message would render as a broken
 * bubble and would be replayed as empty history on every future turn.
 */
export async function appendAssistantMessage(
  conversationId: string,
  content: string
): Promise<void> {
  if (!content.trim()) {
    return;
  }

  await prisma.message.create({
    data: { conversationId, sender: "ASSISTANT", content },
  });
}
