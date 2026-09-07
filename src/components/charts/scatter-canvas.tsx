"use client";

import { useEffect, useRef } from "react";
import { scaleLinear } from "d3-scale";

import type { Point } from "./series";

/**
 * The one high-cardinality view in the course: thousands of 2D points,
 * drawn to a `<canvas>` rather than as SVG nodes.
 *
 * WHY THIS IS THE ONLY CANVAS COMPONENT
 *
 * PHASE_1A_ARCHITECTURE.md §11 works through the node counts: a PDF curve
 * is one `<path>`, a 5,000-sample histogram is at most 60 `<rect>`s, and a
 * Q-Q plot is a path plus a line. Only the uniform module's 2D workspace
 * scatter genuinely renders one mark per sample, and at 5,000 marks SVG
 * stops being reasonable. Everything else stays SVG, which keeps it
 * server-renderable, inspectable and stylable by design tokens.
 *
 * This component is therefore `"use client"` and the SVG ones are not.
 *
 * ACCESSIBILITY (§24)
 *
 * A canvas is opaque to assistive technology. `label` becomes the
 * accessible name and `description` carries what a sighted reader gets
 * from the shape — the sampling process, the bounds, and whether the fill
 * looks even. That text is not a courtesy: for a screen-reader user it is
 * the entire content of the figure, so the caller is expected to describe
 * the DATA, not the picture.
 */

export interface ScatterCanvasProps {
  points: readonly Point[];
  xDomain: readonly [number, number];
  yDomain: readonly [number, number];
  /** CSS pixels; the backing store is scaled by devicePixelRatio. */
  width?: number;
  height?: number;
  xLabel?: string;
  yLabel?: string;
  label: string;
  description?: string;
  radius?: number;
}

export function ScatterCanvas({
  points,
  xDomain,
  yDomain,
  width = 480,
  height = 480,
  xLabel,
  yLabel,
  label,
  description,
  radius = 1.6,
}: ScatterCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    // Match the backing store to the device pixel ratio, or the points are
    // visibly soft on any HiDPI display - which is most of them.
    const ratio = typeof window === "undefined" ? 1 : window.devicePixelRatio || 1;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, width, height);

    const padding = 8;
    const xScale = scaleLinear()
      .domain(xDomain as [number, number])
      .range([padding, width - padding]);
    const yScale = scaleLinear()
      .domain(yDomain as [number, number])
      .range([height - padding, padding]);

    // Read the resolved token colour rather than hardcoding one, so the
    // canvas follows the same theme as every SVG chart beside it (§21).
    const styles = getComputedStyle(canvas);
    context.fillStyle = styles.getPropertyValue("color").trim() || "#3b82f6";
    context.globalAlpha = 0.45;

    for (const point of points) {
      const px = xScale(point.x);
      const py = yScale(point.y);
      if (!Number.isFinite(px) || !Number.isFinite(py)) continue;

      context.beginPath();
      context.arc(px, py, radius, 0, Math.PI * 2);
      context.fill();
    }
  }, [points, xDomain, yDomain, width, height, radius]);

  return (
    <figure className="m-0">
      <canvas
        ref={canvasRef}
        style={{ width: `${width}px`, height: `${height}px` }}
        className="text-primary border-border max-w-full rounded-md border"
        role="img"
        aria-label={label}
      />
      {/* Visible axis labels, since the canvas draws none of its own. */}
      {(xLabel || yLabel) && (
        <figcaption className="text-muted-foreground mt-2 text-[12px]">
          {yLabel ? <span>{yLabel} (vertical)</span> : null}
          {xLabel && yLabel ? <span> · </span> : null}
          {xLabel ? <span>{xLabel} (horizontal)</span> : null}
        </figcaption>
      )}
      {description ? (
        <p className="text-muted-foreground mt-1 text-[12px]">{description}</p>
      ) : null}
    </figure>
  );
}
