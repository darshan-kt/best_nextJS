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

/** `m:ss` / `h:mm:ss` — for showing which part of a video is being played. */
function formatTimestamp(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const mm = hours > 0 ? String(minutes).padStart(2, "0") : String(minutes);
  const ss = String(seconds).padStart(2, "0");

  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function EmbedBlock({ data }: { data: EmbedBlockData }) {
  const { startSeconds, endSeconds } = data;
  const isClip = startSeconds !== undefined || endSeconds !== undefined;

  // Built with `URLSearchParams` rather than string concatenation so the
  // numeric bounds are encoded rather than trusted, matching how the
  // `videoId` itself is constrained before it ever reaches this template.
  const params = new URLSearchParams();
  if (startSeconds !== undefined) {
    params.set("start", String(startSeconds));
  }
  if (endSeconds !== undefined) {
    params.set("end", String(endSeconds));
  }
  const query = params.size > 0 ? `?${params}` : "";

  // Derived from the already-validated id rather than stored as its own
  // authored URL — one less field that could point somewhere unintended.
  const fullVideoHref = `https://www.youtube.com/watch?v=${data.videoId}`;

  return (
    <figure className="flex flex-col gap-2">
      <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-border bg-black">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${data.videoId}${query}`}
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
          {isClip && startSeconds !== undefined && endSeconds !== undefined
            ? ` · plays ${formatTimestamp(startSeconds)}–${formatTimestamp(endSeconds)}`
            : ""}
        </p>
        {data.whySelected ? (
          <p className="text-body-sm text-muted-foreground">
            {data.whySelected}
          </p>
        ) : null}
        {isClip ? (
          // Offered, not hidden: the player is cued to the relevant
          // chapter, but a learner who wants the whole thing should not
          // have to go hunting for it.
          <p className="text-body-sm text-muted-foreground">
            <a
              href={fullVideoHref}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-sm underline underline-offset-2 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              Watch the full video on YouTube
            </a>{" "}
            <span className="text-caption">(opens in a new tab)</span>
          </p>
        ) : null}
      </figcaption>
    </figure>
  );
}
