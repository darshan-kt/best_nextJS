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
 * Phase 1 ships four: UNIFORM, GAUSSIAN, EXPONENTIAL, IRWIN_HALL.
 *
 * The fourth arrived last and by the route this file was designed for. It
 * is a registry entry and nothing else — no component, no chart primitive,
 * no block-renderer branch and no database migration were touched to add
 * it. That is the extensibility claim above, tested rather than asserted.
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

export type DistributionKind =
  | "UNIFORM"
  | "GAUSSIAN"
  | "EXPONENTIAL"
  | "IRWIN_HALL";

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

export interface IrwinHallParams {
  /**
   * How many independent Uniform(0, 1) draws are summed. A positive
   * integer, and the only parameter this distribution has.
   *
   * Named `k` rather than `n` deliberately: `n` is already the sample-count
   * control every simulation carries (`SAMPLE_COUNT_PARAMETER`), and the
   * block schema exempts that key from its registry check. Two different
   * meanings of `n` in one block payload would be an authoring trap with no
   * error message.
   */
  k: number;
}

export interface DistributionParamsByKind {
  UNIFORM: UniformParams;
  GAUSSIAN: GaussianParams;
  EXPONENTIAL: ExponentialParams;
  IRWIN_HALL: IrwinHallParams;
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

/* ------------------------------------------------------------ irwin-hall -- */

/**
 * Densities of the Irwin-Hall family at x, evaluated by the B-spline
 * recurrence, returning BOTH the order-k density and the order-(k+1) row
 * the CDF is assembled from.
 *
 * THE RECURRENCE, AND WHY NOT THE TEXTBOOK FORMULA
 *
 * The Irwin-Hall density is the cardinal B-spline of order k, so it obeys
 *
 *     f_m(y) = [ y * f_{m-1}(y) + (m - y) * f_{m-1}(y - 1) ] / (m - 1)
 *
 * with f_1 the indicator on [0, 1). Every coefficient is non-negative
 * wherever a term is non-zero, so this is exact and numerically stable at
 * every k.
 *
 * The formula usually printed instead is the alternating binomial sum
 * `(1/(k-1)!) * SUM (-1)^j C(k,j) (x-j)^(k-1)`. It is algebraically the
 * same function and computationally unusable at the sizes this lesson
 * needs: at k = 30, x = 15 its largest term is around 2e42 against an
 * answer of 0.25, and measured against this recurrence it loses roughly
 * eight significant digits to cancellation. A density that is wrong in the
 * fourth digit still draws a convincing bell, which is exactly why
 * PHASE_1A_ARCHITECTURE.md rates mathematical correctness a High risk: the
 * failure is invisible in the figure.
 *
 * ONE PASS FOR TWO ANSWERS
 *
 * The scheme walks orders 2..k+1 over a shifted array, so the order-k row
 * — the density — is computed on the way to the order-(k+1) row the CDF
 * needs. Returning both halves the cost of `quantile`, which evaluates the
 * pair once per Newton step: 5,000 quantiles at k = 30 measured at 129 ms
 * rather than 183.
 *
 * Cost is O(k^2) with an O(k) allocation, which is why `validate` caps k.
 */
function irwinHallEvaluate(x: number, k: number): { density: number; lower: number } {
  const shifts = Math.floor(x);
  const order = k + 1;
  const width = order + shifts;

  // Level 1: the uniform's own density at each shift. Half-open on
  // purpose — [0, 1] at both ends would double-count the knot and hand
  // f_2(1) the value 2.
  const values = new Float64Array(width + 1);
  for (let j = 0; j <= width; j += 1) {
    const y = x - j;
    values[j] = y >= 0 && y < 1 ? 1 : 0;
  }

  let density = 0;
  for (let m = 2; m <= order; m += 1) {
    const last = width - (m - 1);
    for (let j = 0; j <= last; j += 1) {
      const y = x - j;
      values[j] = (y * values[j] + (m - y) * values[j + 1]) / (m - 1);
    }
    if (m === k) density = values[0];
  }
  // k = 1 never enters the loop at order k, and inside (0, 1) the sum of a
  // single uniform draw has density 1 by definition.
  if (k === 1) density = 1;

  /**
   * F_k(x) = SUM_{j >= 0} f_{k+1}(x - j).
   *
   * Not quadrature and not a second approximation: differentiating the
   * order-(k+1) spline gives f_{k+1}'(y) = f_k(y) - f_k(y - 1), so the
   * shifted sum telescopes to exactly f_k and vanishes at -infinity. The
   * CDF is therefore as exact as the density, from the same pass.
   */
  let cumulative = 0;
  for (let j = 0; j <= shifts; j += 1) cumulative += values[j];

  return { density, lower: Math.min(1, Math.max(0, cumulative)) };
}

/**
 * Irwin-Hall: the sum of k independent Uniform(0, 1) draws.
 *
 * WHY THIS ENTRY EXISTS, AND WHY IT IS NOT A GAUSSIAN
 *
 * M3.2 `gaussian-mechanism` has to show that many small, independent,
 * additive errors produce a bell shape. Seeding that lesson with a Gaussian
 * generator would assume its conclusion: the histogram would be bell-shaped
 * because `sample` drew from a bell, not because anything was added, and
 * the learner would be looking at the answer rather than at the mechanism.
 *
 * So `sample` below is the mechanism, written out: k uniform draws, added.
 * `pdf`, `cdf`, `quantile`, `mean` and `variance` are the exact
 * consequences of that sum — not approximations to a normal, and not a
 * normal in disguise. The bell that appears as the learner raises k is
 * produced by addition; nothing in this file put it there.
 *
 * The Gaussian is the limit, and the limit is never invoked. A lesson that
 * wants the comparison draws a separate GAUSSIAN block on a pinned shared
 * axis (the M5.2 pattern) — at k = 12 the mean is 6 and the standard
 * deviation is exactly 1, so mu = 6, sigma = 1 is an exact match rather
 * than an eyeballed one, and the learner is comparing two independently
 * generated things.
 *
 * This is deliberately NOT a proof of the Central Limit Theorem, and M3.2
 * says so in a warning callout. It is one family of summands, converging
 * unusually fast because the uniform is bounded and symmetric. What it
 * demonstrates is that summation alone is enough to produce the shape.
 */
const irwinHall: DistributionSpec<"IRWIN_HALL"> = {
  kind: "IRWIN_HALL",
  label: "Sum of uniform errors (Irwin-Hall)",
  variety: "CONTINUOUS",
  parameters: [
    {
      key: "k",
      label: "Error sources summed (k)",
      suggestedMin: 1,
      suggestedMax: 30,
      suggestedStep: 1,
      // Opens on the state that is NOT a bell. The convergence is
      // something the learner produces by moving the slider, rather than
      // something already on screen when the lesson loads.
      defaultValue: 1,
      description:
        "How many independent error sources are added together. One is a flat block; two is a triangle; by twelve the shape is a bell nobody put there.",
    },
  ],

  /**
   * k must be a positive integer, and is capped.
   *
   * The cap is not mathematical — the distribution is defined for every k.
   * It is a resource guard. Evaluation is O(k^2) with an O(k) allocation,
   * and k reaches here from a JSON block payload whose slider bounds an
   * author chooses; an unbounded integer there hangs the tab rather than
   * returning a wrong number (§9, §29). Two hundred is far past the point
   * where any change is visible: by k = 30 the shape is already
   * indistinguishable from its limit at histogram resolution.
   */
  validate: ({ k }) => {
    if (!Number.isFinite(k)) return "k must be a finite number.";
    if (!Number.isInteger(k)) return "k must be a whole number of error sources.";
    if (k < 1) return "k must be at least 1 — there has to be something to add.";
    if (k > 200) return "k is capped at 200; the shape stops changing long before that.";
    return null;
  },

  // A sum of k values each in [0, 1] cannot leave [0, k]. Bounded support
  // is one of the three conditions M3.2 names as a place the Gaussian
  // mechanism breaks down, and it is visible here rather than asserted.
  support: ({ k }) => [0, k],

  /**
   * Frames the mass, not the support.
   *
   * These differ sharply here and the difference matters. At k = 30 the
   * support is 30 units wide while the standard deviation is 1.58, so a
   * frame drawn on the support would render the bell as a spike in an
   * empty axis at exactly the lesson where its shape has to be read. Four
   * standard deviations either side of the mean, clipped to the support,
   * shows the whole block at k = 1 and the whole bell at k = 30.
   */
  plotDomain: ({ k }) => {
    const spread = Math.sqrt(k / 12);
    const low = Math.max(0, k / 2 - 4 * spread);
    const high = Math.min(k, k / 2 + 4 * spread);
    const pad = (high - low) * 0.05;
    return [low - pad, high + pad];
  },

  pdf: (x, { k }) => {
    // k = 1 is the uniform, and the uniform's own entry above is inclusive
    // at both bounds; matching that keeps the two agreeing at x = 1.
    if (k === 1) return x >= 0 && x <= 1 ? 1 : 0;
    if (x <= 0 || x >= k) return 0;
    return irwinHallEvaluate(x, k).density;
  },

  cdf: (x, { k }) => {
    if (x <= 0) return 0;
    if (x >= k) return 1;
    return irwinHallEvaluate(x, k).lower;
  },

  /**
   * No closed form exists, so this is a Newton solve kept inside a
   * bisection bracket: Newton for the speed, the maintained bracket so a
   * step that would leave the interval falls back to a halving rather than
   * diverging. Each iteration costs one `irwinHallEvaluate`, which returns
   * the density and the CDF together — the derivative is free.
   *
   * Round-trip |F(F^-1(p)) - p| measured at 4e-15 worst case across
   * k in {1, 2, 4, 12, 30} and p from 1e-5 to 1 - 1e-5, asserted in the
   * tests rather than assumed.
   */
  quantile: (p, { k }) => {
    if (p <= 0) return 0;
    if (p >= 1) return k;

    let low = 0;
    let high = k;
    let x = k * p;

    for (let i = 0; i < 100; i += 1) {
      const { density, lower } = irwinHallEvaluate(x, k);
      const error = lower - p;

      if (error > 0) high = x;
      else low = x;
      if (Math.abs(error) < 1e-14) break;

      let next = density > 1e-300 ? x - error / density : (low + high) / 2;
      if (!(next > low && next < high)) next = (low + high) / 2;
      if (Math.abs(next - x) < 1e-15) {
        x = next;
        break;
      }
      x = next;
    }

    return x;
  },

  /**
   * THE MECHANISM ITSELF. k uniform draws, added.
   *
   * This is the one line M3.2 exists to demonstrate, and it is written the
   * long way on purpose: no inverse transform, no normal approximation, no
   * shortcut that would make the resulting shape a property of the
   * algorithm rather than of the summation. The learner raising k is
   * literally adding more terms to this loop.
   */
  sample: (rng, { k }) => {
    let total = 0;
    for (let i = 0; i < k; i += 1) total += rng();
    return total;
  },

  // Exact, and worth reading beside the shape: both are linear in k, so
  // the distribution widens as sqrt(k) while its centre moves as k. That
  // is why the bell appears to sharpen relative to its own support.
  mean: ({ k }) => k / 2,
  variance: ({ k }) => k / 12,

  /**
   * Method of moments on the MEAN: k = round(2 * sample mean).
   *
   * Both moments identify k (mean = k/2, variance = k/12), so the choice
   * needs a reason. The mean-based estimator is far tighter: at k = 12 and
   * n = 1000 its standard error is about 0.063 against about 0.52 for the
   * variance-based one, an eightfold difference, because the fourth-moment
   * term that governs the variance of a sample variance dominates here.
   * Rounding is part of the estimator rather than presentation — k counts
   * error sources and a fitted 11.4 of them is not a thing.
   */
  fit: (samples) => {
    const m = sampleMean(samples);
    if (!Number.isFinite(m) || m <= 0) return { k: 1 };
    return { k: Math.min(200, Math.max(1, Math.round(2 * m))) };
  },

  framing: {
    question: "WHY does a bell shape keep appearing?",
    mechanism:
      "Many small independent errors add together, and the sum concentrates near the middle simply because there are far more ways to land there than at either extreme.",
    assumptions: [
      "The error sources are added, not multiplied.",
      "The sources are independent of one another.",
      "No single source is much larger than the rest.",
      "Each source is bounded, so the sum is bounded too — which is why this is a mechanism for the shape, not a proof of the Central Limit Theorem.",
    ],
  },
};

/* ------------------------------------------------------------- registry -- */

/**
 * The registry. One entry per distribution the course teaches.
 *
 * Adding a fourth was: one `DistributionKind` value, one params interface,
 * one entry here, one value in `distributionKindSchema`, and one content
 * module. Nothing that renders a distribution changed.
 *
 * That prediction was written before IRWIN_HALL existed and held, with one
 * correction worth keeping: there is no Prisma enum value. `ContentBlockType`
 * carries DISTRIBUTION_SIM and the distribution kind lives inside the block's
 * validated JSON payload, so a new distribution needs no migration at all.
 */
export const DISTRIBUTIONS: {
  [K in DistributionKind]: DistributionSpec<K>;
} = {
  UNIFORM: uniform,
  GAUSSIAN: gaussian,
  EXPONENTIAL: exponential,
  IRWIN_HALL: irwinHall,
};

export const DISTRIBUTION_KINDS = Object.keys(DISTRIBUTIONS) as DistributionKind[];

/** Exported for direct testing against published values. */
export const __numerics = { standardNormalCdf, probit };
