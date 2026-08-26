"use client";

import { useState } from "react";
import { Lightbulb } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Progressive disclosure for DEBUGGING's required hints and INDEPENDENT's
 * optional ones (§11 of ROS2_COURSE_DESIGN.md: "Do not immediately reveal
 * the solution. Teach systematic debugging."). Ephemeral client state
 * only — nothing here is submitted or persisted, matching the scope
 * decision that these exercises are content-only, not graded.
 *
 * `aria-live="polite"` on the hint list, not a focus move: this is
 * content appended to a list the learner is already looking at (they just
 * clicked "show a hint"), not a phase transition like the quiz runner's —
 * moving focus here would be a worse experience than letting a screen
 * reader announce the addition in place.
 */
export function HintReveal({
  hints,
  final,
}: {
  hints: string[];
  /** Rendered after every hint has been revealed, or on its own explicit
   *  reveal — DEBUGGING's solution, most concretely. */
  final?: { label: string; content: React.ReactNode };
}) {
  const [revealedCount, setRevealedCount] = useState(0);
  const [finalRevealed, setFinalRevealed] = useState(false);

  const allHintsRevealed = revealedCount >= hints.length;

  return (
    <div className="flex flex-col gap-3">
      <ul aria-live="polite" className="flex flex-col gap-2">
        {hints.slice(0, revealedCount).map((hint, index) => (
          <li
            key={index}
            className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3"
          >
            <Lightbulb
              className="mt-0.5 size-4 shrink-0 text-muted-foreground"
              aria-hidden="true"
            />
            <span className="text-body-sm text-foreground">{hint}</span>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap gap-2">
        {!allHintsRevealed ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setRevealedCount((count) => count + 1)}
          >
            {revealedCount === 0 ? "Show a hint" : "Show another hint"}
          </Button>
        ) : null}

        {final && !finalRevealed ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setFinalRevealed(true)}
          >
            {final.label}
          </Button>
        ) : null}
      </div>

      {final && finalRevealed ? final.content : null}
    </div>
  );
}
