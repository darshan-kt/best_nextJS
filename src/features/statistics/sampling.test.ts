import { describe, expect, it } from "vitest";

import { MAX_SIMULATION_SAMPLES, defaultValues, runSimulation } from "./sampling";

/**
 * `runSimulation` is the entire behaviour of an interactive simulation:
 * move a slider, and this is what changes. So the tests that matter are
 * not "does it return an object" but "does changing a parameter move the
 * number the learner is being asked to watch, by the amount the model
 * predicts" — which is the claim every lesson built on these blocks makes.
 *
 * Tolerances are derived from the standard error, not picked to make the
 * suite pass: at n = 20,000 the standard error of the mean is sigma/141,
 * so the assertions below sit at roughly 10-20 standard errors — tight
 * enough to catch a wrong sampler, loose enough not to be flaky.
 */

const BASE = { seed: 42, binCount: 40, sampleCount: 20_000 } as const;

describe("determinism", () => {
  it("returns identical results for identical input", () => {
    const input = { kind: "GAUSSIAN" as const, values: { mu: 2, sigma: 0.02 }, ...BASE };

    const first = runSimulation(input);
    const second = runSimulation(input);

    expect(first.samples).toEqual(second.samples);
    expect(first.summary).toEqual(second.summary);
  });

  it("returns different samples for a different seed", () => {
    const values = { mu: 0, sigma: 1 };
    const a = runSimulation({ kind: "GAUSSIAN", values, ...BASE, seed: 1 });
    const b = runSimulation({ kind: "GAUSSIAN", values, ...BASE, seed: 2 });

    expect(a.samples).not.toEqual(b.samples);
    // ...but both still describe the same distribution.
    expect(a.summary.mean).toBeCloseTo(b.summary.mean, 1);
  });
});

describe("parameter changes move the reported statistics", () => {
  it("changing sigma changes the sampled standard deviation proportionally", () => {
    // The core interaction of M3.3: drag sigma, watch the spread respond.
    const narrow = runSimulation({
      kind: "GAUSSIAN",
      values: { mu: 2, sigma: 0.02 },
      ...BASE,
    });
    const wide = runSimulation({
      kind: "GAUSSIAN",
      values: { mu: 2, sigma: 0.08 },
      ...BASE,
    });

    expect(narrow.summary.standardDeviation).toBeGreaterThan(0);
    expect(Math.abs(narrow.summary.standardDeviation - 0.02)).toBeLessThan(2e-3);
    expect(Math.abs(wide.summary.standardDeviation - 0.08)).toBeLessThan(4e-3);

    // Four times the sigma means four times the sampled spread.
    const ratio = wide.summary.standardDeviation / narrow.summary.standardDeviation;
    expect(ratio).toBeGreaterThan(3.8);
    expect(ratio).toBeLessThan(4.2);

    // And the mean must NOT move: a sampler that couples the two would
    // teach the wrong thing about what sigma controls.
    expect(Math.abs(wide.summary.mean - narrow.summary.mean)).toBeLessThan(5e-3);
  });

  it("changing mu shifts the sampled mean by the same amount", () => {
    const at2 = runSimulation({ kind: "GAUSSIAN", values: { mu: 2, sigma: 0.5 }, ...BASE });
    const at5 = runSimulation({ kind: "GAUSSIAN", values: { mu: 5, sigma: 0.5 }, ...BASE });

    expect(at5.summary.mean - at2.summary.mean).toBeCloseTo(3, 1);
    // Spread is unchanged by a location shift.
    expect(at5.summary.standardDeviation).toBeCloseTo(at2.summary.standardDeviation, 1);
  });

  it("changing lambda changes the exponential mean to 1/lambda", () => {
    for (const lambda of [0.5, 2, 5]) {
      const result = runSimulation({ kind: "EXPONENTIAL", values: { lambda }, ...BASE });

      expect(result.theoretical.mean).toBeCloseTo(1 / lambda, 12);
      // Within ~2% of the model at this sample size.
      expect(Math.abs(result.summary.mean - 1 / lambda) / (1 / lambda)).toBeLessThan(0.03);
    }
  });

  it("changing uniform bounds moves the sampled range and variance", () => {
    const narrow = runSimulation({ kind: "UNIFORM", values: { a: 0, b: 1 }, ...BASE });
    const wide = runSimulation({ kind: "UNIFORM", values: { a: 0, b: 4 }, ...BASE });

    expect(narrow.summary.min).toBeGreaterThanOrEqual(0);
    expect(narrow.summary.max).toBeLessThanOrEqual(1);
    expect(wide.summary.max).toBeGreaterThan(3.9);

    // Variance is (b - a)^2 / 12, so four times the width is sixteen
    // times the variance.
    expect(wide.theoretical.variance / narrow.theoretical.variance).toBeCloseTo(16, 6);
    expect(wide.summary.variance / narrow.summary.variance).toBeGreaterThan(14);
    expect(wide.summary.variance / narrow.summary.variance).toBeLessThan(18);
  });

  it("increasing the sample count tightens agreement with the model", () => {
    // The observation M1.6 and M3.7 are built on. Averaged over several
    // seeds, because a single small sample can land close by luck - which
    // is itself the point those lessons make.
    const error = (sampleCount: number, seed: number) => {
      const result = runSimulation({
        kind: "GAUSSIAN",
        values: { mu: 2, sigma: 0.5 },
        seed,
        binCount: 40,
        sampleCount,
      });
      return Math.abs(result.summary.mean - 2);
    };

    const seeds = [1, 2, 3, 4, 5, 6, 7, 8];
    const meanError = (n: number) =>
      seeds.reduce((total, seed) => total + error(n, seed), 0) / seeds.length;

    expect(meanError(20_000)).toBeLessThan(meanError(50));
  });
});

describe("derived view data", () => {
  it("produces one bin per requested bin and a full-resolution curve", () => {
    const result = runSimulation({
      kind: "GAUSSIAN",
      values: { mu: 0, sigma: 1 },
      ...BASE,
      binCount: 25,
    });

    expect(result.bins).toHaveLength(25);
    expect(result.pdfCurve).toHaveLength(200);
    expect(result.cdfCurve).toHaveLength(200);
    expect(result.ecdfPoints).toHaveLength(BASE.sampleCount);
    expect(result.qqPairs).toHaveLength(BASE.sampleCount);
  });

  it("bins a density that integrates to about 1 over the plot domain", () => {
    const result = runSimulation({ kind: "GAUSSIAN", values: { mu: 0, sigma: 1 }, ...BASE });
    const area = result.bins.reduce(
      (total, bin) => total + bin.density * (bin.end - bin.start),
      0
    );

    // Not exactly 1: the plot domain truncates at +/-4 sigma.
    expect(area).toBeGreaterThan(0.99);
    expect(area).toBeLessThanOrEqual(1.0001);
  });

  it("keeps every Q-Q theoretical quantile finite", () => {
    // The (i + 0.5)/n plotting positions exist precisely so that no point
    // lands at p = 1, whose Gaussian quantile is +Infinity.
    const result = runSimulation({
      kind: "GAUSSIAN",
      values: { mu: 0, sigma: 1 },
      ...BASE,
      sampleCount: 500,
    });

    expect(result.qqPairs.every((pair) => Number.isFinite(pair.theoretical))).toBe(true);
  });

  it("honours an explicit domain, so several simulators can share axes", () => {
    const result = runSimulation({
      kind: "GAUSSIAN",
      values: { mu: 0, sigma: 1 },
      ...BASE,
      domain: [-10, 10],
    });

    expect(result.domain).toEqual([-10, 10]);
    expect(result.bins[0].start).toBeCloseTo(-10, 10);
  });
});

describe("invalid parameters fail visibly", () => {
  it("reports the registry's own message and draws nothing", () => {
    const result = runSimulation({
      kind: "GAUSSIAN",
      values: { mu: 0, sigma: 0 },
      ...BASE,
    });

    expect(result.error).toContain("greater than zero");
    expect(result.samples).toHaveLength(0);
    expect(result.bins).toHaveLength(0);
    expect(result.pdfCurve).toHaveLength(0);
    // No NaN leaks into anything a chart would try to scale.
    expect(result.summary.count).toBe(0);
  });

  it("rejects a reversed uniform interval", () => {
    const result = runSimulation({ kind: "UNIFORM", values: { a: 5, b: 1 }, ...BASE });
    expect(result.error).toContain("strictly less");
  });

  it("falls back to the registry default for a missing parameter", () => {
    // Slider state is external input; a key can be absent on first render
    // or after a lesson changes which controls it exposes.
    const result = runSimulation({ kind: "GAUSSIAN", values: {}, ...BASE });

    expect(result.error).toBeNull();
    expect(result.theoretical.mean).toBe(0);
    expect(result.theoretical.standardDeviation).toBe(1);
  });

  it("ignores an unknown key rather than passing it through", () => {
    const result = runSimulation({
      kind: "EXPONENTIAL",
      values: { lambda: 2, sigma: 999 },
      ...BASE,
    });

    expect(result.error).toBeNull();
    expect(result.theoretical.mean).toBeCloseTo(0.5, 12);
  });
});

describe("bounds", () => {
  it("clamps the sample count to the schema ceiling", () => {
    const result = runSimulation({
      kind: "UNIFORM",
      values: { a: 0, b: 1 },
      seed: 1,
      binCount: 10,
      sampleCount: 1_000_000,
    });

    expect(result.summary.count).toBe(MAX_SIMULATION_SAMPLES);
  });

  it("handles a zero sample count without throwing", () => {
    const result = runSimulation({
      kind: "UNIFORM",
      values: { a: 0, b: 1 },
      seed: 1,
      binCount: 10,
      sampleCount: 0,
    });

    expect(result.error).toBeNull();
    expect(result.samples).toHaveLength(0);
    expect(result.bins).toHaveLength(10);
  });
});

describe("defaultValues", () => {
  it("returns a valid starting point for every distribution", () => {
    for (const kind of ["UNIFORM", "GAUSSIAN", "EXPONENTIAL"] as const) {
      const result = runSimulation({
        kind,
        values: defaultValues(kind),
        seed: 1,
        binCount: 20,
        sampleCount: 100,
      });

      expect(result.error).toBeNull();
    }
  });
});
