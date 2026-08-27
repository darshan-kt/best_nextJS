import { Info, ShieldAlert, TriangleAlert } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import type { HardwareSupportStatus } from "@/db/generated/enums";

/**
 * The legacy/deprecated warning surface (Stage 1 plan decision 4;
 * non-negotiables — "never present outdated drivers without warning...
 * driven by the model field, not hand-written into each lesson").
 *
 * Rendered automatically by `SpecTableBlock` and `DeviceCard` whenever a
 * device's `supportStatus` isn't `ACTIVELY_MAINTAINED` — no lesson author
 * places this by hand, and there is no way to author a device page that
 * omits it while genuinely needing it. Palette reuses `CalloutBlock`'s
 * existing INFO/WARNING/DANGER tokens rather than inventing new ones
 * (§21, §34).
 */
const STATUS_PRESENTATION: Record<
  Exclude<HardwareSupportStatus, "ACTIVELY_MAINTAINED">,
  {
    icon: typeof Info;
    title: string;
    className: string;
  }
> = {
  COMMUNITY_MAINTAINED: {
    icon: Info,
    title: "Community-maintained driver",
    className:
      "border-blue-500/30 bg-blue-500/5 text-blue-900 [&>svg]:text-blue-600 dark:text-blue-100 dark:[&>svg]:text-blue-400",
  },
  LEGACY: {
    icon: TriangleAlert,
    title: "Legacy hardware — read this before you buy or build",
    className:
      "border-amber-500/30 bg-amber-500/5 text-amber-900 [&>svg]:text-amber-600 dark:text-amber-100 dark:[&>svg]:text-amber-400",
  },
  DEPRECATED: {
    icon: ShieldAlert,
    title: "Deprecated — not recommended for new builds",
    className: "",
  },
};

export function HardwareSupportBanner({
  status,
  note,
}: {
  status: HardwareSupportStatus;
  note: string | null;
}) {
  if (status === "ACTIVELY_MAINTAINED") {
    return null;
  }

  const { icon: Icon, title, className } = STATUS_PRESENTATION[status];

  return (
    <Alert
      variant={status === "DEPRECATED" ? "destructive" : "default"}
      className={cn(className)}
    >
      <Icon aria-hidden="true" />
      <AlertTitle>{title}</AlertTitle>
      {note ? <AlertDescription>{note}</AlertDescription> : null}
    </Alert>
  );
}
