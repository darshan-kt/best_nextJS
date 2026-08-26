import { describe, expect, it } from "vitest";

import { exerciseConfigSchema } from "./schemas";

/**
 * `Exercise.config` payload validation (§9, §11 of ROS2_COURSE_DESIGN.md) —
 * same reasoning as `features/learning/schemas.test.ts`: this JSON column
 * is untyped at the database layer, so these schemas are what stands
 * between a malformed row and a crashed render.
 */

describe("exerciseConfigSchema — GUIDED", () => {
  const valid = {
    type: "GUIDED" as const,
    goal: { body: "Write your first publisher." },
    steps: [{ title: "Create the package", content: { body: "Run ros2 pkg create." } }],
  };

  it("accepts a valid guided exercise", () => {
    expect(exerciseConfigSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts a step with inline visuals", () => {
    const result = exerciseConfigSchema.safeParse({
      ...valid,
      steps: [
        {
          title: "Create the package",
          content: {
            body: "Run ros2 pkg create.",
            visuals: [
              { kind: "CODE", data: { code: "ros2 pkg create my_pkg" } },
              { kind: "IMAGE", data: { src: "https://example.com/x.png", alt: "Terminal output" } },
            ],
          },
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects zero steps", () => {
    expect(exerciseConfigSchema.safeParse({ ...valid, steps: [] }).success).toBe(
      false
    );
  });

  it("rejects a step with an empty body", () => {
    const result = exerciseConfigSchema.safeParse({
      ...valid,
      steps: [{ title: "A step", content: { body: "" } }],
    });
    expect(result.success).toBe(false);
  });
});

describe("exerciseConfigSchema — INDEPENDENT", () => {
  const valid = {
    type: "INDEPENDENT" as const,
    goal: { body: "Publish a string message on /greeting." },
    successCriteria: ["ros2 topic echo /greeting shows your message"],
  };

  it("accepts a valid independent exercise without hints", () => {
    expect(exerciseConfigSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts optional hints", () => {
    expect(
      exerciseConfigSchema.safeParse({ ...valid, hints: ["Check rclpy.init() runs first."] })
        .success
    ).toBe(true);
  });

  it("rejects zero success criteria", () => {
    expect(
      exerciseConfigSchema.safeParse({ ...valid, successCriteria: [] }).success
    ).toBe(false);
  });
});

describe("exerciseConfigSchema — DEBUGGING", () => {
  const valid = {
    type: "DEBUGGING" as const,
    scenario: { body: "The subscriber never receives any messages." },
    hints: ["Check the topic name with `ros2 topic list`."],
    solution: { body: "The publisher was on a different topic name." },
  };

  it("accepts a valid debugging exercise", () => {
    expect(exerciseConfigSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts an optional rootCause", () => {
    expect(
      exerciseConfigSchema.safeParse({
        ...valid,
        rootCause: { body: "A typo in the topic name string." },
      }).success
    ).toBe(true);
  });

  it("rejects zero hints — a debugging exercise with no hints isn't teaching systematic debugging", () => {
    expect(exerciseConfigSchema.safeParse({ ...valid, hints: [] }).success).toBe(
      false
    );
  });

  it("rejects a missing solution", () => {
    expect(
      exerciseConfigSchema.safeParse({
        type: "DEBUGGING",
        scenario: valid.scenario,
        hints: valid.hints,
      }).success
    ).toBe(false);
  });
});

describe("exerciseConfigSchema — discriminant", () => {
  it("rejects an unknown type", () => {
    expect(
      exerciseConfigSchema.safeParse({ type: "OPEN_ENDED", goal: { body: "x" } })
        .success
    ).toBe(false);
  });
});
