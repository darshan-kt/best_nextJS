import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Spacing comes from one `gap` on the flex column rather than a `gap` plus
 * a hand-added `mt-2` on the action, which is how this component and
 * ErrorState ended up with subtly different rhythms (§21).
 */
interface EmptyStateProps extends React.ComponentProps<"div"> {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      data-slot="empty-state"
      className={cn(
        "flex flex-col items-center justify-center gap-5 rounded-xl border border-dashed border-border bg-muted/25 px-6 py-14 text-center",
        className
      )}
      {...props}
    >
      {icon ? (
        <div
          className="flex size-12 items-center justify-center rounded-full bg-accent text-accent-foreground"
          aria-hidden="true"
        >
          {icon}
        </div>
      ) : null}

      <div className="flex max-w-md flex-col gap-2">
        <p className="font-heading text-title-sm font-semibold text-balance text-foreground">
          {title}
        </p>
        {description ? (
          <p className="text-body-sm text-pretty text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>

      {action}
    </div>
  );
}

export { EmptyState };
