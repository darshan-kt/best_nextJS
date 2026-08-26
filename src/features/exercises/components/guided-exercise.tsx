import type { GuidedExerciseConfig } from "../schemas";
import { RichTextView } from "./rich-text-view";

/** "Learner follows detailed steps." (§11) — purely static; nothing here
 *  needs reveal-on-demand the way DEBUGGING's hints or solution do. */
export function GuidedExercise({ config }: { config: GuidedExerciseConfig }) {
  return (
    <div className="flex flex-col gap-5">
      <RichTextView content={config.goal} />

      <ol className="flex flex-col gap-4">
        {config.steps.map((step, index) => (
          <li key={index} className="flex gap-4">
            <div
              className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent text-caption font-medium text-accent-foreground"
              aria-hidden="true"
            >
              {index + 1}
            </div>
            <div className="flex flex-1 flex-col gap-2">
              <p className="font-heading text-body font-medium text-foreground">
                {step.title}
              </p>
              <RichTextView content={step.content} />
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
