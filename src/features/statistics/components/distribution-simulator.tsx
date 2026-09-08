"use client";

import { useDeferredValue, useMemo, useState } from "react";

import { cn } from "@/lib/utils";

import { DISTRIBUTIONS, type DistributionKind, type ParameterSpec } from "../distributions";
import type { ParameterControlData } from "../schemas";
import { defaultValues, runSimulation, runSimulation2D } from "../sampling";
import { summarize } from "../summary";
import { DistributionPlot, type PlotView } from "./distribution-plot";
import { ScatterPlot } from "./diagnostic-plots";
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

/**
 * The chart views a simulator can switch between.
 *
 * `PlotView` covers the two 1D frames `DistributionPlot` draws. The 2D
 * scatter is not a third variant of those: it plots pairs, not a density
 * over one axis, and it renders to canvas rather than SVG — so it is a
 * peer here rather than a member of `PlotView`, and `ScatterPlot` draws
 * it. The block schema binds `SCATTER_2D` to UNIFORM, which is M2.5's
 * workspace and the only Phase 1 use.
 */
export type SimulatorView = PlotView | "SCATTER_2D";

/** Enum values are storage; these are what a learner reads on the button. */
const VIEW_LABELS: Record<SimulatorView, string> = {
  PDF: "Density",
  CDF: "Cumulative",
  SCATTER_2D: "2D workspace",
};

export interface DistributionSimulatorProps {
  kind: DistributionKind;
  title: string;
  /** What the learner should notice — required by the block schema. */
  prompt: string;
  seed?: number;
  binCount?: number;
  initialSampleCount?: number;
  /**
   * Offers a "Draw again" button: a new sample from the same model at the
   * same n. See `allowResample` on the block schema for why this is a
   * first-class control rather than something a slider could stand in for.
   */
  allowResample?: boolean;
  /**
   * The lesson's own control declarations, keyed by parameter.
   *
   * WHY THESE ARE NOT IGNORED
   *
   * The registry declares what a parameter *is* — sigma exists, it is a
   * standard deviation, it cannot be negative. A block declares what this
   * lesson wants of it: a workspace slider that runs 0 to 3 metres and
   * starts at 2.5, not the registry's general-purpose -5 to 5 starting at
   * 1. Both are legitimate and neither can replace the other, so the
   * effective spec is the registry entry with the authored control laid
   * over it.
   *
   * Dropping these was a real defect, not a simplification: M2.5's prose
   * describes a 2.5-metre-square room and the simulator opened on a
   * 1-metre one, with a slider that would take a learner to -5 m.
   */
  controls?: readonly ParameterControlData[];
  /** Pins the x-axis, so several simulators can share axes. */
  domain?: readonly [number, number];
  views?: readonly SimulatorView[];
  unit?: string;
  xLabel?: string;
  className?: string;
}

function formatBound(value: number): string {
  return Number.isFinite(value) ? Number(value.toPrecision(3)).toString() : "?";
}

export function DistributionSimulator({
  kind,
  title,
  prompt,
  seed = 42,
  binCount = 40,
  initialSampleCount,
  allowResample = false,
  controls = [],
  domain,
  views = ["PDF"],
  unit,
  xLabel,
  className,
}: DistributionSimulatorProps) {
  const spec = DISTRIBUTIONS[kind];

  // Registry entry overlaid with the lesson's control, per parameter. Built
  // once from props rather than per render: this is a pure function of the
  // block payload, which does not change while the lesson is open.
  const { effectiveSpecs, sampleCountSpec, lockedKeys, initialValues } = useMemo(() => {
    const byKey = new Map(controls.map((control) => [control.key, control]));

    return {
      effectiveSpecs: spec.parameters.map((parameter): ParameterSpec => {
        const control = byKey.get(parameter.key);
        if (!control) return parameter;

        return {
          ...parameter,
          label: control.label,
          unit: control.unit ?? parameter.unit,
          suggestedMin: control.min,
          suggestedMax: control.max,
          suggestedStep: control.step,
          defaultValue: control.default,
        };
      }),
      // `n` is a control an author may declare (the block schema exempts it
      // from the registry check for exactly this reason), so it is overlaid
      // the same way. A lesson that pins n at 30 to make small-sample
      // instability the subject has to be able to say so.
      sampleCountSpec: ((): ParameterSpec => {
        const control = byKey.get(SAMPLE_COUNT_PARAMETER.key);
        if (!control) return SAMPLE_COUNT_PARAMETER;

        return {
          ...SAMPLE_COUNT_PARAMETER,
          label: control.label,
          suggestedMin: control.min,
          suggestedMax: control.max,
          suggestedStep: control.step,
          defaultValue: control.default,
        };
      })(),
      lockedKeys: new Set(
        controls.filter((control) => control.locked).map((control) => control.key)
      ),
      initialValues: {
        ...defaultValues(kind),
        ...Object.fromEntries(
          controls
            .filter((control) => byKey.has(control.key))
            .map((control) => [control.key, control.default])
        ),
      },
    };
  }, [kind, spec, controls]);

  const [values, setValues] = useState<Record<string, number>>(() => initialValues);
  const [sampleCount, setSampleCount] = useState(
    initialSampleCount ?? sampleCountSpec.defaultValue
  );

  // Bumped by "Draw again". Added to the block's seed rather than replacing
  // it, so a lesson quoting the numbers from its first draw still gets them
  // on load — reproducibility (spec §47) survives the button existing.
  const [redraw, setRedraw] = useState(0);
  const effectiveSeed = seed + redraw;
  const [view, setView] = useState<SimulatorView>(views[0] ?? "PDF");

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
        seed: effectiveSeed,
        binCount,
        domain,
      }),
    [kind, deferredValues, deferredSampleCount, effectiveSeed, binCount, domain]
  );

  // Only drawn when the learner is actually looking at it. The 2D draw
  // consumes two samples per point, so computing it alongside every PDF
  // render would double the sampling cost of a simulator that never shows
  // a scatter (§26).
  const isScatter = view === "SCATTER_2D";
  const scatter = useMemo(
    () =>
      isScatter
        ? runSimulation2D({
            kind,
            values: deferredValues,
            sampleCount: deferredSampleCount,
            seed: effectiveSeed,
            binCount,
            domain,
          })
        : null,
    [isScatter, kind, deferredValues, deferredSampleCount, effectiveSeed, binCount, domain]
  );

  // §24 calls the statistics panel "the accessible content of the figure",
  // so in the scatter view it has to describe the scatter rather than a
  // separate 1D draw the learner cannot see. The x marginal is what a
  // reader would compute off the horizontal axis; y is an independent
  // draw from the same distribution, which is the lesson's whole point
  // and is said in the note beside it rather than left to be inferred.
  const summaryResult = useMemo(
    () =>
      scatter && !scatter.error
        ? { ...result, summary: summarize(scatter.points.map((point) => point.x)) }
        : result,
    [result, scatter]
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
                  {VIEW_LABELS[candidate]}
                </button>
              ))}
            </div>
          ) : null}

          {view === "SCATTER_2D" ? (
            scatter === null || scatter.error ? (
              <p role="status" className="text-destructive text-body-sm">
                {scatter?.error ?? "This view is unavailable."}
              </p>
            ) : (
              <ScatterPlot
                points={scatter.points}
                domain={scatter.domain}
                xLabel={xLabel ?? "x"}
                yLabel="y"
                // The accessible name carries the DATA, not the picture:
                // a canvas is opaque to assistive technology, so the
                // bounds and the count are the figure's whole content for
                // a screen-reader user (`ScatterCanvas`, §24).
                label={`${scatter.points.length.toLocaleString()} points, each drawn from two independent ${spec.label.toLowerCase()} draws over ${formatBound(
                  scatter.support[0]
                )} to ${formatBound(scatter.support[1])}${
                  unit ? ` ${unit}` : ""
                } on both axes, plotted on fixed axes running ${formatBound(
                  scatter.domain[0]
                )} to ${formatBound(scatter.domain[1])}${unit ? ` ${unit}` : ""}.`}
                description="Two independent 1D draws, plotted as one 2D point. Look for even coverage: clusters, gaps or an edge the points avoid would each mean something other than uniform is happening."
              />
            )
          ) : (
            <DistributionPlot
              result={result}
              view={view}
              showHistogram={view === "PDF"}
              showMean={view === "PDF"}
              xLabel={xLabel}
              distributionLabel={spec.label}
            />
          )}
        </div>

        <div className="min-w-0">
          <div className="flex flex-col gap-4">
            {effectiveSpecs.map((parameter) => (
              <ParameterControl
                key={parameter.key}
                parameter={parameter}
                value={values[parameter.key] ?? parameter.defaultValue}
                locked={lockedKeys.has(parameter.key)}
                onChange={handleChange}
              />
            ))}

            <ParameterControl
              parameter={sampleCountSpec}
              value={sampleCount}
              locked={lockedKeys.has(sampleCountSpec.key)}
              onChange={(_key, value) => setSampleCount(value)}
            />

            {allowResample ? (
              <div>
                <button
                  type="button"
                  onClick={() => setRedraw((count) => count + 1)}
                  className="border-border hover:bg-accent rounded-md border px-3 py-1.5 text-body-sm"
                >
                  Draw again
                </button>
                <p className="text-muted-foreground mt-1.5 text-caption">
                  Same model, same number of samples, different draw. Draw
                  {redraw > 0 ? ` ${redraw + 1}` : " 1"}.
                </p>
              </div>
            ) : null}
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
            <StatisticalSummary result={summaryResult} unit={unit} />
            {isScatter ? (
              <p className="text-muted-foreground mt-2 text-caption">
                These describe the horizontal axis. The vertical axis is an
                independent draw from the same distribution — the scatter is
                two 1D processes, not one 2D one.
              </p>
            ) : null}
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
