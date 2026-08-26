import { AlertTriangle } from "lucide-react";

import type { ContentBlockType } from "@/db/generated/enums";

/**
 * The catch-all for a block type this player has no renderer for
 * (CALLOUT / FILE / EMBED today, or any type added later before its
 * renderer lands) and for a block whose stored JSON failed validation.
 *
 * Rendering *something* here, rather than silently dropping the block, is
 * the point: a missing block reads to a learner as "the lesson is
 * incomplete," which is a worse and less debuggable failure than an
 * explicit "this part isn't available yet" notice (§28).
 */
export function UnsupportedBlock({
  blockType,
  invalid = false,
}: {
  blockType: ContentBlockType;
  invalid?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-dashed border-border bg-muted/30 px-4 py-3.5 text-body-sm text-muted-foreground">
      <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
      <span>
        {invalid
          ? `This ${blockType.toLowerCase()} block couldn't be displayed.`
          : `${blockType.charAt(0)}${blockType.slice(1).toLowerCase()} content isn't supported in the player yet.`}
      </span>
    </div>
  );
}
