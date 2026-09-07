import {
  DistributionPlot,
  DistributionSimulator,
  StatisticalSummary,
} from "@/features/statistics/components";
import { runSimulation } from "@/features/statistics/sampling";
import type { DistributionSimBlockData } from "@/features/statistics/schemas";

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
 */
export function DistributionSimBlock({ data }: { data: DistributionSimBlockData }) {
  if (data.interactive) {
    return (
      <DistributionSimulator
        kind={data.distribution}
        title={data.title}
        prompt={data.prompt}
        seed={data.seed}
        binCount={data.binCount}
        lockedParameters={data.controls
          .filter((control) => control.locked)
          .map((control) => control.key)}
        domain={data.xDomain}
        views={data.views.includes("CDF") ? ["PDF", "CDF"] : ["PDF"]}
        unit={data.unit}
        xLabel={data.xLabel}
      />
    );
  }

  // Static: computed here on the server, from the block's own declared
  // defaults. Deterministic via the block's seed, so the figure a learner
  // sees is the figure the lesson prose describes.
  const result = runSimulation({
    kind: data.distribution,
    values: Object.fromEntries(
      data.controls.map((control) => [control.key, control.default])
    ),
    sampleCount: data.maxSamples,
    seed: data.seed,
    binCount: data.binCount,
    domain: data.xDomain,
  });

  return (
    <figure className="border-border bg-card m-0 rounded-lg border p-4 sm:p-6">
      <figcaption className="mb-3">
        <span className="text-title-sm block">{data.title}</span>
        <span className="text-muted-foreground mt-1 block text-body-sm">
          {data.prompt}
        </span>
      </figcaption>

      <DistributionPlot
        result={result}
        view={data.views.includes("CDF") && !data.views.includes("PDF") ? "CDF" : "PDF"}
        showHistogram={data.views.includes("HISTOGRAM")}
        xLabel={data.xLabel}
        distributionLabel={data.distribution.toLowerCase()}
      />

      {data.views.includes("SUMMARY_STATS") ? (
        <div className="mt-4">
          <StatisticalSummary result={result} unit={data.unit} />
        </div>
      ) : null}
    </figure>
  );
}
