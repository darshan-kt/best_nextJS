import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import type { SafeQuizQuestion } from "../../queries";
import type { TrueFalseValue } from "../../schemas";

const OPTIONS = [
  { id: "true", label: "True", answer: true },
  { id: "false", label: "False", answer: false },
] as const;

export function TrueFalseQuestion({
  question,
  value,
  onChange,
}: {
  question: SafeQuizQuestion;
  value: TrueFalseValue | undefined;
  onChange: (value: TrueFalseValue) => void;
}) {
  const selectedId =
    value === undefined ? undefined : value.answer ? "true" : "false";

  return (
    <RadioGroup
      value={selectedId}
      onValueChange={(id) =>
        onChange({ answer: OPTIONS.find((o) => o.id === id)!.answer })
      }
      aria-label={question.prompt}
    >
      {OPTIONS.map((option) => (
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
