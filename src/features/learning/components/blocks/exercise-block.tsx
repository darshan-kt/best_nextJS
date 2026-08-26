import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { DebuggingExercise } from "@/features/exercises/components/debugging-exercise";
import { GuidedExercise } from "@/features/exercises/components/guided-exercise";
import { IndependentExercise } from "@/features/exercises/components/independent-exercise";
import type { ExerciseConfig } from "@/features/exercises/schemas";

const EXERCISE_LABELS: Record<ExerciseConfig["type"], string> = {
  GUIDED: "Guided exercise",
  INDEPENDENT: "Independent exercise",
  DEBUGGING: "Debugging exercise",
};

/**
 * The real EXERCISE renderer (§11, §19), replacing the Milestone 9
 * placeholder. Three pedagogical types share this one entry point —
 * `ExerciseConfig`'s discriminant (`type`) picks the sub-renderer, the
 * same dispatch shape `BlockRenderer` itself uses one level up (§11).
 *
 * Content-only: the learner runs ROS 2/Turtlesim on their own machine
 * (ROS2_COURSE_KICKOFF_PROMPTS.md's locked-in decisions) — nothing here
 * submits or grades anything, so there is no "mark exercise complete"
 * affordance distinct from the lesson-level one (`MarkCompleteButton`),
 * matching the existing `LessonProgress` design (block-level completion
 * is deliberately not modelled).
 */
export function ExerciseBlock({
  title,
  config,
}: {
  title: string;
  config: ExerciseConfig;
}) {
  return (
    <Card className="border-dashed">
      <CardHeader className="flex-row flex-wrap items-center gap-2.5">
        <Badge variant="secondary">{EXERCISE_LABELS[config.type]}</Badge>
        <p className="font-heading text-body-lg font-semibold text-foreground">
          {title}
        </p>
      </CardHeader>

      <CardContent>
        {config.type === "GUIDED" ? <GuidedExercise config={config} /> : null}
        {config.type === "INDEPENDENT" ? (
          <IndependentExercise config={config} />
        ) : null}
        {config.type === "DEBUGGING" ? (
          <DebuggingExercise config={config} />
        ) : null}
      </CardContent>
    </Card>
  );
}
