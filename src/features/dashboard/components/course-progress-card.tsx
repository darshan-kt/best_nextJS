import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { CourseDashboardEntry } from "../queries";

/**
 * One enrolled course on the student dashboard (§44, Milestone 9).
 *
 * All three enrollment statuses render here, distinguished rather than
 * filtered — a full history of the student's activity, not just what's
 * currently in progress:
 *
 *   ACTIVE    — progress bar, Continue/Start into the first incomplete
 *               lesson (or Review, in the edge case where every published
 *               lesson is already complete but the enrollment hasn't
 *               flipped to COMPLETED yet).
 *   COMPLETED — a badge in place of the bar, Review back into the
 *               curriculum picker rather than a specific lesson.
 *   CANCELLED — dimmed, no call to action — nothing left to continue.
 */
export function CourseProgressCard({
  course,
}: {
  course: CourseDashboardEntry;
}) {
  const {
    courseSlug,
    courseTitle,
    courseSubtitle,
    status,
    completedLessonCount,
    totalLessonCount,
    nextLessonSlug,
  } = course;

  const percent =
    totalLessonCount > 0
      ? Math.round((completedLessonCount / totalLessonCount) * 100)
      : 0;
  const isCancelled = status === "CANCELLED";
  const hasLessons = totalLessonCount > 0;

  return (
    <Card className={cn(isCancelled && "opacity-60")}>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <Link
              href={`/courses/${courseSlug}`}
              className="font-heading text-body font-medium text-foreground underline-offset-4 hover:underline"
            >
              {courseTitle}
            </Link>
            {courseSubtitle ? (
              <p className="text-body-sm text-muted-foreground">
                {courseSubtitle}
              </p>
            ) : null}
          </div>

          {status === "COMPLETED" ? (
            <Badge variant="accent" className="shrink-0">
              Completed
            </Badge>
          ) : null}
          {status === "CANCELLED" ? (
            <Badge variant="secondary" className="shrink-0">
              Cancelled
            </Badge>
          ) : null}
        </div>

        {!isCancelled && hasLessons ? (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-caption text-muted-foreground">
              <span>
                {completedLessonCount} of {totalLessonCount}{" "}
                {totalLessonCount === 1 ? "lesson" : "lessons"}
              </span>
              <span className="tabular-nums">{percent}%</span>
            </div>
            <Progress value={percent} aria-label={`${courseTitle} progress`} />
          </div>
        ) : null}

        {status === "ACTIVE" && nextLessonSlug ? (
          <Button asChild size="sm" className="w-fit">
            <Link href={`/courses/${courseSlug}/learn/${nextLessonSlug}`}>
              {completedLessonCount === 0 ? "Start course" : "Continue"}
            </Link>
          </Button>
        ) : status === "COMPLETED" || (status === "ACTIVE" && hasLessons) ? (
          <Button asChild size="sm" variant="outline" className="w-fit">
            <Link href={`/courses/${courseSlug}/learn`}>Review</Link>
          </Button>
        ) : status === "ACTIVE" ? (
          <p className="text-caption text-muted-foreground">
            No lessons published yet.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
