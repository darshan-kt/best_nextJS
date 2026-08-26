import { Download } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import type { FileBlockData } from "../../schemas";

/**
 * A downloadable reference — cheat sheets, source code, exercise files
 * (§17 of ROS2_COURSE_DESIGN.md). External URL only: this app has no file
 * storage/upload feature (no S3 or equivalent provider is wired up
 * anywhere in the codebase), so there is nothing to upload *to* yet —
 * building that is a separate, considerably larger feature than closing
 * this content-block gap.
 *
 * A plain link, not the HTML `download` attribute: `download` only
 * reliably forces a save for same-origin (or CORS-permissive)
 * resources, and every file this block points at is external.
 * `target="_blank"` is the honest behavior — it opens the resource, which
 * downloads it for content types a browser doesn't render inline (PDFs,
 * archives), and previews it otherwise, which is still useful.
 */
export function FileBlock({ data }: { data: FileBlockData }) {
  return (
    <Card>
      <CardContent>
        <a
          href={data.href}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center gap-4"
        >
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
            <Download className="size-5" aria-hidden="true" />
          </div>

          <div className="flex min-w-0 flex-col gap-0.5">
            <p className="font-heading text-body font-medium text-foreground underline-offset-4 group-hover:underline">
              {data.label}
            </p>
            {data.description ? (
              <p className="text-body-sm text-muted-foreground">
                {data.description}
              </p>
            ) : null}
            {data.sizeLabel ? (
              <p className="text-caption text-muted-foreground">
                {data.sizeLabel}
              </p>
            ) : null}
          </div>
        </a>
      </CardContent>
    </Card>
  );
}
