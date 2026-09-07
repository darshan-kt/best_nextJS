import { describe, expect, it } from "vitest";

import {
  DISTRIBUTIONS,
  DISTRIBUTION_KINDS,
  __numerics,
  type DistributionKind,
} from "./distributions";
import { createRng } from "./rng";
import { mean, standardDeviation } from "./summary";

/**
 * Mathematical correctness is risk 3 in PHASE_1A_ARCHITECTURE.md, and the
 * reason it is rated High is that a wrong constant is invisible: a
 * Gaussian with the wrong normalizing factor still looks like a bell
 * curve. So every closed-form value below is a published constant or a
 * hand-derived one, never a snapshot of what this implementation returned.
 *
 * The Gaussian CDF and quantile are rational approximations; their error
 * bounds are asserted directly rather than assumed.
 */

const { standardNormalCdf, probit } = __numerics;

describe("numerical primitives", () => {
  it("matches published standard normal CDF values to double precision", () => {
    // Reference values from the standard normal table, full precision.
    expect(standardNormalCdf(0)).toBeCloseTo(0.5, 15);
    expect(standardNormalCdf(1)).toBeCloseTo(0.8413447460685429, 14);
    expect(standardNormalCdf(-1)).toBeCloseTo(0.15865525393145707, 14);
    expect(standardNormalCdf(1.96)).toBeCloseTo(0.9750021048517795, 14);
    expect(standardNormalCdf(2.5)).toBeCloseTo(0.9937903346742238, 14);
    expect(standardNormalCdf(-3)).toBeCloseTo(0.0013498980316300933, 14);
  });

  it("stays accurate in the far tails, where a Q-Q plot's reference line lives", () => {
    // Tail accuracy is RELATIVE, not absolute: Phi(-8) is 6.2e-16, so an
    // absolute-error assertion there is satisfied by returning zero. The
    // property that actually matters for a Q-Q plot is that the tail
    // quantiles keep their significant figures.
    const relativeError = (actual: number, expected: number) =>
      Math.abs(actual - expected) / expected;

    // Measured bounds, not aspirational ones. The rational branch (|z| <
    // 7.07) holds ~1e-11 relative or better; the continued-fraction branch
    // beyond it holds ~1e-8. Every Q-Q plot this course draws lives in the
    // first branch: with (i + 0.5)/n plotting positions and the schema's
    // 50,000-sample ceiling, the most extreme point is |z| ~ 4.3.
    expect(relativeError(standardNormalCdf(-3), 0.0013498980316300933)).toBeLessThan(1e-13);
    expect(relativeError(standardNormalCdf(-5), 2.866515718791939e-7)).toBeLessThan(1e-10);
    expect(relativeError(standardNormalCdf(-8), 6.220960574271782e-16)).toBeLessThan(1e-7);
    expect(relativeError(standardNormalCdf(-10), 7.619853024160526e-24)).toBeLessThan(1e-7);

    // Past 37 sigma the result is 0 or 1 to within double precision.
    expect(standardNormalCdf(-40)).toBe(0);
    expect(standardNormalCdf(40)).toBe(1);
  });

  it("is symmetric", () => {
    for (const x of [0.5, 1, 2, 3, 6]) {
      expect(standardNormalCdf(x) + standardNormalCdf(-x)).toBeCloseTo(1, 14);
    }
  });

  it("matches published probit values", () => {
    expect(probit(0.5)).toBeCloseTo(0, 12);
    expect(probit(0.975)).toBeCloseTo(1.959963984540054, 12);
    expect(probit(0.95)).toBeCloseTo(1.6448536269514722, 12);
    expect(probit(0.025)).toBeCloseTo(-1.959963984540054, 12);
    expect(probit(0.001)).toBeCloseTo(-3.090232306167813, 12);
    expect(probit(0.999)).toBeCloseTo(3.090232306167813, 12);
  });

  it("is a true inverse of the CDF after the Halley refinement", () => {
    for (const p of [1e-6, 1e-3, 0.02, 0.1, 0.5, 0.9, 0.98, 0.999, 1 - 1e-6]) {
      expect(standardNormalCdf(probit(p))).toBeCloseTo(p, 13);
    }
  });

  it("returns infinities at the endpoints", () => {
    expect(probit(0)).toBe(Number.NEGATIVE_INFINITY);
    expect(probit(1)).toBe(Number.POSITIVE_INFINITY);
  });
});

describe("uniform", () => {
  const spec = DISTRIBUTIONS.UNIFORM;
  const params = { a: 2, b: 6 };

  it("has a flat density of 1 / (b - a) inside the support and 0 outside", () => {
    expect(spec.pdf(2, params)).toBeCloseTo(0.25, 12);
    expect(spec.pdf(4, params)).toBeCloseTo(0.25, 12);
    expect(spec.pdf(6, params)).toBeCloseTo(0.25, 12);
    expect(spec.pdf(1.999, params)).toBe(0);
    expect(spec.pdf(6.001, params)).toBe(0);
  });

  it("computes the CDF linearly and saturates outside the support", () => {
    expect(spec.cdf(1, params)).toBe(0);
    expect(spec.cdf(2, params)).toBeCloseTo(0, 12);
    expect(spec.cdf(4, params)).toBeCloseTo(0.5, 12);
    expect(spec.cdf(6, params)).toBeCloseTo(1, 12);
    expect(spec.cdf(7, params)).toBe(1);
  });

  it("matches the closed-form mean and variance", () => {
    expect(spec.mean(params)).toBeCloseTo(4, 12);
    expect(spec.variance(params)).toBeCloseTo(16 / 12, 12);
  });

  it("inverts its own CDF", () => {
    for (const p of [0.01, 0.25, 0.5, 0.75, 0.99]) {
      expect(spec.cdf(spec.quantile(p, params), params)).toBeCloseTo(p, 10);
    }
  });

  it("rejects a non-ordered or non-finite interval", () => {
    expect(spec.validate({ a: 2, b: 6 })).toBeNull();
    expect(spec.validate({ a: 6, b: 2 })).toContain("strictly less");
    expect(spec.validate({ a: 2, b: 2 })).toContain("strictly less");
    expect(spec.validate({ a: Number.NaN, b: 2 })).toContain("finite");
  });

  it("fits the sample minimum and maximum (the MLE, deliberately biased inward)", () => {
    const fitted = spec.fit([3, 1, 4, 1, 5]);
    expect(fitted).toEqual({ a: 1, b: 5 });
  });
});

describe("gaussian", () => {
  const spec = DISTRIBUTIONS.GAUSSIAN;
  const standard = { mu: 0, sigma: 1 };

  it("peaks at 1 / (sigma * sqrt(2 pi))", () => {
    expect(spec.pdf(0, standard)).toBeCloseTo(0.3989422804014327, 12);
    expect(spec.pdf(0, { mu: 0, sigma: 2 })).toBeCloseTo(0.19947114020071635, 12);
  });

  it("is symmetric about mu", () => {
    const params = { mu: 2, sigma: 0.5 };
    expect(spec.pdf(1.7, params)).toBeCloseTo(spec.pdf(2.3, params), 12);
  });

  it("matches published standard normal CDF values", () => {
    expect(spec.cdf(0, standard)).toBeCloseTo(0.5, 15);
    expect(spec.cdf(1, standard)).toBeCloseTo(0.8413447460685429, 14);
    expect(spec.cdf(-1, standard)).toBeCloseTo(0.15865525393145707, 14);
    expect(spec.cdf(1.96, standard)).toBeCloseTo(0.9750021048517795, 14);
  });

  it("reproduces the 68-95-99.7 rule the course teaches in M3.5", () => {
    const within = (k: number) => spec.cdf(k, standard) - spec.cdf(-k, standard);

    expect(within(1)).toBeCloseTo(0.6826894921370859, 14);
    expect(within(2)).toBeCloseTo(0.9544997361036416, 14);
    expect(within(3)).toBeCloseTo(0.9973002039367398, 14);
  });

  it("inverts its own CDF", () => {
    const params = { mu: 2, sigma: 0.02 };
    for (const p of [0.001, 0.05, 0.5, 0.95, 0.999]) {
      expect(spec.cdf(spec.quantile(p, params), params)).toBeCloseTo(p, 13);
    }
  });

  it("rejects a non-positive sigma rather than returning NaN", () => {
    expect(spec.validate(standard)).toBeNull();
    expect(spec.validate({ mu: 0, sigma: 0 })).toContain("greater than zero");
    expect(spec.validate({ mu: 0, sigma: -1 })).toContain("greater than zero");
    expect(spec.validate({ mu: Number.NaN, sigma: 1 })).toContain("finite");
  });

  it("has an infinite support but a finite plot domain", () => {
    expect(spec.support(standard)).toEqual([
      Number.NEGATIVE_INFINITY,
      Number.POSITIVE_INFINITY,
    ]);

    const [low, high] = spec.plotDomain({ mu: 2, sigma: 0.5 });
    expect(low).toBeCloseTo(0, 12);
    expect(high).toBeCloseTo(4, 12);
  });

  it("recovers its parameters from a large seeded sample", () => {
    // The flagship lab's actual working numbers: a wall at 2 m with 2 cm
    // of noise. Standard error of the mean here is 1.4e-4, so a 2e-3
    // tolerance is roughly 14 standard errors - tight enough to catch a
    // wrong constant, loose enough not to be flaky.
    const params = { mu: 2, sigma: 0.02 };
    const rng = createRng(42);
    const samples = Array.from({ length: 20_000 }, () => spec.sample(rng, params));

    expect(mean(samples)).toBeCloseTo(2, 2);
    expect(Math.abs(mean(samples) - 2)).toBeLessThan(2e-3);
    expect(Math.abs(standardDeviation(samples) - 0.02)).toBeLessThan(2e-3);

    const fitted = spec.fit(samples);
    expect(Math.abs(fitted.mu - 2)).toBeLessThan(2e-3);
    expect(Math.abs(fitted.sigma - 0.02)).toBeLessThan(2e-3);
  });

  it("fits with the Bessel-corrected sigma, matching NumPy ddof=1", () => {
    const samples = [2, 4, 4, 4, 5, 5, 7, 9];
    expect(spec.fit(samples).sigma).toBeCloseTo(Math.sqrt(32 / 7), 12);
  });
});

describe("exponential", () => {
  const spec = DISTRIBUTIONS.EXPONENTIAL;
  const params = { lambda: 2 };

  it("has density lambda at zero and decays from there", () => {
    expect(spec.pdf(0, params)).toBeCloseTo(2, 12);
    expect(spec.pdf(1, params)).toBeCloseTo(2 * Math.exp(-2), 12);
    expect(spec.pdf(-0.1, params)).toBe(0);
  });

  it("matches the closed-form CDF", () => {
    expect(spec.cdf(0, params)).toBeCloseTo(0, 12);
    expect(spec.cdf(0.5, params)).toBeCloseTo(1 - Math.exp(-1), 12);
    expect(spec.cdf(-1, params)).toBe(0);
  });

  it("has mean and median 1/lambda and ln(2)/lambda respectively", () => {
    expect(spec.mean(params)).toBeCloseTo(0.5, 12);
    expect(spec.variance(params)).toBeCloseTo(0.25, 12);
    expect(spec.quantile(0.5, params)).toBeCloseTo(Math.LN2 / 2, 12);
  });

  it("is memoryless: P(T > s + t | T > s) = P(T > t)", () => {
    // The property M4.4 is built on, asserted rather than assumed.
    const survival = (t: number) => 1 - spec.cdf(t, params);
    const s = 1.5;
    const t = 0.7;

    expect(survival(s + t) / survival(s)).toBeCloseTo(survival(t), 12);
  });

  it("starts its support at zero", () => {
    expect(spec.support(params)[0]).toBe(0);
    expect(spec.plotDomain(params)[0]).toBe(0);
  });

  it("rejects a non-positive lambda", () => {
    expect(spec.validate(params)).toBeNull();
    expect(spec.validate({ lambda: 0 })).toContain("greater than zero");
    expect(spec.validate({ lambda: -1 })).toContain("greater than zero");
  });

  it("recovers lambda from a large seeded sample", () => {
    const rng = createRng(2026);
    const samples = Array.from({ length: 50_000 }, () => spec.sample(rng, { lambda: 3 }));

    expect(samples.every((value) => value >= 0)).toBe(true);
    expect(spec.fit(samples).lambda).toBeCloseTo(3, 1);
  });

  it("never samples a negative waiting time", () => {
    const rng = createRng(9);
    for (let i = 0; i < 5_000; i += 1) {
      expect(spec.sample(rng, { lambda: 0.05 })).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("registry invariants", () => {
  it("keys every entry by its own kind", () => {
    for (const kind of DISTRIBUTION_KINDS) {
      expect(DISTRIBUTIONS[kind].kind).toBe(kind);
    }
  });

  it("ships exactly the three Phase 1 distributions", () => {
    expect([...DISTRIBUTION_KINDS].sort()).toEqual([
      "EXPONENTIAL",
      "GAUSSIAN",
      "UNIFORM",
    ]);
  });

  it("gives every parameter a default inside its suggested range", () => {
    for (const kind of DISTRIBUTION_KINDS) {
      for (const parameter of DISTRIBUTIONS[kind].parameters) {
        expect(parameter.suggestedMin).toBeLessThan(parameter.suggestedMax);
        expect(parameter.defaultValue).toBeGreaterThanOrEqual(parameter.suggestedMin);
        expect(parameter.defaultValue).toBeLessThanOrEqual(parameter.suggestedMax);
        expect(parameter.suggestedStep).toBeGreaterThan(0);
        // Every parameter carries a learner-facing explanation - the same
        // requirement HardwareDeviceSpec.whyItMatters already enforces.
        expect(parameter.description.length).toBeGreaterThan(0);
      }
    }
  });

  it("accepts every parameter default as valid", () => {
    // A default that fails its own validator would render an error on
    // first paint of every simulation block.
    const defaults = (kind: DistributionKind) =>
      Object.fromEntries(
        DISTRIBUTIONS[kind].parameters.map((p) => [p.key, p.defaultValue])
      );

    expect(DISTRIBUTIONS.UNIFORM.validate(defaults("UNIFORM") as never)).toBeNull();
    expect(DISTRIBUTIONS.GAUSSIAN.validate(defaults("GAUSSIAN") as never)).toBeNull();
    expect(
      DISTRIBUTIONS.EXPONENTIAL.validate(defaults("EXPONENTIAL") as never)
    ).toBeNull();
  });

  it("states a framing question and at least two assumptions for each", () => {
    // Spec §63: assumptions are never hidden. Making that a structural
    // property of the registry means a future distribution cannot be added
    // without them.
    for (const kind of DISTRIBUTION_KINDS) {
      const { framing } = DISTRIBUTIONS[kind];
      expect(framing.question.length).toBeGreaterThan(0);
      expect(framing.mechanism.length).toBeGreaterThan(0);
      expect(framing.assumptions.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("integrates each density to 1 over its plot domain", () => {
    // A blunt trapezoid check, but it catches a wrong normalizing constant
    // in any of the three - the failure mode that looks correct on a plot.
    const cases = [
      { spec: DISTRIBUTIONS.UNIFORM, params: { a: 0, b: 1 } },
      { spec: DISTRIBUTIONS.GAUSSIAN, params: { mu: 0, sigma: 1 } },
      { spec: DISTRIBUTIONS.EXPONENTIAL, params: { lambda: 1 } },
    ] as const;

    for (const { spec, params } of cases) {
      const [low, high] = spec.plotDomain(params as never);
      const steps = 20_000;
      const width = (high - low) / steps;

      let area = 0;
      for (let i = 0; i < steps; i += 1) {
        const left = spec.pdf(low + i * width, params as never);
        const right = spec.pdf(low + (i + 1) * width, params as never);
        area += ((left + right) / 2) * width;
      }

      // Not exactly 1: the plot domain deliberately truncates the Gaussian
      // at +/-4 sigma (0.006% of the mass) and the exponential at its
      // 99.9th percentile.
      expect(area).toBeGreaterThan(0.998);
      expect(area).toBeLessThanOrEqual(1.0001);
    }
  });
});
