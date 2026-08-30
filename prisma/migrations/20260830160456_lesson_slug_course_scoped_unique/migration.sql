-- Lesson.slug was only unique per section (`Lesson_sectionId_slug_key`),
-- but the lesson player route is flat and course-scoped
-- (/courses/[slug]/learn/[lessonSlug]) — there is no section segment in
-- the URL. Two sections in the same course reusing a slug therefore
-- collided at the routing layer (findLessonNavigation resolved whichever
-- section's lesson came first in curriculum order, silently serving the
-- wrong content for the other section's URL).
--
-- This adds a denormalised `courseId` (mirroring `section.courseId`) and
-- replaces the per-section uniqueness with the actually-required
-- per-course uniqueness. The column is backfilled before being made
-- NOT NULL so this is safe to run against existing data.

-- AddColumn (nullable first, so existing rows can be backfilled)
ALTER TABLE "Lesson" ADD COLUMN "courseId" TEXT;

-- Backfill from the existing Section -> Course relationship
UPDATE "Lesson"
SET "courseId" = "Section"."courseId"
FROM "Section"
WHERE "Section"."id" = "Lesson"."sectionId";

-- Enforce NOT NULL now that every row has a value
ALTER TABLE "Lesson" ALTER COLUMN "courseId" SET NOT NULL;

-- DropIndex (the old, insufficient per-section uniqueness)
DROP INDEX "Lesson_sectionId_slug_key";

-- CreateIndex (the new per-course uniqueness this migration exists for)
CREATE UNIQUE INDEX "Lesson_courseId_slug_key" ON "Lesson"("courseId", "slug");

-- AddForeignKey
ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
