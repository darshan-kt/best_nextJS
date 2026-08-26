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

  it("includes EMBED, CALLOUT, and FILE block text", () => {
    const prompt = buildGroundingPrompt(COURSE, {
      title: "Mixed lesson",
      blocks: [
        {
          id: "b1",
          position: 0,
          kind: "EMBED",
          data: {
            provider: "youtube",
            videoId: "dQw4w9WgXcQ",
            title: "Understanding topics",
            creator: "Articulated Robotics",
          },
        },
        {
          id: "b2",
          position: 1,
          kind: "CALLOUT",
          data: { variant: "WARNING", title: "Version note", body: "Jazzy only." },
        },
        {
          id: "b3",
          position: 2,
          kind: "FILE",
          data: { href: "https://example.com/cheatsheet.pdf", label: "Command cheat sheet" },
        },
      ],
    });

    expect(prompt).toContain("Understanding topics");
    expect(prompt).toContain("Articulated Robotics");
    expect(prompt).toContain("Version note: Jazzy only.");
    expect(prompt).toContain("Command cheat sheet");
  });

  it("summarizes a DEBUGGING exercise by its scenario, without leaking hints or the solution", () => {
    const prompt = buildGroundingPrompt(COURSE, {
      title: "Debugging lesson",
      blocks: [
        {
          id: "b1",
          position: 0,
          kind: "EXERCISE",
          exercise: {
            title: "Silent subscriber",
            instructions: null,
            config: {
              type: "DEBUGGING",
              scenario: { body: "The subscriber never receives any messages." },
              hints: ["Check the topic name with `ros2 topic list`."],
              solution: { body: "The publisher was on a different topic name." },
            },
          },
        },
      ],
    });

    expect(prompt).toContain("debugging exercise");
    expect(prompt).toContain("Silent subscriber");
    expect(prompt).toContain("The subscriber never receives any messages.");
    expect(prompt).not.toContain("ros2 topic list");
    expect(prompt).not.toContain("different topic name");
  });

  it("summarizes a GUIDED exercise by its goal", () => {
    const prompt = buildGroundingPrompt(COURSE, {
      title: "Guided lesson",
      blocks: [
        {
          id: "b1",
          position: 0,
          kind: "EXERCISE",
          exercise: {
            title: "Write your first publisher",
            instructions: null,
            config: {
              type: "GUIDED",
              goal: { body: "Publish a string message on /greeting." },
              steps: [{ title: "Create the package", content: { body: "Run ros2 pkg create." } }],
            },
          },
        },
      ],
    });

    expect(prompt).toContain("guided exercise");
    expect(prompt).toContain("Publish a string message on /greeting.");
  });
});
