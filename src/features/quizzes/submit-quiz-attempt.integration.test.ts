import { afterEach, describe, expect, it } from "vitest";

import { prisma } from "@/db/client";
import type { Actor } from "@/features/auth/policy";
import { resetDb } from "@/test/reset-db";
import { submitQuizAttempt } from "./submit-quiz-attempt";

/**
 * `submitQuizAttempt` is the one place a real `prisma.$transaction` runs in
 * this codebase's application layer — the reason integration tests need
 * real Postgres at all rather than a mock (see the plan's test-infra
 * design). Untested before Milestone 11.
 */

afterEach(async () => {
  await resetDb();
});

let n = 0;

const CHOICE_DATA = {
  options: [
    { id: "a", label: "A" },
    { id: "b", label: "B" },
    { id: "c", label: "C" },
  ],
  correctOptionIds: ["b"],
};

async function createQuizFixture(options?: {
  maxAttempts?: number | null;
  passingScore?: number;
}) {
  n += 1;

  const instructor = await prisma.user.create({
    data: { email: `instructor-${n}@test.local`, name: "Instructor" },
  });

  const course = await prisma.course.create({
    data: {
      slug: `course-${n}`,
      title: `Course ${n}`,
      status: "PUBLISHED",
      visibility: "PUBLIC",
      instructorId: instructor.id,
      publishedAt: new Date(),
    },
  });

  const section = await prisma.section.create({
    data: { courseId: course.id, title: "Section 1", position: 1 },
  });

  const lesson = await prisma.lesson.create({
    data: {
      sectionId: section.id,
      courseId: course.id,
      slug: "lesson-1",
      title: "Lesson 1",
      position: 1,
      isPublished: true,
    },
  });

  const quiz = await prisma.quiz.create({
    data: {
      title: `Quiz ${n}`,
      passingScore: options?.passingScore ?? 50,
      maxAttempts: options?.maxAttempts ?? null,
    },
  });

  await prisma.quizQuestion.create({
    data: {
      quizId: quiz.id,
      type: "SINGLE_CHOICE",
      position: 1,
      prompt: "Which option is correct?",
      points: 2,
      data: CHOICE_DATA,
    },
  });

  await prisma.lessonContentBlock.create({
    data: {
      lessonId: lesson.id,
      type: "QUIZ",
      position: 1,
      quizId: quiz.id,
    },
  });

  const student = await prisma.user.create({
    data: { email: `student-${n}@test.local`, name: "Student" },
  });
  await prisma.enrollment.create({
    data: { userId: student.id, courseId: course.id, status: "ACTIVE" },
  });
  const actor: Actor = { id: student.id, roles: ["STUDENT"] };

  return { course, quiz, student, actor };
}

describe("submitQuizAttempt", () => {
  it("grades the attempt, persists it with its answers, and reports canRetake", async () => {
    const { course, quiz, actor } = await createQuizFixture();

    const result = await submitQuizAttempt({
      actor,
      courseSlug: course.slug,
      quizId: quiz.id,
      responses: [{ questionId: "irrelevant", value: {} }],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.result.attemptNumber).toBe(1);
    expect(result.result.canRetake).toBe(true); // maxAttempts null

    const attempts = await prisma.quizAttempt.findMany({
      where: { quizId: quiz.id, userId: actor.id },
    });
    expect(attempts).toHaveLength(1);
    expect(attempts[0].status).toBe("GRADED");

    const answers = await prisma.quizAnswer.findMany({
      where: { attemptId: attempts[0].id },
    });
    expect(answers).toHaveLength(1);
  });

  it("grades a correct SINGLE_CHOICE response and computes score from points, not question count", async () => {
    const { course, quiz, actor } = await createQuizFixture({
      passingScore: 50,
    });
    const question = await prisma.quizQuestion.findFirstOrThrow({
      where: { quizId: quiz.id },
    });

    const result = await submitQuizAttempt({
      actor,
      courseSlug: course.slug,
      quizId: quiz.id,
      responses: [
        { questionId: question.id, value: { selectedOptionId: "b" } },
      ],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.result.score).toBe(100);
    expect(result.result.passed).toBe(true);
    expect(result.result.answers[0].isCorrect).toBe(true);
    // The correct-answer summary is only revealed post-submission.
    expect(result.result.answers[0].correctAnswer).toEqual({
      kind: "CHOICE",
      correctOptionIds: ["b"],
    });
  });

  it("increments attemptNumber across repeated submissions by the same learner", async () => {
    const { course, quiz, actor } = await createQuizFixture();

    await submitQuizAttempt({
      actor,
      courseSlug: course.slug,
      quizId: quiz.id,
      responses: [],
    });
    const second = await submitQuizAttempt({
      actor,
      courseSlug: course.slug,
      quizId: quiz.id,
      responses: [],
    });

    expect(second.ok && second.result.attemptNumber).toBe(2);
  });

  it("enforces maxAttempts inside the transaction, returning ATTEMPT_LIMIT_REACHED", async () => {
    const { course, quiz, actor } = await createQuizFixture({
      maxAttempts: 1,
    });

    const first = await submitQuizAttempt({
      actor,
      courseSlug: course.slug,
      quizId: quiz.id,
      responses: [],
    });
    expect(first.ok && first.result.canRetake).toBe(false);

    const second = await submitQuizAttempt({
      actor,
      courseSlug: course.slug,
      quizId: quiz.id,
      responses: [],
    });
    expect(second).toEqual({ ok: false, reason: "ATTEMPT_LIMIT_REACHED" });

    // The rejected attempt must not have been persisted.
    const attempts = await prisma.quizAttempt.findMany({
      where: { quizId: quiz.id, userId: actor.id },
    });
    expect(attempts).toHaveLength(1);
  });

  it("returns NOT_FOUND for a quiz that belongs to a different course", async () => {
    const { quiz: quizInCourseA } = await createQuizFixture();
    const { course: courseB, actor: actorB } = await createQuizFixture();

    const result = await submitQuizAttempt({
      actor: actorB,
      courseSlug: courseB.slug,
      quizId: quizInCourseA.id,
      responses: [],
    });

    expect(result).toEqual({ ok: false, reason: "NOT_FOUND" });
  });

  it("returns FORBIDDEN for an actor with no enrollment in the course", async () => {
    const { course, quiz } = await createQuizFixture();
    const outsider = await prisma.user.create({
      data: { email: `outsider-${++n}@test.local`, name: "Outsider" },
    });
    const actor: Actor = { id: outsider.id, roles: ["STUDENT"] };

    const result = await submitQuizAttempt({
      actor,
      courseSlug: course.slug,
      quizId: quiz.id,
      responses: [],
    });

    expect(result).toEqual({ ok: false, reason: "FORBIDDEN" });
  });
});
