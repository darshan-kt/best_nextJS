import { ClipboardList, FlaskConical } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

/**
 * QUIZ and EXERCISE blocks (§18, §19).
 *
 * Real question rendering and grading are Milestones 8 and 9 — this is
 * deliberately not a stub that quietly does nothing. It shows the real
 * title the instructor gave the quiz or exercise, so the block is
 * recognizable as "this course has a quiz here" rather than invisible, and
 * marks it clearly as not yet interactive rather than implying it is.
 */
export function PlaceholderBlock({
  kind,
  title,
  description,
}: {
  kind: "QUIZ" | "EXERCISE";
  title: string;
  description: string | null;
}) {
  const Icon = kind === "QUIZ" ? ClipboardList : FlaskConical;

  return (
    <Card className="border-dashed bg-muted/30">
      <CardContent className="flex items-start gap-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
          <Icon className="size-5" aria-hidden="true" />
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-heading text-body font-medium text-foreground">
              {title}
            </p>
            <Badge variant="secondary">
              {kind === "QUIZ" ? "Quiz" : "Exercise"} — coming soon
            </Badge>
          </div>

          {description ? (
            <p className="text-body-sm text-muted-foreground">{description}</p>
          ) : null}

          <p className="text-caption text-muted-foreground">
            {kind === "QUIZ"
              ? "Taking this quiz arrives with the quiz engine."
              : "Submitting this exercise arrives with practical exercises."}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
