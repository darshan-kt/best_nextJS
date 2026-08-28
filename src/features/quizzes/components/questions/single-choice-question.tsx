import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import type { SafeQuizQuestion } from "../../queries";
import type { SingleChoiceValue } from "../../schemas";

/**
 * SINGLE_CHOICE and TRUE_FALSE share this component — a true/false question
 * is just a two-option single-choice question at the data layer (see the
 * `TrueFalseQuestion` wrapper), so there is no reason to hand-roll a second
 * radio-group implementation for it (§34).
 */
export function SingleChoiceQuestion({
  question,
  value,
  onChange,
}: {
  question: SafeQuizQuestion;
  value: SingleChoiceValue | undefined;
  onChange: (value: SingleChoiceValue) => void;
}) {
  return (
    // KNOWN ISSUE (found during Stage 7 hardware-course Playwright
    // validation, 2026-08-28): React logs "RadioGroup is changing from
    // uncontrolled to controlled" the first time a learner picks an
    // answer. Root cause: `value` here is `undefined` on first render
    // (nothing selected yet) and becomes a real string once `onChange`
    // fires, which is the exact controlled/uncontrolled transition React
    // warns about. Harmless in practice — selection and grading both work
    // — but real and reproducible on every SINGLE_CHOICE/TRUE_FALSE
    // question in every quiz across the whole LMS, not scoped to one
    // course. Likely fix: default to `value?.selectedOptionId ?? ""` so
    // the prop is controlled from the first render. Not fixed here —
    // out of scope for the work that found it; pick up next time this
    // component is touched.
    <RadioGroup
      value={value?.selectedOptionId}
      onValueChange={(selectedOptionId) => onChange({ selectedOptionId })}
      aria-label={question.prompt}
    >
      {(question.options ?? []).map((option) => (
        <div key={option.id} className="flex items-center gap-2.5">
          <RadioGroupItem
            id={`${question.id}-${option.id}`}
            value={option.id}
          />
          <Label
            htmlFor={`${question.id}-${option.id}`}
            className="text-body-sm text-foreground"
          >
            {option.label}
          </Label>
        </div>
      ))}
    </RadioGroup>
  );
}
