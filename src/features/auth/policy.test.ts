import { describe, expect, it } from "vitest";

import { can, type Actor, type EnrollmentSubject, type OwnedSubject } from "./policy";

/**
 * Direct coverage for the `PolicyAction` branches `course-access.test.ts`
 * doesn't reach (§12, §13, Milestone 11).
 *
 * `course-access.test.ts` already covers `course:view`, `course:learn`,
 * `course:enroll`, `progress:mark/view`, and `quiz:attempt/view` — this
 * file is deliberately scoped to what that one doesn't touch: the
 * ownership-based course actions, submissions, admin-only actions, and the
 * ADMIN bypass itself. `chat:send` is included here even though it shares
 * its rule with `progress:mark` in `can()`, because it was never directly
 * asserted anywhere — a future edit to that shared branch could silently
 * change chat's behavior without a single test noticing.
 */

const STUDENT: Actor = { id: "user_student", roles: ["STUDENT"] };
const OTHER_STUDENT: Actor = { id: "user_other_student", roles: ["STUDENT"] };
const INSTRUCTOR: Actor = { id: "user_instructor", roles: ["INSTRUCTOR"] };
const TUTOR: Actor = { id: "user_tutor", roles: ["TUTOR"] };
const MODERATOR: Actor = { id: "user_moderator", roles: ["MODERATOR"] };
const ADMIN: Actor = { id: "user_admin", roles: ["ADMIN"] };

const OWNED_COURSE = { instructorId: INSTRUCTOR.id };
const ACTIVE_ENROLLMENT: EnrollmentSubject = {
  userId: STUDENT.id,
  status: "ACTIVE",
};

describe("can() — ADMIN bypass", () => {
  it("grants an admin every action, bypassing per-resource ownership", () => {
    expect(can(ADMIN, { type: "course:create" })).toBe(true);
    expect(can(ADMIN, { type: "course:update", course: OWNED_COURSE })).toBe(
      true
    );
    expect(can(ADMIN, { type: "course:delete", course: OWNED_COURSE })).toBe(
      true
    );
    expect(can(ADMIN, { type: "user:manageRoles" })).toBe(true);
    expect(can(ADMIN, { type: "admin:access" })).toBe(true);
  });
});

describe("can() — course:create", () => {
  it("requires the INSTRUCTOR role", () => {
    expect(can(INSTRUCTOR, { type: "course:create" })).toBe(true);
    expect(can(STUDENT, { type: "course:create" })).toBe(false);
    expect(can(null, { type: "course:create" })).toBe(false);
  });
});

describe("can() — course:update / course:delete", () => {
  it("grants the owning instructor and denies everyone else", () => {
    expect(
      can(INSTRUCTOR, { type: "course:update", course: OWNED_COURSE })
    ).toBe(true);
    expect(
      can(STUDENT, { type: "course:update", course: OWNED_COURSE })
    ).toBe(false);
  });

  it("lets a moderator update but not delete — deletion cascades further", () => {
    expect(
      can(MODERATOR, { type: "course:update", course: OWNED_COURSE })
    ).toBe(true);
    expect(
      can(MODERATOR, { type: "course:delete", course: OWNED_COURSE })
    ).toBe(false);
  });

  it("denies delete to the owner's non-admin peers", () => {
    expect(
      can(STUDENT, { type: "course:delete", course: OWNED_COURSE })
    ).toBe(false);
  });
});

describe("can() — submission:view / submission:grade", () => {
  const submission: OwnedSubject = { userId: STUDENT.id };

  it("lets the owning student view their own submission", () => {
    expect(can(STUDENT, { type: "submission:view", submission })).toBe(true);
  });

  it("lets instructors, tutors and moderators view any submission", () => {
    expect(can(INSTRUCTOR, { type: "submission:view", submission })).toBe(
      true
    );
    expect(can(TUTOR, { type: "submission:view", submission })).toBe(true);
    expect(can(MODERATOR, { type: "submission:view", submission })).toBe(
      true
    );
  });

  it("denies an unrelated student view access", () => {
    expect(can(OTHER_STUDENT, { type: "submission:view", submission })).toBe(
      false
    );
  });

  it("never lets a submitter grade their own work, whatever their role", () => {
    const ownSubmission: OwnedSubject = { userId: INSTRUCTOR.id };
    expect(
      can(INSTRUCTOR, { type: "submission:grade", submission: ownSubmission })
    ).toBe(false);
  });

  it("lets instructors and tutors grade someone else's submission", () => {
    expect(can(INSTRUCTOR, { type: "submission:grade", submission })).toBe(
      true
    );
    expect(can(TUTOR, { type: "submission:grade", submission })).toBe(true);
  });

  it("denies grading to a moderator (not in the grading role set) and a student", () => {
    expect(can(MODERATOR, { type: "submission:grade", submission })).toBe(
      false
    );
    expect(can(STUDENT, { type: "submission:grade", submission })).toBe(
      false
    );
  });
});

describe("can() — user:manageRoles", () => {
  it("is reachable only through the ADMIN bypass — denied to everyone else", () => {
    expect(can(MODERATOR, { type: "user:manageRoles" })).toBe(false);
    expect(can(INSTRUCTOR, { type: "user:manageRoles" })).toBe(false);
    expect(can(STUDENT, { type: "user:manageRoles" })).toBe(false);
    expect(can(null, { type: "user:manageRoles" })).toBe(false);
  });
});

describe("can() — admin:access", () => {
  it("grants moderators in addition to the ADMIN bypass", () => {
    expect(can(MODERATOR, { type: "admin:access" })).toBe(true);
  });

  it("denies everyone below moderator", () => {
    expect(can(INSTRUCTOR, { type: "admin:access" })).toBe(false);
    expect(can(STUDENT, { type: "admin:access" })).toBe(false);
    expect(can(null, { type: "admin:access" })).toBe(false);
  });
});

describe("can() — chat:send", () => {
  it("shares progress:mark's rule: the enrollment's own active/completed owner only", () => {
    expect(
      can(STUDENT, { type: "chat:send", enrollment: ACTIVE_ENROLLMENT })
    ).toBe(true);

    const completed: EnrollmentSubject = {
      userId: STUDENT.id,
      status: "COMPLETED",
    };
    expect(can(STUDENT, { type: "chat:send", enrollment: completed })).toBe(
      true
    );
  });

  it("denies a cancelled enrollment, someone else's enrollment, and no enrollment at all", () => {
    const cancelled: EnrollmentSubject = {
      userId: STUDENT.id,
      status: "CANCELLED",
    };
    expect(can(STUDENT, { type: "chat:send", enrollment: cancelled })).toBe(
      false
    );

    expect(
      can(OTHER_STUDENT, { type: "chat:send", enrollment: ACTIVE_ENROLLMENT })
    ).toBe(false);

    expect(can(STUDENT, { type: "chat:send", enrollment: null })).toBe(false);
  });

  it("denies even the course's own instructor — previewing creates no enrollment to attach a conversation to", () => {
    expect(
      can(INSTRUCTOR, { type: "chat:send", enrollment: null })
    ).toBe(false);
  });
});
