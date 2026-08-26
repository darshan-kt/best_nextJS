import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { SafeQuizQuestion } from "../../queries";
import type { MultipleChoiceValue } from "../../schemas";

export function MultipleChoiceQuestion({
  question,
  value,
  onChange,
}: {
  question: SafeQuizQuestion;
  value: MultipleChoiceValue | undefined;
  onChange: (value: MultipleChoiceValue) => void;
}) {
  const selected = new Set(value?.selectedOptionIds ?? []);

  function toggle(optionId: string, checked: boolean) {
    const next = new Set(selected);
    if (checked) {
      next.add(optionId);
    } else {
      next.delete(optionId);
    }
    onChange({ selectedOptionIds: Array.from(next) });
  }

  return (
    <div
      role="group"
      aria-label={question.prompt}
      className="flex flex-col gap-2.5"
    >
      {(question.options ?? []).map((option) => (
        <div key={option.id} className="flex items-center gap-2.5">
          <Checkbox
            id={`${question.id}-${option.id}`}
            checked={selected.has(option.id)}
            onCheckedChange={(checked) => toggle(option.id, checked === true)}
          />
          <Label
            htmlFor={`${question.id}-${option.id}`}
            className="text-body-sm text-foreground"
          >
            {option.label}
          </Label>
        </div>
      ))}
    </div>
  );
}
