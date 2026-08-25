import { describe, expect, it } from "vitest";

import { can, type Actor, type CourseSubject } from "@/features/auth/policy";
import { CATALOG_VISIBILITY, isListableInCatalog } from "./visibility";

/**
 * The catalogue's SQL filter and the authorization policy must agree
 * (§12, §14).
 *
 * `CATALOG_VISIBILITY` decides which courses PostgreSQL returns;
 * `can(actor, { type: "course:view" })` decides who may read one. They
 * encode the same rule in two languages, and nothing in the type system
 * stops them from drifting apart. If the `where` clause ever selects a
 * course the policy would deny, the catalogue leaks it — so this test
 * pins the two together against fixtures that include the cases most
 * likely to break: unpublished, archived, and the organization-private
 * stand-in.
 *
 * This is an authorization-correctness test, not general coverage.
 */

// --- Fixtures --------------------------------------------------------------

const OWNER_ID = "user_instructor";

interface Fixture {
  name: string;
  course: CourseSubject;
  /** Whether this course belongs in the public catalogue. */
  expectedInCatalog: boolean;
}

const FIXTURES: Fixture[] = [
  {
    name: "published + public",
    course: { instructorId: OWNER_ID, status: "PUBLISHED", visibility: "PUBLIC" },
    expectedInCatalog: true,
  },
  {
    name: "published + private (the organization-private stand-in)",
    course: { instructorId: OWNER_ID, status: "PUBLISHED", visibility: "PRIVATE" },
    expectedInCatalog: false,
  },
  {
    name: "draft + public",
    course: { instructorId: OWNER_ID, status: "DRAFT", visibility: "PUBLIC" },
    expectedInCatalog: false,
  },
  {
    name: "draft + private",
    course: { instructorId: OWNER_ID, status: "DRAFT", visibility: "PRIVATE" },
    expectedInCatalog: false,
  },
  {
    name: "archived + public",
    course: { instructorId: OWNER_ID, status: "ARCHIVED", visibility: "PUBLIC" },
    expectedInCatalog: false,
  },
];

const anonymous: Actor | null = null;
const learner: Actor = { id: "user_learner", roles: ["STUDENT"] };
const owner: Actor = { id: OWNER_ID, roles: ["INSTRUCTOR"] };
const otherInstructor: Actor = { id: "user_other", roles: ["INSTRUCTOR"] };
const moderator: Actor = { id: "user_mod", roles: ["MODERATOR"] };

/**
 * Evaluates `CATALOG_VISIBILITY` against a fixture, the way PostgreSQL
 * would.
 *
 * The clause is currently a flat map of column equality checks, which is
 * why this simple matcher is faithful. The assertion below guards that
 * assumption: if the clause ever grows an operator (`OR`, `not`, `in`),
 * this evaluator stops being an accurate model and the test fails loudly
 * rather than quietly testing the wrong thing.
 */
function matchesCatalogFilter(course: CourseSubject): boolean {
  return Object.entries(CATALOG_VISIBILITY).every(
    ([column, expected]) =>
      course[column as keyof CourseSubject] === expected
  );
}

describe("catalogue visibility", () => {
  it("expresses the filter as plain column equality", () => {
    // Guards the fidelity of `matchesCatalogFilter` above.
    for (const value of Object.values(CATALOG_VISIBILITY)) {
      expect(typeof value).toBe("string");
    }

    expect(Object.keys(CATALOG_VISIBILITY).sort()).toEqual([
      "status",
      "visibility",
    ]);
  });

  it.each(FIXTURES)(
    "selects $name in SQL exactly when the policy lists it",
    ({ course, expectedInCatalog }) => {
      expect(matchesCatalogFilter(course)).toBe(expectedInCatalog);
      expect(isListableInCatalog(course)).toBe(expectedInCatalog);
    }
  );

  it.each(FIXTURES)(
    "never returns $name to an anonymous visitor the policy would deny",
    ({ course, expectedInCatalog }) => {
      // The core invariant: for the catalogue's audience, the SQL filter
      // and `can()` agree exactly. Anything SQL returns, the policy
      // permits — so a row can never reach a visitor who may not read it.
      expect(matchesCatalogFilter(course)).toBe(
        can(anonymous, { type: "course:view", course })
      );

      expect(matchesCatalogFilter(course)).toBe(
        can(learner, { type: "course:view", course })
      );

      expect(expectedInCatalog).toBe(
        can(anonymous, { type: "course:view", course })
      );
    }
  );

  it("is narrower than read access for an author, on purpose", () => {
    const draft = FIXTURES.find((f) => f.name === "draft + public")!.course;

    // The author may read their own draft...
    expect(can(owner, { type: "course:view", course: draft })).toBe(true);
    // ...but it must not appear in a catalogue aimed at learners.
    expect(matchesCatalogFilter(draft)).toBe(false);

    // A different instructor gets no such access.
    expect(can(otherInstructor, { type: "course:view", course: draft })).toBe(
      false
    );
  });

  it("keeps private courses out of the catalogue even for moderators", () => {
    const priv = FIXTURES.find((f) =>
      f.name.startsWith("published + private")
    )!.course;

    expect(can(moderator, { type: "course:view", course: priv })).toBe(true);
    expect(matchesCatalogFilter(priv)).toBe(false);
  });

  it("denies a course whose status or visibility is unknown", () => {
    // Callers that omit these fields must fail closed, never open.
    const partial: CourseSubject = { instructorId: OWNER_ID };

    expect(can(anonymous, { type: "course:view", course: partial })).toBe(false);
    expect(isListableInCatalog(partial)).toBe(false);
    expect(matchesCatalogFilter(partial)).toBe(false);
  });
});
