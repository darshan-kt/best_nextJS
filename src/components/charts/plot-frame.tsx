import type { ReactNode } from "react";
import { scaleLinear } from "d3-scale";

import { safePlotDomain } from "./scales";

/**
 * The shared coordinate system every chart in the course is drawn inside
 * (§21, §34: one frame, not one per chart type).
 *
 * WHY THIS IS NOT A CLIENT COMPONENT
 *
 * Nothing here uses a hook, an event handler or a browser API, so a
 * theory lesson's static figure renders entirely on the server and ships
 * no JavaScript for the chart at all (§7, §26). Only two things in the
 * whole visualization layer need the client: `ScatterCanvas`, which needs
 * a real `<canvas>`, and the interactive simulator that owns slider state.
 * Keeping that boundary at the leaves rather than at the frame is what
 * stops a single interactive block from dragging every chart on the page
 * into the client bundle.
 *
 * ACCESSIBILITY (§24)
 *
 * `label` is required and becomes the accessible name of a `role="img"`
 * element. It is expected to carry the actual numbers — "histogram of
 * 5000 LiDAR readings, mean 2.00 m, standard deviation 0.02 m" — not a
 * category ("a histogram"). A chart whose alternative text describes its
 * genre rather than its content teaches nothing to a screen-reader user,
 * and the course's own rule is that every visual must teach.
 */

export interface PlotMargin {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/** Room for a two-line axis label and rotated tick text at our type sizes. */
export const DEFAULT_PLOT_MARGIN: PlotMargin = {
  top: 12,
  right: 16,
  bottom: 44,
  left: 56,
};

export type LinearScale = ReturnType<typeof scaleLinear<number, number>>;

export interface PlotGeometry {
  /** Data value -> pixel x. */
  xScale: LinearScale;
  /** Data value -> pixel y. Inverted, so larger values sit higher. */
  yScale: LinearScale;
  /** Drawable area, excluding margins. */
  innerWidth: number;
  innerHeight: number;
  margin: PlotMargin;
}

export interface PlotFrameProps {
  xDomain: readonly [number, number];
  yDomain: readonly [number, number];
  /**
   * The viewBox coordinate system, not a CSS pixel size. The rendered SVG
   * scales to its container width via `preserveAspectRatio`, so these fix
   * the aspect ratio and the relationship between stroke widths and the
   * data area, not the on-screen size (§23).
   */
  width?: number;
  height?: number;
  margin?: Partial<PlotMargin>;
  /** Accessible name. Must describe the data, not the chart type. */
  label: string;
  /**
   * Longer text alternative for anything the label cannot carry — the
   * shape of a distribution, an outlier's location, what a Q-Q plot's
   * curvature means.
   */
  description?: string;
  /** Receives the geometry and returns the marks. */
  children: (geometry: PlotGeometry) => ReactNode;
}

export function PlotFrame({
  xDomain,
  yDomain,
  width = 640,
  height = 380,
  margin: marginOverrides,
  label,
  description,
  children,
}: PlotFrameProps) {
  const margin = { ...DEFAULT_PLOT_MARGIN, ...marginOverrides };
  const innerWidth = Math.max(0, width - margin.left - margin.right);
  const innerHeight = Math.max(0, height - margin.top - margin.bottom);

  const xScale = scaleLinear().domain(safePlotDomain(xDomain)).range([0, innerWidth]);
  const yScale = scaleLinear().domain(safePlotDomain(yDomain)).range([innerHeight, 0]);

  const descriptionId = description ? `plot-desc-${hashLabel(label)}` : undefined;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={label}
      aria-describedby={descriptionId}
      className="h-auto w-full max-w-full"
    >
      {description ? (
        <desc id={descriptionId}>{description}</desc>
      ) : null}
      <g transform={`translate(${margin.left}, ${margin.top})`}>
        {children({ xScale, yScale, innerWidth, innerHeight, margin })}
      </g>
    </svg>
  );
}

/**
 * A stable id from the label, so `aria-describedby` resolves without
 * `useId` — which would force this component to the client and undo the
 * server-rendering property described at the top of this file.
 */
function hashLabel(label: string): string {
  let hash = 0;
  for (let i = 0; i < label.length; i += 1) {
    hash = (Math.imul(31, hash) + label.charCodeAt(i)) | 0;
  }
  return (hash >>> 0).toString(36);
}
