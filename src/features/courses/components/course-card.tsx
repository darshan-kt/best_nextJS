import Link from "next/link";
import { ArrowRight } from "lucide-react";

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { CatalogCourse } from "../queries";

/**
 * A single catalogue entry (presentation layer, §5 — no business logic).
 *
 * The whole card is one link rather than a card with a button inside it:
 * a nested interactive element would give the keyboard two stops for one
 * destination, and screen readers two announcements (§24). The visible
 * "View course" affordance is therefore decorative, marked
 * `aria-hidden`, and the accessible name comes from the title.
 */
export function CourseCard({ course }: { course: CatalogCourse }) {
  return (
    <Card
      size="sm"
      className="group/course relative h-full transition-shadow hover:ring-foreground/20 focus-within:ring-2 focus-within:ring-ring"
    >
      <CardHeader>
        <CardTitle className="font-heading text-base leading-snug">
          <Link
            href={`/courses/${course.slug}`}
            // Stretches the link's hit area over the whole card without
            // nesting interactive elements.
            className="after:absolute after:inset-0 focus-visible:outline-none"
          >
            {course.title}
          </Link>
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1">
        {course.subtitle ? (
          <p className="line-clamp-3 text-sm text-muted-foreground">
            {course.subtitle}
          </p>
        ) : null}
      </CardContent>

      <CardFooter className="flex items-center justify-between gap-3 border-t border-border pt-3 pb-(--card-spacing)">
        <span className="truncate text-xs text-muted-foreground">
          {course.instructor.name ?? "Instructor"}
        </span>

        <span
          className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-muted-foreground transition-colors group-hover/course:text-foreground motion-reduce:transition-none"
          aria-hidden="true"
        >
          View course
          <ArrowRight className="size-3.5 transition-transform group-hover/course:translate-x-0.5 motion-reduce:transform-none motion-reduce:transition-none" />
        </span>
      </CardFooter>
    </Card>
  );
}
