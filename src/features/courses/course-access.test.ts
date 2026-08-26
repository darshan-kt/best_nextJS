import { describe, expect, it } from "vitest";

import {
  can,
  type Actor,
  type CourseSubject,
  type EnrollmentSubject,
} from "@/features/auth/policy";
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
 * The second half covers enrollment-gated access (§12): who may reach
 * course content, which is a different question from who may see the
 * course exists. Both live here because they are the same concern —
 * course access — and splitting them across files would invite the two
 * halves to drift the way SQL and policy already can.
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

// --- Enrollment-gated access (§12) -----------------------------------------

const publicCourse: CourseSubject = {
  instructorId: OWNER_ID,
  status: "PUBLISHED",
  visibility: "PUBLIC",
};

const enrolled: EnrollmentSubject = { status: "ACTIVE" };
const completed: EnrollmentSubject = { status: "COMPLETED" };
const cancelled: EnrollmentSubject = { status: "CANCELLED" };

function mayLearn(
  actor: Actor | null,
  enrollment: EnrollmentSubject | null,
  course: CourseSubject = publicCourse
): boolean {
  return can(actor, { type: "course:learn", course, enrollment });
}

describe("enrollment-gated course content", () => {
  it("lets an enrolled learner in", () => {
    expect(mayLearn(learner, enrolled)).toBe(true);
  });

  it("keeps a learner who is not enrolled out", () => {
    // The case that matters: being able to *see* a published course in the
    // catalogue must not imply being able to open its lessons.
    expect(mayLearn(learner, null)).toBe(false);
    expect(can(learner, { type: "course:view", course: publicCourse })).toBe(
      true
    );
  });

  it("keeps an anonymous visitor out even of a public course", () => {
    expect(mayLearn(anonymous, null)).toBe(false);
  });

  it("still admits a learner who has completed the course", () => {
    // Finishing a course must not lock someone out of material they earned.
    expect(mayLearn(learner, completed)).toBe(true);
  });

  it("refuses a cancelled enrollment", () => {
    expect(mayLearn(learner, cancelled)).toBe(false);
  });

  it("admits the author and moderators without an enrollment", () => {
    // Both need to see what learners see, and neither enrolls to do it.
    expect(mayLearn(owner, null)).toBe(true);
    expect(mayLearn(moderator, null)).toBe(true);

    // A different instructor is just another signed-in user here.
    expect(mayLearn(otherInstructor, null)).toBe(false);
  });

  it("does not let a cancelled enrollment override the author's access", () => {
    expect(mayLearn(owner, cancelled)).toBe(true);
  });

  it("gates enrolling itself on the course being self-enrollable", () => {
    const archived: CourseSubject = {
      instructorId: OWNER_ID,
      status: "ARCHIVED",
      visibility: "PUBLIC",
    };
    const priv: CourseSubject = {
      instructorId: OWNER_ID,
      status: "PUBLISHED",
      visibility: "PRIVATE",
    };

    expect(can(learner, { type: "course:enroll", course: publicCourse })).toBe(
      true
    );
    expect(can(learner, { type: "course:enroll", course: archived })).toBe(
      false
    );
    expect(can(learner, { type: "course:enroll", course: priv })).toBe(false);

    // Anonymous users cannot enroll in anything.
    expect(can(anonymous, { type: "course:enroll", course: publicCourse })).toBe(
      false
    );
  });
});
