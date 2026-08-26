import { prisma } from "@/db/client";
import type { EnrollmentSubject } from "@/features/auth/policy";

/**
 * Enrollment reads (application layer, §5).
 *
 * Lives in its own feature module rather than under `courses` because
 * progress (Milestone 7) and the student dashboard (Milestone 9) both need
 * enrollment data without needing course data — importing the whole
 * courses feature to ask "is this person enrolled?" would couple them to
 * the wrong thing.
 */

export interface EnrollmentRecord extends EnrollmentSubject {
  id: string;
  enrolledAt: Date;
  completedAt: Date | null;
}

/**
 * The actor's enrollment in a course, or null.
 *
 * Returns null for an anonymous viewer without touching the database:
 * nobody signed out can be enrolled, and skipping the query keeps the
 * catalogue's most common case — a logged-out visitor — at one query
 * instead of two.
 */
export async function getEnrollment(
  userId: string | null,
  courseId: string
): Promise<EnrollmentRecord | null> {
  if (!userId) {
    return null;
  }

  return prisma.enrollment.findUnique({
    // Hits the `[userId, courseId]` unique index.
    where: { userId_courseId: { userId, courseId } },
    select: {
      id: true,
      userId: true,
      status: true,
      enrolledAt: true,
      completedAt: true,
    },
  });
}
