import type { ImageBlockData } from "../../schemas";
import { ZoomableImage } from "./zoomable-image";

/**
 * `next/image` rather than a plain `<img>` — optimized delivery is a
 * stated performance rule (§26), not a nice-to-have, and the one-time cost
 * is naming the source host in `next.config.ts`.
 *
 * A fixed aspect-ratio box rather than intrinsic width/height: content
 * authors won't know a fixed pixel size in advance, and `fill` inside a
 * ratio-locked container avoids layout shift without requiring one.
 *
 * Both of those now live in `ZoomableImage`, which adds click-to-enlarge —
 * course diagrams are authored at roughly twice the lesson column's width,
 * so the inline render is an overview and the dialog is the readable copy.
 * This component stays a Server Component and keeps the `"use client"`
 * boundary down at the one piece that genuinely needs state (§7); the
 * caption never needed to cross it.
 */
export function ImageBlock({ data }: { data: ImageBlockData }) {
  return (
    <figure className="flex flex-col gap-2">
      <ZoomableImage data={data} />

      {data.caption ? (
        <figcaption className="text-caption text-muted-foreground">
          {data.caption}
        </figcaption>
      ) : null}
    </figure>
  );
}
