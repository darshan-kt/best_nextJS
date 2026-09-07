/**
 * The pure geometry helpers behind the chart components.
 *
 * Extracted into a `.ts` module rather than left inline in the `.tsx`
 * files for a specific reason: `vitest.config.mts` deliberately runs
 * without jsdom or React testing utilities ("everything here exercises
 * pure functions... adding infrastructure it does not use would be
 * dependency weight nobody asked for", §40). These two functions are the
 * error-prone part of the charting layer — a degenerate domain and a
 * misformatted tick are exactly the bugs that look like a working chart —
 * so they belong where the existing test tier can reach them.
 */

/**
 * Guard a plot domain against zero width.
 *
 * A zero-width domain collapses every mark onto a single pixel and makes
 * `ticks()` degenerate. This happens for real, not just in theory: a
 * histogram of identical sensor readings, or a simulation at n = 1.
 * Widening by half a unit either side is the same guard `histogram()` in
 * `features/statistics/summary.ts` applies, for the same reason.
 */
export function safePlotDomain(
  domain: readonly [number, number]
): [number, number] {
  const [low, high] = domain;

  if (!Number.isFinite(low) || !Number.isFinite(high)) {
    // An infinite bound reaches here when a caller passes a distribution's
    // mathematical `support` where its `plotDomain` was wanted. Falling
    // back to a unit domain renders an empty-but-valid chart rather than an
    // SVG full of NaN coordinates.
    return [0, 1];
  }

  if (low === high) return [low - 0.5, high + 0.5];
  if (low > high) return [high, low];

  return [low, high];
}

/**
 * Axis tick formatting.
 *
 * Ours rather than `d3-format`'s, because the numbers this course displays
 * span a LiDAR noise axis reading 1.94–2.06 and a density axis reaching
 * 1e-3, and neither should be rendered in the other's convention (§40).
 *
 * Three significant figures with trailing zeros stripped, so an axis reads
 * `0, 0.5, 1` rather than `0.00, 0.500, 1.00`; exponential notation
 * outside a readable magnitude range.
 */
export function formatTick(value: number): string {
  if (!Number.isFinite(value)) return "";
  if (value === 0) return "0";

  const magnitude = Math.abs(value);
  if (magnitude >= 1e5 || magnitude < 1e-3) {
    return value.toExponential(1);
  }

  const text = value.toPrecision(3);
  if (!text.includes(".")) return text;

  return text.replace(/\.?0+$/, "");
}
