/**
 * Everything an interactive simulation computes, as one pure function
 * (§5: domain layer — no React, no DOM, no I/O).
 *
 * WHY THIS IS NOT INSIDE THE COMPONENT
 *
 * `runSimulation` is the entire behaviour of `DISTRIBUTION_SIM`: change a
 * parameter, and this is what changes. Keeping it here rather than inside
 * a `useMemo` in the simulator has two consequences that matter:
 *
 *   1. It is testable in the existing test tier. `vitest.config.mts`
 *      deliberately runs without jsdom, so "does changing sigma actually
 *      change the reported standard deviation" is answerable here and
 *      would not be answerable inside a component (§35, §40).
 *   2. `statsrobotics/figures.py` renders the same curves for the static
 *      lesson figures. Both sides being driven by the same registry and
 *      the same seeded generator is what lets a CI check assert they
 *      agree — risk 3 in PHASE_1A_ARCHITECTURE.md.
 *
 * Registry-driven throughout: there is no `switch (kind)` anywhere in this
 * file or in any component built on it. Uniform, Gaussian and Exponential
 * share one code path, and a fourth distribution is a registry entry.
 */

import {
  DISTRIBUTIONS,
  type DistributionKind,
  type DistributionParamsByKind,
} from "./distributions";
import { createRng } from "./rng";
import {
  ecdf,
  histogram,
  quantilePairs,
  summarize,
  type EcdfPoint,
  type HistogramBin,
  type QuantilePair,
  type SampleSummary,
} from "./summary";

export interface CurvePoint {
  x: number;
  y: number;
}

export interface SimulationInput<K extends DistributionKind> {
  kind: K;
  /**
   * Live control values, keyed by `ParameterSpec.key`. A plain record
   * rather than a typed params object because this is what slider state
   * actually is — see `toParams`.
   */
  values: Readonly<Record<string, number>>;
  sampleCount: number;
  seed: number;
  binCount: number;
  /** Overrides the registry's own plot domain — used to pin shared axes. */
  domain?: readonly [number, number];
  /** Curve resolution. 200 is below the point where more is visible. */
  curveResolution?: number;
}

export interface SimulationResult {
  /** Non-null when the parameters are invalid; everything else is empty. */
  error: string | null;
  samples: number[];
  summary: SampleSummary;
  bins: HistogramBin[];
  pdfCurve: CurvePoint[];
  cdfCurve: CurvePoint[];
  ecdfPoints: EcdfPoint[];
  /** Observed vs model quantiles, for a Q-Q plot. */
  qqPairs: QuantilePair[];
  domain: [number, number];
  /** What the model says, as opposed to what the sample did. */
  theoretical: {
    mean: number;
    variance: number;
    standardDeviation: number;
  };
}

/** Hard ceiling, mirroring `distributionSimBlockSchema.maxSamples`. */
export const MAX_SIMULATION_SAMPLES = 50_000;

const EMPTY_SUMMARY: SampleSummary = {
  count: 0,
  mean: Number.NaN,
  variance: Number.NaN,
  standardDeviation: Number.NaN,
  median: Number.NaN,
  min: Number.NaN,
  max: Number.NaN,
  iqr: Number.NaN,
};

/**
 * Slider values become typed parameters here, and nowhere else.
 *
 * The single type assertion in this module lives at this boundary, and is
 * immediately followed by `spec.validate` at the one call site. The
 * registry declares which keys exist, so the object is built from
 * `spec.parameters` rather than from whatever the caller happened to pass
 * — an unknown key cannot leak in, and a missing one falls back to the
 * declared default rather than becoming `undefined` (§8, §9).
 */
function toParams<K extends DistributionKind>(
  kind: K,
  values: Readonly<Record<string, number>>
): DistributionParamsByKind[K] {
  const entries = DISTRIBUTIONS[kind].parameters.map((parameter) => [
    parameter.key,
    values[parameter.key] ?? parameter.defaultValue,
  ]);

  return Object.fromEntries(entries) as DistributionParamsByKind[K];
}

/** Evaluate `fn` at `resolution` evenly spaced points across `domain`. */
function sampleCurve(
  fn: (x: number) => number,
  domain: readonly [number, number],
  resolution: number
): CurvePoint[] {
  const [low, high] = domain;
  const step = (high - low) / (resolution - 1);

  return Array.from({ length: resolution }, (_, index) => {
    const x = low + index * step;
    return { x, y: fn(x) };
  });
}

/**
 * Compute a full simulation. Deterministic: the same input always produces
 * the same output, which is what makes lesson prose able to quote numbers.
 */
export function runSimulation<K extends DistributionKind>(
  input: SimulationInput<K>
): SimulationResult {
  const spec = DISTRIBUTIONS[input.kind];
  const params = toParams(input.kind, input.values);

  const error = spec.validate(params);
  const domain = (input.domain ?? spec.plotDomain(params)) as [number, number];

  if (error) {
    // Fail visibly but harmlessly: the component renders the message
    // instead of a chart full of NaN (§28).
    return {
      error,
      samples: [],
      summary: EMPTY_SUMMARY,
      bins: [],
      pdfCurve: [],
      cdfCurve: [],
      ecdfPoints: [],
      qqPairs: [],
      domain,
      theoretical: {
        mean: Number.NaN,
        variance: Number.NaN,
        standardDeviation: Number.NaN,
      },
    };
  }

  const count = Math.max(
    0,
    Math.min(MAX_SIMULATION_SAMPLES, Math.floor(input.sampleCount))
  );

  // One generator for the whole draw, seeded per call — so a re-render
  // with unchanged input reproduces the identical sample set rather than
  // continuing a shared stream.
  const rng = createRng(input.seed);
  const samples = new Array<number>(count);
  for (let i = 0; i < count; i += 1) {
    samples[i] = spec.sample(rng, params);
  }

  const resolution = input.curveResolution ?? 200;
  const variance = spec.variance(params);

  return {
    error: null,
    samples,
    summary: summarize(samples),
    bins: histogram(samples, input.binCount, domain),
    pdfCurve: sampleCurve((x) => spec.pdf(x, params), domain, resolution),
    cdfCurve: sampleCurve((x) => spec.cdf(x, params), domain, resolution),
    ecdfPoints: ecdf(samples),
    qqPairs: quantilePairs(samples, (p) => spec.quantile(p, params)),
    domain,
    theoretical: {
      mean: spec.mean(params),
      variance,
      standardDeviation: Math.sqrt(variance),
    },
  };
}

/** Initial control values for a distribution, straight from the registry. */
export function defaultValues(kind: DistributionKind): Record<string, number> {
  return Object.fromEntries(
    DISTRIBUTIONS[kind].parameters.map((p) => [p.key, p.defaultValue])
  );
}

export interface Simulation2DResult {
  error: string | null;
  points: { x: number; y: number }[];
  /** The plotted frame — the caller's pinned axis, or the registry's own. */
  domain: [number, number];
  /**
   * Where values can actually occur, which is NOT the frame.
   *
   * A lesson that pins `xDomain` so a narrowed workspace visibly shrinks
   * inside a fixed frame makes these two differ on purpose, and a caption
   * that quotes the frame while the points came from the support is
   * simply wrong — for a canvas, whose accessible name is the figure's
   * entire content to a screen-reader user, wrong in the one place it
   * cannot be checked by looking.
   */
  support: [number, number];
}

/**
 * A 2D point set: two independent draws per point from the same
 * distribution.
 *
 * M2.5's uniform workspace is the only Phase 1 use, and the block schema
 * ties `SCATTER_2D` to UNIFORM for exactly that reason. Both axes share
 * one parameter set — a workspace with different x and y bounds is a real
 * thing, but it needs two parameter sets in the block payload, and adding
 * that before a lesson asks for it would be shape invented ahead of need.
 *
 * Uses one generator for both coordinates, drawing x then y per point, so
 * the pair stream is reproducible from the seed like everything else here.
 */
export function runSimulation2D<K extends DistributionKind>(
  input: SimulationInput<K>
): Simulation2DResult {
  const spec = DISTRIBUTIONS[input.kind];
  const params = toParams(input.kind, input.values);
  const error = spec.validate(params);
  const domain = (input.domain ?? spec.plotDomain(params)) as [number, number];

  if (error) return { error, points: [], domain, support: domain };

  const count = Math.max(
    0,
    Math.min(MAX_SIMULATION_SAMPLES, Math.floor(input.sampleCount))
  );
  const rng = createRng(input.seed);
  const points = new Array<{ x: number; y: number }>(count);

  for (let i = 0; i < count; i += 1) {
    points[i] = { x: spec.sample(rng, params), y: spec.sample(rng, params) };
  }

  return { error: null, points, domain, support: spec.support(params) as [number, number] };
}

/**
 * Thin an ordered series down to at most `limit` evenly-spaced entries.
 *
 * A Q-Q plot of 5,000 samples is 5,000 marks, which `PointSeries` refuses
 * (`MAX_SVG_POINTS`) — correctly, since that many SVG nodes is what the
 * canvas path exists for. But a Q-Q plot does not need every order
 * statistic: its shape, including the tail curvature that carries the
 * information, is fully legible from a few hundred evenly-spaced ones.
 * Thinning preserves the first and last points, which is where the
 * departure from the model is largest and therefore least discardable.
 */
export function thinSeries<T>(series: readonly T[], limit: number): T[] {
  if (series.length <= limit) return [...series];

  const step = (series.length - 1) / (limit - 1);
  return Array.from({ length: limit }, (_, index) =>
    series[Math.round(index * step)]
  );
}
