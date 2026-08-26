import { describe, expect, it } from "vitest";

import { gradeAnswer, summarizeScore } from "./scoring";

/**
 * Grading correctness (§18). This is the one place a quiz score is
 * computed — the Server Action calls it, the client never does — so a bug
 * here is a scoring bug or a security hole, not a display glitch. Every
 * implemented question type gets a correct case, an incorrect case, and an
 * unanswered/malformed case, since "no response" and "garbage response"
 * both have to fail closed rather than throw or silently pass.
 */

const CHOICE_DATA = {
  options: [
    { id: "a", label: "A" },
    { id: "b", label: "B" },
    { id: "c", label: "C" },
  ],
  correctOptionIds: ["b"],
};

const MULTI_CHOICE_DATA = {
  options: [
    { id: "a", label: "A" },
    { id: "b", label: "B" },
    { id: "c", label: "C" },
  ],
  correctOptionIds: ["a", "c"],
};

describe("gradeAnswer", () => {
  it("grades SINGLE_CHOICE correctly and incorrectly", () => {
    expect(
      gradeAnswer("SINGLE_CHOICE", 2, CHOICE_DATA, { selectedOptionId: "b" })
    ).toEqual({ isCorrect: true, pointsAwarded: 2 });

    expect(
      gradeAnswer("SINGLE_CHOICE", 2, CHOICE_DATA, { selectedOptionId: "a" })
    ).toEqual({ isCorrect: false, pointsAwarded: 0 });
  });

  it("fails closed on a missing or malformed SINGLE_CHOICE response", () => {
    expect(gradeAnswer("SINGLE_CHOICE", 2, CHOICE_DATA, undefined)).toEqual({
      isCorrect: false,
      pointsAwarded: 0,
    });
    expect(
      gradeAnswer("SINGLE_CHOICE", 2, CHOICE_DATA, { selectedOptionId: 42 })
    ).toEqual({ isCorrect: false, pointsAwarded: 0 });
  });

  it("requires an exact option set for MULTIPLE_CHOICE — no partial credit", () => {
    expect(
      gradeAnswer("MULTIPLE_CHOICE", 3, MULTI_CHOICE_DATA, {
        selectedOptionIds: ["a", "c"],
      })
    ).toEqual({ isCorrect: true, pointsAwarded: 3 });

    expect(
      gradeAnswer("MULTIPLE_CHOICE", 3, MULTI_CHOICE_DATA, {
        selectedOptionIds: ["a"],
      })
    ).toEqual({ isCorrect: false, pointsAwarded: 0 });

    expect(
      gradeAnswer("MULTIPLE_CHOICE", 3, MULTI_CHOICE_DATA, {
        selectedOptionIds: ["a", "b", "c"],
      })
    ).toEqual({ isCorrect: false, pointsAwarded: 0 });

    // Order doesn't matter, only the set.
    expect(
      gradeAnswer("MULTIPLE_CHOICE", 3, MULTI_CHOICE_DATA, {
        selectedOptionIds: ["c", "a"],
      })
    ).toEqual({ isCorrect: true, pointsAwarded: 3 });
  });

  it("grades TRUE_FALSE", () => {
    expect(
      gradeAnswer("TRUE_FALSE", 1, { correctAnswer: true }, { answer: true })
    ).toEqual({ isCorrect: true, pointsAwarded: 1 });

    expect(
      gradeAnswer("TRUE_FALSE", 1, { correctAnswer: true }, { answer: false })
    ).toEqual({ isCorrect: false, pointsAwarded: 0 });
  });

  it("grades SHORT_ANSWER case-insensitively and trimmed", () => {
    const data = { acceptedAnswers: ["structural typing"] };

    expect(
      gradeAnswer("SHORT_ANSWER", 1, data, { text: "  Structural   Typing  " })
    ).toEqual({ isCorrect: true, pointsAwarded: 1 });

    expect(gradeAnswer("SHORT_ANSWER", 1, data, { text: "nominal typing" })).toEqual(
      { isCorrect: false, pointsAwarded: 0 }
    );
  });

  it("fails closed when the question's own stored data is malformed", () => {
    // A bad seed/DB row must not crash grading or silently award points.
    expect(
      gradeAnswer("SINGLE_CHOICE", 2, { garbage: true }, {
        selectedOptionId: "b",
      })
    ).toEqual({ isCorrect: false, pointsAwarded: 0 });
  });

  it("fails closed for an unimplemented question type", () => {
    expect(
      // @ts-expect-error — exercising the runtime default branch for a
      // future enum value the type system doesn't know yet (§18).
      gradeAnswer("CODE", 5, {}, {})
    ).toEqual({ isCorrect: false, pointsAwarded: 0 });
  });
});

describe("summarizeScore", () => {
  it("weighs by points, not question count", () => {
    // A 1-point question right, a 3-point question wrong: 1/4 = 25%.
    const graded = [{ pointsAwarded: 1 }, { pointsAwarded: 0 }];
    expect(summarizeScore(graded, 4, 70)).toEqual({ score: 25, passed: false });
  });

  it("passes exactly at the passing score", () => {
    const graded = [{ pointsAwarded: 7 }];
    expect(summarizeScore(graded, 10, 70)).toEqual({ score: 70, passed: true });
  });

  it("treats zero possible points as an unconditional fail, not a divide-by-zero", () => {
    expect(summarizeScore([], 0, 70)).toEqual({ score: 0, passed: false });
  });
});
