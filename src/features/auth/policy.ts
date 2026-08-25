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

/** Minimal shape of a course for ownership decisions. */
export interface CourseSubject {
  instructorId: string;
  status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
}

/** Minimal shape of any record owned by a single user. */
export interface OwnedSubject {
  userId: string;
}

export type PolicyAction =
  | { type: "course:create" }
  | { type: "course:view"; course: CourseSubject }
  | { type: "course:update"; course: CourseSubject }
  | { type: "course:delete"; course: CourseSubject }
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
  // Unauthenticated users can do nothing that reaches this layer. Public
  // read paths (the course catalogue) are not routed through `can()`.
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
      // Published courses are readable by any signed-in user; unpublished
      // ones only by their author. Enrollment-based restrictions arrive
      // with the Enrollment model in Milestone 5.
      return (
        action.course.status === "PUBLISHED" ||
        action.course.instructorId === actor.id ||
        hasRole(actor, "MODERATOR")
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
