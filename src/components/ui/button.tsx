import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Loader2 } from "lucide-react"
import { Slot } from "radix-ui"

import { cn, focusRing } from "@/lib/utils"

/**
 * Interactive states are declared once, here, and every variant inherits
 * them (§21):
 *
 *   focus    — the shared ring from `lib/utils`.
 *   hover    — each variant shifts to its own `-hover` token, never an
 *              opacity fade. `bg-primary/80` used to lighten the whole
 *              button including its text; a dedicated hover colour keeps
 *              contrast intact.
 *   disabled — 50% and no pointer events.
 *   loading  — `data-loading` drives a spinner and `aria-busy`, so a
 *              submitting button no longer looks identical to a disabled
 *              one (it previously had no loading treatment at all).
 *
 * Heights come from the shared control ladder, so a button beside an input
 * is exactly as tall as the input.
 */
const buttonVariants = cva(
  cn(
    "group/button relative inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding font-medium whitespace-nowrap transition-colors select-none",
    focusRing,
    "disabled:pointer-events-none disabled:opacity-50",
    "data-[loading=true]:pointer-events-none",
    "aria-invalid:border-destructive aria-invalid:ring-[3px] aria-invalid:ring-destructive/20",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
  ),
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary-hover",
        outline:
          "border-border bg-background text-foreground hover:border-ring hover:bg-accent hover:text-accent-foreground aria-expanded:bg-accent aria-expanded:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-muted aria-expanded:bg-muted",
        ghost:
          "text-foreground hover:bg-accent hover:text-accent-foreground aria-expanded:bg-accent aria-expanded:text-accent-foreground",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/18 focus-visible:border-destructive/50 focus-visible:ring-destructive/25",
        link: "text-accent-foreground underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-control-sm gap-1.5 rounded-md px-3 text-caption",
        default: "h-control gap-2 px-4 text-body-sm",
        lg: "h-control-lg gap-2 px-5 text-body",
        icon: "size-control",
        "icon-sm": "size-control-sm rounded-md [&_svg:not([class*='size-'])]:size-3.5",
        "icon-lg": "size-control-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
    /** Shows a spinner and blocks interaction while an action is in flight. */
    loading?: boolean
  }

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  loading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      data-loading={loading || undefined}
      // `aria-busy` is what a screen reader announces; the spinner is what
      // a sighted user sees. Both are needed (§24).
      aria-busy={loading || undefined}
      disabled={asChild ? undefined : disabled || loading}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    >
      {loading ? (
        // `data-motion="essential"` exempts it from the global
        // reduced-motion freeze in globals.css — a frozen spinner would
        // stop reporting progress.
        <Loader2
          className="animate-spin"
          data-motion="essential"
          aria-hidden="true"
        />
      ) : null}
      {/* Slot accepts only one element child, so an `asChild` button — a
          Button wrapping a Link — needs its child marked as the slottable
          one before the spinner can sit beside it. */}
      {asChild ? <Slot.Slottable>{children}</Slot.Slottable> : children}
    </Comp>
  )
}

export { Button, buttonVariants }
