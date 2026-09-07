/**
 * The distribution registry (§5: domain layer — pure, no I/O, no React).
 *
 * THIS FILE IS THE COURSE'S EXTENSIBILITY MECHANISM.
 *
 * Every distribution the course teaches is one entry here. The simulation
 * block, the plots, the parameter controls, the summary panel, the Q-Q
 * plot and the fitted overlay are all driven by the registry rather than
 * by per-distribution components, so adding Poisson (or Binomial, or
 * Gamma) in a later phase is one entry plus one content module — no
 * component, renderer, block type or schema change. That is the concrete
 * form of "design the architecture so they can be added later"
 * (PHASE_1A_ARCHITECTURE.md §12).
 *
 * Phase 1 deliberately ships three: UNIFORM, GAUSSIAN, EXPONENTIAL.
 *
 * NUMERICAL ACCURACY
 *
 * The Gaussian has no closed-form CDF, so `cdf` and `quantile` use
 * published rational approximations rather than exact expressions. Both
 * reach double-precision accuracy; the bounds are stated at each call site
 * and asserted in `distributions.test.ts`. Everything else here is exact.
 */

import type { Rng } from "./rng";
import { mean as sampleMean, standardDeviation as sampleStandardDeviation } from "./summary";

export type DistributionKind = "UNIFORM" | "GAUSSIAN" | "EXPONENTIAL";

export interface UniformParams {
  /** Lower bound, inclusive. */
  a: number;
  /** Upper bound, inclusive. */
  b: number;
}

export interface GaussianParams {
  mu: number;
  sigma: number;
}

export interface ExponentialParams {
  lambda: number;
}

export interface DistributionParamsByKind {
  UNIFORM: UniformParams;
  GAUSSIAN: GaussianParams;
  EXPONENTIAL: ExponentialParams;
}

export type DistributionParams =
  DistributionParamsByKind[keyof DistributionParamsByKind];

/**
 * One learner-facing parameter. The block schema validates its controls
 * against these (PHASE_1A_ARCHITECTURE.md §18.2), so an author cannot ship
 * a slider for a parameter a distribution does not have, nor omit one it
 * requires.
 */
export interface ParameterSpec {
  key: string;
  label: string;
  /** Rendered beside the value, e.g. "m" or "events/s". */
  unit?: string;
  /** Sensible slider bounds for a lesson; not a mathematical constraint. */
  suggestedMin: number;
  suggestedMax: number;
  suggestedStep: number;
  defaultValue: number;
  /** One sentence, learner-facing: what moving this actually changes. */
  description: string;
}

export interface DistributionSpec<K extends DistributionKind> {
  kind: K;
  label: string;
  /**
   * DISCRETE is reserved — no Phase 1 distribution uses it. It exists so
   * that the PMF-vs-PDF rendering decision (M1.2) is a registry property
   * rather than a conditional the future Bernoulli module has to add to
   * every chart component.
   */
  variety: "CONTINUOUS" | "DISCRETE";
  parameters: ParameterSpec[];

  /**
   * Reject invalid parameters with a learner-readable reason, or `null`
   * when valid.
   *
   * Every function below assumes validated parameters. This is the guard
   * the Zod block schema and the simulator both call first (§9): sigma = 0
   * would otherwise divide by zero and render a silent NaN, which is worse
   * than an error message.
   */
  validate(params: DistributionParamsByKind[K]): string | null;

  /**
   * Mathematical support — where the density is non-zero. May be
   * infinite. This is a *teaching* value (M4.3 turns on the exponential's
   * support starting at 0); use `plotDomain` for axes.
   */
  support(params: DistributionParamsByKind[K]): [number, number];

  /**
   * A finite domain worth drawing. Distinct from `support` because the
   * Gaussian's support is the whole real line and an axis cannot be.
   */
  plotDomain(params: DistributionParamsByKind[K]): [number, number];

  pdf(x: number, params: DistributionParamsByKind[K]): number;
  cdf(x: number, params: DistributionParamsByKind[K]): number;
  /** Inverse CDF. Powers Q-Q plots and inverse-transform sampling. */
  quantile(p: number, params: DistributionParamsByKind[K]): number;

  sample(rng: Rng, params: DistributionParamsByKind[K]): number;

  mean(params: DistributionParamsByKind[K]): number;
  variance(params: DistributionParamsByKind[K]): number;

  /**
   * Estimate parameters from data. The estimator used is named in each
   * implementation's comment, because which estimator was used is part of
   * what M3.9 and M4.7 ask learners to reason about — a fitted overlay
   * whose provenance is unstated is exactly the kind of unexamined claim
   * spec §63 forbids.
   */
  fit(samples: readonly number[]): DistributionParamsByKind[K];

  /** The course's WHERE / HOW / WHEN framing (PHASE_1A §5). */
  framing: {
    question: string;
    mechanism: string;
    assumptions: string[];
  };
}

/* ------------------------------------------------- numerical primitives -- */

/**
 * Standard normal CDF, Hart's rational approximation (the double-precision
 * form popularised by Graeme West, "Better approximations to cumulative
 * normal functions").
 *
 * Relative error is about 1e-13 or better inside |z| < 7.07, and about
 * 1e-8 in the continued-fraction branch beyond it — against the 1.5e-7 of
 * the textbook Abramowitz & Stegun 7.1.26 series this replaced. Both bounds
 * are measured in `distributions.test.ts` rather than quoted from the
 * source paper. Every Q-Q plot this course draws lives in the first branch:
 * with (i + 0.5)/n plotting positions and the block schema's 50,000-sample
 * ceiling, the most extreme point is around |z| = 4.3. The extra accuracy is not vanity: the flagship
 * module's Q-Q plot compares observed order statistics against theoretical
 * quantiles across five orders of magnitude of tail probability, and an
 * approximation whose own error is visible at the tails would put a bend in
 * the reference line that a learner would read as a property of their data.
 *
 * Computed directly rather than via `erf`, since Phi is what every caller
 * actually wants and routing through erf would only add a rescale.
 */
function standardNormalCdf(x: number): number {
  const absX = Math.abs(x);

  // Beyond 37 standard deviations the result is 0 or 1 to within double
  // precision, and exp(-x^2/2) underflows.
  if (absX > 37) return x > 0 ? 1 : 0;

  const exponential = Math.exp(-0.5 * absX * absX);
  let upperTail: number;

  if (absX < 7.07106781186547) {
    let build = 3.52624965998911e-2 * absX + 0.700383064443688;
    build = build * absX + 6.37396220353165;
    build = build * absX + 33.912866078383;
    build = build * absX + 112.079291497871;
    build = build * absX + 221.213596169931;
    build = build * absX + 220.206867912376;
    const numerator = exponential * build;

    build = 8.83883476483184e-2 * absX + 1.75566716318264;
    build = build * absX + 16.064177579207;
    build = build * absX + 86.7807322029461;
    build = build * absX + 296.564248779674;
    build = build * absX + 637.333633378831;
    build = build * absX + 793.826512519948;
    build = build * absX + 440.413735824752;

    upperTail = numerator / build;
  } else {
    // Continued-fraction form, which stays accurate where the rational
    // approximation above loses significance.
    let build = absX + 0.65;
    build = absX + 4 / build;
    build = absX + 3 / build;
    build = absX + 2 / build;
    build = absX + 1 / build;
    upperTail = exponential / build / 2.506628274631;
  }

  return x > 0 ? 1 - upperTail : upperTail;
}

/**
 * Inverse standard normal CDF (probit).
 *
 * Peter Acklam's rational approximation (relative error below 1.15e-9),
 * refined by one step of Halley's method against `standardNormalCdf` above.
 * The refinement costs one CDF evaluation and takes the result to
 * double-precision accuracy, which is what makes `quantile` a true inverse
 * of `cdf` rather than an approximate one — asserted as a round-trip in the
 * tests.
 *
 * Returns -Infinity at p = 0 and +Infinity at p = 1, which is
 * mathematically correct and is precisely why `quantilePairs` in
 * `summary.ts` uses (i + 0.5) / n plotting positions — see the comment
 * there.
 */
function probit(p: number): number {
  if (p <= 0) return Number.NEGATIVE_INFINITY;
  if (p >= 1) return Number.POSITIVE_INFINITY;

  const a = [
    -3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2,
    1.38357751867269e2, -3.066479806614716e1, 2.506628277459239,
  ];
  const b = [
    -5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2,
    6.680131188771972e1, -1.328068155288572e1,
  ];
  const c = [
    -7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838,
    -2.549732539343734, 4.374664141464968, 2.938163982698783,
  ];
  const d = [
    7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996,
    3.754408661907416,
  ];

  const pLow = 0.02425;
  const pHigh = 1 - pLow;

  let x: number;

  if (p < pLow) {
    const q = Math.sqrt(-2 * Math.log(p));
    x =
      (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  } else if (p > pHigh) {
    const q = Math.sqrt(-2 * Math.log(1 - p));
    x =
      -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  } else {
    const q = p - 0.5;
    const r = q * q;
    x =
      ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) /
      (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  }

  // One Halley step. `error` is the CDF residual; `u` rescales it by the
  // density at x. Skipped in the far tails, where the density underflows
  // and the correction would be 0/0.
  const error = standardNormalCdf(x) - p;
  if (Number.isFinite(x) && Math.abs(x) < 37) {
    const u = error * Math.sqrt(2 * Math.PI) * Math.exp((x * x) / 2);
    x -= u / (1 + (x * u) / 2);
  }

  return x;
}

/** A [0, 1) draw pushed into (0, 1] — guards log(0) in inverse transforms. */
function openUnit(rng: Rng): number {
  let u = rng();
  while (u <= 0) u = rng();
  return u;
}

/* -------------------------------------------------------------- uniform -- */

const uniform: DistributionSpec<"UNIFORM"> = {
  kind: "UNIFORM",
  label: "Uniform",
  variety: "CONTINUOUS",
  parameters: [
    {
      key: "a",
      label: "Minimum (a)",
      unit: "m",
      suggestedMin: -5,
      suggestedMax: 5,
      suggestedStep: 0.1,
      defaultValue: 0,
      description: "The lower bound of the range. No value below this can occur.",
    },
    {
      key: "b",
      label: "Maximum (b)",
      unit: "m",
      suggestedMin: -5,
      suggestedMax: 5,
      suggestedStep: 0.1,
      defaultValue: 1,
      description: "The upper bound of the range. No value above this can occur.",
    },
  ],

  validate: ({ a, b }) => {
    if (!Number.isFinite(a) || !Number.isFinite(b)) return "a and b must be finite numbers.";
    if (!(a < b)) return "The minimum (a) must be strictly less than the maximum (b).";
    return null;
  },

  support: ({ a, b }) => [a, b],

  // A tenth of the width either side, so the density's edges are visible
  // as edges rather than running off the axis.
  plotDomain: ({ a, b }) => {
    const pad = (b - a) * 0.1;
    return [a - pad, b + pad];
  },

  pdf: (x, { a, b }) => (x < a || x > b ? 0 : 1 / (b - a)),

  cdf: (x, { a, b }) => {
    if (x < a) return 0;
    if (x > b) return 1;
    return (x - a) / (b - a);
  },

  quantile: (p, { a, b }) => a + Math.min(1, Math.max(0, p)) * (b - a),

  // Inverse-transform sampling, which for the uniform is just a rescale.
  sample: (rng, { a, b }) => a + rng() * (b - a),

  mean: ({ a, b }) => (a + b) / 2,
  variance: ({ a, b }) => ((b - a) * (b - a)) / 12,

  /**
   * Maximum-likelihood estimator: the sample minimum and maximum.
   *
   * Deliberately the MLE and not a bias-corrected variant, because M2's
   * lesson is that this estimator is *systematically too narrow* — no
   * sample can contain a value outside itself, so the estimated interval
   * always sits inside the true one. Correcting that silently here would
   * remove the observation the module is built on.
   */
  fit: (samples) => {
    if (samples.length === 0) return { a: 0, b: 1 };
    return { a: Math.min(...samples), b: Math.max(...samples) };
  },

  framing: {
    question: "WHERE can a random value occur?",
    mechanism:
      "Every value inside a known interval is equally likely; nothing outside it is possible.",
    assumptions: [
      "The bounds are known and fixed.",
      "No value inside the range is favoured over any other.",
      "Draws are independent of one another.",
    ],
  },
};

/* ------------------------------------------------------------- gaussian -- */

const gaussian: DistributionSpec<"GAUSSIAN"> = {
  kind: "GAUSSIAN",
  label: "Normal (Gaussian)",
  variety: "CONTINUOUS",
  parameters: [
    {
      key: "mu",
      label: "Mean (μ)",
      unit: "m",
      suggestedMin: -5,
      suggestedMax: 5,
      suggestedStep: 0.01,
      defaultValue: 0,
      description: "The centre of the distribution — where measurements cluster.",
    },
    {
      key: "sigma",
      label: "Standard deviation (σ)",
      unit: "m",
      suggestedMin: 0.001,
      suggestedMax: 3,
      suggestedStep: 0.001,
      defaultValue: 1,
      description: "How far measurements typically stray from the centre.",
    },
  ],

  validate: ({ mu, sigma }) => {
    if (!Number.isFinite(mu)) return "μ must be a finite number.";
    if (!Number.isFinite(sigma)) return "σ must be a finite number.";
    if (sigma <= 0) return "σ must be greater than zero.";
    return null;
  },

  support: () => [Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY],

  // +/- 4 sigma covers 99.994% of the mass — past the 99.7% the
  // 68-95-99.7 lesson (M3.5) draws, so the third band is visible with
  // room around it rather than clipped at the axis edge.
  plotDomain: ({ mu, sigma }) => [mu - 4 * sigma, mu + 4 * sigma],

  pdf: (x, { mu, sigma }) => {
    const z = (x - mu) / sigma;
    return Math.exp(-0.5 * z * z) / (sigma * Math.sqrt(2 * Math.PI));
  },

  cdf: (x, { mu, sigma }) => standardNormalCdf((x - mu) / sigma),

  quantile: (p, { mu, sigma }) => mu + sigma * probit(p),

  /**
   * Box-Muller transform.
   *
   * Draws two uniforms and keeps one normal, discarding the paired second
   * value. That costs an extra draw per sample and buys statelessness: the
   * cached-second-value optimisation would make `sample` depend on call
   * history, so the same seed would produce different results depending on
   * how the caller interleaved distributions. Reproducibility is worth
   * more here than one multiply.
   */
  sample: (rng, { mu, sigma }) => {
    const u1 = openUnit(rng);
    const u2 = rng();
    const radius = Math.sqrt(-2 * Math.log(u1));
    return mu + sigma * radius * Math.cos(2 * Math.PI * u2);
  },

  mean: ({ mu }) => mu,
  variance: ({ sigma }) => sigma * sigma,

  /**
   * Sample mean, and the Bessel-corrected (n - 1) standard deviation.
   *
   * Note this is NOT the maximum-likelihood estimator of sigma, which
   * divides by n. The unbiased form is used because it is what M1.5 teaches
   * and what NumPy's `ddof=1` produces in the Python half of the same
   * experiment; the browser and the notebook must agree on the number a
   * learner is asked to compare.
   */
  fit: (samples) => ({
    mu: sampleMean(samples),
    sigma: sampleStandardDeviation(samples),
  }),

  framing: {
    question: "HOW does a measurement vary around its typical value?",
    mechanism:
      "Many small, independent errors add together, and their sum clusters symmetrically around a central value.",
    assumptions: [
      "Errors are additive rather than multiplicative.",
      "No single error source dominates the rest.",
      "The process is stationary — its centre and spread do not drift during the measurement.",
      "Successive measurements are independent.",
    ],
  },
};

/* ---------------------------------------------------------- exponential -- */

const exponential: DistributionSpec<"EXPONENTIAL"> = {
  kind: "EXPONENTIAL",
  label: "Exponential",
  variety: "CONTINUOUS",
  parameters: [
    {
      key: "lambda",
      label: "Rate (λ)",
      unit: "events/s",
      suggestedMin: 0.01,
      suggestedMax: 5,
      suggestedStep: 0.01,
      defaultValue: 1,
      description:
        "How often events happen on average. The mean waiting time is 1/λ.",
    },
  ],

  validate: ({ lambda }) => {
    if (!Number.isFinite(lambda)) return "λ must be a finite number.";
    if (lambda <= 0) return "λ must be greater than zero.";
    return null;
  },

  // Support starts at 0: a waiting time cannot be negative. M4.3 turns on
  // exactly this, which is why `support` is a distinct value from
  // `plotDomain` rather than folded into it.
  support: () => [0, Number.POSITIVE_INFINITY],

  // The 99.9th percentile — far enough to show the tail decaying, close
  // enough that the mass near zero is not squashed into the axis.
  plotDomain: ({ lambda }) => [0, -Math.log(0.001) / lambda],

  pdf: (x, { lambda }) => (x < 0 ? 0 : lambda * Math.exp(-lambda * x)),

  cdf: (x, { lambda }) => (x < 0 ? 0 : 1 - Math.exp(-lambda * x)),

  quantile: (p, { lambda }) => {
    const clamped = Math.min(1, Math.max(0, p));
    if (clamped >= 1) return Number.POSITIVE_INFINITY;
    return -Math.log(1 - clamped) / lambda;
  },

  // Inverse-transform sampling. M4.5 shows this derivation, so the
  // implementation and the lesson are the same three lines.
  sample: (rng, { lambda }) => -Math.log(openUnit(rng)) / lambda,

  mean: ({ lambda }) => 1 / lambda,
  variance: ({ lambda }) => 1 / (lambda * lambda),

  /**
   * Maximum-likelihood estimator: lambda-hat = 1 / sample mean.
   *
   * M4.5 derives this, and M4.7 asks learners to apply it to real event
   * data — so the estimator the course teaches and the one the fitted
   * overlay draws are the same estimator.
   */
  fit: (samples) => {
    const m = sampleMean(samples);
    if (!Number.isFinite(m) || m <= 0) return { lambda: 1 };
    return { lambda: 1 / m };
  },

  framing: {
    question: "WHEN might the next event occur?",
    mechanism:
      "Events arrive at a constant average rate, independently of one another and of how long you have already waited.",
    assumptions: [
      "Events are independent of one another.",
      "The average rate is constant over the observation window.",
      "The process is memoryless — elapsed waiting time carries no information.",
    ],
  },
};

/* ------------------------------------------------------------- registry -- */

/**
 * The registry. One entry per distribution the course teaches.
 *
 * Adding a fourth is: one `DistributionKind` value, one params interface,
 * one entry here, one Prisma enum value, and one content module. Nothing
 * that renders a distribution needs to change.
 */
export const DISTRIBUTIONS: {
  [K in DistributionKind]: DistributionSpec<K>;
} = {
  UNIFORM: uniform,
  GAUSSIAN: gaussian,
  EXPONENTIAL: exponential,
};

export const DISTRIBUTION_KINDS = Object.keys(DISTRIBUTIONS) as DistributionKind[];

/** Exported for direct testing against published values. */
export const __numerics = { standardNormalCdf, probit };
