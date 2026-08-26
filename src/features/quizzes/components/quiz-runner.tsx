"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, ClipboardList, RotateCcw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { QuizAttemptSummary, QuizForAttempt } from "../queries";
import { submitQuizAttemptAction, type SubmitQuizAttemptFormState } from "../actions";
import { QuestionCard } from "./question-card";
import { QuizResults } from "./quiz-results";

/**
 * The interactive quiz-taking flow (§18) — the one client component this
 * milestone adds. Everything around it (the lesson page, `BlockRenderer`,
 * `QuizBlock`) stays server-rendered; this is the smallest boundary that
 * actually needs local interactive state (§7).
 *
 * Three phases, held in local state only — nothing is persisted until
 * submission (see the comment on `submitQuizAttempt`):
 *
 *   summary     — quiz info, past attempts, a Start/Retake button.
 *   in-progress — every question on one page (not a stepper — see below),
 *                 collected into `responses` and submitted as one request.
 *   results     — the just-submitted attempt's full graded breakdown.
 *
 * All questions render at once, in a single scrollable form, rather than a
 * multi-step wizard: it works correctly with nothing beyond native form
 * semantics (Tab order, fieldset/legend grouping), whereas a stepper would
 * need its own focus-management this milestone has no other reason to
 * build (§35). A page reload mid-attempt loses unsaved answers — there is
 * no autosave — which is the direct cost of not persisting an in-progress
 * attempt; documented as a known limitation, not an oversight.
 */

type Phase = "summary" | "in-progress" | "results";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending} className="w-fit">
      {pending ? "Submitting…" : "Submit quiz"}
    </Button>
  );
}

function AttemptHistory({ attempts }: { attempts: readonly QuizAttemptSummary[] }) {
  if (attempts.length === 0) return null;

  return (
    <ul className="flex flex-col gap-1.5">
      {attempts.map((attempt) => (
        <li
          key={attempt.attemptNumber}
          className="flex items-center gap-2 text-body-sm text-muted-foreground"
        >
          <Badge variant={attempt.passed ? "accent" : "secondary"}>
            {attempt.passed ? "Passed" : "Not passed"}
          </Badge>
          <span>
            Attempt {attempt.attemptNumber} — {attempt.score}%
          </span>
        </li>
      ))}
    </ul>
  );
}

export function QuizRunner({
  quiz,
  pastAttempts,
  courseSlug,
  lessonSlug,
}: {
  quiz: QuizForAttempt;
  pastAttempts: readonly QuizAttemptSummary[];
  courseSlug: string;
  lessonSlug: string;
}) {
  const attemptsUsed = pastAttempts.length;
  const [canRetakeOverride, setCanRetakeOverride] = useState<boolean | null>(
    null
  );
  const canAttempt =
    canRetakeOverride ??
    (quiz.maxAttempts == null || attemptsUsed < quiz.maxAttempts);

  const [phase, setPhase] = useState<Phase>("summary");
  const [responses, setResponses] = useState<Record<string, unknown>>({});
  const [state, setState] = useState<SubmitQuizAttemptFormState>({});

  // A plain async client function, not `useActionState` — passing one
  // directly to `<form action>` is itself a React 19 transition, so
  // `useFormStatus` below still works, but control returns here right
  // after the call resolves. That is what lets the phase change happen in
  // response to the actual event (a submission finishing) instead of a
  // `useEffect` reacting to state that already changed — React flags
  // `setState` inside an effect body as a footgun for exactly this shape
  // of "do something once an async call completes."
  async function handleSubmit(formData: FormData) {
    const outcome = await submitQuizAttemptAction(state, formData);
    setState(outcome);
    if (outcome.result) {
      setCanRetakeOverride(outcome.result.canRetake);
      setPhase("results");
    }
  }

  const sortedQuestions = [...quiz.questions].sort(
    (a, b) => a.position - b.position
  );

  function startAttempt() {
    setResponses({});
    setPhase("in-progress");
  }

  if (phase === "results" && state.result) {
    return (
      <Card>
        <CardContent className="flex flex-col gap-5">
          <h3 className="font-heading text-body font-medium text-foreground">
            {quiz.title}
          </h3>
          <QuizResults result={state.result} questions={sortedQuestions} />
          {canAttempt ? (
            <Button variant="outline" className="w-fit" onClick={startAttempt}>
              <RotateCcw aria-hidden="true" />
              Retake quiz
            </Button>
          ) : (
            <p className="text-body-sm text-muted-foreground">
              You&apos;ve used all of your attempts for this quiz.
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  if (phase === "in-progress") {
    return (
      <form
        action={handleSubmit}
        className="flex flex-col gap-4"
        aria-label={`${quiz.title} — quiz`}
      >
        <input type="hidden" name="quizId" value={quiz.id} />
        <input type="hidden" name="courseSlug" value={courseSlug} />
        <input type="hidden" name="lessonSlug" value={lessonSlug} />
        <input
          type="hidden"
          name="responsesJson"
          value={JSON.stringify(
            Object.entries(responses).map(([questionId, value]) => ({
              questionId,
              value,
            }))
          )}
          readOnly
        />

        <div className="flex flex-col gap-4">
          {sortedQuestions.map((question, index) => (
            <QuestionCard
              key={question.id}
              index={index + 1}
              total={sortedQuestions.length}
              question={question}
              value={responses[question.id]}
              onChange={(value) =>
                setResponses((prev) => ({ ...prev, [question.id]: value }))
              }
            />
          ))}
        </div>

        <div className="flex flex-col gap-2">
          <SubmitButton />
          {state.error ? (
            <p
              role="alert"
              className="flex items-center gap-2 text-body-sm text-destructive"
            >
              <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
              {state.error}
            </p>
          ) : null}
        </div>
      </form>
    );
  }

  return (
    <Card>
      <CardContent className="flex items-start gap-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
          <ClipboardList className="size-5" aria-hidden="true" />
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <p className="font-heading text-body font-medium text-foreground">
              {quiz.title}
            </p>
            {quiz.description ? (
              <p className="text-body-sm text-muted-foreground">
                {quiz.description}
              </p>
            ) : null}
            <p className="text-caption text-muted-foreground">
              {sortedQuestions.length} question
              {sortedQuestions.length === 1 ? "" : "s"} · Pass at{" "}
              {quiz.passingScore}%
            </p>
          </div>

          <AttemptHistory attempts={pastAttempts} />

          {canAttempt ? (
            <Button className="w-fit" onClick={startAttempt}>
              {attemptsUsed > 0 ? "Retake quiz" : "Start quiz"}
            </Button>
          ) : (
            <p className="text-body-sm text-muted-foreground">
              You&apos;ve used all of your attempts for this quiz.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
