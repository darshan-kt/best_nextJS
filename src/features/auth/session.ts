import { redirect } from "next/navigation";

import { prisma } from "@/db/client";
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

/**
 * The signed-in user's stored record, or null.
 *
 * Sessions are stateless JWTs, so a token stays valid until it expires
 * even if the user row is gone — an account deleted mid-session, or a
 * database restored from an older backup. Treating that as "signed in"
 * makes every page that loads user data throw.
 *
 * A missing record is therefore reported as not signed in, which is both
 * accurate and safe.
 */
export async function getCurrentUser(): Promise<UserRecord | null> {
  const actor = await getCurrentActor();

  if (!actor) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: actor.id },
    select: { id: true, name: true, email: true, image: true },
  });

  if (!user) {
    return null;
  }

  return { ...user, roles: actor.roles };
}

export interface UserRecord {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  roles: readonly Actor["roles"][number][];
}

/**
 * Requires an authenticated user whose record still exists, redirecting to
 * sign-in otherwise. Use this wherever the page needs user fields; use
 * `requireUser()` when only the id and roles are needed, since that avoids
 * the query entirely.
 */
export async function requireUserRecord(
  callbackUrl?: string
): Promise<UserRecord> {
  const user = await getCurrentUser();

  if (!user) {
    const target = callbackUrl
      ? `${SIGN_IN_PATH}?callbackUrl=${encodeURIComponent(callbackUrl)}`
      : SIGN_IN_PATH;

    redirect(target);
  }

  return user;
}
