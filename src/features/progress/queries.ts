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

/**
 * The same lookup as `getCompletedLessonIds`, batched across every
 * enrollment the dashboard (§44, Milestone 9) needs at once — one query
 * regardless of how many courses a student is enrolled in, rather than one
 * `getCompletedLessonIds` call per course (§26, §42).
 *
 * An enrollment with no completions still gets an entry (an empty set),
 * not a missing map key — so a caller iterating enrollments never has to
 * special-case "never looked up" versus "looked up, found nothing."
 */
export async function getCompletedLessonIdsByEnrollments(
  enrollmentIds: readonly string[]
): Promise<Map<string, Set<string>>> {
  const result = new Map<string, Set<string>>(
    enrollmentIds.map((id) => [id, new Set<string>()])
  );

  if (enrollmentIds.length === 0) {
    return result;
  }

  const rows = await prisma.lessonProgress.findMany({
    where: { enrollmentId: { in: enrollmentIds as string[] } },
    select: { enrollmentId: true, lessonId: true },
  });

  for (const row of rows) {
    result.get(row.enrollmentId)?.add(row.lessonId);
  }

  return result;
}
