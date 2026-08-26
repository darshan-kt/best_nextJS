import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SafeQuizQuestion } from "../../queries";
import type { ShortAnswerValue } from "../../schemas";

export function ShortAnswerQuestion({
  question,
  value,
  onChange,
}: {
  question: SafeQuizQuestion;
  value: ShortAnswerValue | undefined;
  onChange: (value: ShortAnswerValue) => void;
}) {
  const inputId = `${question.id}-answer`;

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={inputId} className="sr-only">
        {question.prompt}
      </Label>
      <Input
        id={inputId}
        value={value?.text ?? ""}
        onChange={(event) => onChange({ text: event.target.value })}
        placeholder="Type your answer"
        autoComplete="off"
      />
    </div>
  );
}
