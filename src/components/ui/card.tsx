import * as React from "react"
import { Slot } from "radix-ui"

import { cn, focusRingWithin } from "@/lib/utils"

/**
 * `interactive` is the fix for hover/focus drift: the course card used to
 * hand-roll `hover:ring-foreground/20 focus-within:ring-2 focus-within:ring-ring`,
 * a ring that matched nothing else in the app. Any card that is a link now
 * asks for `interactive` and gets the same lift and the same focus ring as
 * every other focusable surface (§21).
 */
function Card({
  className,
  size = "default",
  interactive = false,
  ...props
}: React.ComponentProps<"div"> & {
  size?: "default" | "sm"
  interactive?: boolean
}) {
  return (
    <div
      data-slot="card"
      data-size={size}
      data-interactive={interactive || undefined}
      className={cn(
        "group/card flex flex-col gap-(--card-spacing) overflow-hidden rounded-xl border border-border bg-card py-(--card-spacing) text-body-sm text-card-foreground [--card-spacing:--spacing(5)] has-data-[slot=card-footer]:pb-0 has-[>img:first-child]:pt-0 data-[size=sm]:[--card-spacing:--spacing(4)] *:[img:first-child]:rounded-t-xl *:[img:last-child]:rounded-b-xl",
        interactive && [
          "relative transition-[border-color,box-shadow] hover:border-ring hover:shadow-[0_1px_2px_-1px_oklch(0_0_0/0.08),0_8px_20px_-12px_oklch(0_0_0/0.28)]",
          focusRingWithin,
        ],
        className
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "group/card-header @container/card-header grid auto-rows-min items-start gap-1.5 rounded-t-xl px-(--card-spacing) has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto] [.border-b]:pb-(--card-spacing)",
        className
      )}
      {...props}
    />
  )
}

/**
 * `asChild` lets a card that *is* the page — the sign-in card, say — render
 * its title as a real `h1` instead of a styled div, so the document keeps a
 * correct heading outline (§24).
 */
function CardTitle({
  className,
  asChild = false,
  ...props
}: React.ComponentProps<"div"> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "div"

  return (
    <Comp
      data-slot="card-title"
      className={cn(
        "font-heading text-title-sm font-semibold text-balance text-card-foreground group-data-[size=sm]/card:text-body group-data-[size=sm]/card:font-medium",
        className
      )}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-body-sm text-pretty text-muted-foreground", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-(--card-spacing)", className)}
      {...props}
    />
  )
}

/**
 * The footer owns its own padding. Callers used to override it by hand
 * (`pt-3 pb-(--card-spacing)` on the course card), which is exactly the
 * one-off spacing this pass is removing — a footer is a footer everywhere.
 */
function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "mt-auto flex items-center gap-3 rounded-b-xl border-t border-border bg-muted/40 px-(--card-spacing) py-3 text-caption",
        className
      )}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}
