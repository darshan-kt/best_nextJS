import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Camera, ImageOff, Radar } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { PageShell } from "@/components/shared/page-shell";
import { SpecTableBlock } from "@/features/learning/components/blocks/spec-table-block";
import { getHardwareDeviceBySlug } from "@/features/hardware/queries";
import type { HardwareCategory } from "@/db/generated/enums";

const CATEGORY_LABEL: Record<HardwareCategory, string> = {
  RGB_D_CAMERA: "RGB-D Camera",
  LIDAR_2D: "2D LiDAR",
};

const CATEGORY_ICON: Record<HardwareCategory, typeof Camera> = {
  RGB_D_CAMERA: Camera,
  LIDAR_2D: Radar,
};

export async function generateMetadata({
  params,
}: PageProps<"/hardware/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const device = await getHardwareDeviceBySlug(slug);

  return {
    title: device ? `${device.name} · LMS Platform` : "Hardware Catalog",
  };
}

/** One device's full reference page — the "quick reference" surface §26 asks for. */
export default async function HardwareDevicePage({
  params,
}: PageProps<"/hardware/[slug]">) {
  const { slug } = await params;
  const device = await getHardwareDeviceBySlug(slug);

  if (!device) {
    notFound();
  }

  const CategoryIcon = CATEGORY_ICON[device.category];

  return (
    <PageShell width="narrow" className="gap-8">
      <div className="flex flex-col gap-4">
        <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-border bg-muted">
          {device.heroImageSrc ? (
            <Image
              src={device.heroImageSrc}
              alt={device.heroImageAlt ?? device.name}
              fill
              sizes="(min-width: 768px) 688px, 100vw"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground">
              <CategoryIcon className="size-12" aria-hidden="true" />
              <span className="flex items-center gap-1.5 text-caption">
                <ImageOff className="size-3.5" aria-hidden="true" />
                Product photo pending capture
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Badge variant="secondary" className="w-fit">
            {CATEGORY_LABEL[device.category]}
          </Badge>
          <h1 className="font-heading text-title text-balance text-foreground sm:text-title-lg">
            {device.name}
          </h1>
          <p className="text-body-sm text-muted-foreground">{device.manufacturer}</p>
        </div>

        <p className="text-body text-pretty text-foreground">{device.summary}</p>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-border p-5">
        <h2 className="font-heading text-title-sm font-semibold text-foreground">
          ROS 2 integration
        </h2>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-body-sm">
          <dt className="text-muted-foreground">Driver package</dt>
          <dd className="font-mono text-foreground">{device.driverPackage}</dd>
          <dt className="text-muted-foreground">Source</dt>
          <dd>
            <a
              href={device.driverRepoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent-foreground underline underline-offset-2 hover:no-underline"
            >
              {device.driverRepoUrl}
            </a>
          </dd>
          <dt className="text-muted-foreground">ROS 2 distributions</dt>
          <dd className="flex flex-wrap gap-1.5">
            {device.rosDistroCompat.map((distro) => (
              <Badge key={distro} variant="outline">
                {distro}
              </Badge>
            ))}
          </dd>
        </dl>
      </div>

      <SpecTableBlock device={device} data={{}} />

      {device.topics.length > 0 ? (
        <div className="flex flex-col gap-3">
          <h2 className="font-heading text-title-sm font-semibold text-foreground">
            Topics
          </h2>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[480px] border-collapse text-body-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-left">
                  <th scope="col" className="px-4 py-2.5 font-medium text-foreground">
                    Topic
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-medium text-foreground">
                    Message type
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-medium text-foreground">
                    Description
                  </th>
                </tr>
              </thead>
              <tbody>
                {device.topics.map((topic) => (
                  <tr
                    key={topic.topicName}
                    className="border-b border-border last:border-0"
                  >
                    <th
                      scope="row"
                      className="px-4 py-2.5 text-left font-mono text-foreground"
                    >
                      {topic.topicName}
                    </th>
                    <td className="px-4 py-2.5 font-mono text-muted-foreground">
                      {topic.messageType}
                    </td>
                    <td className="px-4 py-2.5 text-pretty text-muted-foreground">
                      {topic.description}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      <Link
        href={`/hardware/compare?devices=${device.slug}`}
        className="inline-flex w-fit items-center gap-1.5 text-body-sm font-medium text-accent-foreground hover:underline"
      >
        Compare with another device
        <ArrowRight className="size-3.5" aria-hidden="true" />
      </Link>
    </PageShell>
  );
}
