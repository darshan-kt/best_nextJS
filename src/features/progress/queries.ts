import { prisma } from "@/db/client";

/**
 * Progress reads (application layer, §5).
 *
 * A raw, scoped read — like `getEnrollment`, it does not call `can()`
 * itself. The caller resolves the actor's own enrollment first (which is
 * how ownership is actually established: `getEnrollment(actor.id, ...)`
 * never returns anyone else's row) and decides, via `progress:view`,
 * whether to request this at all. Folding authorization into the query
 * layer here would be a second, inconsistent place authorization happens
 * in a codebase that otherwise keeps it at one (§12, §31).
 */

/**
 * IDs of the lessons a given enrollment has completed.
 *
 * `null` short-circuits without a query, mirroring `getEnrollment`'s
 * null-`userId` case: no enrollment means no progress to look up.
 */
export async function getCompletedLessonIds(
  enrollmentId: string | null
): Promise<Set<string>> {
  if (!enrollmentId) {
    return new Set();
  }

  const rows = await prisma.lessonProgress.findMany({
    where: { enrollmentId },
    select: { lessonId: true },
  });

  return new Set(rows.map((row) => row.lessonId));
}
