import { Badge } from "@/components/ui/badge";
import type { SafeQuizQuestion } from "../queries";
import { SingleChoiceQuestion } from "./questions/single-choice-question";
import { MultipleChoiceQuestion } from "./questions/multiple-choice-question";
import { TrueFalseQuestion } from "./questions/true-false-question";
import { ShortAnswerQuestion } from "./questions/short-answer-question";

/**
 * The one place that switches on question type (§18, mirroring
 * `BlockRenderer`'s role for content blocks, §11). Adding a fifth question
 * type is one new component in `questions/` and one new case here.
 *
 * A native `<fieldset>`/`<legend>` groups each question's prompt with its
 * inputs — the accessible-name relationship that lets a screen reader
 * announce "question 3 of 6, multiple choice" as a unit rather than reading
 * option labels with no question attached (§24).
 */
export function QuestionCard({
  index,
  total,
  question,
  value,
  onChange,
}: {
  index: number;
  total: number;
  question: SafeQuizQuestion;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5">
      <legend className="mb-1 flex flex-wrap items-center gap-2 px-0.5 text-body-sm font-medium text-foreground">
        <span className="text-muted-foreground">
          Question {index} of {total}
        </span>
        <Badge variant="secondary">{question.points} pt{question.points === 1 ? "" : "s"}</Badge>
      </legend>

      <p className="text-body text-foreground text-pretty">{question.prompt}</p>

      {question.type === "SINGLE_CHOICE" ? (
        <SingleChoiceQuestion
          question={question}
          value={value as never}
          onChange={onChange}
        />
      ) : question.type === "MULTIPLE_CHOICE" ? (
        <MultipleChoiceQuestion
          question={question}
          value={value as never}
          onChange={onChange}
        />
      ) : question.type === "TRUE_FALSE" ? (
        <TrueFalseQuestion
          question={question}
          value={value as never}
          onChange={onChange}
        />
      ) : (
        <ShortAnswerQuestion
          question={question}
          value={value as never}
          onChange={onChange}
        />
      )}
    </fieldset>
  );
}
