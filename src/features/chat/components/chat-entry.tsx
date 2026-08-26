import { can, type Actor, type EnrollmentSubject } from "@/features/auth/policy";
import { getConversation, getConversationMessages } from "../queries";
import { ChatPanel } from "./chat-panel";

/**
 * Authorization + data-fetching boundary for the course assistant entry
 * point (§12, §16) — mirrors `QuizBlock`'s role for quizzes (Milestone 8).
 * An actor without a valid enrollment (an instructor/moderator previewing
 * their own course) gets no assistant entry point at all, the same
 * omission `progress:view` already makes for `MarkCompleteButton`.
 */
export async function ChatEntry({
  actor,
  enrollment,
  courseId,
  courseSlug,
  lessonSlug,
}: {
  actor: Actor;
  enrollment: EnrollmentSubject | null;
  courseId: string;
  courseSlug: string;
  lessonSlug?: string;
}) {
  if (!can(actor, { type: "chat:send", enrollment })) {
    return null;
  }

  const conversation = await getConversation(actor.id, courseId);
  const messages = conversation
    ? await getConversationMessages(conversation.id)
    : [];

  return (
    <ChatPanel
      courseSlug={courseSlug}
      lessonSlug={lessonSlug}
      initialMessages={messages}
    />
  );
}
