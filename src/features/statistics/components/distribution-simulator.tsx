"use client";

import { useDeferredValue, useMemo, useState } from "react";

import { cn } from "@/lib/utils";

import { DISTRIBUTIONS, type DistributionKind } from "../distributions";
import { defaultValues, runSimulation } from "../sampling";
import { DistributionPlot, type PlotView } from "./distribution-plot";
import { ParameterControl, SAMPLE_COUNT_PARAMETER } from "./parameter-control";
import { StatisticalSummary } from "./statistical-summary";

/**
 * The interactive simulation (PHASE_1A_ARCHITECTURE.md §12).
 *
 * ONE COMPONENT, THREE DISTRIBUTIONS
 *
 * There is no `switch (kind)` here, in `runSimulation`, or in any
 * component below. Everything specific to a distribution — which
 * parameters exist, their ranges and defaults, the density, the CDF, the
 * sampler, the closed-form mean and variance, and the assumptions the
 * model rests on — comes from `DISTRIBUTIONS[kind]`. Uniform, Gaussian and
 * Exponential differ only in which registry entry is looked up, so a
 * fourth distribution is a registry entry plus a content module, with no
 * change to this file. That was the whole point of building the registry
 * before the UI.
 *
 * CLIENT BOUNDARY (§7, §26)
 *
 * This file and `parameter-control.tsx` are the only `"use client"`
 * modules in the simulation layer. `DistributionPlot`,
 * `StatisticalSummary` and every primitive in `components/charts/` (except
 * `ScatterCanvas`) are server-renderable, so a lesson page carrying six
 * static theory figures and one interactive simulator ships the client
 * bundle for the simulator alone. Putting the boundary here rather than at
 * the plot is what keeps that true.
 *
 * MOTION (§25)
 *
 * The chart marks deliberately do not animate. A curve that eases into
 * position while a learner drags a slider puts latency between the input
 * and the feedback, which is the opposite of what a parameter-exploration
 * lesson needs — §25's own rule is that animation should improve clarity,
 * and here it would reduce it. The only transition is a short opacity
 * settle on the statistics readout, so a large jump in the numbers is
 * noticeable rather than silent, and it is gated behind `motion-safe:` so
 * a reduced-motion preference removes it entirely.
 */

export interface DistributionSimulatorProps {
  kind: DistributionKind;
  title: string;
  /** What the learner should notice — required by the block schema. */
  prompt: string;
  seed?: number;
  binCount?: number;
  initialSampleCount?: number;
  /** Parameter keys rendered read-only, for one-idea-at-a-time lessons. */
  lockedParameters?: readonly string[];
  /** Pins the x-axis, so several simulators can share axes. */
  domain?: readonly [number, number];
  views?: readonly PlotView[];
  unit?: string;
  xLabel?: string;
  className?: string;
}

export function DistributionSimulator({
  kind,
  title,
  prompt,
  seed = 42,
  binCount = 40,
  initialSampleCount = SAMPLE_COUNT_PARAMETER.defaultValue,
  lockedParameters = [],
  domain,
  views = ["PDF"],
  unit,
  xLabel,
  className,
}: DistributionSimulatorProps) {
  const spec = DISTRIBUTIONS[kind];

  const [values, setValues] = useState<Record<string, number>>(() => defaultValues(kind));
  const [sampleCount, setSampleCount] = useState(initialSampleCount);
  const [view, setView] = useState<PlotView>(views[0] ?? "PDF");

  // Dragging a slider produces many changes per second. Deferring the
  // recompute keeps the control itself responsive and lets React drop
  // intermediate frames rather than queueing a full resample for each one
  // (§26). The slider still moves at full rate; only the chart lags, and
  // only under load.
  const deferredValues = useDeferredValue(values);
  const deferredSampleCount = useDeferredValue(sampleCount);
  const isStale = deferredValues !== values || deferredSampleCount !== sampleCount;

  const result = useMemo(
    () =>
      runSimulation({
        kind,
        values: deferredValues,
        sampleCount: deferredSampleCount,
        seed,
        binCount,
        domain,
      }),
    [kind, deferredValues, deferredSampleCount, seed, binCount, domain]
  );

  const handleChange = (key: string, value: number) =>
    setValues((current) => ({ ...current, [key]: value }));

  return (
    <section
      className={cn("border-border bg-card rounded-lg border p-4 sm:p-6", className)}
      aria-label={title}
    >
      <header className="mb-4">
        <h3 className="text-title-sm">{title}</h3>
        <p className="text-muted-foreground mt-1 text-body-sm">{prompt}</p>
      </header>

      {/* Stacked on mobile, side by side from `md`. The chart keeps the
          larger share, since it is the thing being explored (§23). */}
      <div className="grid gap-6 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="min-w-0">
          {views.length > 1 ? (
            <div role="group" aria-label="Chart view" className="mb-3 flex gap-2">
              {views.map((candidate) => (
                <button
                  key={candidate}
                  type="button"
                  aria-pressed={view === candidate}
                  onClick={() => setView(candidate)}
                  className={cn(
                    "border-border rounded-md border px-3 py-1 text-body-sm",
                    view === candidate
                      ? "bg-primary text-primary-foreground border-primary"
                      : "hover:bg-accent"
                  )}
                >
                  {candidate}
                </button>
              ))}
            </div>
          ) : null}

          <DistributionPlot
            result={result}
            view={view}
            showHistogram={view === "PDF"}
            showMean={view === "PDF"}
            xLabel={xLabel}
            distributionLabel={spec.label}
          />
        </div>

        <div className="min-w-0">
          <div className="flex flex-col gap-4">
            {spec.parameters.map((parameter) => (
              <ParameterControl
                key={parameter.key}
                parameter={parameter}
                value={values[parameter.key] ?? parameter.defaultValue}
                locked={lockedParameters.includes(parameter.key)}
                onChange={handleChange}
              />
            ))}

            <ParameterControl
              parameter={SAMPLE_COUNT_PARAMETER}
              value={sampleCount}
              onChange={(_key, value) => setSampleCount(value)}
            />
          </div>

          <div
            className={cn(
              "mt-6",
              // The only motion in the component, and it is removed
              // entirely under a reduced-motion preference.
              "motion-safe:transition-opacity motion-safe:duration-150",
              isStale && "opacity-60"
            )}
          >
            <StatisticalSummary result={result} unit={unit} />
          </div>

          <details className="mt-4">
            <summary className="text-body-sm cursor-pointer">
              What this model assumes
            </summary>
            {/* Straight from the registry: spec §63 requires assumptions to
                be visible, so every simulation carries them rather than
                relying on the surrounding prose to remember. */}
            <ul className="text-muted-foreground mt-2 list-disc space-y-1 pl-5 text-caption">
              {spec.framing.assumptions.map((assumption) => (
                <li key={assumption}>{assumption}</li>
              ))}
            </ul>
          </details>
        </div>
      </div>
    </section>
  );
}
