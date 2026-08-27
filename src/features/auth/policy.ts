import type { RoleName } from "@/db/generated/enums";

/**
 * Centralized authorization policy (§12, §13).
 *
 * Every "is this allowed?" question in the application is answered here,
 * by `can()`. Features must not re-implement role checks locally — a rule
 * that lives in two places eventually disagrees with itself, and the copy
 * someone forgets is a security hole.
 *
 * Design notes:
 *
 *   * Resource subjects are minimal structural shapes (`{ instructorId }`),
 *     not Prisma model types. This keeps the policy layer free of any
 *     dependency on feature modules, so `features/courses` can import
 *     policy without policy importing courses back.
 *
 *   * `Actor | null` is accepted deliberately: "not signed in" is a normal
 *     authorization input, not an error. Callers never have to null-check
 *     before asking.
 *
 *   * Actions form a discriminated union, so adding an action without
 *     handling it is a compile error rather than a silent `false`.
 */

/** The authenticated user, reduced to what authorization actually needs. */
export interface Actor {
  id: string;
  roles: readonly RoleName[];
}

/**
 * Minimal shape of a course for access decisions.
 *
 * `status` and `visibility` are optional because ownership-only actions
 * (`course:update`, `course:delete`) do not need them. Callers that omit
 * them for a read decision get a denial, not an accidental grant — the
 * absence of evidence is never treated as permission.
 */
export interface CourseSubject {
  instructorId: string;
  status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  visibility?: "PUBLIC" | "PRIVATE";
}

/**
 * Whether a course is part of the public catalogue (§14).
 *
 * Both conditions are required: an unpublished course is not public
 * regardless of visibility, and a PRIVATE course is not public regardless
 * of status.
 *
 * PRIVATE currently means "not publicly listed", readable only by its
 * author, moderators and admins. When the Organization domain arrives it
 * gains an ORGANIZATION visibility (or an organization-scoped grant on
 * PRIVATE), which *widens* access from this deny-by-default position. That
 * direction matters: a rule that starts closed and opens up is a feature,
 * whereas one that starts open and has to be narrowed is a leak.
 *
 * Lives here rather than in the courses feature so that `can()` depends on
 * nothing outside the policy layer. `features/courses` imports this; it is
 * never the other way round.
 */
export function isPubliclyVisible(course: CourseSubject): boolean {
  return course.status === "PUBLISHED" && course.visibility === "PUBLIC";
}

/** Minimal shape of any record owned by a single user. */
export interface OwnedSubject {
  userId: string;
}

/**
 * A learner's enrollment in the course being accessed, or null when they
 * have none. Null is a normal input, not an error — "not enrolled" is an
 * answer the policy needs to be able to give.
 *
 * `userId` was added in Milestone 7, for `progress:mark` / `progress:view`
 * — those need to know whose enrollment this is, not only whether it's
 * live, because progress is a personal record rather than shared course
 * content (contrast with `course:learn` below, which never needed it).
 */
export interface EnrollmentSubject {
  userId: string;
  status: "ACTIVE" | "COMPLETED" | "CANCELLED";
}

/**
 * Whether a course accepts self-enrollment (§12).
 *
 * Currently equivalent to being in the public catalogue: you may enroll
 * yourself in anything you could have discovered. Deliberately expressed
 * as its own predicate rather than inlined, because this is the seam where
 * an invitation-only or approval-required policy lands when the product
 * has one — at which point it consults a course field instead of this
 * derivation, and every caller stays unchanged.
 */
export function isOpenForSelfEnrollment(course: CourseSubject): boolean {
  return isPubliclyVisible(course);
}

export type PolicyAction =
  | { type: "course:create" }
  | {
      type: "course:view";
      course: CourseSubject;
      enrollment?: EnrollmentSubject | null;
    }
  | { type: "course:enroll"; course: CourseSubject }
  | {
      type: "course:learn";
      course: CourseSubject;
      enrollment: EnrollmentSubject | null;
    }
  | { type: "course:update"; course: CourseSubject }
  | { type: "course:delete"; course: CourseSubject }
  | { type: "progress:mark"; enrollment: EnrollmentSubject | null }
  | { type: "progress:view"; enrollment: EnrollmentSubject | null }
  | { type: "quiz:attempt"; enrollment: EnrollmentSubject | null }
  | { type: "quiz:view"; enrollment: EnrollmentSubject | null }
  | { type: "chat:send"; enrollment: EnrollmentSubject | null }
  | { type: "submission:view"; submission: OwnedSubject }
  | { type: "submission:grade"; submission: OwnedSubject }
  | { type: "user:manageRoles" }
  | { type: "admin:access" };

function hasRole(actor: Actor, ...roles: readonly RoleName[]): boolean {
  return roles.some((role) => actor.roles.includes(role));
}

/**
 * The single authorization decision point.
 *
 * Returns `true` only when the action is explicitly permitted; every
 * unmatched case denies. Authorization must fail closed — an action nobody
 * remembered to allow should be blocked, never open by default.
 */
export function can(actor: Actor | null, action: PolicyAction): boolean {
  // The public catalogue is the one read that does not require an actor:
  // a published, PUBLIC course is browsable by anyone, signed in or not.
  // Evaluated before the null-actor guard so anonymous discovery is an
  // explicit, auditable grant expressed *through* the policy layer rather
  // than a path that quietly bypasses it (§12).
  //
  // This is the only anonymous grant. Adding a second one should be a
  // deliberate decision, not a convenience.
  if (action.type === "course:view" && isPubliclyVisible(action.course)) {
    return true;
  }

  // Every other action denies without an authenticated actor.
  if (!actor) {
    return false;
  }

  // Administrators bypass per-resource ownership, but this is the only
  // place that shortcut exists, so it stays auditable.
  if (hasRole(actor, "ADMIN")) {
    return true;
  }

  switch (action.type) {
    case "course:create":
      return hasRole(actor, "INSTRUCTOR");

    case "course:view":
      // Publicly visible courses were already granted above, so anything
      // reaching here is unpublished, PRIVATE, or both: readable by its
      // author, moderators, or a learner with a live enrollment (mirrors
      // `course:learn` below). Note that a PUBLISHED but PRIVATE course is
      // therefore *not* readable by an arbitrary signed-in user —
      // publication and audience are separate questions (§14).
      //
      // The enrollment branch matters specifically for a course that goes
      // back to DRAFT mid-authoring (§11's curriculum hierarchy is built
      // incrementally, module by module) while a learner is still actively
      // progressing through it: enrollment, not publish status, is what
      // makes a course "theirs" (§12 — "students can access enrolled
      // courses"), so losing access to material with real progress on it
      // would be a worse failure than an early preview leaking out.
      return (
        action.course.instructorId === actor.id ||
        hasRole(actor, "MODERATOR") ||
        (action.enrollment?.userId === actor.id &&
          (action.enrollment.status === "ACTIVE" ||
            action.enrollment.status === "COMPLETED"))
      );

    case "course:enroll":
      // Self-enrollment is limited to courses the actor could have found
      // in the catalogue. Note this asks only whether the *actor* may
      // enroll; whether the course is in a state that accepts enrollments
      // at all is a domain question, answered by the enroll use case, and
      // the two must not be conflated — an administrator passes this check
      // and is still refused enrollment in an archived course.
      return isOpenForSelfEnrollment(action.course);

    case "course:learn":
      // Enrollment-gated content (§12). Instructors reach their own
      // course without enrolling in it, and moderators reach any course,
      // because both need to see what learners see.
      //
      // COMPLETED still grants access: finishing a course should not lock
      // someone out of material they earned. CANCELLED does not.
      if (
        action.enrollment?.status === "ACTIVE" ||
        action.enrollment?.status === "COMPLETED"
      ) {
        return true;
      }

      return (
        action.course.instructorId === actor.id || hasRole(actor, "MODERATOR")
      );

    case "progress:mark":
    case "progress:view":
    case "quiz:attempt":
    case "quiz:view":
    case "chat:send":
      // Progress is a personal record of *this learner's own* completion,
      // not course content — deliberately not the same rule as
      // `course:learn` above. An instructor or moderator previewing a
      // course creates no `Enrollment` row, so there is nothing valid for
      // a completion record to attach to; letting them through here would
      // mean either silently doing nothing or writing progress that
      // belongs to no one. Ownership is required in addition to the
      // enrollment being live — checked here, once, rather than left for
      // every call site to reimplement (§13).
      //
      // A quiz attempt and a chat conversation are the same kind of
      // personal record as lesson progress (Milestones 7, 8, 10), so all
      // three share this rule rather than `course:learn`'s bypass — an
      // author previewing their own course has nothing valid for an
      // attempt, or a conversation, to attach to either.
      return (
        action.enrollment?.userId === actor.id &&
        (action.enrollment.status === "ACTIVE" ||
          action.enrollment.status === "COMPLETED")
      );

    case "course:update":
      return (
        action.course.instructorId === actor.id || hasRole(actor, "MODERATOR")
      );

    case "course:delete":
      // Deliberately stricter than update: deletion cascades through
      // sections, lessons and content, so moderators cannot do it.
      return action.course.instructorId === actor.id;

    case "submission:view":
      return (
        action.submission.userId === actor.id ||
        hasRole(actor, "INSTRUCTOR", "TUTOR", "MODERATOR")
      );

    case "submission:grade":
      // Grading your own work is never permitted, whatever your role.
      return (
        action.submission.userId !== actor.id &&
        hasRole(actor, "INSTRUCTOR", "TUTOR")
      );

    case "user:manageRoles":
      // Reachable only via the ADMIN shortcut above.
      return false;

    case "admin:access":
      return hasRole(actor, "MODERATOR");

    default: {
      // Exhaustiveness guard: adding a PolicyAction variant without a case
      // fails to compile here rather than silently denying at runtime.
      const exhaustive: never = action;
      void exhaustive;
      return false;
    }
  }
}
