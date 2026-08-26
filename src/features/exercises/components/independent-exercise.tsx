import { CheckCircle2 } from "lucide-react";

import type { IndependentExerciseConfig } from "../schemas";
import { HintReveal } from "./hint-reveal";
import { RichTextView } from "./rich-text-view";

/** "Learner receives a goal with fewer instructions." (§11) — success
 *  criteria stand in for the step-by-step GUIDED gives instead; hints, if
 *  any, are opt-in rather than shown up front, or this would just be a
 *  GUIDED exercise with extra steps. */
export function IndependentExercise({
  config,
}: {
  config: IndependentExerciseConfig;
}) {
  return (
    <div className="flex flex-col gap-5">
      <RichTextView content={config.goal} />

      <div className="flex flex-col gap-2">
        <p className="text-caption font-medium text-muted-foreground uppercase">
          You&apos;ll know you&apos;re done when
        </p>
        <ul className="flex flex-col gap-2">
          {config.successCriteria.map((criterion, index) => (
            <li key={index} className="flex items-start gap-2.5">
              <CheckCircle2
                className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
              <span className="text-body-sm text-foreground">{criterion}</span>
            </li>
          ))}
        </ul>
      </div>

      {config.hints && config.hints.length > 0 ? (
        <HintReveal hints={config.hints} />
      ) : null}
    </div>
  );
}
