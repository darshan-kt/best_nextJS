import { describe, expect, it } from "vitest";

import type { CurriculumLesson, CurriculumSection } from "@/features/courses/queries";
import { findLessonNavigation, flattenLessons } from "./navigation";

/**
 * Lesson navigation (§11).
 *
 * Pure-function coverage for the edges that matter to a learner clicking
 * through a course: the first lesson has no previous, the last has no
 * next, and a slug that isn't in the curriculum is "not found" rather than
 * a crash.
 */

function lesson(slug: string, title = slug): CurriculumLesson {
  return { id: `id-${slug}`, slug, title, durationMinutes: 10 };
}

const sections: CurriculumSection[] = [
  {
    id: "section-1",
    title: "Section 1",
    summary: null,
    lessons: [lesson("intro"), lesson("basics")],
  },
  {
    id: "section-2",
    title: "Section 2",
    summary: null,
    lessons: [lesson("advanced"), lesson("wrap-up")],
  },
];

describe("flattenLessons", () => {
  it("preserves section and lesson order", () => {
    expect(flattenLessons(sections).map((l) => l.slug)).toEqual([
      "intro",
      "basics",
      "advanced",
      "wrap-up",
    ]);
  });

  it("returns an empty list for a curriculum with no populated sections", () => {
    expect(flattenLessons([])).toEqual([]);
  });
});

describe("findLessonNavigation", () => {
  const lessons = flattenLessons(sections);

  it("finds a middle lesson with both neighbours", () => {
    const nav = findLessonNavigation(lessons, "basics");
    expect(nav?.current.slug).toBe("basics");
    expect(nav?.position).toBe(2);
    expect(nav?.total).toBe(4);
    expect(nav?.previous?.slug).toBe("intro");
    expect(nav?.next?.slug).toBe("advanced");
  });

  it("gives the first lesson no previous", () => {
    const nav = findLessonNavigation(lessons, "intro");
    expect(nav?.previous).toBeNull();
    expect(nav?.next?.slug).toBe("basics");
  });

  it("gives the last lesson no next", () => {
    const nav = findLessonNavigation(lessons, "wrap-up");
    expect(nav?.next).toBeNull();
    expect(nav?.previous?.slug).toBe("advanced");
  });

  it("crosses a section boundary as one continuous sequence", () => {
    // "basics" is the last lesson of section 1; its next is the first
    // lesson of section 2, not null.
    const nav = findLessonNavigation(lessons, "basics");
    expect(nav?.next?.slug).toBe("advanced");
  });

  it("returns null for a lesson slug not in the curriculum", () => {
    expect(findLessonNavigation(lessons, "does-not-exist")).toBeNull();
  });

  it("handles a single-lesson course with neither neighbour", () => {
    const solo = flattenLessons([
      { id: "s", title: "Only section", summary: null, lessons: [lesson("only")] },
    ]);
    const nav = findLessonNavigation(solo, "only");
    expect(nav?.previous).toBeNull();
    expect(nav?.next).toBeNull();
    expect(nav?.total).toBe(1);
  });

  it("resolves a duplicate slug across sections to the first occurrence", () => {
    // Lesson.slug is only unique within a section (schema constraint); this
    // documents the resolution order the schema comment promises.
    const duplicated = flattenLessons([
      { id: "a", title: "A", summary: null, lessons: [lesson("repeat", "First")] },
      { id: "b", title: "B", summary: null, lessons: [lesson("repeat", "Second")] },
    ]);
    const nav = findLessonNavigation(duplicated, "repeat");
    expect(nav?.current.title).toBe("First");
  });
});
