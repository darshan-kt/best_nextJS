import * as React from "react";
import { AlertTriangle } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/**
 * Structurally identical to EmptyState — same gaps, same icon size, same
 * type steps — so that the two read as one family. Only the colour differs,
 * because only one of them is a failure (§21).
 */
interface ErrorStateProps extends React.ComponentProps<"div"> {
  title?: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
}

function ErrorState({
  title = "Something went wrong",
  description = "We couldn't complete this action. Please try again.",
  onRetry,
  retryLabel = "Try again",
  className,
  ...props
}: ErrorStateProps) {
  return (
    <div
      data-slot="error-state"
      className={cn(
        "flex flex-col items-center justify-center gap-5 rounded-xl border border-destructive/25 bg-destructive/5 px-6 py-14 text-center",
        className
      )}
      {...props}
    >
      <div
        className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive"
        aria-hidden="true"
      >
        <AlertTriangle className="size-6" />
      </div>

      <div className="flex max-w-md flex-col gap-2">
        <p className="font-heading text-title-sm font-semibold text-balance text-foreground">
          {title}
        </p>
        <p className="text-body-sm text-pretty text-muted-foreground">
          {description}
        </p>
      </div>

      {onRetry ? (
        <Button variant="outline" onClick={onRetry}>
          {retryLabel}
        </Button>
      ) : null}
    </div>
  );
}

export { ErrorState };
