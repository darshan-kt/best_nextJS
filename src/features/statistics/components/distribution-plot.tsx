import {
  BarSeries,
  LineSeries,
  PlotFrame,
  ReferenceLine,
  XAxis,
  YAxis,
  type Bar,
} from "@/components/charts";

import type { SimulationResult } from "../sampling";

/**
 * The chart half of a simulation: a theoretical curve, the sampled
 * histogram beneath it, and a marker at the sample mean.
 *
 * No `"use client"`. It takes a computed `SimulationResult` and renders
 * SVG — no state, no effects, no handlers. A static theory figure
 * (`interactive: false`) therefore renders entirely on the server and
 * ships no chart JavaScript, while the interactive simulator passes the
 * same component a result it recomputed on the client. One component,
 * both modes (§7, §26).
 *
 * The accessible name is built from the actual statistics rather than the
 * chart type, per the contract `PlotFrame` documents: "histogram of 5000
 * samples, mean 2.00, standard deviation 0.02" tells a screen-reader user
 * what the figure shows; "a histogram" tells them nothing.
 */

export type PlotView = "PDF" | "CDF";

export interface DistributionPlotProps {
  result: SimulationResult;
  view?: PlotView;
  /** Draw the sampled histogram under the theoretical curve. */
  showHistogram?: boolean;
  /** Mark the sample mean. */
  showMean?: boolean;
  xLabel?: string;
  distributionLabel: string;
  width?: number;
  height?: number;
}

function formatStat(value: number): string {
  return Number.isFinite(value) ? Number(value.toPrecision(3)).toString() : "unavailable";
}

export function DistributionPlot({
  result,
  view = "PDF",
  showHistogram = true,
  showMean = false,
  xLabel,
  distributionLabel,
  width,
  height,
}: DistributionPlotProps) {
  if (result.error) {
    return (
      <p role="status" className="text-destructive text-body-sm">
        {result.error}
      </p>
    );
  }

  const curve = view === "PDF" ? result.pdfCurve : result.cdfCurve;
  const showBars = showHistogram && view === "PDF" && result.bins.length > 0;

  // The histogram is a DENSITY (see HistogramBin.density), so bars and the
  // PDF curve share a y-axis honestly. Plotting counts here instead is the
  // single most common way this comparison is drawn wrong.
  const bars: Bar[] = showBars
    ? result.bins.map((bin) => ({ start: bin.start, end: bin.end, value: bin.density }))
    : [];

  const curveMax = curve.reduce(
    (highest, point) => (Number.isFinite(point.y) ? Math.max(highest, point.y) : highest),
    0
  );
  const barMax = bars.reduce((highest, bar) => Math.max(highest, bar.value), 0);
  const yMax = view === "CDF" ? 1 : Math.max(curveMax, barMax) * 1.08 || 1;

  const label =
    view === "CDF"
      ? `Cumulative distribution of the ${distributionLabel} model over ${result.summary.count.toLocaleString()} samples.`
      : `${distributionLabel} density with a histogram of ${result.summary.count.toLocaleString()} samples. ` +
        `Sample mean ${formatStat(result.summary.mean)}, standard deviation ${formatStat(
          result.summary.standardDeviation
        )}; the model predicts mean ${formatStat(result.theoretical.mean)}, standard deviation ${formatStat(
          result.theoretical.standardDeviation
        )}.`;

  return (
    <PlotFrame
      xDomain={result.domain}
      yDomain={[0, yMax]}
      width={width}
      height={height}
      label={label}
      description={
        showBars
          ? "The solid curve is the model. The bars are the samples actually drawn — they follow the curve only approximately, and the gap between them is sampling variability, not an error."
          : undefined
      }
    >
      {(geometry) => (
        <>
          <YAxis geometry={geometry} title={view === "CDF" ? "Cumulative probability" : "Density"} />
          {showBars ? <BarSeries geometry={geometry} bars={bars} tone="simulation" /> : null}
          <LineSeries geometry={geometry} points={curve} tone="theory" />
          {showMean && Number.isFinite(result.summary.mean) ? (
            <ReferenceLine geometry={geometry} x={result.summary.mean} tone="reference" label="mean" />
          ) : null}
          <XAxis geometry={geometry} title={xLabel} />
        </>
      )}
    </PlotFrame>
  );
}
