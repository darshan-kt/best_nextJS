import { Prisma } from "@/db/generated/client";
import { prisma } from "@/db/client";
import { can, type Actor } from "@/features/auth/policy";
import { getCourseWithCurriculum } from "@/features/courses/queries";
import { getEnrollment } from "@/features/enrollment/queries";
import { gradeAnswer, summarizeScore } from "./scoring";
import { getQuizForCourse } from "./queries";
import { questionValueSchemas } from "./schemas";

/**
 * Use case: submit a quiz attempt (§5, application layer).
 *
 * There is deliberately no separate "start attempt" use case. Nothing is
 * persisted until submission — the client collects answers in local state
 * and this is the one write, which sidesteps having to design (and defend)
 * a resumable, autosaved in-progress attempt this milestone doesn't need
 * (§35). `AttemptStatus.IN_PROGRESS` stays reachable in the schema for a
 * future milestone that wants autosave; nothing here ever sets it.
 *
 * Framework-free and result-typed, exactly like `markLessonComplete` beside
 * it: "you can't do that" is an outcome the caller renders, not a fault
 * (§28), and this stays unit-testable without a request.
 */

export type SubmitQuizAttemptFailureReason =
  | "NOT_FOUND"
  | "FORBIDDEN"
  | "ATTEMPT_LIMIT_REACHED";

export type CorrectAnswerSummary =
  | { kind: "CHOICE"; correctOptionIds: string[] }
  | { kind: "TRUE_FALSE"; correctAnswer: boolean }
  | { kind: "SHORT_ANSWER"; acceptedAnswers: string[] };

export interface GradedQuestionResult {
  questionId: string;
  prompt: string;
  points: number;
  pointsAwarded: number;
  isCorrect: boolean;
  explanation: string | null;
  correctAnswer: CorrectAnswerSummary;
}

export interface QuizAttemptResult {
  attemptNumber: number;
  score: number;
  passed: boolean;
  passingScore: number;
  submittedAt: Date;
  answers: GradedQuestionResult[];
  /** Whether another attempt is allowed after this one. */
  canRetake: boolean;
}

export type SubmitQuizAttemptResult =
  | { ok: true; result: QuizAttemptResult }
  | { ok: false; reason: SubmitQuizAttemptFailureReason };

interface SubmitQuizAttemptArgs {
  actor: Actor;
  courseSlug: string;
  quizId: string;
  responses: readonly { questionId: string; value: unknown }[];
}

/** Builds the post-grading "what was actually correct" summary for review. */
function buildCorrectAnswerSummary(
  type: "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "TRUE_FALSE" | "SHORT_ANSWER",
  data: unknown
): CorrectAnswerSummary {
  if (type === "SINGLE_CHOICE" || type === "MULTIPLE_CHOICE") {
    const parsed = data as { correctOptionIds?: unknown };
    return {
      kind: "CHOICE",
      correctOptionIds: Array.isArray(parsed.correctOptionIds)
        ? (parsed.correctOptionIds as string[])
        : [],
    };
  }

  if (type === "TRUE_FALSE") {
    const parsed = data as { correctAnswer?: unknown };
    return {
      kind: "TRUE_FALSE",
      correctAnswer: parsed.correctAnswer === true,
    };
  }

  const parsed = data as { acceptedAnswers?: unknown };
  return {
    kind: "SHORT_ANSWER",
    acceptedAnswers: Array.isArray(parsed.acceptedAnswers)
      ? (parsed.acceptedAnswers as string[])
      : [],
  };
}

class AttemptLimitReachedError extends Error {}

export async function submitQuizAttempt({
  actor,
  courseSlug,
  quizId,
  responses,
}: SubmitQuizAttemptArgs): Promise<SubmitQuizAttemptResult> {
  const course = await getCourseWithCurriculum(courseSlug, actor);
  if (!course) {
    return { ok: false, reason: "NOT_FOUND" };
  }

  // Re-derived fresh, not trusted from anything the client sent — the same
  // shape as `markLessonComplete`'s enrollment check (§12).
  const enrollment = await getEnrollment(actor.id, course.id);
  if (!enrollment || !can(actor, { type: "quiz:attempt", enrollment })) {
    return { ok: false, reason: "FORBIDDEN" };
  }

  // Confirms the quiz actually belongs to *this* course, not merely that
  // it exists somewhere — see the comment on `getQuizForCourse`.
  const quiz = await getQuizForCourse(quizId, course.id);
  if (!quiz) {
    return { ok: false, reason: "NOT_FOUND" };
  }

  // Full question rows, including the correct-answer data the "safe" quiz
  // object above deliberately omits. Read once, here, on the server only.
  const gradableQuestions = await prisma.quizQuestion.findMany({
    where: { quizId: quiz.id },
    // Without an explicit order, Postgres makes no guarantee about row
    // order — the results review must list questions the same way the
    // learner answered them (§26), not however the database happened to
    // return them.
    orderBy: { position: "asc" },
    select: {
      id: true,
      type: true,
      position: true,
      prompt: true,
      explanation: true,
      points: true,
      data: true,
    },
  });

  const responseByQuestionId = new Map(
    responses.map((r) => [r.questionId, r.value])
  );

  const graded = gradableQuestions.map((question) => {
    const rawValue = responseByQuestionId.get(question.id);
    const valueSchema = questionValueSchemas[question.type];
    // Absent or malformed responses grade as unanswered (zero points)
    // rather than rejecting the whole submission — a partially-completed
    // quiz is a normal outcome, not a bad request (§28).
    const parsedValue = valueSchema.safeParse(rawValue);
    const outcome = gradeAnswer(
      question.type,
      question.points,
      question.data,
      parsedValue.success ? parsedValue.data : undefined
    );

    return {
      question,
      responseValue: parsedValue.success ? parsedValue.data : null,
      ...outcome,
    };
  });

  const totalPossiblePoints = gradableQuestions.reduce(
    (sum, q) => sum + q.points,
    0
  );
  const { score, passed } = summarizeScore(
    graded,
    totalPossiblePoints,
    quiz.passingScore
  );

  try {
    const attempt = await prisma.$transaction(async (tx) => {
      const last = await tx.quizAttempt.findFirst({
        where: { quizId: quiz.id, userId: actor.id },
        orderBy: { attemptNumber: "desc" },
        select: { attemptNumber: true },
      });
      const attemptNumber = (last?.attemptNumber ?? 0) + 1;

      // Re-checked here, inside the transaction, so two concurrent
      // submissions cannot both slip in under the limit (§12 defense in
      // depth — the UI already hides the "retake" affordance once
      // exhausted, but that is not where this is actually enforced).
      if (quiz.maxAttempts != null && attemptNumber > quiz.maxAttempts) {
        throw new AttemptLimitReachedError();
      }

      const created = await tx.quizAttempt.create({
        data: {
          quizId: quiz.id,
          userId: actor.id,
          attemptNumber,
          status: "GRADED",
          score,
          passed,
          submittedAt: new Date(),
        },
      });

      await tx.quizAnswer.createMany({
        data: graded.map((g) => ({
          attemptId: created.id,
          questionId: g.question.id,
          response: g.responseValue ?? Prisma.JsonNull,
          isCorrect: g.isCorrect,
          pointsAwarded: g.pointsAwarded,
        })),
      });

      return created;
    });

    const canRetake =
      quiz.maxAttempts == null || attempt.attemptNumber < quiz.maxAttempts;

    return {
      ok: true,
      result: {
        attemptNumber: attempt.attemptNumber,
        score,
        passed,
        passingScore: quiz.passingScore,
        submittedAt: attempt.submittedAt!,
        canRetake,
        answers: graded.map((g) => ({
          questionId: g.question.id,
          prompt: g.question.prompt,
          points: g.question.points,
          pointsAwarded: g.pointsAwarded,
          isCorrect: g.isCorrect,
          explanation: g.question.explanation,
          correctAnswer: buildCorrectAnswerSummary(
            g.question.type as
              | "SINGLE_CHOICE"
              | "MULTIPLE_CHOICE"
              | "TRUE_FALSE"
              | "SHORT_ANSWER",
            g.question.data
          ),
        })),
      },
    };
  } catch (error) {
    if (error instanceof AttemptLimitReachedError) {
      return { ok: false, reason: "ATTEMPT_LIMIT_REACHED" };
    }
    throw error;
  }
}
