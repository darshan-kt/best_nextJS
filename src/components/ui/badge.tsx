import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn, focusRing } from "@/lib/utils"

/**
 * Uses the shared focus ring rather than its own `ring-[3px]` spelling, and
 * the caption step from the type scale rather than a raw `text-xs`.
 *
 * `accent` is the one badge variant that spends brand colour — reserved for
 * marking the current or primary thing. `secondary` stays neutral so that a
 * list of badges (roles on the dashboard, say) does not turn into a wall of
 * teal (§21 — one accent, used sparingly).
 */
const badgeVariants = cva(
  cn(
    "group/badge inline-flex w-fit shrink-0 items-center justify-center gap-1.5 overflow-hidden rounded-4xl border border-transparent px-2.5 py-0.5 text-caption font-medium whitespace-nowrap transition-colors",
    focusRing,
    "aria-invalid:border-destructive aria-invalid:ring-destructive/20",
    "[&>svg]:pointer-events-none [&>svg]:size-3.5!"
  ),
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a]:hover:bg-primary-hover",
        accent:
          "border-ring/30 bg-accent text-accent-foreground [a]:hover:border-ring",
        secondary:
          "bg-secondary text-secondary-foreground [a]:hover:bg-muted",
        destructive:
          "bg-destructive/10 text-destructive focus-visible:ring-destructive/25 [a]:hover:bg-destructive/18",
        outline:
          "border-border text-foreground [a]:hover:border-ring [a]:hover:bg-accent [a]:hover:text-accent-foreground",
        ghost: "text-muted-foreground [a]:hover:bg-muted",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
