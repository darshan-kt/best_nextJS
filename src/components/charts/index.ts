/**
 * Domain-agnostic plotting primitives (PHASE_1A_ARCHITECTURE.md §16).
 *
 * These know about scales and pixels. They know nothing about
 * distributions, samples or robots — that lives in
 * `features/statistics/components/`, which composes these. Keeping the
 * boundary sharp is what lets a future module (covariance ellipses, a
 * Poisson PMF) reuse the frame and axes without inheriting Phase 1's
 * assumptions.
 */
export {
  PlotFrame,
  DEFAULT_PLOT_MARGIN,
  type PlotFrameProps,
  type PlotGeometry,
  type PlotMargin,
  type LinearScale,
} from "./plot-frame";
export { XAxis, YAxis, type AxisProps } from "./axis";
export {
  LineSeries,
  BarSeries,
  ReferenceLine,
  PointSeries,
  MAX_SVG_POINTS,
  type Bar,
  type Point,
  type SeriesTone,
} from "./series";
export { ScatterCanvas, type ScatterCanvasProps } from "./scatter-canvas";
export { safePlotDomain, formatTick } from "./scales";
