import { FlaskConical } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

/**
 * EXERCISE blocks (§19). QUIZ blocks moved to a real implementation in
 * `features/quizzes/components/quiz-block.tsx` (§44, Milestone 8) — this
 * component now only covers the remaining Milestone 9 placeholder.
 *
 * Deliberately not a stub that quietly does nothing: it shows the real
 * title the instructor gave the exercise, so the block is recognizable as
 * "this course has an exercise here" rather than invisible, and marks it
 * clearly as not yet interactive rather than implying it is.
 */
export function PlaceholderBlock({
  title,
  description,
}: {
  title: string;
  description: string | null;
}) {
  return (
    <Card className="border-dashed bg-muted/30">
      <CardContent className="flex items-start gap-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
          <FlaskConical className="size-5" aria-hidden="true" />
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-heading text-body font-medium text-foreground">
              {title}
            </p>
            <Badge variant="secondary">Exercise — coming soon</Badge>
          </div>

          {description ? (
            <p className="text-body-sm text-muted-foreground">{description}</p>
          ) : null}

          <p className="text-caption text-muted-foreground">
            Submitting this exercise arrives with practical exercises.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
