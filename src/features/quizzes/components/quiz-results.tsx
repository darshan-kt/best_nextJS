import { CheckCircle2, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { SafeQuizQuestion } from "../queries";
import type { QuizAttemptResult } from "../submit-quiz-attempt";

/**
 * Post-submission review (§18: "Explanations, Feedback"). Correct answers
 * and explanations are safe to show here — grading has already happened
 * server-side, so nothing is being leaked ahead of an attempt (contrast
 * with `SafeQuizQuestion`, which withholds exactly these fields).
 *
 * `questions` is the same safe list used to take the quiz — passed back in
 * only to resolve option *labels* for choice questions, since
 * `CorrectAnswerSummary` carries option ids, not their display text.
 */
export function QuizResults({
  result,
  questions,
}: {
  result: QuizAttemptResult;
  questions: readonly SafeQuizQuestion[];
}) {
  const optionLabelsByQuestionId = new Map(
    questions.map((q) => [
      q.id,
      new Map((q.options ?? []).map((o) => [o.id, o.label])),
    ])
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-center gap-2.5">
          <Badge variant={result.passed ? "accent" : "destructive"}>
            {result.passed ? "Passed" : "Not yet passed"}
          </Badge>
          <span className="text-body-sm text-muted-foreground">
            Attempt {result.attemptNumber}
          </span>
        </div>
        <p className="font-heading text-title-sm text-foreground">
          {result.score}%{" "}
          <span className="text-body-sm font-normal text-muted-foreground">
            (passing score: {result.passingScore}%)
          </span>
        </p>
      </div>

      <ol className="flex flex-col gap-3">
        {result.answers.map((answer, index) => (
          <li
            key={answer.questionId}
            className="flex flex-col gap-2 rounded-xl border border-border bg-card p-5"
          >
            <div className="flex items-start gap-2.5">
              {answer.isCorrect ? (
                <CheckCircle2
                  className="mt-0.5 size-4 shrink-0 text-accent-foreground"
                  aria-hidden="true"
                />
              ) : (
                <XCircle
                  className="mt-0.5 size-4 shrink-0 text-destructive"
                  aria-hidden="true"
                />
              )}
              <div className="flex flex-col gap-1">
                <p className="text-body-sm font-medium text-foreground">
                  {index + 1}. {answer.prompt}
                </p>
                <p className="text-caption text-muted-foreground">
                  {answer.isCorrect
                    ? `Correct — ${answer.pointsAwarded}/${answer.points} pts`
                    : `Incorrect — 0/${answer.points} pts`}
                </p>
                {!answer.isCorrect ? (
                  <p className="text-caption text-muted-foreground">
                    {formatCorrectAnswer(
                      answer.correctAnswer,
                      optionLabelsByQuestionId.get(answer.questionId)
                    )}
                  </p>
                ) : null}
                {answer.explanation ? (
                  <p className="text-body-sm text-muted-foreground">
                    {answer.explanation}
                  </p>
                ) : null}
              </div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function formatCorrectAnswer(
  correctAnswer: QuizAttemptResult["answers"][number]["correctAnswer"],
  optionLabels: Map<string, string> | undefined
): string {
  switch (correctAnswer.kind) {
    case "TRUE_FALSE":
      return `Correct answer: ${correctAnswer.correctAnswer ? "True" : "False"}`;
    case "SHORT_ANSWER":
      return `Accepted answer: ${correctAnswer.acceptedAnswers[0] ?? ""}`;
    case "CHOICE": {
      const labels = correctAnswer.correctOptionIds.map(
        (id) => optionLabels?.get(id) ?? id
      );
      return `Correct answer: ${labels.join(", ")}`;
    }
  }
}
