import Link from "next/link";
import { GraduationCap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SignOutButton } from "@/features/auth/components/sign-out-button";
import type { Actor } from "@/features/auth/policy";
import { MobileNavDrawer } from "./mobile-nav-drawer";

const NAV_LINKS = [
  { href: "/courses", label: "Courses" },
  { href: "/hardware", label: "Hardware" },
];

/**
 * Shared top navigation for the site's browsing and account surfaces.
 * Applied per route group through `SiteChrome`, deliberately not through
 * the root layout — see that component for which routes opt out and why.
 *
 * Server Component: the only interactive piece is the mobile drawer,
 * isolated in `MobileNavDrawer` (§7). `actor` decides only which controls
 * to show — never an authorization decision itself (§12); every route it
 * links to enforces its own access rules independently.
 */
export function SiteHeader({ actor }: { actor: Actor | null }) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-sm supports-backdrop-filter:bg-background/85">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6 sm:px-10">
        <Link
          href="/"
          className="flex items-center gap-2 font-heading text-body font-semibold text-foreground"
        >
          <GraduationCap
            className="size-5 text-accent-foreground"
            aria-hidden="true"
          />
          LMS Platform
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => (
            <Button key={link.href} asChild variant="ghost" size="sm">
              <Link href={link.href}>{link.label}</Link>
            </Button>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {actor ? (
            <>
              <Button asChild size="sm">
                <Link href="/dashboard">Dashboard</Link>
              </Button>
              <SignOutButton size="sm" />
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/sign-in">Sign in</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/sign-up">Create free account</Link>
              </Button>
            </>
          )}
        </div>

        <MobileNavDrawer isSignedIn={Boolean(actor)} links={NAV_LINKS} />
      </div>
    </header>
  );
}
