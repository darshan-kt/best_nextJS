"use client"

import * as React from "react"
import { Progress as ProgressPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function Progress({
  className,
  value,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root>) {
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      // `value` is forwarded, not just consumed below. It was destructured
      // out of props for the indicator transform and never passed on, so
      // Radix saw no value, marked the bar `data-state="indeterminate"` and
      // omitted `aria-valuenow` — the bar looked right and announced
      // nothing. axe does not flag it, because an indeterminate progressbar
      // is a legal state; it is only wrong here because the value is known.
      value={value}
      className={cn(
        "relative flex h-2 w-full items-center overflow-hidden rounded-full bg-muted",
        className
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className="size-full flex-1 rounded-full bg-primary transition-transform"
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  )
}

export { Progress }
