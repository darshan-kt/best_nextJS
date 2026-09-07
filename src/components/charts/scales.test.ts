import { describe, expect, it } from "vitest";

import { formatTick, safePlotDomain } from "./scales";

describe("safePlotDomain", () => {
  it("passes a normal domain through unchanged", () => {
    expect(safePlotDomain([0, 1])).toEqual([0, 1]);
    expect(safePlotDomain([-2.5, 7.25])).toEqual([-2.5, 7.25]);
  });

  it("widens a zero-width domain rather than collapsing every mark to one pixel", () => {
    // Reachable for real: a histogram of identical sensor readings, or a
    // simulation at n = 1.
    expect(safePlotDomain([3, 3])).toEqual([2.5, 3.5]);
    expect(safePlotDomain([0, 0])).toEqual([-0.5, 0.5]);
  });

  it("orders a reversed domain instead of inverting the axis silently", () => {
    expect(safePlotDomain([5, 1])).toEqual([1, 5]);
  });

  it("falls back to a unit domain on an infinite bound", () => {
    // This is what a caller passing a distribution's mathematical
    // `support` where its `plotDomain` was wanted looks like — the
    // Gaussian's support is the whole real line. Rendering an empty chart
    // beats an SVG full of NaN coordinates.
    expect(safePlotDomain([Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY])).toEqual([0, 1]);
    expect(safePlotDomain([0, Number.POSITIVE_INFINITY])).toEqual([0, 1]);
    expect(safePlotDomain([Number.NaN, 1])).toEqual([0, 1]);
  });
});

describe("formatTick", () => {
  it("strips trailing zeros so an axis reads 0, 0.5, 1", () => {
    expect(formatTick(0)).toBe("0");
    expect(formatTick(0.5)).toBe("0.5");
    expect(formatTick(1)).toBe("1");
    expect(formatTick(2)).toBe("2");
  });

  it("keeps three significant figures on the LiDAR noise scale", () => {
    // The flagship module's x-axis runs roughly 1.94 to 2.06; two
    // significant figures would render every tick as "2".
    expect(formatTick(1.94)).toBe("1.94");
    expect(formatTick(2.06)).toBe("2.06");
    expect(formatTick(1.995)).toBe("2");
  });

  it("switches to exponential outside a readable magnitude range", () => {
    expect(formatTick(0.0001)).toBe("1.0e-4");
    expect(formatTick(250_000)).toBe("2.5e+5");
  });

  it("handles negatives", () => {
    expect(formatTick(-1)).toBe("-1");
    expect(formatTick(-0.25)).toBe("-0.25");
  });

  it("renders nothing for a non-finite tick rather than 'NaN'", () => {
    expect(formatTick(Number.NaN)).toBe("");
    expect(formatTick(Number.POSITIVE_INFINITY)).toBe("");
  });
});
