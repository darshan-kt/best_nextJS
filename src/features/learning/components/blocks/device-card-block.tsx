import { DeviceCard } from "@/components/hardware/device-card";
import type { HardwareDeviceDetail } from "@/features/hardware/queries";

/**
 * A `DEVICE_CARD` content block — the same `<DeviceCard>` the standalone
 * `/hardware` catalog renders (Stage 1 plan decision 5), embedded inline
 * in a lesson. Useful when a lesson references a device it doesn't itself
 * teach (e.g. a foundation module previewing the devices covered later).
 */
export function DeviceCardBlock({ device }: { device: HardwareDeviceDetail }) {
  return (
    <div className="max-w-sm">
      <DeviceCard device={device} href={`/hardware/${device.slug}`} />
    </div>
  );
}
