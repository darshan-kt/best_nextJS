"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, CheckCircle2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  markLessonCompleteAction,
  type MarkLessonCompleteFormState,
} from "../actions";

/**
 * The lesson-completion control (§44, Milestone 6→7 wiring).
 *
 * A manual action, not auto-complete on scroll or view: a scroll-based
 * signal is trivially defeated by tabbing away, means something different
 * per content type (a scroll position for TEXT is not a playhead for
 * VIDEO and is nothing at all for the QUIZ/EXERCISE placeholders), and
 * would need client-side tracking machinery this milestone has no other
 * reason to add (§7 — minimal client JS). A button is one unambiguous
 * signal, works identically for every lesson regardless of what it
 * contains, and needs nothing beyond the form/Server Action pattern
 * already used for enrollment.
 *
 * One-way: once complete, this renders a static badge, not a toggle.
 * There is no "mark incomplete" in this milestone.
 */

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" variant="outline" loading={pending} className="w-fit">
      {pending ? "Marking complete…" : "Mark as complete"}
    </Button>
  );
}

export function MarkCompleteButton({
  courseSlug,
  lessonSlug,
  completed,
}: {
  courseSlug: string;
  lessonSlug: string;
  completed: boolean;
}) {
  const [state, formAction] = useActionState<
    MarkLessonCompleteFormState,
    FormData
  >(markLessonCompleteAction, {});

  if (completed) {
    return (
      <Badge variant="accent" className="w-fit">
        <CheckCircle2 aria-hidden="true" />
        Completed
      </Badge>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="courseSlug" value={courseSlug} />
      <input type="hidden" name="lessonSlug" value={lessonSlug} />

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
    </form>
  );
}
