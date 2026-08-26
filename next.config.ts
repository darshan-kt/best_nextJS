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

  // Security response headers (§29, Milestone 12). Content-Security-Policy
  // is deliberately not here: it needs a fresh nonce per request, which a
  // static header list can't produce, so it's set in `src/proxy.ts`
  // instead. These are the headers that don't vary per request.
  async headers() {
    const isProduction = process.env.NODE_ENV === "production";

    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Superseded by the CSP's `frame-ancestors 'none'` in modern
          // browsers, but kept for the older ones that only honor this.
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Denies browser features this app never uses. Extend this list
          // only when a feature actually needs one of them — it should
          // stay a record of what's deliberately off, not a template.
          {
            key: "Permissions-Policy",
            value:
              "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
          // HSTS is only meaningful — and only spec-compliant to send —
          // over HTTPS, which local development isn't.
          ...(isProduction
            ? [
                {
                  key: "Strict-Transport-Security",
                  value: "max-age=63072000; includeSubDomains",
                },
              ]
            : []),
        ],
      },
    ];
  },
};

export default nextConfig;
