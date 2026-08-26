import type { QuestionType } from "@/db/generated/enums";
import {
  choiceDataSchema,
  trueFalseDataSchema,
  shortAnswerDataSchema,
  type MultipleChoiceValue,
  type ShortAnswerValue,
  type SingleChoiceValue,
  type TrueFalseValue,
} from "./schemas";

/**
 * Grading (domain layer, §5, §18) — pure functions, no Prisma, no request,
 * no session. This is what makes it unit-testable without a database and
 * safe to trust as the *only* place a score is computed: the Server Action
 * calls this, the client never does, which is the actual enforcement of
 * "a submitted answer can't be tampered with to fake a score" (§12).
 */

export interface GradedAnswer {
  isCorrect: boolean;
  pointsAwarded: number;
}

/**
 * Short-answer matching: case-insensitive, trimmed, internal whitespace
 * collapsed to a single space. Anything fuzzier (typo tolerance, synonyms)
 * is out of scope for this milestone — flagged as a known limitation, not
 * guessed at.
 */
function normalizeShortAnswer(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

function sameOptionSet(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  return b.every((id) => set.has(id));
}

/**
 * Grades one response against its question's real definition.
 *
 * `data` and `value` are `unknown` on purpose: the caller has already
 * looked up which `QuestionType` this question actually is from the
 * database (never from anything the client asserted) and is handing this
 * function the matching schema's parsed shape below. If either the
 * question's own stored `data` or the learner's `value` fails validation,
 * grading fails closed — zero points, not a thrown error, since a bad seed
 * row or a malformed response is not the learner's fault to be crashed by.
 */
export function gradeAnswer(
  type: QuestionType,
  points: number,
  data: unknown,
  value: unknown
): GradedAnswer {
  const zero: GradedAnswer = { isCorrect: false, pointsAwarded: 0 };

  switch (type) {
    case "SINGLE_CHOICE": {
      const parsedData = choiceDataSchema.safeParse(data);
      if (!parsedData.success) return zero;
      const v = value as SingleChoiceValue | undefined;
      if (!v || typeof v.selectedOptionId !== "string") return zero;

      const isCorrect = parsedData.data.correctOptionIds.includes(
        v.selectedOptionId
      );
      return { isCorrect, pointsAwarded: isCorrect ? points : 0 };
    }

    case "MULTIPLE_CHOICE": {
      const parsedData = choiceDataSchema.safeParse(data);
      if (!parsedData.success) return zero;
      const v = value as MultipleChoiceValue | undefined;
      if (!v || !Array.isArray(v.selectedOptionIds)) return zero;

      // Exact match required — no partial credit for a subset of correct
      // options. Simpler and unambiguous; partial credit is a scoring
      // policy nuance this milestone doesn't need to guess at.
      const isCorrect = sameOptionSet(
        parsedData.data.correctOptionIds,
        v.selectedOptionIds
      );
      return { isCorrect, pointsAwarded: isCorrect ? points : 0 };
    }

    case "TRUE_FALSE": {
      const parsedData = trueFalseDataSchema.safeParse(data);
      if (!parsedData.success) return zero;
      const v = value as TrueFalseValue | undefined;
      if (!v || typeof v.answer !== "boolean") return zero;

      const isCorrect = v.answer === parsedData.data.correctAnswer;
      return { isCorrect, pointsAwarded: isCorrect ? points : 0 };
    }

    case "SHORT_ANSWER": {
      const parsedData = shortAnswerDataSchema.safeParse(data);
      if (!parsedData.success) return zero;
      const v = value as ShortAnswerValue | undefined;
      if (!v || typeof v.text !== "string") return zero;

      const accepted = new Set(
        parsedData.data.acceptedAnswers.map(normalizeShortAnswer)
      );
      const isCorrect = accepted.has(normalizeShortAnswer(v.text));
      return { isCorrect, pointsAwarded: isCorrect ? points : 0 };
    }

    default: {
      // CODE / MATCHING / ORDERING / DRAG_DROP / SIMULATION: structurally
      // anticipated by the enum (§18) but have no grading implementation
      // yet. Failing closed here — rather than a compile-time exhaustive
      // switch — is deliberate: the enum can grow ahead of this function
      // without breaking the build, since the seed data and UI don't yet
      // produce these types either.
      return zero;
    }
  }
}

/**
 * Rolls per-question results into an attempt-level score.
 *
 * Percentage of *points*, not of question count — a 1-point true/false
 * question and a 3-point short answer don't weigh the same.
 */
export function summarizeScore(
  graded: readonly { pointsAwarded: number }[],
  totalPossiblePoints: number,
  passingScore: number
): { score: number; passed: boolean } {
  if (totalPossiblePoints <= 0) {
    return { score: 0, passed: false };
  }

  const earned = graded.reduce((sum, g) => sum + g.pointsAwarded, 0);
  const score = Math.round((earned / totalPossiblePoints) * 100);
  return { score, passed: score >= passingScore };
}
