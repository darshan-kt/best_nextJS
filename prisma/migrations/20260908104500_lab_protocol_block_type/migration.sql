-- AlterEnum
-- Additive: `ADD VALUE` appends to the enum's sort order and does not
-- rewrite `LessonContentBlock`, so this is safe on a populated table.
-- Deferred from the Phase 1D/1E migration on purpose — see the enum's own
-- comment in schema.prisma: a value with no schema, renderer or grounding
-- case would have forced the block-coverage test to carry an exemption
-- list. It lands here together with all four.
ALTER TYPE "ContentBlockType" ADD VALUE 'LAB_PROTOCOL';
