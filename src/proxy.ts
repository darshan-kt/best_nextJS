import { NextResponse, type NextRequest } from "next/server";

/**
 * Next's Proxy convention (formerly "Middleware" — renamed in v16; see
 * https://nextjs.org/docs/messages/middleware-to-proxy). Exists solely to
 * attach a per-request Content-Security-Policy header with a fresh nonce
 * (§29, Milestone 12). This is NOT an authorization boundary — see
 * README's "Authorization" section for why access control deliberately
 * stays in Server Components/Actions instead of here, which is bypassable
 * in ways an in-request `can()` check isn't. Setting a response header on
 * every matched request has no such bypass, which is why it's fine to put
 * *this* here.
 *
 * `script-src` carries the real protection: `'strict-dynamic'` plus a
 * nonce means a `<script>` tag an attacker manages to inject doesn't run —
 * it's missing the nonce — even though `'self'`/host-based allowlists
 * would have let it through if it came from an already-trusted origin.
 * Next.js auto-detects the `'nonce-*'` source in this header and applies
 * it to the inline scripts it manages itself (the RSC streaming payload),
 * so nothing else in the app needs to read or thread the nonce through.
 *
 * `style-src` still carries `'unsafe-inline'` — re-examined for the AWS
 * production rollout, not carried forward from Milestone 12 unexamined,
 * and the conclusion changed shape along the way. Two independent things
 * need it, not one:
 *
 *   1. Radix UI (the primitive layer under shadcn/ui) positions overlays
 *      — Dialog, Select, Tooltip, Drawer — by setting inline `style="..."`
 *      from JS, to arbitrary, per-render-computed pixel/transform values.
 *      A nonce can't cover inline style *attributes* at all (nonces only
 *      apply to `<style>` elements), and CSP3's attribute-hashing escape
 *      hatch (`'unsafe-hashes'`) can't either, for a more fundamental
 *      reason: hashing needs a fixed, enumerable set of known strings, and
 *      these values don't exist until the browser lays out that specific
 *      popover on that specific screen.
 *   2. `vaul` (the mobile Drawer, §23) injects a real `<style>` *element*
 *      into `<head>` at runtime — confirmed live, not assumed: an earlier
 *      version of this policy split `style-src` into `style-src-elem`
 *      (no exception) and `style-src-attr` (Radix's exception only),
 *      reasoning that nothing else injects a `<style>` block. Testing the
 *      actual lesson player against that split immediately produced a
 *      real, non-devtools CSP violation from vaul. Its injected CSS is a
 *      fixed string (not per-render-computed like Radix's), so hashing it
 *      is technically possible — but the string lives inside vaul's
 *      bundled `dist` output, not anywhere this app owns; pinning a hash
 *      to it means either hardcoding a value that silently goes stale
 *      (drawer animations breaking with zero build-time signal) on the
 *      next `vaul` version bump, or reaching into another package's
 *      internal bundle output to extract it programmatically — real
 *      fragility either way, not a genuine fix.
 *
 * With both `style-src-elem` and `style-src-attr` needing the same
 * exception, the split earns nothing a single `style-src 'unsafe-inline'`
 * doesn't already cover for modern browsers, while actively regressing
 * older ones (which ignore the split and fall back to enforcing plain
 * `style-src`, breaking both Radix and vaul there). So this stays a single
 * directive — the trade-off itself is real and accepted, not silently
 * carried forward.
 *
 * `img-src` and `media-src` allow exactly the one remote host
 * `next.config.ts`'s `images.remotePatterns` already allowlists for IMAGE
 * content blocks (VIDEO blocks stream from the same host in this seed
 * data), so this doesn't re-litigate that decision in a second place.
 *
 * `frame-src` allows exactly `youtube-nocookie.com` — added for the
 * EMBED content-block type (ROS 2 course Stage 0, curated external
 * videos). Without it, `default-src 'self'` would block the iframe
 * entirely. Scoped to that one host rather than a generic
 * arbitrary-iframe allowance, matching `embedBlockSchema`
 * (`features/learning/schemas.ts`) restricting `provider` to a single
 * literal — the two are the same decision made in both the data layer
 * and the header that enforces it.
 */
export function proxy(request: NextRequest): NextResponse {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const isProduction = process.env.NODE_ENV === "production";

  const csp = [
    `default-src 'self'`,
    // 'unsafe-eval' is dev-only: React's development build uses eval() to
    // reconstruct component stacks for its debugging overlays and says
    // outright that it never does so in production, so this never ships.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isProduction ? "" : " 'unsafe-eval'"}`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: https://interactive-examples.mdn.mozilla.net`,
    `media-src 'self' https://interactive-examples.mdn.mozilla.net`,
    `frame-src https://www.youtube-nocookie.com`,
    `font-src 'self'`,
    `connect-src 'self'`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    // Upgrading http: subresources to https: would break local dev, which
    // serves the app itself over http.
    ...(isProduction ? ["upgrade-insecure-requests"] : []),
  ].join("; ");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    // Skip static assets and image-optimizer output — they never render
    // an inline script, so a CSP header on them is pure overhead.
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
