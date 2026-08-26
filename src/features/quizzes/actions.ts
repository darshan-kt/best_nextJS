"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getCurrentActor } from "@/features/auth/session";
import { quizResponseEnvelopeSchema } from "./schemas";
import { submitQuizAttempt, type QuizAttemptResult } from "./submit-quiz-attempt";

/**
 * Server Action adapter for quiz submission (§31) — authenticate →
 * validate → call the use case → turn the result into UI state, the same
 * shape every other adapter in this codebase follows.
 *
 * Unlike `markLessonCompleteAction`'s scalar `FormData` fields, one
 * attempt's answers are a variable-length, per-question-shaped structure.
 * Rather than inventing a second Server Action calling convention (a direct
 * function call from a `useTransition` handler) for that reason alone, this
 * keeps the established `useActionState` + `<form action>` pattern: the
 * client serializes `responses` into a single hidden JSON field, parsed and
 * validated here exactly as any other external input must be (§9) — a
 * `JSON.parse` failure is just another shape of "invalid input," handled
 * the same way a missing field would be.
 */

export interface SubmitQuizAttemptFormState {
  error?: string;
  result?: QuizAttemptResult;
}

const formSchema = z.object({
  quizId: z.string().min(1),
  courseSlug: z.string().min(1).max(200),
  lessonSlug: z.string().min(1).max(200),
  responsesJson: z.string().max(50_000),
});

export async function submitQuizAttemptAction(
  _state: SubmitQuizAttemptFormState,
  formData: FormData
): Promise<SubmitQuizAttemptFormState> {
  const parsedForm = formSchema.safeParse({
    quizId: formData.get("quizId"),
    courseSlug: formData.get("courseSlug"),
    lessonSlug: formData.get("lessonSlug"),
    responsesJson: formData.get("responsesJson"),
  });

  if (!parsedForm.success) {
    return { error: "Something went wrong. Please refresh and try again." };
  }

  let payload: unknown;
  try {
    payload = JSON.parse(parsedForm.data.responsesJson);
  } catch {
    return { error: "Something went wrong. Please refresh and try again." };
  }

  const parsedEnvelope = quizResponseEnvelopeSchema.safeParse({
    quizId: parsedForm.data.quizId,
    courseSlug: parsedForm.data.courseSlug,
    lessonSlug: parsedForm.data.lessonSlug,
    responses: payload,
  });

  if (!parsedEnvelope.success) {
    return { error: "Something went wrong. Please refresh and try again." };
  }

  const actor = await getCurrentActor();
  if (!actor) {
    return { error: "You need to sign in to submit this quiz." };
  }

  const { quizId, courseSlug, lessonSlug, responses } = parsedEnvelope.data;
  const outcome = await submitQuizAttempt({
    actor,
    courseSlug,
    quizId,
    responses,
  });

  if (!outcome.ok) {
    const message =
      outcome.reason === "NOT_FOUND"
        ? "This quiz is no longer available."
        : outcome.reason === "ATTEMPT_LIMIT_REACHED"
          ? "You've used all of your attempts for this quiz."
          : "You don't have access to attempt this quiz.";
    return { error: message };
  }

  // The lesson page's own server-rendered attempt history (and the quiz
  // block's "attempts remaining" state) is stale the instant this
  // succeeds — same reasoning as `markLessonCompleteAction`.
  revalidatePath(`/courses/${courseSlug}/learn/${lessonSlug}`);

  return { result: outcome.result };
}
