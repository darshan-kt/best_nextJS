/**
 * Re-derives `Enrollment.status` from actual progress, across every course.
 *
 * Two jobs, one code path:
 *
 * 1. **Backfill.** Enrollments written before
 *    `reconcileEnrollmentStatus` existed can hold a `COMPLETED` status
 *    that no longer matches their progress — the ROS 2 course's seeded
 *    learner finished it at 3/3 and stayed `COMPLETED` when Module 1 took
 *    it to 6 lessons.
 * 2. **After a content change.** A course gaining or losing published
 *    lessons moves the completion bar for everyone already enrolled.
 *    `db:seed` is the only thing that changes lesson counts in this
 *    codebase today, so `postdb:seed` runs this automatically; when a real
 *    authoring UI exists it should call `reconcileCourseEnrollments` for
 *    the affected course directly rather than re-running this whole sweep.
 *
 * Safe to run repeatedly: reconciliation is idempotent and only writes
 * rows whose derived status actually differs from what is stored.
 */

// Not the Prisma CLI, so nothing has loaded `.env` yet — same situation
// `prisma/seed.ts` and `src/test/integration-setup.ts` both document.
try {
  process.loadEnvFile();
} catch {
  // No `.env` file — fall through to the ambient environment.
}

async function main(): Promise<void> {
  // Imported after the environment is populated, so `@/config/env`'s
  // validation sees the loaded values (`prisma/seed.ts` does the same).
  const { prisma } = await import("../src/db/client.js");
  const { reconcileCourseEnrollments } = await import(
    "../src/features/progress/reconcile-enrollment-status.js"
  );

  try {
    const courses = await prisma.course.findMany({
      select: { id: true, slug: true },
    });

    let changed = 0;
    let inspected = 0;

    for (const course of courses) {
      const outcomes = await reconcileCourseEnrollments(course.id);
      inspected += outcomes.length;

      for (const outcome of outcomes.filter((row) => row.changed)) {
        changed += 1;
        console.log(
          `  ${course.slug}: ${outcome.previousStatus} → ${outcome.status} ` +
            `(${outcome.completedLessonCount}/${outcome.totalLessonCount})`
        );
      }
    }

    console.log(
      `Reconciled ${inspected} enrollment(s) across ${courses.length} course(s); ` +
        `${changed} corrected.`
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
