import { cn } from "@/lib/utils";

import type { SimulationResult } from "../sampling";

/**
 * The sample's statistics as text, beside the chart.
 *
 * NOT a caption and not a debug readout — this is the accessible content
 * of the figure. §24 requires the chart to be usable without seeing it,
 * and the same principle drove `SeriesTone` never being the only channel
 * distinguishing two series in the charting layer. A learner using a
 * screen reader gets these numbers; a learner who can see the chart gets
 * them too, because reading a mean off a histogram by eye is exactly the
 * imprecision this course is trying to remove.
 *
 * Showing the theoretical value beside the sampled one is the course's
 * central comparison (spec §59: expected vs measured, then the
 * difference). It is not optional decoration — M1.6, M3.6 and M3.7 are
 * built on the gap between these two columns.
 *
 * No `"use client"`: this renders numbers. It is a Server Component when
 * the caller is one, and stays out of the client bundle for a static
 * figure (§7, §26).
 */

export interface StatisticalSummaryProps {
  result: SimulationResult;
  /** Appended to every value, e.g. "m". */
  unit?: string;
  /** Hides the theoretical column for a lesson comparing two samples. */
  showTheoretical?: boolean;
  className?: string;
}

/** Four significant figures: enough to see sampling variability move. */
function formatValue(value: number, unit?: string): string {
  if (!Number.isFinite(value)) return "—";

  const text =
    Math.abs(value) >= 1e5 || (Math.abs(value) < 1e-3 && value !== 0)
      ? value.toExponential(2)
      : Number(value.toPrecision(4)).toString();

  return unit ? `${text} ${unit}` : text;
}

export function StatisticalSummary({
  result,
  unit,
  showTheoretical = true,
  className,
}: StatisticalSummaryProps) {
  const { summary, theoretical } = result;

  const rows = [
    {
      label: "Mean",
      sampled: summary.mean,
      theoretical: theoretical.mean,
      unit,
    },
    {
      label: "Standard deviation",
      sampled: summary.standardDeviation,
      theoretical: theoretical.standardDeviation,
      unit,
    },
    {
      label: "Variance",
      sampled: summary.variance,
      theoretical: theoretical.variance,
      // Variance is in squared units; saying so is the M1.5 teaching point
      // about why sigma rather than sigma^2 is the number engineers quote.
      unit: unit ? `${unit}²` : undefined,
    },
    { label: "Median", sampled: summary.median, theoretical: null, unit },
    { label: "Minimum", sampled: summary.min, theoretical: null, unit },
    { label: "Maximum", sampled: summary.max, theoretical: null, unit },
  ];

  return (
    <table className={cn("w-full text-left text-body-sm", className)}>
      <caption className="text-muted-foreground mb-2 text-caption">
        {summary.count.toLocaleString()} samples
        {showTheoretical ? " — sampled against what the model predicts" : ""}
      </caption>
      <thead>
        <tr className="text-muted-foreground text-caption">
          <th scope="col" className="pb-1 font-medium">
            Statistic
          </th>
          <th scope="col" className="pb-1 text-right font-medium">
            Sampled
          </th>
          {showTheoretical ? (
            <th scope="col" className="pb-1 text-right font-medium">
              Model
            </th>
          ) : null}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.label} className="border-border/60 border-t">
            <th scope="row" className="py-1 font-normal">
              {row.label}
            </th>
            {/* tabular-nums stops the column jittering as a slider moves —
                the one place a digit-width change reads as motion. */}
            <td className="py-1 text-right tabular-nums">
              {formatValue(row.sampled, row.unit)}
            </td>
            {showTheoretical ? (
              <td className="text-muted-foreground py-1 text-right tabular-nums">
                {row.theoretical === null ? "—" : formatValue(row.theoretical, row.unit)}
              </td>
            ) : null}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
