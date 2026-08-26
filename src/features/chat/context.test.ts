import { describe, expect, it } from "vitest";

import { buildGroundingPrompt } from "./context";

/**
 * §16. Pins the two shapes the assistant is ever grounded on: a course
 * with no current lesson (e.g. a general question from the course page),
 * and a course with a specific lesson's content blocks in view.
 */

const COURSE = { title: "TypeScript Foundations", description: "Types, inference, and the compiler's mental model." };

describe("buildGroundingPrompt", () => {
  it("includes the course title and description with no lesson", () => {
    const prompt = buildGroundingPrompt(COURSE, null);

    expect(prompt).toContain("TypeScript Foundations");
    expect(prompt).toContain("Types, inference, and the compiler's mental model.");
    expect(prompt).not.toContain("currently viewing the lesson");
  });

  it("includes lesson text blocks when a lesson is in view", () => {
    const prompt = buildGroundingPrompt(COURSE, {
      title: "Structural typing",
      blocks: [
        { id: "b1", position: 0, kind: "TEXT", data: { body: "Shape beats name." } },
        {
          id: "b2",
          position: 1,
          kind: "CODE",
          data: { code: "const x: Point = { x: 1, y: 2 };", language: "typescript" },
        },
      ],
    });

    expect(prompt).toContain('currently viewing the lesson "Structural typing"');
    expect(prompt).toContain("Shape beats name.");
    expect(prompt).toContain("const x: Point = { x: 1, y: 2 };");
  });

  it("says a lesson has no content rather than emitting an empty section", () => {
    const prompt = buildGroundingPrompt(COURSE, {
      title: "Empty lesson",
      blocks: [],
    });

    expect(prompt).toContain("no content yet");
  });

  it("skips blocks with nothing to ground on rather than emitting blank lines", () => {
    const prompt = buildGroundingPrompt(COURSE, {
      title: "Mixed lesson",
      blocks: [
        { id: "b1", position: 0, kind: "IMAGE", data: { src: "https://x/y.png", alt: "diagram" } },
        { id: "b2", position: 1, kind: "INVALID", blockType: "TEXT" },
      ],
    });

    // The IMAGE block has no caption and the INVALID block has no data —
    // neither contributes text, so the lesson reads as having none.
    expect(prompt).toContain("no content yet");
  });
});
