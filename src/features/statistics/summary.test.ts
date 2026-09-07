import { describe, expect, it } from "vitest";

import {
  ecdf,
  histogram,
  mean,
  median,
  quantile,
  quantilePairs,
  standardDeviation,
  summarize,
  variance,
} from "./summary";

/**
 * These are the numbers lessons quote and quizzes ask learners to compute,
 * so each definitional choice is pinned to a hand-computed value rather
 * than to whatever the implementation happens to return.
 *
 * `SAMPLE` has mean 5 and a summed squared deviation of 32, which makes
 * the Bessel-corrected variance 32/7 and the population variance 32/8 = 4
 * — chosen precisely because the two differ visibly, so a regression from
 * n - 1 to n cannot pass.
 */
const SAMPLE = [2, 4, 4, 4, 5, 5, 7, 9];

describe("moments", () => {
  it("computes the mean", () => {
    expect(mean(SAMPLE)).toBe(5);
  });

  it("uses Bessel's correction (n - 1), matching NumPy ddof=1", () => {
    expect(variance(SAMPLE)).toBeCloseTo(32 / 7, 12);
    expect(variance(SAMPLE)).not.toBeCloseTo(4, 6);
    expect(standardDeviation(SAMPLE)).toBeCloseTo(Math.sqrt(32 / 7), 12);
  });

  it("returns NaN rather than a confident zero for fewer than two samples", () => {
    expect(variance([])).toBeNaN();
    expect(variance([3])).toBeNaN();
    expect(mean([])).toBeNaN();
  });
});

describe("quantile (type 7, matching NumPy's default)", () => {
  it("interpolates linearly between order statistics", () => {
    expect(quantile([1, 2, 3, 4], 0.5)).toBeCloseTo(2.5, 12);
    expect(quantile([1, 2, 3, 4], 0.25)).toBeCloseTo(1.75, 12);
    expect(quantile([1, 2, 3, 4], 0.75)).toBeCloseTo(3.25, 12);
  });

  it("returns the extremes at p = 0 and p = 1", () => {
    expect(quantile([5, 1, 3], 0)).toBe(1);
    expect(quantile([5, 1, 3], 1)).toBe(5);
  });

  it("does not require sorted input and does not mutate its argument", () => {
    const unsorted = [9, 1, 5];
    expect(quantile(unsorted, 0.5)).toBe(5);
    expect(unsorted).toEqual([9, 1, 5]);
  });

  it("clamps p outside [0, 1]", () => {
    expect(quantile([1, 2, 3], -1)).toBe(1);
    expect(quantile([1, 2, 3], 2)).toBe(3);
  });

  it("computes the median for odd and even counts", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 2, 3])).toBeCloseTo(2.5, 12);
  });
});

describe("summarize", () => {
  it("reports every field the statistics panel displays", () => {
    const summary = summarize(SAMPLE);

    expect(summary.count).toBe(8);
    expect(summary.mean).toBe(5);
    expect(summary.variance).toBeCloseTo(32 / 7, 12);
    expect(summary.median).toBeCloseTo(4.5, 12);
    expect(summary.min).toBe(2);
    expect(summary.max).toBe(9);
    expect(summary.iqr).toBeCloseTo(quantile(SAMPLE, 0.75) - quantile(SAMPLE, 0.25), 12);
  });

  it("degrades to NaN on an empty sample rather than throwing", () => {
    const summary = summarize([]);
    expect(summary.count).toBe(0);
    expect(summary.mean).toBeNaN();
    expect(summary.max).toBeNaN();
  });
});

describe("histogram", () => {
  it("includes the maximum value in the final bin", () => {
    // The off-by-one this guards is invisible at n = 5000 and glaring at
    // n = 6: without the inclusive final edge, the value 5 falls outside
    // every bin and disappears.
    const bins = histogram([0, 1, 2, 3, 4, 5], 5, [0, 5]);

    expect(bins).toHaveLength(5);
    expect(bins.map((bin) => bin.count)).toEqual([1, 1, 1, 1, 2]);
    expect(bins.reduce((total, bin) => total + bin.count, 0)).toBe(6);
  });

  it("normalizes to a density that integrates to 1", () => {
    const samples = Array.from({ length: 500 }, (_, index) => index / 500);
    const bins = histogram(samples, 20, [0, 1]);
    const area = bins.reduce(
      (total, bin) => total + bin.density * (bin.end - bin.start),
      0
    );

    expect(area).toBeCloseTo(1, 10);
  });

  it("excludes samples outside an explicit domain", () => {
    const bins = histogram([-5, 0.5, 5], 2, [0, 1]);
    expect(bins.reduce((total, bin) => total + bin.count, 0)).toBe(1);
  });

  it("widens a degenerate domain instead of producing infinite density", () => {
    const bins = histogram([3, 3, 3], 4);

    expect(bins).toHaveLength(4);
    for (const bin of bins) {
      expect(bin.end).toBeGreaterThan(bin.start);
      expect(Number.isFinite(bin.density)).toBe(true);
    }
    expect(bins.reduce((total, bin) => total + bin.count, 0)).toBe(3);
  });

  it("rejects a non-positive or fractional bin count", () => {
    expect(() => histogram([1, 2], 0)).toThrow(RangeError);
    expect(() => histogram([1, 2], 2.5)).toThrow(RangeError);
  });

  it("returns empty bins rather than throwing on no samples", () => {
    const bins = histogram([], 4);
    expect(bins).toHaveLength(4);
    expect(bins.every((bin) => bin.count === 0 && bin.density === 0)).toBe(true);
  });
});

describe("ecdf", () => {
  it("uses (i + 1) / n so the largest sample reaches p = 1", () => {
    const points = ecdf([3, 1, 2]);

    expect(points.map((point) => point.x)).toEqual([1, 2, 3]);
    expect(points.map((point) => point.p)).toEqual([1 / 3, 2 / 3, 1]);
  });

  it("returns nothing for an empty sample", () => {
    expect(ecdf([])).toEqual([]);
  });
});

describe("quantilePairs", () => {
  it("uses (i + 0.5) / n plotting positions, so no point is at p = 1", () => {
    // The distinction matters: with (i + 1) / n the final theoretical
    // quantile of any unbounded distribution is +Infinity, which would put
    // a point at infinity on the flagship module's Q-Q plot.
    const seen: number[] = [];
    quantilePairs([1, 2, 3, 4], (p) => {
      seen.push(p);
      return p;
    });

    expect(seen).toEqual([0.125, 0.375, 0.625, 0.875]);
    expect(seen.every((p) => p > 0 && p < 1)).toBe(true);
  });

  it("pairs observed order statistics with theoretical quantiles", () => {
    const pairs = quantilePairs([10, 30, 20], (p) => p * 100);

    expect(pairs.map((pair) => pair.observed)).toEqual([10, 20, 30]);
    // Element-wise, not toEqual: these are floating-point divisions and
    // exact bit equality is not the property under test.
    const expected = [100 / 6, 50, 500 / 6];
    pairs.forEach((pair, index) => {
      expect(pair.theoretical).toBeCloseTo(expected[index], 12);
    });
  });
});
