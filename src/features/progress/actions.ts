"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { SIGN_IN_PATH } from "@/features/auth/config";
import { getCurrentActor } from "@/features/auth/session";
import { markLessonComplete } from "./mark-lesson-complete";

/**
 * Server Action adapter for lesson completion (§31), the same shape as
 * `enrollAction` beside it: authenticate → validate → call the use case →
 * turn the result into UI state. No business rule lives here.
 */

export interface MarkLessonCompleteFormState {
  error?: string;
}

// A Server Action is a public HTTP endpoint; its input is validated like
// any other external input (§9), not trusted because it happened to come
// from this app's own form.
const markCompleteSchema = z.object({
  courseSlug: z
    .string()
    .trim()
    .min(1)
    .max(200)
    .regex(/^[a-z0-9-]+$/i, "Invalid course"),
  lessonSlug: z
    .string()
    .trim()
    .min(1)
    .max(200)
    .regex(/^[a-z0-9-]+$/i, "Invalid lesson"),
});

export async function markLessonCompleteAction(
  _state: MarkLessonCompleteFormState,
  formData: FormData
): Promise<MarkLessonCompleteFormState> {
  const parsed = markCompleteSchema.safeParse({
    courseSlug: formData.get("courseSlug"),
    lessonSlug: formData.get("lessonSlug"),
  });

  if (!parsed.success) {
    return { error: "Something went wrong. Please refresh and try again." };
  }

  const { courseSlug, lessonSlug } = parsed.data;
  const actor = await getCurrentActor();

  // Authentication is enforced server-side, not by hiding the button
  // (§12). An anonymous POST straight to this action lands here.
  if (!actor) {
    redirect(
      `${SIGN_IN_PATH}?callbackUrl=${encodeURIComponent(
        `/courses/${courseSlug}/learn/${lessonSlug}`
      )}`
    );
  }

  const result = await markLessonComplete({ actor, courseSlug, lessonSlug });

  if (!result.ok) {
    return {
      error:
        result.reason === "NOT_FOUND"
          ? "That lesson is no longer available."
          : "You don't have access to update progress in this course.",
    };
  }

  // Every surface that renders completion state is stale the moment this
  // succeeds: the lesson itself, the curriculum picker's checkmarks and
  // progress bar, and the course detail page's own progress display.
  revalidatePath(`/courses/${courseSlug}/learn/${lessonSlug}`);
  revalidatePath(`/courses/${courseSlug}/learn`);
  revalidatePath(`/courses/${courseSlug}`);

  return {};
}
