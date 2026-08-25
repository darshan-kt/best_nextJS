import type { Prisma } from "@/db/generated/client";
import { isPubliclyVisible, type CourseSubject } from "@/features/auth/policy";

/**
 * Course visibility for the catalogue, expressed twice (§12, §14).
 *
 * `can(actor, { type: "course:view", course })` is the authoritative
 * answer for *one* course. It cannot filter a listing, though: doing so
 * would mean loading every draft in the database into memory in order to
 * reject it — a data-exposure risk and an unbounded query (§10, §26).
 *
 * So the same rule exists in a second form here, as a Prisma `where`
 * clause that pushes the filter into PostgreSQL. The two forms must
 * agree, and the fact that they *can* disagree is the main hazard in this
 * module. Two things guard against it:
 *
 *   1. They sit side by side in this file, so changing one has the other
 *      in view.
 *   2. Callers re-check every returned row through `can()` before
 *      rendering (see `queries.ts`). The SQL narrows; the policy decides.
 *
 * Point 2 is what makes drift fail safe. A `where` that is accidentally
 * too permissive is caught per row and never reaches a user; one that is
 * too strict shows too few courses, which is visible but harmless. The SQL
 * alone can never grant what the policy would deny.
 */

/**
 * The catalogue lists publicly visible courses — published *and* PUBLIC —
 * and nothing else, for every visitor including instructors, moderators
 * and admins.
 *
 * This is deliberately narrower than "courses you are allowed to read". A
 * moderator may read a draft, and an author certainly may read their own,
 * but neither belongs in a discovery surface aimed at learners: it would
 * put half-written courses in front of students the moment an instructor
 * browsed the catalogue. Authoring and moderation get their own listings
 * when those tools are built.
 *
 * Because of that, the clause does not depend on who is asking. When
 * organization-private catalogues arrive (§14) this becomes a function of
 * the actor's memberships — and that is the moment to revisit the pairing
 * with `can()` above, since both sides gain a branch at once.
 */
export const CATALOG_VISIBILITY: Prisma.CourseWhereInput = {
  status: "PUBLISHED",
  visibility: "PUBLIC",
};

/**
 * The policy-side counterpart of {@link CATALOG_VISIBILITY}: whether a
 * course row that came back from the database genuinely belongs in a
 * catalogue listing.
 */
export function isListableInCatalog(course: CourseSubject): boolean {
  return isPubliclyVisible(course);
}
