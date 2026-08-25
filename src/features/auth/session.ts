import { redirect } from "next/navigation";

import { auth } from "./index";
import { SIGN_IN_PATH } from "./config";
import type { Actor } from "./policy";

/**
 * Reads the current session and reduces it to an `Actor` — the shape the
 * policy layer works with.
 *
 * Returns null when nobody is signed in. Callers that require a user
 * should use `requireUser()` instead of null-checking this themselves.
 */
export async function getCurrentActor(): Promise<Actor | null> {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  return {
    id: session.user.id,
    roles: session.user.roles ?? [],
  };
}

/**
 * Requires an authenticated user, redirecting to sign-in when absent.
 *
 * `redirect()` throws, so control never returns to the caller when the
 * user is anonymous — the non-null return type is therefore accurate, and
 * protected code below the call cannot accidentally run unauthenticated.
 *
 * `callbackUrl` preserves where the user was heading so they land there
 * after signing in rather than on a generic home page.
 */
export async function requireUser(callbackUrl?: string): Promise<Actor> {
  const actor = await getCurrentActor();

  if (!actor) {
    const target = callbackUrl
      ? `${SIGN_IN_PATH}?callbackUrl=${encodeURIComponent(callbackUrl)}`
      : SIGN_IN_PATH;

    redirect(target);
  }

  return actor;
}
