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
 *
 * Hover and focus now come from `Card interactive`, not from ring classes
 * written on this component — the card used to carry its own
 * `focus-within:ring-2` that matched nothing else in the app (§21).
 */
export function CourseCard({ course }: { course: CatalogCourse }) {
  return (
    <Card size="sm" interactive className="h-full">
      <CardHeader>
        <CardTitle>
          <Link
            href={`/courses/${course.slug}`}
            // Stretches the link's hit area over the whole card without
            // nesting interactive elements. The ring is raised by the card.
            className="outline-none after:absolute after:inset-0 after:rounded-xl"
          >
            {course.title}
          </Link>
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1">
        {course.subtitle ? (
          <p className="line-clamp-3 text-body-sm text-pretty text-muted-foreground">
            {course.subtitle}
          </p>
        ) : null}
      </CardContent>

      <CardFooter className="justify-between">
        <span className="truncate text-muted-foreground">
          {course.instructor.name ?? "Instructor"}
        </span>

        <span
          className="inline-flex shrink-0 items-center gap-1 font-medium text-muted-foreground transition-colors group-hover/card:text-accent-foreground"
          aria-hidden="true"
        >
          View course
          <ArrowRight className="size-3.5 transition-transform group-hover/card:translate-x-0.5" />
        </span>
      </CardFooter>
    </Card>
  );
}
