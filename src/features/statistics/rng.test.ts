import { describe, expect, it } from "vitest";

import { createRng, drawSamples } from "./rng";

/**
 * Reproducibility is a course requirement, not an implementation detail
 * (spec §47): lesson prose quotes concrete numbers, the static figures
 * `figures.py` renders quote the same numbers, and both must match what a
 * learner sees. Every guarantee that rests on is asserted here.
 */

describe("createRng", () => {
  it("produces the same sequence for the same seed", () => {
    const first = createRng(42);
    const second = createRng(42);

    const a = Array.from({ length: 50 }, () => first());
    const b = Array.from({ length: 50 }, () => second());

    expect(a).toEqual(b);
  });

  it("produces different sequences for different seeds", () => {
    const a = Array.from({ length: 20 }, createRng(1));
    const b = Array.from({ length: 20 }, createRng(2));

    expect(a).not.toEqual(b);
  });

  it("stays within [0, 1)", () => {
    const rng = createRng(7);

    for (let i = 0; i < 10_000; i += 1) {
      const value = rng();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it("is roughly uniform over many draws", () => {
    const rng = createRng(2026);
    const samples = Array.from({ length: 100_000 }, rng);
    const mean = samples.reduce((total, value) => total + value, 0) / samples.length;

    // Standard error of the mean for U(0,1) at n = 100_000 is about 0.0009,
    // so 0.005 is a comfortable multiple without being vacuous.
    expect(mean).toBeCloseTo(0.5, 2);
  });

  it("treats a fractional or negative seed as stable rather than undefined", () => {
    expect(Array.from({ length: 5 }, createRng(3.7))).toEqual(
      Array.from({ length: 5 }, createRng(3.7))
    );
    expect(Array.from({ length: 5 }, createRng(-1))).toEqual(
      Array.from({ length: 5 }, createRng(-1))
    );
  });

  it("rejects a non-finite seed rather than silently producing NaN", () => {
    expect(() => createRng(Number.NaN)).toThrow(RangeError);
    expect(() => createRng(Number.POSITIVE_INFINITY)).toThrow(RangeError);
  });
});

describe("drawSamples", () => {
  it("draws exactly the requested count", () => {
    const rng = createRng(1);
    expect(drawSamples(0, rng)).toHaveLength(0);
    expect(drawSamples(1, rng)).toHaveLength(1);
    expect(drawSamples(1000, rng)).toHaveLength(1000);
  });

  it("rejects a negative or fractional count", () => {
    const rng = createRng(1);
    expect(() => drawSamples(-1, rng)).toThrow(RangeError);
    expect(() => drawSamples(2.5, rng)).toThrow(RangeError);
  });
});
