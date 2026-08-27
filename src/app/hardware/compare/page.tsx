import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Camera, ImageOff, Radar, Scale } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader, PageShell } from "@/components/shared/page-shell";
import { HardwareSupportBanner } from "@/components/hardware/hardware-support-banner";
import {
  getHardwareDevicesForComparison,
  type HardwareDeviceDetail,
} from "@/features/hardware/queries";
import type { HardwareCategory } from "@/db/generated/enums";

export const metadata: Metadata = {
  title: "Compare Hardware · LMS Platform",
  description: "Side-by-side hardware specifications.",
};

const CATEGORY_LABEL: Record<HardwareCategory, string> = {
  RGB_D_CAMERA: "RGB-D Camera",
  LIDAR_2D: "2D LiDAR",
};

const CATEGORY_ICON: Record<HardwareCategory, typeof Camera> = {
  RGB_D_CAMERA: Camera,
  LIDAR_2D: Radar,
};

/**
 * The side-by-side comparison view (§20) — Stage 1 plan decision 5. A
 * route, not a lesson content block: comparing devices is a catalog
 * browsing action, not something that belongs in one lesson's lexical
 * flow, and this way the same URL works whether a learner arrives from
 * `/hardware`, a device page's "Compare" link, or a link pasted from
 * elsewhere.
 *
 * Spec rows are matched by `HardwareDeviceSpec.key` across devices — two
 * devices that both report a "range" spec line up on one row even if
 * their units or exact values differ, which is the whole point of a
 * comparison. A spec only one device has still gets its own row, with the
 * other column left blank rather than the row being dropped — an absent
 * spec is itself informative (§20: "limitations").
 */
export default async function HardwareComparePage({
  searchParams,
}: PageProps<"/hardware/compare">) {
  const params = await searchParams;
  const raw = params.devices;
  const slugs = (Array.isArray(raw) ? raw[0] : raw)
    ?.split(",")
    .map((s) => s.trim())
    .filter(Boolean) ?? [];

  const devices =
    slugs.length > 0 ? await getHardwareDevicesForComparison(slugs) : [];

  return (
    <PageShell>
      <PageHeader
        title="Compare hardware"
        description="Specifications side by side, pulled live from each device's own record."
      />

      {devices.length < 2 ? (
        <EmptyState
          icon={<Scale className="size-6" aria-hidden="true" />}
          title={
            devices.length === 0
              ? "No devices selected"
              : "Add at least one more device"
          }
          description="Open the hardware catalog and pick two or more devices to compare."
          action={
            <Link
              href="/hardware"
              className="text-body-sm font-medium text-accent-foreground hover:underline"
            >
              Browse the catalog
            </Link>
          }
        />
      ) : (
        <ComparisonTable devices={devices} />
      )}
    </PageShell>
  );
}

function ComparisonTable({ devices }: { devices: HardwareDeviceDetail[] }) {
  // Union of every spec key across the selected devices, in the order
  // each key first appears — stable, and doesn't require every device to
  // agree on a canonical spec ordering.
  const specKeys: { key: string; label: string }[] = [];
  const seen = new Set<string>();
  for (const device of devices) {
    for (const spec of device.specs) {
      if (!seen.has(spec.key)) {
        seen.add(spec.key);
        specKeys.push({ key: spec.key, label: spec.label });
      }
    }
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full min-w-[640px] border-collapse text-body-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50 text-left">
            <th scope="col" className="px-4 py-3 font-medium text-foreground">
              Specification
            </th>
            {devices.map((device) => (
              <th key={device.id} scope="col" className="px-4 py-3 align-top">
                <DeviceColumnHeader device={device} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-border">
            <th scope="row" className="px-4 py-2.5 text-left font-medium text-foreground">
              Manufacturer
            </th>
            {devices.map((device) => (
              <td key={device.id} className="px-4 py-2.5 text-foreground">
                {device.manufacturer}
              </td>
            ))}
          </tr>
          <tr className="border-b border-border">
            <th scope="row" className="px-4 py-2.5 text-left font-medium text-foreground">
              Category
            </th>
            {devices.map((device) => (
              <td key={device.id} className="px-4 py-2.5 text-foreground">
                {CATEGORY_LABEL[device.category]}
              </td>
            ))}
          </tr>
          <tr className="border-b border-border">
            <th scope="row" className="px-4 py-2.5 text-left font-medium text-foreground">
              Driver
            </th>
            {devices.map((device) => (
              <td key={device.id} className="px-4 py-2.5 font-mono text-foreground">
                {device.driverPackage}
              </td>
            ))}
          </tr>
          {specKeys.map(({ key, label }) => (
            <tr key={key} className="border-b border-border last:border-0">
              <th
                scope="row"
                className="px-4 py-2.5 text-left font-medium text-foreground"
              >
                {label}
              </th>
              {devices.map((device) => {
                const spec = device.specs.find((s) => s.key === key);
                return (
                  <td key={device.id} className="px-4 py-2.5 text-foreground">
                    {spec ? (
                      <>
                        {spec.value}
                        {spec.unit ? (
                          <span className="text-muted-foreground"> {spec.unit}</span>
                        ) : null}
                      </>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DeviceColumnHeader({ device }: { device: HardwareDeviceDetail }) {
  const CategoryIcon = CATEGORY_ICON[device.category];

  return (
    <div className="flex flex-col gap-2">
      <div className="relative aspect-video w-40 overflow-hidden rounded-lg border border-border bg-muted">
        {device.heroImageSrc ? (
          <Image
            src={device.heroImageSrc}
            alt={device.heroImageAlt ?? device.name}
            fill
            sizes="160px"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-muted-foreground">
            <CategoryIcon className="size-5" aria-hidden="true" />
            <ImageOff className="size-3" aria-hidden="true" />
          </div>
        )}
      </div>
      <Link
        href={`/hardware/${device.slug}`}
        className="font-heading font-semibold text-foreground hover:underline"
      >
        {device.name}
      </Link>
      <Badge variant="secondary" className="w-fit">
        {CATEGORY_LABEL[device.category]}
      </Badge>
      <HardwareSupportBanner
        status={device.supportStatus}
        note={device.supportStatusNote}
      />
    </div>
  );
}
