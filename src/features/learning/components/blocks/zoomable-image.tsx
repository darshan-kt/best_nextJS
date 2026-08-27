"use client";

import Image from "next/image";
import { ZoomInIcon } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { ImageBlockData } from "../../schemas";

/**
 * The interactive half of an IMAGE block: the inline thumbnail doubles as
 * a button that opens the diagram full-size.
 *
 * This exists because course diagrams are information-dense — a
 * troubleshooting decision tree or an architecture stack carries text
 * that has to survive being rendered into a ~630px lesson column, which
 * is roughly half the width the diagram was authored at. Rather than
 * flatten every diagram until its smallest label is legible at that size
 * (which would mean far less on each one), the lesson shows a readable
 * overview and lets the learner open the real thing.
 *
 * The only `"use client"` boundary in the block renderers, and
 * deliberately the smallest one that works (§7): `ImageBlock` itself stays
 * a Server Component and hands the payload down. Accessibility comes from
 * the shared Dialog primitive rather than a bespoke overlay — focus trap,
 * Escape to close, focus restored to the trigger, and `aria-modal` are all
 * Radix's, not reimplemented here. The animation is not marked
 * `data-motion="essential"`, so `prefers-reduced-motion` suppresses it
 * through the global rule in `globals.css`.
 *
 * `object-cover` inline (a ratio-locked box, no layout shift) but
 * `object-contain` when enlarged: the enlarged view is the one that must
 * never crop, since cropping is the problem it exists to solve.
 */
export function ZoomableImage({ data }: { data: ImageBlockData }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="group relative aspect-video w-full cursor-zoom-in overflow-hidden rounded-xl border border-border bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          {/* The lesson column is max-width capped, so this box measures
              ~686px on any viewport at or above `md` — not the 640px this
              previously claimed, which made the browser pick the 640w
              candidate and upscale it. Rounded up to the next srcset stop
              so diagram text is sampled at or above its render size. */}
          <Image
            src={data.src}
            alt={data.alt}
            fill
            sizes="(min-width: 768px) 704px, 100vw"
            className="object-cover"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute right-2 bottom-2 flex items-center gap-1 rounded-md bg-background/85 px-2 py-1 text-caption text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
          >
            <ZoomInIcon className="size-3.5" />
            Enlarge
          </span>
          {/* The button's accessible name. The image's own `alt` describes
              the diagram; this says what activating the control does, so a
              screen reader user hears both rather than a button labelled
              with a paragraph of diagram description. */}
          <span className="sr-only">Enlarge image</span>
        </button>
      </DialogTrigger>

      <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-5xl">
        <DialogTitle className="pr-8">Enlarged diagram</DialogTitle>
        <div className="relative aspect-video max-h-[75vh] w-full overflow-hidden rounded-lg bg-muted">
          <Image
            src={data.src}
            alt={data.alt}
            fill
            sizes="90vw"
            className="object-contain"
          />
        </div>
        <DialogDescription>{data.caption ?? data.alt}</DialogDescription>
      </DialogContent>
    </Dialog>
  );
}
