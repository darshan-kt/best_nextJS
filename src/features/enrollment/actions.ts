"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getCurrentActor } from "@/features/auth/session";
import { SIGN_IN_PATH } from "@/features/auth/config";
import { redirect } from "next/navigation";
import {
  ENROLL_FAILURE_MESSAGES,
  enrollStudentInCourse,
} from "./enroll-student";

/**
 * Server Action adapter for enrollment (§31: authenticate → validate →
 * execute → return a structured result).
 *
 * Thin on purpose. Everything it does is translate between the web and
 * the use case: read the form, validate it, resolve the actor, call
 * `enrollStudentInCourse`, and turn the result into UI state. No business
 * rule lives here — a rule written in a Server Action can only ever be
 * enforced from a form.
 */

export interface EnrollFormState {
  error?: string;
}

// A Server Action is a public HTTP endpoint; the form is not the only
// thing that can call it, so its input is validated like any other
// external input (§9).
const enrollSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1)
    .max(200)
    // Slugs are URL path segments, so anything outside this alphabet is
    // malformed input rather than a lookup that should reach the database.
    .regex(/^[a-z0-9-]+$/i, "Invalid course"),
});

export async function enrollAction(
  _state: EnrollFormState,
  formData: FormData
): Promise<EnrollFormState> {
  const parsed = enrollSchema.safeParse({ slug: formData.get("slug") });

  if (!parsed.success) {
    return { error: "Something went wrong. Please refresh and try again." };
  }

  const { slug } = parsed.data;
  const actor = await getCurrentActor();

  // Authentication is enforced server-side, not by hiding the button
  // (§12). An anonymous POST straight to this action lands here.
  if (!actor) {
    redirect(
      `${SIGN_IN_PATH}?callbackUrl=${encodeURIComponent(`/courses/${slug}`)}`
    );
  }

  const result = await enrollStudentInCourse({ actor, courseSlug: slug });

  if (!result.ok) {
    return { error: ENROLL_FAILURE_MESSAGES[result.reason] };
  }

  // The detail page renders enrollment state, so its cache entry is stale
  // the moment this succeeds.
  revalidatePath(`/courses/${slug}`);

  return {};
}
