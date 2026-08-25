import { forbidden } from "next/navigation";

import { can, type Actor, type PolicyAction } from "./policy";
import { requireUser } from "./session";

/**
 * Server-side enforcement helpers (§12).
 *
 * These are the functions protected routes and Server Actions call. They
 * compose `requireUser()` (authentication) with `can()` (authorization) so
 * that no caller can accidentally check one and forget the other.
 *
 * Enforcement lives here and in the Server Components that call it —
 * deliberately not in middleware. Middleware runs before the request
 * reaches the route and has repeatedly proven to be a bypassable place to
 * put an authorization boundary; it is fine for redirect UX, but the
 * authoritative check belongs next to the data access.
 */

/**
 * Requires an authenticated user permitted to perform `action`.
 *
 * Denial is a 403, not a redirect to sign-in: the user is already
 * authenticated, so sending them to a login form would be a confusing
 * loop. Returns the actor so callers can use it without re-fetching.
 */
export async function requirePermission(
  action: PolicyAction,
  callbackUrl?: string
): Promise<Actor> {
  const actor = await requireUser(callbackUrl);

  if (!can(actor, action)) {
    forbidden();
  }

  return actor;
}

/**
 * Convenience wrapper for the common "is this user allowed into the admin
 * area" check, expressed through the same policy layer rather than by
 * inspecting roles directly.
 */
export async function requireAdminAccess(callbackUrl?: string): Promise<Actor> {
  return requirePermission({ type: "admin:access" }, callbackUrl);
}
