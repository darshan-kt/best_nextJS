import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * The page container (§21 — consistent spacing scale).
 *
 * Every M1–M4 route previously hand-wrote its own shell, and no two agreed:
 * `gap-16 px-6 py-16 sm:px-10` on the home page, `gap-8 px-6 py-12 sm:px-10
 * sm:py-16` on the catalogue, `gap-8 px-6 py-16` with no responsive step at
 * all on the dashboard and admin pages. The gutter, the vertical rhythm and
 * the max width are decisions the design system should make once.
 *
 * Three widths, each with a stated job:
 *
 *   wide   — multi-column content: the catalogue grid, the token showcase.
 *   narrow — single-column reading and forms: dashboard, admin.
 *   focus  — a centred card or message with nothing around it: auth, 403.
 */
const widths = {
  wide: "max-w-5xl",
  narrow: "max-w-3xl",
  focus: "max-w-md",
} as const;

interface PageShellProps extends React.ComponentProps<"div"> {
  width?: keyof typeof widths;
  /** Vertically centres the content — for `focus` pages that are short. */
  centered?: boolean;
}

function PageShell({
  width = "wide",
  centered = false,
  className,
  ...props
}: PageShellProps) {
  return (
    <div
      data-slot="page-shell"
      className={cn(
        "mx-auto flex w-full flex-1 flex-col gap-10 px-6 py-12 sm:px-10 sm:py-16",
        widths[width],
        centered && "justify-center",
        className
      )}
      {...props}
    />
  );
}

/**
 * The page's title block. Keeps the h1 → lede relationship identical on
 * every route; before this, four routes rendered an h1 at four different
 * sizes (`text-4xl sm:text-5xl`, `text-3xl sm:text-4xl`, `text-3xl`,
 * `text-2xl`) with no rule behind the difference.
 */
// `title` is omitted from the native props because the HTML `title`
// attribute is a tooltip string, and this one is rich heading content.
interface PageHeaderProps
  extends Omit<React.ComponentProps<"header">, "title"> {
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Rendered above the title — an eyebrow badge, typically. */
  eyebrow?: React.ReactNode;
  /** Rendered opposite the title on wide viewports — page-level actions. */
  actions?: React.ReactNode;
  /** `display` is reserved for the marketing/landing surface. */
  size?: "display" | "page";
}

function PageHeader({
  title,
  description,
  eyebrow,
  actions,
  size = "page",
  className,
  children,
  ...props
}: PageHeaderProps) {
  return (
    // A container query, not a viewport one: whether the title and the
    // actions fit side by side depends on how wide *this header* is, and a
    // `narrow` shell is 688px wide even on a 1440px display. Keyed on the
    // viewport, the dashboard put a 387px title into a 381px column and
    // broke "Welcome, Sam Rivera" across two lines (§23).
    <header
      className={cn("@container/page-header flex flex-col gap-6", className)}
      {...props}
    >
      <div className="flex flex-col gap-4 @3xl/page-header:flex-row @3xl/page-header:items-start @3xl/page-header:justify-between @3xl/page-header:gap-6">
        <div className="flex min-w-0 flex-col gap-3">
          {eyebrow}

          <h1
            className={cn(
              "font-heading text-balance text-foreground",
              size === "display"
                ? "text-title-lg font-semibold sm:text-display"
                : "text-title font-semibold sm:text-title-lg"
            )}
          >
            {title}
          </h1>

          {description ? (
            <p
              className={cn(
                "max-w-2xl text-pretty text-muted-foreground",
                size === "display" ? "text-lede" : "text-body"
              )}
            >
              {description}
            </p>
          ) : null}
        </div>

        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {actions}
          </div>
        ) : null}
      </div>

      {children}
    </header>
  );
}

export { PageShell, PageHeader };
