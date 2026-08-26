import type { VideoBlockData } from "../../schemas";

/**
 * A native `<video>` element against whatever URL the block points at —
 * provider-agnostic by construction, so nothing in the player couples to a
 * specific video host or SDK (§32). Self-hosted files, a CDN URL, or a
 * future signed URL from object storage all work unchanged.
 *
 * Known gap (§24): there is no captions track, because the block schema
 * doesn't carry one yet. A `captionsSrc` field and a `<track>` element are
 * the real fix — flagging rather than silently shipping without it.
 */
export function VideoBlock({ data }: { data: VideoBlockData }) {
  return (
    <figure className="flex flex-col gap-2">
      <div className="overflow-hidden rounded-xl border border-border bg-foreground/5">
        <video
          controls
          poster={data.posterSrc}
          className="aspect-video w-full bg-black"
        >
          <source src={data.src} />
        </video>
      </div>

      <p className="text-caption text-muted-foreground">{data.title}</p>
    </figure>
  );
}
