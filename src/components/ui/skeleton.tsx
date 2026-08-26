import { cn } from "@/lib/utils"

/**
 * The pulse is decorative — it conveys nothing the surrounding
 * `role="status"` does not already announce — so it is *not* marked
 * `data-motion="essential"` and the global reduced-motion rule in
 * globals.css freezes it. That is the correct outcome (§25).
 */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  )
}

export { Skeleton }
