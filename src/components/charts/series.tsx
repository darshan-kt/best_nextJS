import { line as d3Line } from "d3-shape";

import type { PlotGeometry } from "./plot-frame";

/**
 * The marks: a continuous curve, a set of bars, a reference line and a
 * small point set.
 *
 * All four are one component file rather than four, because they share the
 * `SeriesTone` vocabulary below and splitting them would mean four
 * imports at every call site to draw one chart (§33: split when it
 * improves readability, not for the sake of small files).
 *
 * COLOUR IS SEMANTIC, NOT DECORATIVE
 *
 * The course spec assigns meaning to colour — theory, simulation, robot
 * data, insight, warning — and the whole theory-vs-reality comparison
 * depends on a reader knowing which curve is which. `SeriesTone` names the
 * meaning and maps it onto existing design tokens; no chart passes a raw
 * colour. Adding a sixth tone is a change here, not at forty call sites
 * (§21).
 *
 * Tone is never the ONLY channel that distinguishes two series: theory is
 * a solid curve, simulation is dashed, and every chart is accompanied by
 * its numbers as text. A reader who cannot distinguish the colours can
 * still distinguish the series (§24).
 */

export type SeriesTone =
  /** Closed-form mathematics: a PDF or CDF curve. */
  | "theory"
  /** Synthetic samples drawn in the browser. */
  | "simulation"
  /** Measurements from a real robot. */
  | "robot"
  /** A derived guide: a mean marker, a Q-Q reference line. */
  | "reference";

const TONE_CLASS: Record<SeriesTone, string> = {
  theory: "stroke-primary",
  simulation: "stroke-accent-foreground",
  robot: "stroke-destructive",
  reference: "stroke-muted-foreground",
};

const TONE_FILL_CLASS: Record<SeriesTone, string> = {
  theory: "fill-primary",
  simulation: "fill-accent-foreground",
  robot: "fill-destructive",
  reference: "fill-muted-foreground",
};

export interface Point {
  x: number;
  y: number;
}

/* ----------------------------------------------------------- line series -- */

export interface LineSeriesProps {
  geometry: PlotGeometry;
  points: readonly Point[];
  tone?: SeriesTone;
  /** Dashed by convention for simulated series — see the note above. */
  dashed?: boolean;
  strokeWidth?: number;
}

export function LineSeries({
  geometry,
  points,
  tone = "theory",
  dashed = false,
  strokeWidth = 2,
}: LineSeriesProps) {
  const { xScale, yScale } = geometry;

  const path = d3Line<Point>()
    .x((point) => xScale(point.x))
    .y((point) => yScale(point.y))
    // Drop non-finite points rather than breaking the path: a Q-Q plot's
    // theoretical quantiles legitimately reach +/-Infinity at the extreme
    // plotting positions of an unbounded distribution.
    .defined((point) => Number.isFinite(point.x) && Number.isFinite(point.y))(points);

  if (!path) return null;

  return (
    <path
      d={path}
      fill="none"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeDasharray={dashed ? "6 4" : undefined}
      className={TONE_CLASS[tone]}
      aria-hidden="true"
    />
  );
}

/* ------------------------------------------------------------ bar series -- */

export interface Bar {
  start: number;
  end: number;
  value: number;
}

export interface BarSeriesProps {
  geometry: PlotGeometry;
  bars: readonly Bar[];
  tone?: SeriesTone;
}

/**
 * Histogram bars.
 *
 * `value` is expected to be a DENSITY, not a raw count, so that bars and a
 * PDF curve can share a y-axis. `histogram()` in
 * features/statistics/summary.ts computes it; plotting counts against a
 * density is the most common way the theory-vs-reality overlay gets drawn
 * wrong, which is why the type is named `value` and documented here rather
 * than left to the caller's judgement.
 */
export function BarSeries({ geometry, bars, tone = "simulation" }: BarSeriesProps) {
  const { xScale, yScale, innerHeight } = geometry;

  return (
    <g aria-hidden="true">
      {bars.map((bar, index) => {
        const x = xScale(bar.start);
        // A 1px gap so adjacent bars read as separate bins, but never
        // wider than the bar itself at high bin counts - at 120 bins a
        // fixed gap would eat the entire bar.
        const rawWidth = xScale(bar.end) - x;
        const gap = Math.min(1, rawWidth * 0.15);
        const width = Math.max(0, rawWidth - gap);
        const y = yScale(bar.value);
        const height = Math.max(0, innerHeight - y);

        if (!Number.isFinite(x) || !Number.isFinite(y) || width <= 0) return null;

        return (
          <rect
            key={index}
            x={x}
            y={y}
            width={width}
            height={height}
            className={TONE_FILL_CLASS[tone]}
            fillOpacity={0.35}
          />
        );
      })}
    </g>
  );
}

/* -------------------------------------------------------- reference line -- */

export interface ReferenceLineProps {
  geometry: PlotGeometry;
  /** Exactly one of these. A vertical marker for a mean, or a horizontal one. */
  x?: number;
  y?: number;
  tone?: SeriesTone;
  label?: string;
}

/** A vertical or horizontal guide: the sample mean, a threshold, y = x. */
export function ReferenceLine({
  geometry,
  x,
  y,
  tone = "reference",
  label,
}: ReferenceLineProps) {
  const { xScale, yScale, innerWidth, innerHeight } = geometry;

  if (x !== undefined) {
    const px = xScale(x);
    if (!Number.isFinite(px)) return null;

    return (
      <g aria-hidden="true">
        <line
          x1={px}
          x2={px}
          y1={0}
          y2={innerHeight}
          strokeWidth={1.5}
          strokeDasharray="4 3"
          className={TONE_CLASS[tone]}
        />
        {label ? (
          <text
            x={px + 4}
            y={12}
            className={`${TONE_FILL_CLASS[tone]} text-[11px]`}
          >
            {label}
          </text>
        ) : null}
      </g>
    );
  }

  if (y === undefined) return null;
  const py = yScale(y);
  if (!Number.isFinite(py)) return null;

  return (
    <line
      x1={0}
      x2={innerWidth}
      y1={py}
      y2={py}
      strokeWidth={1.5}
      strokeDasharray="4 3"
      className={TONE_CLASS[tone]}
      aria-hidden="true"
    />
  );
}

/* --------------------------------------------------------- point series -- */

export interface PointSeriesProps {
  geometry: PlotGeometry;
  points: readonly Point[];
  tone?: SeriesTone;
  radius?: number;
}

/**
 * A small point set drawn as SVG circles — Q-Q plots and the like, where
 * the count is bounded by the number of plotting positions actually shown.
 *
 * NOT for the 2D uniform workspace scatter: that is thousands of marks and
 * belongs in `ScatterCanvas`. The threshold is asserted in the tests so
 * that a future caller cannot quietly route 5,000 points through here.
 */
export const MAX_SVG_POINTS = 600;

export function PointSeries({
  geometry,
  points,
  tone = "robot",
  radius = 2,
}: PointSeriesProps) {
  const { xScale, yScale } = geometry;

  if (points.length > MAX_SVG_POINTS) {
    throw new RangeError(
      `PointSeries renders one DOM node per point and is capped at ${MAX_SVG_POINTS}; ` +
        `received ${points.length}. Use ScatterCanvas for large point sets.`
    );
  }

  return (
    <g className={TONE_FILL_CLASS[tone]} aria-hidden="true">
      {points.map((point, index) => {
        const cx = xScale(point.x);
        const cy = yScale(point.y);
        if (!Number.isFinite(cx) || !Number.isFinite(cy)) return null;

        return <circle key={index} cx={cx} cy={cy} r={radius} fillOpacity={0.7} />;
      })}
    </g>
  );
}
