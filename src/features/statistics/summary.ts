/**
 * Descriptive statistics and the binning/ECDF/Q-Q primitives every chart in
 * the course is drawn from (§5: domain layer — pure functions, no I/O, no
 * React, no charting library).
 *
 * These are the numbers lessons quote and quizzes ask learners to compute,
 * so the definitional choices below are teaching decisions as much as
 * implementation ones, and each one is stated rather than left implicit.
 */

/** The statistics panel beside every histogram in the course. */
export interface SampleSummary {
  count: number;
  mean: number;
  /** Sample variance, Bessel-corrected (n - 1). See `variance`. */
  variance: number;
  standardDeviation: number;
  median: number;
  min: number;
  max: number;
  /** Interquartile range — the robustness counterpart to `standardDeviation`. */
  iqr: number;
}

export interface HistogramBin {
  /** Inclusive lower edge. */
  start: number;
  /** Exclusive upper edge, except for the final bin — see `histogram`. */
  end: number;
  count: number;
  /**
   * Count normalized to a probability *density*: count / (n * binWidth).
   * This is what makes a histogram directly comparable to a PDF curve on
   * shared axes, which is the whole point of the theory-vs-reality overlay
   * (spec §8). Plotting raw counts against a density is the single most
   * common way that comparison is drawn wrong.
   */
  density: number;
}

export interface EcdfPoint {
  x: number;
  /** Proportion of samples <= x, using (i + 1) / n. */
  p: number;
}

export interface QuantilePair {
  /** Quantile predicted by the candidate model. */
  theoretical: number;
  /** Quantile actually observed in the sample. */
  observed: number;
}

/* -------------------------------------------------------------- moments -- */

export function mean(samples: readonly number[]): number {
  if (samples.length === 0) return Number.NaN;

  let total = 0;
  for (const value of samples) total += value;
  return total / samples.length;
}

/**
 * Sample variance with Bessel's correction (divide by n - 1).
 *
 * The course teaches sample statistics as *estimates of* population
 * parameters (M1.4, M1.6), and the n - 1 form is the unbiased estimator of
 * the population variance. Using n here would quietly contradict what the
 * lessons say and would disagree with NumPy's `ddof=1` in the Python half
 * of the same experiment — the two must produce the same number for the
 * same data, or a learner following the course across both tools sees a
 * discrepancy with no explanation.
 *
 * Undefined for n < 2 and returns NaN rather than 0: with one sample there
 * is no spread to estimate, and 0 would be a confident wrong answer.
 */
export function variance(samples: readonly number[]): number {
  if (samples.length < 2) return Number.NaN;

  const m = mean(samples);
  let sumSquaredDeviations = 0;
  for (const value of samples) {
    const deviation = value - m;
    sumSquaredDeviations += deviation * deviation;
  }
  return sumSquaredDeviations / (samples.length - 1);
}

export function standardDeviation(samples: readonly number[]): number {
  return Math.sqrt(variance(samples));
}

/**
 * Linearly-interpolated sample quantile (the "type 7" definition — R's
 * default, and NumPy's default `linear` method).
 *
 * Picked for cross-tool agreement, for the same reason as Bessel's
 * correction above: the Q-Q plots in M3.9 are drawn in the browser and
 * again in Matplotlib, and a different quantile convention between them
 * would bend the two plots differently for identical data.
 *
 * `samples` need not be sorted; `p` is clamped to [0, 1].
 */
export function quantile(samples: readonly number[], p: number): number {
  if (samples.length === 0) return Number.NaN;

  const sorted = [...samples].sort((a, b) => a - b);
  const clamped = Math.min(1, Math.max(0, p));
  const position = clamped * (sorted.length - 1);
  const lower = Math.floor(position);
  const upper = Math.ceil(position);

  if (lower === upper) return sorted[lower];
  return sorted[lower] + (position - lower) * (sorted[upper] - sorted[lower]);
}

export function median(samples: readonly number[]): number {
  return quantile(samples, 0.5);
}

/**
 * Everything the `StatisticalSummary` component displays, computed in one
 * pass over a sorted copy rather than seven independent sorts.
 */
export function summarize(samples: readonly number[]): SampleSummary {
  if (samples.length === 0) {
    return {
      count: 0,
      mean: Number.NaN,
      variance: Number.NaN,
      standardDeviation: Number.NaN,
      median: Number.NaN,
      min: Number.NaN,
      max: Number.NaN,
      iqr: Number.NaN,
    };
  }

  const sorted = [...samples].sort((a, b) => a - b);
  const q1 = quantile(sorted, 0.25);
  const q3 = quantile(sorted, 0.75);

  return {
    count: sorted.length,
    mean: mean(sorted),
    variance: variance(sorted),
    standardDeviation: standardDeviation(sorted),
    median: quantile(sorted, 0.5),
    min: sorted[0],
    max: sorted[sorted.length - 1],
    iqr: q3 - q1,
  };
}

/* ------------------------------------------------------------- binning -- */

/**
 * Bin samples into equal-width bins over `[domain[0], domain[1]]`, or over
 * the sample range when no domain is given.
 *
 * The final bin's upper edge is **inclusive** — without that, the single
 * largest sample falls outside every bin and silently vanishes from the
 * histogram. That off-by-one is invisible at n = 5,000 and glaring at
 * n = 10, which is exactly the range M1.6 asks learners to explore.
 *
 * A degenerate domain (every sample identical, or an explicit zero-width
 * domain) is widened by a half-unit either side rather than producing bins
 * of zero width and infinite density.
 */
export function histogram(
  samples: readonly number[],
  binCount: number,
  domain?: readonly [number, number]
): HistogramBin[] {
  if (!Number.isInteger(binCount) || binCount < 1) {
    throw new RangeError(`Bin count must be a positive integer, received ${binCount}`);
  }

  let start: number;
  let end: number;

  if (domain) {
    [start, end] = domain;
  } else if (samples.length === 0) {
    start = 0;
    end = 1;
  } else {
    start = Math.min(...samples);
    end = Math.max(...samples);
  }

  if (!(end > start)) {
    start -= 0.5;
    end += 0.5;
  }

  const width = (end - start) / binCount;
  const bins: HistogramBin[] = Array.from({ length: binCount }, (_, index) => ({
    start: start + index * width,
    end: start + (index + 1) * width,
    count: 0,
    density: 0,
  }));

  for (const value of samples) {
    if (value < start || value > end) continue;

    // Clamped so that a value exactly at `end` lands in the final bin
    // rather than one past it.
    const index = Math.min(binCount - 1, Math.floor((value - start) / width));
    bins[index].count += 1;
  }

  if (samples.length > 0) {
    for (const bin of bins) {
      bin.density = bin.count / (samples.length * width);
    }
  }

  return bins;
}

/* --------------------------------------------------- empirical CDF, Q-Q -- */

/**
 * The empirical CDF as a step function's corner points.
 *
 * Uses (i + 1) / n, so the largest sample maps to p = 1. The alternative
 * convention (i + 0.5) / n is standard for *plotting positions* in Q-Q
 * plots, and `quantilePairs` below uses it deliberately — the two
 * conventions differ on purpose and each is used where it belongs.
 */
export function ecdf(samples: readonly number[]): EcdfPoint[] {
  if (samples.length === 0) return [];

  const sorted = [...samples].sort((a, b) => a - b);
  return sorted.map((x, index) => ({ x, p: (index + 1) / sorted.length }));
}

/**
 * Pair each observed order statistic with the quantile a candidate model
 * predicts for it — the data behind a Q-Q plot.
 *
 * Plotting positions are (i + 0.5) / n rather than (i + 1) / n, because
 * the latter's final point is p = 1, whose theoretical quantile is
 * +Infinity for any unbounded distribution (Gaussian, exponential). That
 * would put a point at infinity on the flagship module's most important
 * plot.
 */
export function quantilePairs(
  samples: readonly number[],
  theoreticalQuantile: (p: number) => number
): QuantilePair[] {
  if (samples.length === 0) return [];

  const sorted = [...samples].sort((a, b) => a - b);
  return sorted.map((observed, index) => ({
    theoretical: theoreticalQuantile((index + 0.5) / sorted.length),
    observed,
  }));
}
