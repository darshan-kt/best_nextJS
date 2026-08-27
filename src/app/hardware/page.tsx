import type { Metadata } from "next";
import { Cpu } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader, PageShell } from "@/components/shared/page-shell";
import { DeviceCard } from "@/components/hardware/device-card";
import { listPubliclyVisibleHardware } from "@/features/hardware/queries";

export const metadata: Metadata = {
  title: "Hardware Catalog · LMS Platform",
  description: "Robotics hardware and sensors, with real ROS 2 integration data.",
};

/**
 * The hardware device catalog (Robotics Hardware & Sensors course, Stage 1
 * — §36 plan, decision 5).
 *
 * Open to everyone, signed in or not — the same reasoning `/courses`
 * already applies (discovery over gatekeeping) and the same mechanism:
 * `listPubliclyVisibleHardware` filters in the query, transitively through
 * each device's owning course, rather than this page making its own
 * authorization decision (§12, decision 6 — no new policy branch).
 */
export default async function HardwareCatalogPage() {
  const devices = await listPubliclyVisibleHardware();

  return (
    <PageShell>
      <PageHeader
        title="Hardware Catalog"
        description="Real robotics hardware, with verified specifications and ROS 2 integration details."
      />

      {devices.length === 0 ? (
        <EmptyState
          icon={<Cpu className="size-6" aria-hidden="true" />}
          title="No devices published yet"
          description="The catalog is being built. Published devices will appear here as soon as their course goes live."
        />
      ) : (
        <ul className="grid list-none gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {devices.map((device) => (
            <li key={device.id} className="flex">
              <DeviceCard device={device} href={`/hardware/${device.slug}`} />
            </li>
          ))}
        </ul>
      )}
    </PageShell>
  );
}
