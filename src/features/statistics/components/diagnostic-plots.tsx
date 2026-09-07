import {
  LineSeries,
  PlotFrame,
  PointSeries,
  XAxis,
  YAxis,
  ScatterCanvas,
  type Point,
} from "@/components/charts";

import { DISTRIBUTIONS, type DistributionKind } from "../distributions";
import { thinSeries } from "../sampling";
import { ecdf, quantilePairs } from "../summary";

/**
 * The three diagnostic views M3.9 is built on — empirical CDF, Q-Q plot,
 * and the 2D scatter — plus nothing else.
 *
 * These are the plots that answer "is this model defensible", as opposed
 * to `DistributionPlot`, which shows what the model says. The course's
 * whole scientific posture (spec §27, §45, §63) rests on a learner being
 * able to look past a histogram, so these are first-class components
 * rather than a variant flag on the histogram.
 *
 * None are `"use client"`. Given the numbers, every one is a pure
 * transform into SVG — except `ScatterCanvas`, which is the single canvas
 * component in the codebase and carries its own client boundary.
 */

/* ------------------------------------------------------------------ eCDF -- */

export interface EcdfPlotProps {
  samples: readonly number[];
  /** Overlays the model's own CDF for comparison. */
  overlay?: { kind: DistributionKind; params: Record<string, number> } | null;
  domain: readonly [number, number];
  xLabel?: string;
  label: string;
}

export function EcdfPlot({ samples, overlay, domain, xLabel, label }: EcdfPlotProps) {
  // The step function's corner points, thinned for rendering: at 5,000
  // samples the steps are far below one pixel, so drawing every one costs
  // path length and buys nothing visible.
  const points: Point[] = thinSeries(ecdf(samples), 600).map((point) => ({
    x: point.x,
    y: point.p,
  }));

  const theoretical: Point[] = overlay
    ? Array.from({ length: 200 }, (_, index) => {
        const x = domain[0] + (index / 199) * (domain[1] - domain[0]);
        return {
          x,
          y: DISTRIBUTIONS[overlay.kind].cdf(
            x,
            overlay.params as never
          ),
        };
      })
    : [];

  return (
    <PlotFrame
      xDomain={domain}
      yDomain={[0, 1]}
      label={label}
      description={
        overlay
          ? "The stepped line is the data. The smooth line is the model being tested against it. Where they separate is where the model is failing to describe the data."
          : undefined
      }
    >
      {(geometry) => (
        <>
          <YAxis geometry={geometry} title="Cumulative proportion" />
          {theoretical.length > 0 ? (
            <LineSeries geometry={geometry} points={theoretical} tone="theory" />
          ) : null}
          <LineSeries geometry={geometry} points={points} tone="robot" strokeWidth={1.5} />
          <XAxis geometry={geometry} title={xLabel} />
        </>
      )}
    </PlotFrame>
  );
}

/* ---------------------------------------------------------------- Q-Q -- */

export interface QqPlotProps {
  samples: readonly number[];
  kind: DistributionKind;
  params: Record<string, number>;
  label: string;
  xLabel?: string;
  yLabel?: string;
}

/**
 * Observed order statistics against the quantiles the model predicts.
 *
 * Points on the diagonal mean the model matches. Systematic curvature —
 * especially in the tails — is the finding, not noise, and it is the
 * evidence M3.11 asks a learner to argue from. The reference line is drawn
 * across the union of both ranges so the diagonal is genuinely y = x
 * rather than a best-fit line, which would beg the question.
 */
export function QqPlot({ samples, kind, params, label, xLabel, yLabel }: QqPlotProps) {
  const spec = DISTRIBUTIONS[kind];
  const pairs = thinSeries(
    quantilePairs(samples, (p) => spec.quantile(p, params as never)),
    500
  ).filter((pair) => Number.isFinite(pair.theoretical) && Number.isFinite(pair.observed));

  if (pairs.length === 0) {
    return <p className="text-muted-foreground text-body-sm">Not enough data to plot.</p>;
  }

  const values = pairs.flatMap((pair) => [pair.theoretical, pair.observed]);
  const low = Math.min(...values);
  const high = Math.max(...values);
  const pad = (high - low) * 0.05 || 0.5;
  const domain: [number, number] = [low - pad, high + pad];

  const points: Point[] = pairs.map((pair) => ({ x: pair.theoretical, y: pair.observed }));
  const reference: Point[] = [
    { x: domain[0], y: domain[0] },
    { x: domain[1], y: domain[1] },
  ];

  return (
    <PlotFrame
      xDomain={domain}
      yDomain={domain}
      label={label}
      description="Each point pairs one measurement with the value the model predicts for its rank. Points on the diagonal mean the model matches; a systematic bend, especially at the ends, means it does not."
    >
      {(geometry) => (
        <>
          <YAxis geometry={geometry} title={yLabel ?? "Observed"} />
          <LineSeries geometry={geometry} points={reference} tone="reference" strokeWidth={1} dashed />
          <PointSeries geometry={geometry} points={points} tone="robot" radius={1.8} />
          <XAxis geometry={geometry} title={xLabel ?? "Model quantile"} />
        </>
      )}
    </PlotFrame>
  );
}

/* ------------------------------------------------------------- scatter -- */

export interface ScatterPlotProps {
  points: readonly Point[];
  domain: readonly [number, number];
  yDomain?: readonly [number, number];
  xLabel?: string;
  yLabel?: string;
  label: string;
  description?: string;
}

/**
 * The 2D workspace view.
 *
 * WHERE SCATTER_2D LIVES, AND WHY
 *
 * Neither `DistributionSimulator` nor `DatasetExplorer` owns it — this
 * shared component does, and each of them feeds it different data. M2.5
 * generates the points from two independent uniform draws
 * (`runSimulation2D`); M2.6 reads them from two columns of a recorded
 * target dataset. The QUESTION is the same in both lessons ("does this
 * fill the space evenly?"), so the rendering is one component; only the
 * provenance of the numbers differs. Putting it in either block's renderer
 * would have forced the other to duplicate it.
 *
 * Canvas rather than SVG because this is the one view whose mark count
 * equals its sample count — thousands of points, per
 * PHASE_1A_ARCHITECTURE.md §11.
 */
export function ScatterPlot({
  points,
  domain,
  yDomain,
  xLabel,
  yLabel,
  label,
  description,
}: ScatterPlotProps) {
  return (
    <ScatterCanvas
      points={points}
      xDomain={domain}
      yDomain={yDomain ?? domain}
      xLabel={xLabel}
      yLabel={yLabel}
      label={label}
      description={description}
    />
  );
}
