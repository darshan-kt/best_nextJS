import Image from "next/image";

import type { ImageBlockData } from "../../schemas";

/**
 * `next/image` rather than a plain `<img>` — optimized delivery is a
 * stated performance rule (§26), not a nice-to-have, and the one-time cost
 * is naming the source host in `next.config.ts`.
 *
 * A fixed aspect-ratio box rather than intrinsic width/height: content
 * authors won't know a fixed pixel size in advance, and `fill` inside a
 * ratio-locked container avoids layout shift without requiring one.
 */
export function ImageBlock({ data }: { data: ImageBlockData }) {
  return (
    <figure className="flex flex-col gap-2">
      <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-border bg-muted">
        <Image
          src={data.src}
          alt={data.alt}
          fill
          sizes="(min-width: 768px) 640px, 100vw"
          className="object-cover"
        />
      </div>

      {data.caption ? (
        <figcaption className="text-caption text-muted-foreground">
          {data.caption}
        </figcaption>
      ) : null}
    </figure>
  );
}
