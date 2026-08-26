import { afterEach, describe, expect, it } from "vitest";

import { env } from "@/config/env";
import { prisma } from "@/db/client";
import type { Actor } from "@/features/auth/policy";
import { rateLimiter } from "@/server/rate-limit";
import { resetDb } from "@/test/reset-db";
import { startChatTurn } from "./send-message";

/**
 * `startChatTurn` is everything that happens *before* the model is called
 * (auth, rate limiting, grounding-context assembly, persisting the
 * learner's own message) — see the comment in `send-message.ts`. Tracing
 * the actual call site confirms `aiProvider.streamResponse` is invoked only
 * in `app/api/chat/route.ts`, after this function returns, so this test's
 * scope is complete without touching Gemini: no network, no real API cost.
 */

afterEach(async () => {
  await resetDb();
});

let n = 0;

async function createEnrolledStudent() {
  n += 1;

  const instructor = await prisma.user.create({
    data: { email: `instructor-${n}@test.local`, name: "Instructor" },
  });

  const course = await prisma.course.create({
    data: {
      slug: `course-${n}`,
      title: `Course ${n}`,
      description: "A course about testing.",
      status: "PUBLISHED",
      visibility: "PUBLIC",
      instructorId: instructor.id,
      publishedAt: new Date(),
    },
  });

  const student = await prisma.user.create({
    data: { email: `student-${n}@test.local`, name: "Student" },
  });
  await prisma.enrollment.create({
    data: { userId: student.id, courseId: course.id, status: "ACTIVE" },
  });
  const actor: Actor = { id: student.id, roles: ["STUDENT"] };

  return { course, student, actor };
}

/**
 * Exhausts the shared chat rate limit for one user directly against the
 * `RateLimiter` singleton, using the exact key format
 * `features/chat/rate-limit.ts`'s private `chatKey()` builds
 * (`chat:user:<id>`). Duplicated here deliberately rather than exported
 * from the app module — `checkChatAllowed`/`consumeChatBudget` are the
 * feature's real public surface; this reaches around them only because
 * driving 30 real `startChatTurn` calls (default limit) would mean 30 real
 * DB round trips just to set up one test.
 */
async function exhaustChatBudget(userId: string) {
  const rule = {
    limit: env.CHAT_RATE_LIMIT_MAX_PER_USER,
    windowMs: env.CHAT_RATE_LIMIT_WINDOW_SECONDS * 1000,
  };
  for (let i = 0; i < env.CHAT_RATE_LIMIT_MAX_PER_USER; i += 1) {
    await rateLimiter.recordFailure(`chat:user:${userId}`, rule);
  }
}

describe("startChatTurn", () => {
  it("persists the learner's message and returns a grounded system prompt", async () => {
    const { course, actor } = await createEnrolledStudent();

    const result = await startChatTurn({
      actor,
      courseSlug: course.slug,
      message: "What is this course about?",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.systemPrompt).toContain(course.title);
    expect(result.history).toEqual([]);

    const messages = await prisma.message.findMany({
      where: { conversationId: result.conversationId },
    });
    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatchObject({
      sender: "STUDENT",
      content: "What is this course about?",
    });
  });

  it("reuses the same conversation across turns and returns prior turns as history", async () => {
    const { course, actor } = await createEnrolledStudent();

    const first = await startChatTurn({
      actor,
      courseSlug: course.slug,
      message: "First question",
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    // The route handler would normally append the assistant's reply here;
    // this test only needs a second student turn to exist to prove history
    // is read back on the next call.
    const second = await startChatTurn({
      actor,
      courseSlug: course.slug,
      message: "Second question",
    });
    expect(second.ok).toBe(true);
    if (!second.ok) return;

    expect(second.conversationId).toBe(first.conversationId);
    expect(second.history).toEqual([
      { role: "user", content: "First question" },
    ]);
  });

  it("returns NOT_FOUND for a nonexistent course slug", async () => {
    const { actor } = await createEnrolledStudent();

    const result = await startChatTurn({
      actor,
      courseSlug: "does-not-exist",
      message: "Hello?",
    });

    expect(result).toEqual({ ok: false, reason: "NOT_FOUND" });
  });

  it("returns FORBIDDEN for an actor with no enrollment in the course", async () => {
    const { course } = await createEnrolledStudent();
    const outsider = await prisma.user.create({
      data: { email: `outsider-${++n}@test.local`, name: "Outsider" },
    });
    const actor: Actor = { id: outsider.id, roles: ["STUDENT"] };

    const result = await startChatTurn({
      actor,
      courseSlug: course.slug,
      message: "Hello?",
    });

    expect(result).toEqual({ ok: false, reason: "FORBIDDEN" });

    const messages = await prisma.message.findMany();
    expect(messages).toHaveLength(0);
  });

  it("returns RATE_LIMITED once the student's message budget is exhausted, before any DB write", async () => {
    const { course, actor } = await createEnrolledStudent();
    await exhaustChatBudget(actor.id);

    const result = await startChatTurn({
      actor,
      courseSlug: course.slug,
      message: "One more, please?",
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("RATE_LIMITED");
    expect(result.retryAfterMs).toBeGreaterThan(0);

    // Checked before the message is persisted (§29) — a throttled request
    // must not still cost a database write.
    const messages = await prisma.message.findMany();
    expect(messages).toHaveLength(0);
  });
});
