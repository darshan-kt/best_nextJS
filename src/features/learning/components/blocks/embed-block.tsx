import type { EmbedBlockData } from "../../schemas";

/**
 * A curated external video (§14/§15 of ROS2_COURSE_DESIGN.md), rendered
 * as an iframe against `youtube-nocookie.com` — YouTube's privacy-
 * enhanced embed domain, which avoids setting tracking cookies until the
 * learner actually plays the video.
 *
 * The iframe `src` is built from a strictly-validated `videoId` (11
 * characters, `embedBlockSchema` in `../../schemas.ts`) interpolated into
 * a fixed URL template — never a stored/authored URL rendered directly —
 * so this can't become an open redirect or an arbitrary-iframe vector.
 * `src/proxy.ts`'s CSP allows exactly this one host in `frame-src`.
 *
 * Attribution is part of the block, not an afterthought: §15 requires
 * every recommended video to carry why it was selected, so the learner
 * sees the creator and the reason before watching, the same way a good
 * citation works.
 */
export function EmbedBlock({ data }: { data: EmbedBlockData }) {
  return (
    <figure className="flex flex-col gap-2">
      <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-border bg-black">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${data.videoId}`}
          title={data.title}
          className="absolute inset-0 size-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>

      <figcaption className="flex flex-col gap-1">
        <p className="font-heading text-body font-medium text-foreground">
          {data.title}
        </p>
        <p className="text-body-sm text-muted-foreground">
          {data.creator}
          {data.durationLabel ? ` · ${data.durationLabel}` : ""}
        </p>
        {data.whySelected ? (
          <p className="text-body-sm text-muted-foreground">
            {data.whySelected}
          </p>
        ) : null}
      </figcaption>
    </figure>
  );
}
