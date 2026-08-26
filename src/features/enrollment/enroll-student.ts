import { prisma } from "@/db/client";
import {
  can,
  isOpenForSelfEnrollment,
  type Actor,
} from "@/features/auth/policy";
import type { EnrollmentRecord } from "./queries";

/**
 * Use case: enroll a student in a course (§5, application layer).
 *
 * A discrete operation, deliberately free of framework concerns — no
 * `FormData`, no `redirect()`, no request object. That is what makes it
 * unit-testable and reusable: the Server Action in `actions.ts` is a thin
 * adapter over this, and a future API route or admin tool would be
 * another. Business rules live here, once (§31).
 *
 * Returns a discriminated result rather than throwing. "You are already
 * enrolled" and "this course is archived" are ordinary outcomes the UI
 * must render, not exceptions; reserving throws for genuine faults keeps
 * the two distinguishable at the call site (§28).
 */

export type EnrollFailureReason =
  /** No such course, or one this actor may not even see. */
  | "NOT_FOUND"
  /** The course exists but is not accepting self-enrollment. */
  | "NOT_OPEN"
  /** Authenticated, but not permitted to enroll in this course. */
  | "FORBIDDEN";

export type EnrollResult =
  | {
      ok: true;
      enrollment: EnrollmentRecord;
      /** False when the actor was already enrolled and nothing changed. */
      created: boolean;
    }
  | { ok: false; reason: EnrollFailureReason };

interface EnrollStudentArgs {
  actor: Actor;
  courseSlug: string;
}

export async function enrollStudentInCourse({
  actor,
  courseSlug,
}: EnrollStudentArgs): Promise<EnrollResult> {
  const course = await prisma.course.findUnique({
    where: { slug: courseSlug },
    select: {
      id: true,
      status: true,
      visibility: true,
      instructorId: true,
    },
  });

  // "Not found" also covers courses the actor may not see, so probing
  // slugs cannot reveal which private courses exist (§29).
  if (!course || !can(actor, { type: "course:view", course })) {
    return { ok: false, reason: "NOT_FOUND" };
  }

  // Domain validity and permission are separate questions, checked
  // separately. A course can be perfectly visible to an administrator and
  // still not be accepting enrollments; conflating the two would let the
  // admin bypass in `can()` write an enrollment into an archived course.
  if (!isOpenForSelfEnrollment(course)) {
    return { ok: false, reason: "NOT_OPEN" };
  }

  if (!can(actor, { type: "course:enroll", course })) {
    return { ok: false, reason: "FORBIDDEN" };
  }

  // Idempotent by construction. A double-submitted form, a double-tapped
  // button and a retried request all converge on one row rather than
  // racing to violate the unique constraint: the database decides, not a
  // read-then-write in application code.
  //
  // Re-enrolling after cancelling reactivates the original row, which is
  // why status exists instead of deleting (see schema).
  const existing = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId: actor.id, courseId: course.id } },
    select: { id: true, status: true, enrolledAt: true, completedAt: true },
  });

  if (existing && existing.status !== "CANCELLED") {
    return { ok: true, enrollment: existing, created: false };
  }

  const enrollment = await prisma.enrollment.upsert({
    where: { userId_courseId: { userId: actor.id, courseId: course.id } },
    create: { userId: actor.id, courseId: course.id },
    update: { status: "ACTIVE", completedAt: null },
    select: { id: true, status: true, enrolledAt: true, completedAt: true },
  });

  return { ok: true, enrollment, created: true };
}

/**
 * Human-readable copy for each failure, kept beside the reasons it
 * describes so a new reason cannot be added without deciding what the user
 * is told (§28 — errors must be useful to users, not just developers).
 */
export const ENROLL_FAILURE_MESSAGES: Record<EnrollFailureReason, string> = {
  NOT_FOUND: "That course is no longer available.",
  NOT_OPEN: "This course isn't accepting new enrollments right now.",
  FORBIDDEN: "You don't have access to enroll in this course.",
};
