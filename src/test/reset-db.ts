import { prisma } from "@/db/client";

/**
 * Clears all fixture data between integration tests.
 *
 * Deletes just `User` and `Course` rows — deliberately preferred over
 * listing every table these tests happen to touch today (`Enrollment`,
 * `LessonProgress`, `QuizAttempt`, `Message`, ...): every one of those
 * tables has an `onDelete: Cascade` foreign key back to `User` or `Course`
 * (see `prisma/schema.prisma`), so deleting the parent rows sweeps
 * anything downstream automatically, now or after a future schema change.
 *
 * Safety here does NOT come from using `deleteMany()` instead of raw SQL —
 * neither respects a `?schema=` query-string parameter under
 * `@prisma/adapter-pg` (confirmed: `deleteMany()` landed on `public` just
 * as readily as a raw `TRUNCATE` did, when `TEST_DATABASE_URL` differed
 * from `DATABASE_URL` by `?schema=` alone). Safety comes entirely from
 * `TEST_DATABASE_URL` naming a physically separate Postgres *database*
 * (`lms_test`), enforced by the same-database guard in
 * `integration-setup.ts`. Don't re-introduce a schema-only split.
 */
export async function resetDb(): Promise<void> {
  await prisma.course.deleteMany();
  await prisma.user.deleteMany();
}
