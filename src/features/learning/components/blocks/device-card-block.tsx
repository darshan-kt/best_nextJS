import { DeviceCard } from "@/components/hardware/device-card";
import type { HardwareDeviceDetail } from "@/features/hardware/queries";

/**
 * A `DEVICE_CARD` content block — the same `<DeviceCard>` the standalone
 * `/hardware` catalog renders (Stage 1 plan decision 5), embedded inline
 * in a lesson. Useful when a lesson references a device it doesn't itself
 * teach (e.g. a foundation module previewing the devices covered later).
 *
 * WHY THE LINK IS CONDITIONAL
 *
 * `/hardware/<slug>` only resolves for a device whose home section belongs
 * to a PUBLISHED + PUBLIC course. Every `DEVICE_CARD` seeded today points
 * at a device in a DRAFT course, so every one of them linked to a 404 —
 * from inside the course that owns the device.
 *
 * Deleting the cards would have removed real content that starts working
 * the moment that course publishes. Not linking is the smaller, reversible
 * change: the card still shows the device, and the link comes back on its
 * own when the catalogue page becomes reachable, with no content edit.
 *
 * The deeper inconsistency is left open deliberately. §12 holds that
 * "enrollment, not publish status, is what makes a course theirs" and the
 * lesson route honours that, but `/hardware/[slug]` has no enrollment path
 * at all — so a learner enrolled in the hardware course still cannot open
 * its device pages. That is a policy decision, not a rendering one.
 */
export function DeviceCardBlock({
  device,
  catalogPageIsReachable,
}: {
  device: HardwareDeviceDetail;
  catalogPageIsReachable: boolean;
}) {
  return (
    <div className="max-w-sm">
      <DeviceCard
        device={device}
        href={catalogPageIsReachable ? `/hardware/${device.slug}` : undefined}
      />
    </div>
  );
}
