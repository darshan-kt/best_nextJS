import type { DebuggingExerciseConfig } from "../schemas";
import { HintReveal } from "./hint-reveal";
import { RichTextView } from "./rich-text-view";

/**
 * "Provide a broken system... Do not immediately reveal the solution.
 * Teach systematic debugging." (§11) The scenario is always visible;
 * hints and the solution are behind `HintReveal`'s progressive disclosure
 * so a learner has to actually attempt the debugging process the design
 * doc asks for, rather than the solution appearing alongside the problem.
 */
export function DebuggingExercise({
  config,
}: {
  config: DebuggingExerciseConfig;
}) {
  return (
    <div className="flex flex-col gap-5">
      <RichTextView content={config.scenario} />

      <HintReveal
        hints={config.hints}
        final={{
          label: "Reveal the solution",
          content: (
            <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3.5">
              <div className="flex flex-col gap-1.5">
                <p className="text-caption font-medium text-muted-foreground uppercase">
                  Solution
                </p>
                <RichTextView content={config.solution} />
              </div>

              {config.rootCause ? (
                <div className="flex flex-col gap-1.5 border-t border-border pt-3">
                  <p className="text-caption font-medium text-muted-foreground uppercase">
                    Why it happened
                  </p>
                  <RichTextView content={config.rootCause} />
                </div>
              ) : null}
            </div>
          ),
        }}
      />
    </div>
  );
}
