import Link from "next/link";
import { GraduationCap } from "lucide-react";

const PLATFORM_LINKS = [
  { href: "/courses", label: "Course catalogue" },
  { href: "/hardware", label: "Hardware catalogue" },
  { href: "/dashboard", label: "Dashboard" },
];

const ACCOUNT_LINKS = [
  { href: "/sign-in", label: "Sign in" },
  { href: "/sign-up", label: "Create account" },
];

/**
 * Deliberately small (§35 — don't overbuild ahead of real need). No
 * privacy/terms/social columns: those routes don't exist yet, and a
 * footer full of dead links would undercut the "production-grade" feel
 * this page is going for more than a short one does.
 */
export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-secondary/40">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-12 sm:px-10">
        <div className="flex flex-col gap-8 sm:flex-row sm:justify-between">
          <div className="flex max-w-xs flex-col gap-3">
            <span className="flex items-center gap-2 font-heading text-body font-semibold text-foreground">
              <GraduationCap
                className="size-5 text-accent-foreground"
                aria-hidden="true"
              />
              LMS Platform
            </span>
            <p className="text-body-sm text-muted-foreground">
              Hands-on courses in robotics and applied AI, with a course
              assistant that knows what lesson you&apos;re on.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:gap-16">
            <div className="flex flex-col gap-3">
              <h3 className="text-caption font-semibold tracking-wide text-muted-foreground uppercase">
                Platform
              </h3>
              <ul className="flex flex-col gap-2">
                {PLATFORM_LINKS.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-body-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col gap-3">
              <h3 className="text-caption font-semibold tracking-wide text-muted-foreground uppercase">
                Account
              </h3>
              <ul className="flex flex-col gap-2">
                {ACCOUNT_LINKS.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-body-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <p className="text-caption text-muted-foreground">
          &copy; {year} LMS Platform. Built for learning by building.
        </p>
      </div>
    </footer>
  );
}
