import { Progress } from "@/components/ui/progress";

/**
 * Course-level progress (§26 — no progress, partial, and fully-complete
 * are all one component, distinguished only by the numbers passed in,
 * rather than three separately built states that could drift apart).
 *
 * Reuses the `Progress` bar the Milestone 1 design-system showcase
 * demonstrated against a hand-written "62%" — this is that pattern wired
 * to a real number for the first time.
 */
export function CourseProgress({
  completed,
  total,
}: {
  completed: number;
  total: number;
}) {
  // No published lessons at all: there is nothing to show progress
  // against yet, and a 0/0 bar would read as "you have completed
  // everything" rather than "there is nothing here."
  if (total === 0) {
    return null;
  }

  const percent = Math.round((completed / total) * 100);
  const isComplete = completed >= total;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-body-sm">
        <span className="text-foreground">
          {isComplete ? "Course complete" : "Your progress"}
        </span>
        <span className="text-muted-foreground tabular-nums">
          {completed} of {total} {total === 1 ? "lesson" : "lessons"}
        </span>
      </div>
      <Progress value={percent} aria-label="Course progress" />
    </div>
  );
}
