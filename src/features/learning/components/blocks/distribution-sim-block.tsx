import {
  DistributionPlot,
  DistributionSimulator,
  StatisticalSummary,
  type SimulatorView,
} from "@/features/statistics/components";
import { ScatterPlot } from "@/features/statistics/components/diagnostic-plots";
import { DISTRIBUTIONS } from "@/features/statistics/distributions";
import { runSimulation, runSimulation2D } from "@/features/statistics/sampling";
import type {
  DistributionSimBlockData,
  DistributionView,
} from "@/features/statistics/schemas";

/**
 * `DISTRIBUTION_SIM` adapter — block payload to component props.
 *
 * Thin by design, like every other file in this directory: the block's job
 * is to translate validated JSON into the props a feature component
 * already accepts, not to contain behaviour.
 *
 * The one decision it makes is the interactive/static split, and that
 * split is why this file matters. A theory lesson's figure
 * (`interactive: false`) needs to be numerically exact but not touchable,
 * so it renders through `DistributionPlot` — a Server Component — and
 * ships no JavaScript at all. Only `interactive: true` reaches
 * `DistributionSimulator`, which is where the client boundary begins. A
 * lesson with six static figures and one simulator therefore pays for one
 * simulator (§7, §26).
 *
 * VIEWS
 *
 * `views` is a wider vocabulary than "which chart to draw". HISTOGRAM and
 * THEORETICAL_OVERLAY are layers of the density chart rather than charts
 * of their own, and SUMMARY_STATS is the numbers panel — so only PDF, CDF
 * and SCATTER_2D become switchable views, and the rest are read as flags.
 * Order is preserved, so a block listing SCATTER_2D first opens on the
 * workspace. This translation used to hardcode `["PDF"]` / `["PDF","CDF"]`,
 * which silently discarded SCATTER_2D — the one view M2.5 is built on.
 */

/** The subset of authored views that is a chart the simulator can switch to. */
const SWITCHABLE_VIEWS = ["PDF", "CDF", "SCATTER_2D"] as const;

function toSimulatorViews(views: readonly DistributionView[]): SimulatorView[] {
  const chosen = views.filter((view): view is SimulatorView =>
    (SWITCHABLE_VIEWS as readonly string[]).includes(view)
  );

  // A block declaring only HISTOGRAM or SUMMARY_STATS still needs a chart
  // to render; the density is the one every distribution has.
  return chosen.length > 0 ? chosen : ["PDF"];
}

export function DistributionSimBlock({ data }: { data: DistributionSimBlockData }) {
  if (data.interactive) {
    return (
      <DistributionSimulator
        kind={data.distribution}
        title={data.title}
        prompt={data.prompt}
        seed={data.seed}
        binCount={data.binCount}
        controls={data.controls}
        allowResample={data.allowResample}
        domain={data.xDomain}
        views={toSimulatorViews(data.views)}
        unit={data.unit}
        xLabel={data.xLabel}
      />
    );
  }

  // Static: computed here on the server, from the block's own declared
  // defaults. Deterministic via the block's seed, so the figure a learner
  // sees is the figure the lesson prose describes.
  const values = Object.fromEntries(
    data.controls.map((control) => [control.key, control.default])
  );
  const simulationInput = {
    kind: data.distribution,
    values,
    sampleCount: data.maxSamples,
    seed: data.seed,
    binCount: data.binCount,
    domain: data.xDomain,
  };

  const result = runSimulation(simulationInput);

  /**
   * The registry's human label, not the enum lowercased.
   *
   * This path used to render `data.distribution.toLowerCase()` into the
   * chart's accessible name, which reads acceptably for the first three
   * kinds ("gaussian density...") and badly for anything whose enum value
   * is not already a word: IRWIN_HALL would announce "irwin_hall density"
   * to a screen-reader user. The interactive path has always used
   * `spec.label`; these two now produce the same string.
   */
  const distributionLabel = DISTRIBUTIONS[data.distribution].label.toLowerCase();

  // A static SCATTER_2D is a legitimate figure — the workspace picture in
  // a theory lesson, with no sliders. It is the one static view that still
  // reaches a client boundary, because `ScatterCanvas` draws to canvas;
  // the points themselves are computed here on the server from the block's
  // own seed, so the figure is still the one the prose describes.
  const scatter = data.views.includes("SCATTER_2D")
    ? runSimulation2D(simulationInput)
    : null;

  return (
    <figure className="border-border bg-card m-0 rounded-lg border p-4 sm:p-6">
      <figcaption className="mb-3">
        <span className="text-title-sm block">{data.title}</span>
        <span className="text-muted-foreground mt-1 block text-body-sm">
          {data.prompt}
        </span>
      </figcaption>

      {scatter && !scatter.error ? (
        <ScatterPlot
          points={scatter.points}
          domain={scatter.domain}
          xLabel={data.xLabel ?? "x"}
          yLabel="y"
          label={`${scatter.points.length.toLocaleString()} points, each drawn from two independent ${distributionLabel} draws over ${scatter.support[0]} to ${scatter.support[1]}${
            data.unit ? ` ${data.unit}` : ""
          } on both axes.`}
          description="Two independent 1D draws, plotted as one 2D point."
        />
      ) : (
        <DistributionPlot
          result={result}
          view={data.views.includes("CDF") && !data.views.includes("PDF") ? "CDF" : "PDF"}
          showHistogram={data.views.includes("HISTOGRAM")}
          xLabel={data.xLabel}
          distributionLabel={distributionLabel}
        />
      )}

      {data.views.includes("SUMMARY_STATS") ? (
        <div className="mt-4">
          <StatisticalSummary result={result} unit={data.unit} />
        </div>
      ) : null}
    </figure>
  );
}
