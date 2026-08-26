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
 * `style-src` stays permissive (`'unsafe-inline'`): a CSP nonce only
 * covers `<style>` elements, not inline `style="..."` attributes, and
 * Radix UI — the primitive layer under shadcn/ui — positions overlays
 * (Dialog, Select, Tooltip, Drawer) by setting `style` from JS. Locking
 * that down would mean replacing how those primitives position themselves,
 * not editing a header, so this is accepted as a real, scoped trade-off
 * rather than worked around.
 *
 * `img-src` and `media-src` allow exactly the one remote host
 * `next.config.ts`'s `images.remotePatterns` already allowlists for IMAGE
 * content blocks (VIDEO blocks stream from the same host in this seed
 * data), so this doesn't re-litigate that decision in a second place.
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
