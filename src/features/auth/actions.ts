"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { z } from "zod";

import { prisma } from "@/db/client";
import { signIn, signOut } from "./index";
import {
  checkSignInAllowed,
  clearSignInAttempts,
  formatRetryAfter,
  recordSignInFailure,
} from "./rate-limit";
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  hashPassword,
} from "./password";

/**
 * Server Actions for authentication (§31: authenticate → validate →
 * execute → return a structured result).
 *
 * Input is validated here with Zod regardless of any client-side
 * validation, because a Server Action is a public HTTP endpoint and the
 * browser form is not the only thing that can call it (§9).
 */

export interface AuthFormState {
  error?: string;
}

const DEFAULT_REDIRECT = "/dashboard";

const signUpSchema = z.object({
  name: z.string().trim().min(1, "Please enter your name").max(120),
  email: z.email("Please enter a valid email address").max(320),
  password: z
    .string()
    .min(
      PASSWORD_MIN_LENGTH,
      `Password must be at least ${PASSWORD_MIN_LENGTH} characters`
    )
    .max(PASSWORD_MAX_LENGTH),
});

const signInSchema = z.object({
  email: z.email("Please enter a valid email address").max(320),
  password: z
    .string()
    .min(1, "Please enter your password")
    .max(PASSWORD_MAX_LENGTH),
});

function safeCallbackUrl(raw: FormDataEntryValue | null): string {
  const value = typeof raw === "string" ? raw : "";

  // Only same-site, absolute paths. Accepting an arbitrary URL here would
  // be an open redirect: an attacker could send a victim through a genuine
  // sign-in and bounce them to a look-alike site afterwards. `//host` is
  // rejected too, since browsers read it as protocol-relative.
  if (value.startsWith("/") && !value.startsWith("//")) {
    return value;
  }

  return DEFAULT_REDIRECT;
}

/**
 * Authenticates without letting Auth.js perform the redirect itself.
 *
 * `redirect: false` is what makes the try/catch here safe: with it,
 * `signIn` never calls `redirect()`, so nothing in this block can throw a
 * redirect control-flow signal that a `catch` would wrongly swallow. The
 * caller performs the redirect afterwards, outside any handler.
 *
 * Rejected credentials surface as a thrown `CredentialsSignin` (an
 * `AuthError`) rather than as a returned error URL, so both outcomes are
 * handled. Anything that is not an `AuthError` — a database outage, say —
 * is rethrown rather than being reported to the user as a bad password.
 *
 * Returns true when the credentials were accepted and the session cookie
 * has been set.
 */
async function attemptSignIn(
  email: string,
  password: string
): Promise<boolean> {
  let resultUrl: unknown;

  try {
    resultUrl = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return false;
    }

    throw error;
  }

  if (typeof resultUrl !== "string") {
    return false;
  }

  try {
    return !new URL(resultUrl, "http://localhost").searchParams.has("error");
  } catch {
    return false;
  }
}

export async function signUpAction(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const parsed = signUpSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid details" };
  }

  const { name, password } = parsed.data;
  const email = parsed.data.email.toLowerCase();
  const callbackUrl = safeCallbackUrl(formData.get("callbackUrl"));

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  // Account enumeration is accepted here: telling someone their address is
  // already registered is far better UX than a generic failure, and the
  // sign-in form (where it matters more) stays deliberately vague.
  if (existing) {
    return { error: "An account with this email already exists" };
  }

  const passwordHash = await hashPassword(password);

  // Self-service registration always creates a STUDENT. Elevated roles are
  // granted administratively; accepting a role from the sign-up form would
  // let anyone register as an admin (§12).
  await prisma.user.create({
    data: {
      email,
      name,
      passwordHash,
      roles: { create: [{ role: "STUDENT" }] },
    },
  });

  const signedIn = await attemptSignIn(email, password);

  if (!signedIn) {
    // The account does exist at this point, so guide them to sign in
    // rather than reporting a failure that implies it was not created.
    return { error: "Account created. Please sign in." };
  }

  // Outside any try/catch: redirect() works by throwing, and must not be
  // mistaken for a failure.
  redirect(callbackUrl);
}

export async function signInAction(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid credentials" };
  }

  const callbackUrl = safeCallbackUrl(formData.get("callbackUrl"));
  const email = parsed.data.email.toLowerCase();

  // Checked before the password is verified, so a throttled request never
  // reaches scrypt. Note this blocks even a *correct* password: the whole
  // point is that an attacker who eventually guesses right still cannot
  // use it during the cooldown.
  const throttle = await checkSignInAllowed(email);

  if (throttle.blocked) {
    return {
      error: `Too many sign-in attempts. Try again in ${formatRetryAfter(
        throttle.retryAfterMs
      )}.`,
    };
  }

  const signedIn = await attemptSignIn(email, parsed.data.password);

  if (!signedIn) {
    await recordSignInFailure(email);

    // Deliberately identical for "no such user" and "wrong password":
    // distinguishing them would let an attacker enumerate registered
    // addresses.
    return { error: "Invalid email or password" };
  }

  await clearSignInAttempts(email);

  redirect(callbackUrl);
}

export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: "/" });
}
