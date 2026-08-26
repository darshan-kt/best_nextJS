import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // CLAUDE.md is this project's permanent, hand-authored governing
  // instructions file (see project root) — don't let Next.js append
  // auto-generated agent-rules content to it on every `next dev`.
  agentRules: false,

  experimental: {
    // Enables `forbidden()` / `unauthorized()` from next/navigation, which
    // the authorization guards in src/features/auth/guards.ts use to
    // return a real HTTP 403 with a `forbidden.tsx` UI boundary. Without
    // this flag those APIs throw at runtime. Still flagged as
    // experimental by Next, so it is called from exactly one module —
    // replacing it later means editing that module, not every route.
    authInterrupts: true,
  },

  images: {
    // `next/image` refuses to optimize a remote source unless its host is
    // named here. Scoped to exactly the one host used by IMAGE content
    // blocks in development seed data (§26, §32) — media storage stays
    // provider-agnostic in application code; this list is the one place
    // that names an actual host, and it grows by one entry per real
    // provider, never a wildcard.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "interactive-examples.mdn.mozilla.net",
        pathname: "/media/cc0-images/**",
      },
    ],
  },
};

export default nextConfig;
