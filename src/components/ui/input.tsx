import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn, focusRing } from "@/lib/utils"

/**
 * Heights come from the same control ladder as Button, so a field and the
 * button next to it line up (the catalogue search row previously paired a
 * 32px input with a 32px button by coincidence, not by rule).
 *
 * The disabled state fixes a real defect: the old class list carried both
 * `disabled:pointer-events-none` and `disabled:cursor-not-allowed`, and the
 * first suppresses the second, so the not-allowed cursor never rendered.
 * Pointer events stay on and the cursor does its job.
 */
const inputVariants = cva(
  cn(
    "w-full min-w-0 rounded-lg border border-input bg-transparent transition-colors",
    focusRing,
    "file:inline-flex file:border-0 file:bg-transparent file:text-body-sm file:font-medium file:text-foreground",
    "placeholder:text-muted-foreground",
    "disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground disabled:opacity-70",
    "aria-invalid:border-destructive aria-invalid:ring-[3px] aria-invalid:ring-destructive/20",
    "dark:bg-input/30 dark:disabled:bg-input/50"
  ),
  {
    variants: {
      inputSize: {
        sm: "h-control-sm px-2.5 text-caption",
        default: "h-control px-3 text-body-sm",
        lg: "h-control-lg px-3.5 text-body",
      },
    },
    defaultVariants: {
      inputSize: "default",
    },
  }
)

type InputProps = Omit<React.ComponentProps<"input">, "size"> &
  VariantProps<typeof inputVariants>

function Input({ className, type, inputSize, ...props }: InputProps) {
  return (
    <input
      type={type}
      data-slot="input"
      data-size={inputSize ?? "default"}
      className={cn(inputVariants({ inputSize, className }))}
      {...props}
    />
  )
}

export { Input, inputVariants }
