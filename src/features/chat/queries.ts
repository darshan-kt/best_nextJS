import { prisma } from "@/db/client";
import type { MessageSender } from "@/db/generated/enums";

/**
 * Chat reads (application layer, §5). Like `getEnrollment`, these do not
 * call `can()` themselves — the caller resolves the actor's own enrollment
 * first and decides, via `chat:send`, whether to reach here at all.
 */

export interface ConversationMessage {
  id: string;
  sender: MessageSender;
  content: string;
  createdAt: Date;
}

/**
 * The learner's conversation for this course, creating it on first
 * message. `upsert` on the `[userId, courseId]` unique index — the same
 * shape as `enrollStudentInCourse`'s idempotent enrollment upsert — so a
 * double-submitted first message lands on the same conversation rather
 * than erroring or creating a duplicate.
 */
export async function getOrCreateConversation(
  userId: string,
  courseId: string
): Promise<{ id: string }> {
  return prisma.conversation.upsert({
    where: { userId_courseId: { userId, courseId } },
    create: { userId, courseId },
    update: {},
    select: { id: true },
  });
}

/**
 * The learner's conversation for this course, if one already exists.
 * Read-only — unlike `getOrCreateConversation`, this never creates a row,
 * so simply opening the chat panel on a page view doesn't leave behind an
 * empty conversation for a student who never actually sends a message.
 */
export async function getConversation(
  userId: string,
  courseId: string
): Promise<{ id: string } | null> {
  return prisma.conversation.findUnique({
    where: { userId_courseId: { userId, courseId } },
    select: { id: true },
  });
}

/** A conversation's messages, oldest first — the order they were sent in. */
export async function getConversationMessages(
  conversationId: string
): Promise<ConversationMessage[]> {
  return prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
    select: { id: true, sender: true, content: true, createdAt: true },
  });
}
