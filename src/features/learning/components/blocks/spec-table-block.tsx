import { HardwareSupportBanner } from "@/components/hardware/hardware-support-banner";
import type { HardwareDeviceDetail } from "@/features/hardware/queries";
import type { SpecTableBlockData } from "@/features/hardware/schemas";

/**
 * A device's specifications, read live from `HardwareDevice` /
 * `HardwareDeviceSpec` rather than duplicated as lesson prose (Stage 1
 * plan, decision 1/2) — a spec correction updates here and in the
 * `/hardware` catalog and any comparison view from one edit.
 *
 * Every row carries its "why it matters" explanation (§7, non-negotiables)
 * because the column exists on `HardwareDeviceSpec` itself — there is no
 * way to author a spec row that omits it.
 *
 * `data.specKeys` narrows which specs show at this point in the lesson
 * (e.g. only range/resolution mid-explanation, before the full table
 * later) — placement only, never a second copy of the values themselves.
 */
export function SpecTableBlock({
  device,
  data,
}: {
  device: HardwareDeviceDetail;
  data: SpecTableBlockData;
}) {
  const specs = data.specKeys
    ? device.specs.filter((spec) => data.specKeys!.includes(spec.key))
    : device.specs;

  return (
    <figure className="flex flex-col gap-3">
      <figcaption className="text-body-sm font-medium text-foreground">
        {device.name} — specifications
      </figcaption>

      <HardwareSupportBanner
        status={device.supportStatus}
        note={device.supportStatusNote}
      />

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[560px] border-collapse text-body-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50 text-left">
              <th scope="col" className="px-4 py-2.5 font-medium text-foreground">
                Specification
              </th>
              <th scope="col" className="px-4 py-2.5 font-medium text-foreground">
                Value
              </th>
              <th scope="col" className="px-4 py-2.5 font-medium text-foreground">
                Why it matters
              </th>
            </tr>
          </thead>
          <tbody>
            {specs.map((spec) => (
              <tr key={spec.key} className="border-b border-border last:border-0">
                <th
                  scope="row"
                  className="px-4 py-2.5 text-left font-medium text-foreground"
                >
                  {spec.label}
                </th>
                <td className="px-4 py-2.5 text-foreground">
                  {spec.value}
                  {spec.unit ? (
                    <span className="text-muted-foreground"> {spec.unit}</span>
                  ) : null}
                </td>
                <td className="px-4 py-2.5 text-pretty text-muted-foreground">
                  {spec.whyItMatters}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}
