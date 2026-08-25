import NextAuth from "next-auth";

import { authConfig } from "./config";

/**
 * The single Auth.js instance for the application. Everything else —
 * route handlers, Server Components, Server Actions — imports from here
 * rather than constructing its own.
 */
export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
