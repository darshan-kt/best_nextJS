import { getCurrentActor } from "@/features/auth/session";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";

/**
 * Wraps a page in the shared site header and footer.
 *
 * Applied per page rather than through the root layout, because two route
 * groups deliberately have no sitewide chrome and putting it in
 * `app/layout.tsx` would force it on them:
 *
 *   * The lesson player (`/courses/[slug]/learn/**`) is meant to be a
 *     distraction-minimised reading surface (§23), and already carries its
 *     own chrome — a back link to the course and the assistant entry
 *     point. A second, unrelated nav bar above that would compete with the
 *     lesson for vertical space and attention.
 *   * Sign-in and sign-up are a vertically centred single card that
 *     assumes it owns the viewport, and `(auth)/layout.tsx` already gives
 *     them a logo link home. A full-width sticky header would fight that
 *     composition for no navigational gain.
 *
 * A route group layout (`app/(marketing)/layout.tsx`) would express this
 * more tersely, but only by moving every one of these routes on disk —
 * `/courses` and `/courses/[slug]/learn` would have to end up in different
 * groups despite sharing a URL prefix, which is precisely the sort of
 * large structural change §39 says not to make for a theoretically tidier
 * pattern. Revisit if a third route group ever needs to opt out.
 *
 * Reads the actor itself rather than taking one as a prop: `auth()` is
 * request-memoised, so a page that already called `getCurrentActor()` pays
 * nothing for this, and every call site is spared threading it through.
 */
export async function SiteChrome({ children }: { children: React.ReactNode }) {
  const actor = await getCurrentActor();

  return (
    <>
      <SiteHeader actor={actor} />
      <main className="flex flex-1 flex-col">{children}</main>
      <SiteFooter />
    </>
  );
}
