import { Info, Lightbulb, OctagonAlert, TriangleAlert } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import type { CalloutBlockData } from "../../schemas";

/**
 * Warnings, tips, and notes (§11, §17 of ROS2_COURSE_DESIGN.md — e.g.
 * flagging a version-specific instruction, or "don't skip this step").
 *
 * Built on the shadcn `Alert` primitive rather than a hand-rolled div —
 * `Alert` only ships `default`/`destructive` variants, so DANGER maps
 * onto `destructive` (an existing design-system token) and the other
 * three use Tailwind's palette directly. There's no dedicated info/
 * warning/tip design token in `globals.css` yet, and adding one is a
 * bigger design-system change than this content-block gap warrants —
 * these are systematic Tailwind colors, not one-off arbitrary values.
 */
const VARIANT_STYLES = {
  INFO: {
    icon: Info,
    className:
      "border-blue-500/30 bg-blue-500/5 text-blue-900 [&>svg]:text-blue-600 dark:text-blue-100 dark:[&>svg]:text-blue-400",
  },
  TIP: {
    icon: Lightbulb,
    className:
      "border-emerald-500/30 bg-emerald-500/5 text-emerald-900 [&>svg]:text-emerald-600 dark:text-emerald-100 dark:[&>svg]:text-emerald-400",
  },
  WARNING: {
    icon: TriangleAlert,
    className:
      "border-amber-500/30 bg-amber-500/5 text-amber-900 [&>svg]:text-amber-600 dark:text-amber-100 dark:[&>svg]:text-amber-400",
  },
  DANGER: {
    icon: OctagonAlert,
    className: "",
  },
} as const;

export function CalloutBlock({ data }: { data: CalloutBlockData }) {
  const { icon: Icon, className } = VARIANT_STYLES[data.variant];

  return (
    <Alert
      variant={data.variant === "DANGER" ? "destructive" : "default"}
      className={cn(className)}
    >
      <Icon aria-hidden="true" />
      {data.title ? <AlertTitle>{data.title}</AlertTitle> : null}
      <AlertDescription>{data.body}</AlertDescription>
    </Alert>
  );
}
