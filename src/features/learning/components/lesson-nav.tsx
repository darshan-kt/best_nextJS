import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { LessonNavigation } from "../navigation";

/**
 * Prev/next controls in curriculum order (§11).
 *
 * Plain `<Link>`s, not client-side state — the lesson at the other end is
 * a full server render with its own authorization check (§12), so this is
 * navigation to a new page, not paging through client-held data.
 */
export function LessonNav({
  courseSlug,
  navigation,
}: {
  courseSlug: string;
  navigation: LessonNavigation;
}) {
  const { previous, next, position, total } = navigation;

  return (
    <nav
      className="flex items-center justify-between gap-4 border-t border-border pt-6"
      aria-label="Lesson navigation"
    >
      {previous ? (
        <Button asChild variant="outline">
          <Link href={`/courses/${courseSlug}/learn/${previous.slug}`}>
            <ArrowLeft aria-hidden="true" />
            <span className="hidden sm:inline">{previous.title}</span>
            <span className="sm:hidden">Previous</span>
          </Link>
        </Button>
      ) : (
        <span />
      )}

      <span
        className="shrink-0 text-caption text-muted-foreground tabular-nums"
        aria-current="page"
      >
        Lesson {position} of {total}
      </span>

      {next ? (
        <Button asChild>
          <Link href={`/courses/${courseSlug}/learn/${next.slug}`}>
            <span className="hidden sm:inline">{next.title}</span>
            <span className="sm:hidden">Next</span>
            <ArrowRight aria-hidden="true" />
          </Link>
        </Button>
      ) : (
        <span />
      )}
    </nav>
  );
}
