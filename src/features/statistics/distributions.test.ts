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

describe("irwin-hall", () => {
  const spec = DISTRIBUTIONS.IRWIN_HALL;

  /**
   * Every expected value below is hand-derived from the convolution of k
   * uniforms, not read back out of this implementation. That matters more
   * here than anywhere else in this file: the whole point of the entry is
   * that the bell shape is a consequence of summation, so a density that
   * happens to look bell-shaped while being subtly wrong would corrupt the
   * one lesson it exists for.
   */
  it("is the flat uniform at k = 1", () => {
    expect(spec.pdf(0.5, { k: 1 })).toBeCloseTo(1, 15);
    expect(spec.pdf(0, { k: 1 })).toBeCloseTo(1, 15);
    expect(spec.pdf(1, { k: 1 })).toBeCloseTo(1, 15);
    expect(spec.pdf(1.5, { k: 1 })).toBe(0);
    expect(spec.pdf(-0.5, { k: 1 })).toBe(0);
  });

  it("is the triangle f(x) = x, then 2 - x, at k = 2", () => {
    // The convolution of two unit boxes, by hand.
    for (const x of [0, 0.25, 0.5, 0.75]) {
      expect(spec.pdf(x, { k: 2 })).toBeCloseTo(x, 13);
    }
    for (const x of [1.25, 1.5, 1.75]) {
      expect(spec.pdf(x, { k: 2 })).toBeCloseTo(2 - x, 13);
    }
    expect(spec.pdf(1, { k: 2 })).toBeCloseTo(1, 13);
  });

  it("matches the three-piece quadratic at k = 3", () => {
    // x^2/2 on [0,1]; (-2x^2 + 6x - 3)/2 on [1,2]; (3-x)^2/2 on [2,3].
    expect(spec.pdf(0.5, { k: 3 })).toBeCloseTo(0.125, 13);
    expect(spec.pdf(1.5, { k: 3 })).toBeCloseTo(0.75, 13);
    expect(spec.pdf(2.5, { k: 3 })).toBeCloseTo(0.125, 13);
    expect(spec.pdf(1, { k: 3 })).toBeCloseTo(0.5, 13);
  });

  it("is symmetric about k/2 and integrates to 1, at every k the lesson uses", () => {
    for (const k of [1, 2, 4, 12, 30]) {
      const params = { k };
      for (const offset of [0.1, 0.4, 0.9]) {
        const width = (k / 2) * offset;
        expect(spec.pdf(k / 2 - width, params)).toBeCloseTo(
          spec.pdf(k / 2 + width, params),
          13
        );
      }

      // Trapezoid over the FULL support, not the plot domain: the density
      // must carry all of its mass, independently of what is framed.
      const steps = 60_000;
      const width = k / steps;
      let area = 0;
      for (let i = 0; i < steps; i += 1) {
        area +=
          ((spec.pdf(i * width, params) + spec.pdf((i + 1) * width, params)) / 2) *
          width;
      }
      expect(area).toBeCloseTo(1, 6);
    }
  });

  it("puts exactly half its mass below k/2", () => {
    for (const k of [1, 2, 4, 12, 30]) {
      expect(spec.cdf(k / 2, { k })).toBeCloseTo(0.5, 14);
    }
    // Hand-checked interior values, from the piecewise integrals.
    expect(spec.cdf(1, { k: 2 })).toBeCloseTo(0.5, 14);
    expect(spec.cdf(0.5, { k: 2 })).toBeCloseTo(0.125, 14);
    expect(spec.cdf(1, { k: 3 })).toBeCloseTo(1 / 6, 13);
  });

  it("saturates outside its bounded support", () => {
    expect(spec.cdf(-1, { k: 5 })).toBe(0);
    expect(spec.cdf(6, { k: 5 })).toBe(1);
    expect(spec.support({ k: 30 })).toEqual([0, 30]);
  });

  it("inverts its own CDF to double precision", () => {
    for (const k of [1, 2, 4, 12, 30]) {
      for (const p of [1e-5, 0.001, 0.01, 0.1, 0.25, 0.5, 0.75, 0.9, 0.99, 0.99999]) {
        expect(spec.cdf(spec.quantile(p, { k }), { k })).toBeCloseTo(p, 13);
      }
      expect(spec.quantile(0.5, { k })).toBeCloseTo(k / 2, 10);
    }
  });

  it("matches the closed-form mean k/2 and variance k/12", () => {
    for (const k of [1, 2, 4, 12, 30]) {
      expect(spec.mean({ k })).toBe(k / 2);
      expect(spec.variance({ k })).toBe(k / 12);
    }
    // k = 12 is the anchor M3.2's comparison figure is pinned to: the
    // standard deviation is exactly 1, so the matched Gaussian is
    // mu = 6, sigma = 1 with no rounding anywhere.
    expect(spec.variance({ k: 12 })).toBe(1);
  });

  it("SAMPLES BY ACTUALLY SUMMING UNIFORM DRAWS", () => {
    // The lesson's entire claim is that the shape comes from addition. So
    // this asserts the mechanism directly rather than inferring it from
    // the resulting histogram: a sample must equal the sum of the next k
    // draws of an identically seeded generator, exactly.
    for (const k of [1, 2, 7, 30]) {
      const sampler = createRng(20_260_908);
      const witness = createRng(20_260_908);

      for (let trial = 0; trial < 25; trial += 1) {
        let expected = 0;
        for (let i = 0; i < k; i += 1) expected += witness();
        expect(spec.sample(sampler, { k })).toBe(expected);
      }
    }
  });

  it("draws only inside [0, k], because a sum of bounded terms is bounded", () => {
    const rng = createRng(7);
    for (let i = 0; i < 5_000; i += 1) {
      const value = spec.sample(rng, { k: 12 });
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(12);
    }
  });

  it("recovers the sample mean and standard deviation the model predicts", () => {
    const rng = createRng(99);
    const samples = Array.from({ length: 20_000 }, () => spec.sample(rng, { k: 12 }));

    expect(mean(samples)).toBeCloseTo(6, 1);
    expect(standardDeviation(samples)).toBeCloseTo(1, 1);
  });

  it("rejects a k that is not a whole number of error sources", () => {
    expect(spec.validate({ k: 12 })).toBeNull();
    expect(spec.validate({ k: 2.5 })).toMatch(/whole number/);
    expect(spec.validate({ k: 0 })).toMatch(/at least 1/);
    expect(spec.validate({ k: -3 })).toMatch(/at least 1/);
    expect(spec.validate({ k: Number.NaN })).toMatch(/finite/);
    // The cap is a resource guard, not a mathematical one: evaluation is
    // O(k^2) and k arrives from an author-controlled JSON payload.
    expect(spec.validate({ k: 201 })).toMatch(/capped/);
  });

  it("fits k from the sample mean, rounded to a whole count", () => {
    const rng = createRng(4);
    const samples = Array.from({ length: 5_000 }, () => spec.sample(rng, { k: 9 }));
    expect(spec.fit(samples).k).toBe(9);
    expect(spec.fit([]).k).toBe(1);
  });

  it("frames the mass rather than the support, so the bell is not a spike", () => {
    // At k = 30 the support is 30 wide and sigma is 1.58. A frame drawn on
    // the support would render the bell as a spike in an empty axis at
    // exactly the lesson where its shape has to be read.
    const [low, high] = spec.plotDomain({ k: 30 });
    expect(low).toBeGreaterThan(5);
    expect(high).toBeLessThan(25);
    expect(high - low).toBeLessThan(30);

    // At small k there is no tail to cut, so the whole block is framed.
    const [smallLow, smallHigh] = spec.plotDomain({ k: 1 });
    expect(smallLow).toBeLessThan(0);
    expect(smallHigh).toBeGreaterThan(1);
  });

  /**
   * THE LESSON'S OWN CLAIM, AS A TEST.
   *
   * M3.2 asserts that summing more independent uniform errors takes the
   * shape closer to a bell. That is a checkable statement about this
   * implementation, so it is checked here rather than left to the
   * learner's eye and the author's confidence.
   *
   * Note the direction of the dependency: the Gaussian appears only as the
   * YARDSTICK. Nothing in the Irwin-Hall entry consults it, which is the
   * whole reason the lesson demonstrates a mechanism instead of assuming
   * its conclusion.
   */
  it("converges toward the normal as k rises, monotonically", () => {
    const gaussian = DISTRIBUTIONS.GAUSSIAN;

    const distanceToNormal = (k: number): number => {
      const mu = k / 2;
      const sigma = Math.sqrt(k / 12);
      let worst = 0;

      for (let i = 0; i <= 600; i += 1) {
        const z = -3 + (i * 6) / 600;
        // Standardized, so the comparison is of SHAPE alone — both the
        // centre and the width of the Irwin-Hall move with k.
        const observed = sigma * spec.pdf(mu + z * sigma, { k });
        const reference = gaussian.pdf(z, { mu: 0, sigma: 1 });
        worst = Math.max(worst, Math.abs(observed - reference));
      }

      return worst;
    };

    const ladder = [1, 2, 4, 12, 30].map(distanceToNormal);

    for (let i = 1; i < ladder.length; i += 1) {
      expect(ladder[i]).toBeLessThan(ladder[i - 1]);
    }

    // Measured, not aspirational: 0.199, 0.031, 0.014, 0.0050, 0.0020.
    expect(ladder[0]).toBeGreaterThan(0.15);
    expect(ladder[ladder.length - 1]).toBeLessThan(0.005);
  });

  it("is still not a Gaussian, and says so in its assumptions", () => {
    // Bounded support is the honest limit of the demonstration, and M3.2's
    // warning callout rests on it. If this ever stops being true the
    // lesson's "this is not a proof of the CLT" paragraph is wrong.
    expect(spec.support({ k: 12 })).toEqual([0, 12]);
    expect(spec.framing.assumptions.join(" ")).toMatch(/Central Limit Theorem/);
  });
});

describe("registry invariants", () => {
  it("keys every entry by its own kind", () => {
    for (const kind of DISTRIBUTION_KINDS) {
      expect(DISTRIBUTIONS[kind].kind).toBe(kind);
    }
  });

  it("ships exactly the four Phase 1 distributions", () => {
    // A tripwire, not a tautology. Adding a registry entry changes what
    // every lesson in the course can be authored against, so it should be
    // a deliberate edit here rather than something that slips in.
    expect([...DISTRIBUTION_KINDS].sort()).toEqual([
      "EXPONENTIAL",
      "GAUSSIAN",
      "IRWIN_HALL",
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
    expect(
      DISTRIBUTIONS.IRWIN_HALL.validate(defaults("IRWIN_HALL") as never)
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
      { spec: DISTRIBUTIONS.IRWIN_HALL, params: { k: 1 } },
      { spec: DISTRIBUTIONS.IRWIN_HALL, params: { k: 12 } },
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
