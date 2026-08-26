import { Lock, PlayCircle } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import type { CurriculumSection } from "../queries";

/**
 * The course curriculum (§11: Course → Section → Lesson).
 *
 * Titles are shown to everyone, enrolled or not — a prospective learner
 * deciding whether to enroll needs to see what they would be getting, and
 * this is the same information the catalogue markets. What enrollment buys
 * is access to the lessons themselves, enforced on the server at
 * `/courses/[slug]/learn`, never by what this component chooses to draw.
 *
 * The lock icons here are therefore an explanation of a boundary that
 * already exists, not the boundary itself (§12).
 */

function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;

  return remainder === 0 ? `${hours} hr` : `${hours} hr ${remainder} min`;
}

interface CurriculumOutlineProps {
  sections: CurriculumSection[];
  /** Whether the viewer has access to the lessons themselves. */
  unlocked: boolean;
}

export function CurriculumOutline({
  sections,
  unlocked,
}: CurriculumOutlineProps) {
  const populated = sections.filter((section) => section.lessons.length > 0);

  if (populated.length === 0) {
    return (
      <EmptyState
        title="Curriculum coming soon"
        description="The instructor is still preparing lessons for this course."
      />
    );
  }

  return (
    <ol className="flex list-none flex-col gap-4">
      {populated.map((section, index) => (
        <li
          key={section.id}
          className="overflow-hidden rounded-xl border border-border"
        >
          <div className="flex flex-col gap-1 bg-muted/40 px-5 py-3.5">
            <p className="font-heading text-body-sm font-medium text-foreground">
              <span className="text-muted-foreground">
                Section {index + 1} ·{" "}
              </span>
              {section.title}
            </p>

            {section.summary ? (
              <p className="text-body-sm text-muted-foreground">
                {section.summary}
              </p>
            ) : null}
          </div>

          <ul className="flex list-none flex-col divide-y divide-border">
            {section.lessons.map((lesson) => (
              <li
                key={lesson.id}
                className="flex items-center justify-between gap-3 px-5 py-3"
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  {unlocked ? (
                    <PlayCircle
                      className="size-4 shrink-0 text-muted-foreground"
                      aria-hidden="true"
                    />
                  ) : (
                    <Lock
                      className="size-4 shrink-0 text-muted-foreground"
                      aria-hidden="true"
                    />
                  )}
                  <span className="truncate text-body-sm text-foreground">
                    {lesson.title}
                  </span>
                </span>

                {lesson.durationMinutes ? (
                  <span className="shrink-0 text-caption text-muted-foreground">
                    {formatDuration(lesson.durationMinutes)}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ol>
  );
}
