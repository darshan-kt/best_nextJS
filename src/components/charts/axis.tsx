import type { PlotGeometry } from "./plot-frame";
import { formatTick } from "./scales";

/**
 * Cartesian axes with ticks and an optional axis title.
 *
 * Tick *positions* come from d3-scale's `ticks()`, which picks
 * human-readable round numbers rather than evenly-dividing the domain —
 * the difference between an axis labelled 0, 0.5, 1.0 and one labelled
 * 0, 0.4713, 0.9426.
 *
 * Tick *formatting* is ours rather than d3-format's, because the numbers
 * this course displays carry units and significant-figure conventions that
 * a general-purpose formatter has no way to know about (§40: not a
 * dependency for something this small).
 */

export interface AxisProps {
  geometry: PlotGeometry;
  /** Axis title, e.g. "Distance (m)". */
  title?: string;
  /** Approximate tick count; d3 treats it as a hint, not a demand. */
  tickCount?: number;
  /** Overrides the default significant-figure formatting. */
  format?: (value: number) => string;
}

export function XAxis({ geometry, title, tickCount = 6, format = formatTick }: AxisProps) {
  const { xScale, innerHeight, margin } = geometry;
  const ticks = xScale.ticks(tickCount);

  return (
    <g
      transform={`translate(0, ${innerHeight})`}
      className="fill-muted-foreground text-[11px]"
      aria-hidden="true"
    >
      <line
        x1={0}
        x2={geometry.innerWidth}
        y1={0}
        y2={0}
        className="stroke-border"
        strokeWidth={1}
      />
      {ticks.map((tick) => (
        <g key={tick} transform={`translate(${xScale(tick)}, 0)`}>
          <line y1={0} y2={5} className="stroke-border" strokeWidth={1} />
          <text y={18} textAnchor="middle" fill="currentColor">
            {format(tick)}
          </text>
        </g>
      ))}
      {title ? (
        <text
          x={geometry.innerWidth / 2}
          y={margin.bottom - 8}
          textAnchor="middle"
          fill="currentColor"
          className="text-[12px]"
        >
          {title}
        </text>
      ) : null}
    </g>
  );
}

export function YAxis({ geometry, title, tickCount = 5, format = formatTick }: AxisProps) {
  const { yScale, innerWidth, margin } = geometry;
  const ticks = yScale.ticks(tickCount);

  return (
    <g className="fill-muted-foreground text-[11px]" aria-hidden="true">
      {ticks.map((tick) => (
        <g key={tick} transform={`translate(0, ${yScale(tick)})`}>
          {/* Gridline rather than a tick mark: on a density plot the
              horizontal reference is what lets a reader compare bar
              heights across the width of the chart. */}
          <line
            x1={0}
            x2={innerWidth}
            className="stroke-border"
            strokeWidth={1}
            strokeOpacity={0.4}
          />
          <text x={-8} dy="0.32em" textAnchor="end" fill="currentColor">
            {format(tick)}
          </text>
        </g>
      ))}
      {title ? (
        <text
          transform={`translate(${-margin.left + 14}, ${geometry.innerHeight / 2}) rotate(-90)`}
          textAnchor="middle"
          fill="currentColor"
          className="text-[12px]"
        >
          {title}
        </text>
      ) : null}
    </g>
  );
}
