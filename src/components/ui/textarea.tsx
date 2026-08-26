import * as React from "react"

import { cn, focusRing } from "@/lib/utils"

/**
 * Kept in step with Input: same border, same shared focus ring, same
 * disabled treatment, and the body step from the type scale rather than a
 * `text-base` that shrinks to `text-sm` at `md`.
 */
function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-20 w-full rounded-lg border border-input bg-transparent px-3 py-2.5 text-body-sm transition-colors placeholder:text-muted-foreground",
        focusRing,
        "disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground disabled:opacity-70",
        "aria-invalid:border-destructive aria-invalid:ring-[3px] aria-invalid:ring-destructive/20",
        "dark:bg-input/30 dark:disabled:bg-input/50",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
