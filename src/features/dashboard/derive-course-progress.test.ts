import { describe, expect, it } from "vitest";

import { deriveCourseProgress } from "./derive-course-progress";

/**
 * §44, Milestone 9. Pins the "first incomplete lesson in curriculum order"
 * rule, since it's the one assumption this milestone's plan made instead
 * of asking — worth locking down precisely because of that.
 */

const LESSONS = [
  { id: "l1", slug: "intro" },
  { id: "l2", slug: "basics" },
  { id: "l3", slug: "advanced" },
];

describe("deriveCourseProgress", () => {
  it("targets the first incomplete lesson in curriculum order", () => {
    const result = deriveCourseProgress(LESSONS, new Set(["l1"]));
    expect(result).toEqual({
      completedLessonCount: 1,
      totalLessonCount: 3,
      nextLessonSlug: "basics",
    });
  });

  it("does not target a later lesson just because an earlier one is incomplete", () => {
    // l1 incomplete, l2 complete: the next target is still l1, not l3.
    const result = deriveCourseProgress(LESSONS, new Set(["l2"]));
    expect(result.nextLessonSlug).toBe("intro");
  });

  it("has no next lesson once every published lesson is complete", () => {
    const result = deriveCourseProgress(
      LESSONS,
      new Set(["l1", "l2", "l3"])
    );
    expect(result).toEqual({
      completedLessonCount: 3,
      totalLessonCount: 3,
      nextLessonSlug: null,
    });
  });

  it("targets the first lesson when nothing is complete yet", () => {
    const result = deriveCourseProgress(LESSONS, new Set());
    expect(result.nextLessonSlug).toBe("intro");
    expect(result.completedLessonCount).toBe(0);
  });

  it("handles a course with no published lessons without dividing by zero", () => {
    const result = deriveCourseProgress([], new Set());
    expect(result).toEqual({
      completedLessonCount: 0,
      totalLessonCount: 0,
      nextLessonSlug: null,
    });
  });
});
