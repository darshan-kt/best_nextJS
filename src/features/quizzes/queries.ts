import { prisma } from "@/db/client";
import type { QuestionType } from "@/db/generated/enums";
import { choiceDataSchema } from "./schemas";

/**
 * Quiz reads (application layer, §5).
 *
 * Every read here is scoped to a specific course via `getQuizForCourse` —
 * a `Quiz` row has no `courseId` of its own (it hangs off a
 * `LessonContentBlock`, per the schema comment on that model), so "does
 * this quiz actually belong to this course" is a join, not an assumption.
 * Skipping that join would let a learner enrolled in course A submit
 * answers against a quiz that only ever appears in course B (§12).
 */

export interface SafeQuestionOption {
  id: string;
  label: string;
}

/**
 * A question with everything needed to *take* the quiz and nothing that
 * would let taking it be trivial: no `correctOptionIds`, no
 * `acceptedAnswers`, no `explanation` (explanations routinely restate or
 * imply the answer, so they are withheld until after grading — see
 * `GradedQuestionResult` in `submit-quiz-attempt.ts`).
 */
export interface SafeQuizQuestion {
  id: string;
  type: QuestionType;
  position: number;
  prompt: string;
  points: number;
  options?: SafeQuestionOption[];
}

export interface QuizAttemptSummary {
  attemptNumber: number;
  score: number;
  passed: boolean;
  submittedAt: Date;
}

export interface QuizForAttempt {
  id: string;
  title: string;
  description: string | null;
  passingScore: number;
  maxAttempts: number | null;
  questions: SafeQuizQuestion[];
}

function toSafeQuestion(question: {
  id: string;
  type: QuestionType;
  position: number;
  prompt: string;
  points: number;
  data: unknown;
}): SafeQuizQuestion {
  const base = {
    id: question.id,
    type: question.type,
    position: question.position,
    prompt: question.prompt,
    points: question.points,
  };

  if (question.type === "SINGLE_CHOICE" || question.type === "MULTIPLE_CHOICE") {
    const parsed = choiceDataSchema.safeParse(question.data);
    return { ...base, options: parsed.success ? parsed.data.options : [] };
  }

  return base;
}

/**
 * The quiz a learner is about to attempt, scoped to the course they reached
 * it through. Null when the quiz doesn't exist, or exists but is not part
 * of this course — the two cases collapse the same way `getLessonContentBlocks`
 * treats a bad row: nothing more to say than "not found" (§26).
 */
export async function getQuizForCourse(
  quizId: string,
  courseId: string
): Promise<QuizForAttempt | null> {
  const quiz = await prisma.quiz.findFirst({
    where: {
      id: quizId,
      contentBlock: { lesson: { section: { courseId } } },
    },
    select: {
      id: true,
      title: true,
      description: true,
      passingScore: true,
      maxAttempts: true,
      questions: {
        orderBy: { position: "asc" },
        select: {
          id: true,
          type: true,
          position: true,
          prompt: true,
          points: true,
          data: true,
        },
      },
    },
  });

  if (!quiz) return null;

  return { ...quiz, questions: quiz.questions.map(toSafeQuestion) };
}

/**
 * A learner's own past attempts on this quiz, most recent first. Ownership
 * is the `userId` filter, exactly like `getEnrollment(actor.id, ...)` never
 * returning anyone else's row — there is no separate authorization check to
 * forget here because the query itself cannot return another learner's
 * attempts.
 */
export async function getQuizAttemptHistory(
  userId: string,
  quizId: string
): Promise<QuizAttemptSummary[]> {
  const attempts = await prisma.quizAttempt.findMany({
    where: { userId, quizId, status: "GRADED" },
    orderBy: { attemptNumber: "desc" },
    select: { attemptNumber: true, score: true, passed: true, submittedAt: true },
  });

  return attempts
    .filter(
      (a): a is typeof a & { score: number; passed: boolean; submittedAt: Date } =>
        a.score !== null && a.passed !== null && a.submittedAt !== null
    )
    .map((a) => ({
      attemptNumber: a.attemptNumber,
      score: a.score,
      passed: a.passed,
      submittedAt: a.submittedAt,
    }));
}
