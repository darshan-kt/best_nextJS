import { ClipboardList } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { can, type Actor, type EnrollmentSubject } from "@/features/auth/policy";
import { getQuizAttemptHistory, getQuizForCourse } from "../queries";
import { QuizRunner } from "./quiz-runner";

/**
 * Authorization + data-fetching boundary for a QUIZ content block (§12,
 * §18). Async server component, so this is the one place per quiz block
 * that resolves "can this learner attempt this quiz" and loads exactly
 * what `QuizRunner` needs — `enrollment` itself never crosses into the
 * client component below it, only the plain, already-authorized data
 * derived from it (§29).
 *
 * Mirrors `progress:view`'s pattern in the lesson player: an actor without
 * a valid enrollment (an instructor or moderator previewing their own
 * course) sees the quiz's title and description — so it doesn't vanish,
 * same reasoning as the Milestone 6 placeholder — but gets no interactive
 * runner, since there is nothing valid for an attempt to attach to.
 */
export async function QuizBlock({
  quizId,
  fallbackTitle,
  fallbackDescription,
  actor,
  enrollment,
  courseId,
  courseSlug,
  lessonSlug,
}: {
  quizId: string;
  fallbackTitle: string;
  fallbackDescription: string | null;
  actor: Actor;
  enrollment: EnrollmentSubject | null;
  courseId: string;
  courseSlug: string;
  lessonSlug: string;
}) {
  const canAttempt = can(actor, { type: "quiz:attempt", enrollment });

  if (!canAttempt) {
    return (
      <Card className="border-dashed bg-muted/30">
        <CardContent className="flex items-start gap-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
            <ClipboardList className="size-5" aria-hidden="true" />
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-heading text-body font-medium text-foreground">
                {fallbackTitle}
              </p>
              <Badge variant="secondary">Quiz</Badge>
            </div>
            {fallbackDescription ? (
              <p className="text-body-sm text-muted-foreground">
                {fallbackDescription}
              </p>
            ) : null}
            <p className="text-caption text-muted-foreground">
              Enroll in this course to attempt this quiz.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const quiz = await getQuizForCourse(quizId, courseId);

  if (!quiz) {
    // The block points at a quiz id that no longer resolves inside this
    // course — a deleted or reassigned quiz. Not the learner's fault to be
    // crashed by (§26), rendered as an inert notice rather than a runner.
    return (
      <Card className="border-dashed bg-muted/30">
        <CardContent className="flex flex-col gap-1.5">
          <p className="font-heading text-body font-medium text-foreground">
            {fallbackTitle}
          </p>
          <p className="text-caption text-muted-foreground">
            This quiz is no longer available.
          </p>
        </CardContent>
      </Card>
    );
  }

  const pastAttempts = await getQuizAttemptHistory(actor.id, quiz.id);

  return (
    <QuizRunner
      quiz={quiz}
      pastAttempts={pastAttempts}
      courseSlug={courseSlug}
      lessonSlug={lessonSlug}
    />
  );
}
