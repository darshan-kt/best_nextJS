import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Camera, ImageOff, Radar } from "lucide-react";

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HardwareSupportBanner } from "./hardware-support-banner";
import type { HardwareDeviceCardSummary } from "@/features/hardware/queries";
import type { HardwareCategory } from "@/db/generated/enums";

const CATEGORY_LABEL: Record<HardwareCategory, string> = {
  RGB_D_CAMERA: "RGB-D Camera",
  LIDAR_2D: "2D LiDAR",
};

const CATEGORY_ICON: Record<HardwareCategory, typeof Camera> = {
  RGB_D_CAMERA: Camera,
  LIDAR_2D: Radar,
};

/**
 * The shared presentational card (Stage 1 plan decision 5) — used both by
 * `DeviceCardBlock` (embedded in a lesson) and `/hardware`/`/hardware/[slug]`
 * (the standalone catalog). One visual definition, two entry points (§21,
 * §34: avoid duplicate components).
 *
 * Deliberately not `ZoomableImage`/`aspect-video` — that container is
 * tuned for lesson diagrams read at lesson-column width; a catalog card's
 * hero image wants a squarer, product-shot ratio instead, and reusing the
 * diagram component here would force one ratio to serve two different
 * jobs (Stage 1 plan §3).
 */
export function DeviceCard({
  device,
  href,
}: {
  device: HardwareDeviceCardSummary;
  href: string;
}) {
  const CategoryIcon = CATEGORY_ICON[device.category];

  return (
    <Card interactive className="h-full">
      <div className="relative aspect-4/3 w-full overflow-hidden bg-muted">
        {device.heroImageSrc ? (
          <Image
            src={device.heroImageSrc}
            alt={device.heroImageAlt ?? device.name}
            fill
            sizes="(min-width: 768px) 400px, 100vw"
            className="object-cover"
          />
        ) : (
          // Explicit, labelled placeholder — never a stand-in presented as
          // the real product (kickoff prompt's VISUAL STANDARD: hero shots
          // must be real photography, not generated, and never silently
          // placeholdered).
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground">
            <CategoryIcon className="size-10" aria-hidden="true" />
            <span className="flex items-center gap-1.5 text-caption">
              <ImageOff className="size-3.5" aria-hidden="true" />
              Product photo pending capture
            </span>
          </div>
        )}
      </div>

      <CardHeader>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{CATEGORY_LABEL[device.category]}</Badge>
        </div>
        <CardTitle>
          <Link
            href={href}
            className="outline-none after:absolute after:inset-0 after:rounded-xl"
          >
            {device.name}
          </Link>
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 gap-3">
        <p className="line-clamp-2 text-body-sm text-pretty text-muted-foreground">
          {device.summary}
        </p>
        <HardwareSupportBanner
          status={device.supportStatus}
          note={device.supportStatusNote}
        />
      </CardContent>

      <CardFooter className="justify-between">
        <span className="truncate text-muted-foreground">
          {device.manufacturer}
        </span>
        <span
          className="inline-flex shrink-0 items-center gap-1 font-medium text-muted-foreground transition-colors group-hover/card:text-accent-foreground"
          aria-hidden="true"
        >
          View device
          <ArrowRight className="size-3.5 transition-transform group-hover/card:translate-x-0.5" />
        </span>
      </CardFooter>
    </Card>
  );
}
