import { PrismaAdapter } from "@auth/prisma-adapter";
import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";

import { env } from "@/config/env";
import { prisma } from "@/db/client";
import { PASSWORD_MAX_LENGTH, verifyPassword } from "./password";

import "./types";

export const SIGN_IN_PATH = "/sign-in";

/**
 * Shape accepted by the sign-in form. Intentionally looser than the
 * sign-up schema: existing credentials must be checked as given, not
 * re-validated against rules that may have changed since the account was
 * created. The maximum length still applies as a hashing-cost bound.
 */
const credentialsSchema = z.object({
  email: z.email().max(320),
  password: z.string().min(1).max(PASSWORD_MAX_LENGTH),
});

export const authConfig: NextAuthConfig = {
  // The adapter persists Account/Session/VerificationToken rows for
  // provider-based sign-in. The Credentials provider below does not use
  // it — Auth.js requires JWT sessions with credentials — but wiring it
  // now means adding an OAuth provider later needs no migration.
  adapter: PrismaAdapter(prisma),

  session: { strategy: "jwt" },

  secret: env.AUTH_SECRET,

  pages: {
    signIn: SIGN_IN_PATH,
  },

  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },

      async authorize(rawCredentials) {
        const parsed = credentialsSchema.safeParse(rawCredentials);

        if (!parsed.success) {
          return null;
        }

        const { email, password } = parsed.data;

        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase() },
          select: {
            id: true,
            email: true,
            name: true,
            image: true,
            passwordHash: true,
            roles: { select: { role: true } },
          },
        });

        // A user may exist without a password if they were created through
        // an OAuth provider. Treat that exactly like a wrong password:
        // returning a distinct result would disclose how the account was
        // registered.
        if (!user?.passwordHash) {
          return null;
        }

        const valid = await verifyPassword(password, user.passwordHash);

        if (!valid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          roles: user.roles.map((entry) => entry.role),
        };
      },
    }),
  ],

  callbacks: {
    // Roles are copied into the token at sign-in so that authorization
    // checks on subsequent requests need no database round trip (§26).
    // Consequence: a role change only takes effect on the user's next
    // sign-in. Acceptable while role changes are rare and administrative.
    jwt({ token, user }) {
      if (user?.id) {
        token.id = user.id;
        token.roles = user.roles ?? [];
      }

      return token;
    },

    session({ session, token }) {
      session.user.id = token.id;
      session.user.roles = token.roles ?? [];

      return session;
    },
  },
};
