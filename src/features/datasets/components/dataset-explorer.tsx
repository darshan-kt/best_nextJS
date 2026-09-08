import {
  DistributionPlot,
  StatisticalSummary,
} from "@/features/statistics/components";
import { EcdfPlot, QqPlot, ScatterPlot } from "@/features/statistics/components/diagnostic-plots";
import { DISTRIBUTIONS } from "@/features/statistics/distributions";
import { histogram, summarize } from "@/features/statistics/summary";
import type { SimulationResult } from "@/features/statistics/sampling";

import { tryLoadDatasetPayload } from "../loader";
import type { DatasetDetail, } from "../queries";
import type { DatasetExplorerBlockData } from "../schemas";

/**
 * Renders a real dataset: preview, histogram, empirical CDF, Q-Q plot,
 * summary statistics, 2D scatter, time series. That list is every member
 * of `datasetViewSchema` — keep it that way, because a view the schema
 * accepts and this file ignores fails silently rather than loudly.
 *
 * An async Server Component. The file is read and parsed on the server
 * (see `loader.ts`), so a lesson analysing 5,000 LiDAR readings ships the
 * rendered SVG rather than the samples plus a parser (§7, §26).
 *
 * THE OVERLAY IS A HYPOTHESIS, NOT A CONCLUSION
 *
 * Spec §63 forbids telling a learner their sensor data follows a
 * distribution. So a fitted curve here is always labelled as a candidate
 * being tested, the parameters' provenance is stated (fitted from this
 * data, or pinned by the author), and no goodness-of-fit verdict is
 * rendered anywhere. The learner reads the diagnostics and decides — that
 * is the assessed skill in M3.11 and M4.8.
 */

export interface DatasetExplorerProps {
  dataset: DatasetDetail;
  data: DatasetExplorerBlockData;
}

export async function DatasetExplorer({ dataset, data }: DatasetExplorerProps) {
  const payload = await tryLoadDatasetPayload(
    dataset.sourceUri,
    dataset.format,
    dataset.columns
  );

  if (!payload) {
    return (
      <section className="border-border bg-card rounded-lg border p-4" role="status">
        <h3 className="text-title-sm">{data.title}</h3>
        <p className="text-muted-foreground mt-2 text-body-sm">
          This dataset could not be loaded. The lesson text above still applies;
          the analysis below is unavailable.
        </p>
      </section>
    );
  }

  const values = payload.series[data.valueColumn] ?? [];
  const secondary = data.secondaryColumn
    ? (payload.series[data.secondaryColumn] ?? [])
    : [];

  const column = dataset.columns.find((candidate) => candidate.key === data.valueColumn);
  const secondaryColumn = dataset.columns.find(
    (candidate) => candidate.key === data.secondaryColumn
  );
  const unit = column?.unit;
  const summary = summarize(values);

  // Drift detection, surfaced rather than logged: if the file no longer
  // matches the checksum the row recorded, every number below is computed
  // from something other than what was reviewed (PHASE_1A §10).
  const checksumMatches = payload.checksumSha256 === dataset.checksumSha256;

  const overlaySpec = data.overlay ? DISTRIBUTIONS[data.overlay.distribution] : null;
  const overlayParams =
    data.overlay && overlaySpec
      ? data.overlay.parameterSource === "FITTED_FROM_DATA"
        ? (overlaySpec.fit(values) as unknown as Record<string, number>)
        : (data.overlay.parameters ?? {})
      : null;

  const domain: [number, number] = [
    Number.isFinite(summary.min) ? summary.min : 0,
    Number.isFinite(summary.max) ? summary.max : 1,
  ];

  // Reuses `DistributionPlot` rather than a second histogram renderer: the
  // shape it draws (density bars under a model curve) is exactly what a
  // fitted overlay needs, and a parallel implementation would be the
  // duplication §34 warns about.
  const asSimulationResult: SimulationResult = {
    error: null,
    samples: [...values],
    summary,
    bins: histogram(values, data.binCount, domain),
    pdfCurve:
      overlaySpec && overlayParams
        ? Array.from({ length: 200 }, (_, index) => {
            const x = domain[0] + (index / 199) * (domain[1] - domain[0]);
            return { x, y: overlaySpec.pdf(x, overlayParams as never) };
          })
        : [],
    cdfCurve: [],
    ecdfPoints: [],
    qqPairs: [],
    domain,
    theoretical:
      overlaySpec && overlayParams
        ? {
            mean: overlaySpec.mean(overlayParams as never),
            variance: overlaySpec.variance(overlayParams as never),
            standardDeviation: Math.sqrt(overlaySpec.variance(overlayParams as never)),
          }
        : { mean: Number.NaN, variance: Number.NaN, standardDeviation: Number.NaN },
  };

  const previewRows = Math.min(8, payload.rowCount);

  return (
    <section
      className="border-border bg-card rounded-lg border p-4 sm:p-6"
      aria-label={data.title}
    >
      <header className="mb-4">
        <h3 className="text-title-sm">{data.title}</h3>
        <p className="text-muted-foreground mt-1 text-body-sm">{data.prompt}</p>
        <p className="text-muted-foreground mt-2 text-caption">
          {dataset.title} — {payload.rowCount.toLocaleString()} samples,{" "}
          {dataset.level === "SYNTHETIC"
            ? "mathematically generated"
            : dataset.level === "RECORDED"
              ? "recorded from a real robot"
              : "collected by a learner"}
          {dataset.hardwareDevice ? ` (${dataset.hardwareDevice.name})` : ""}.
        </p>
        {!checksumMatches ? (
          <p role="alert" className="text-destructive mt-2 text-caption">
            This dataset file no longer matches the checksum recorded for it.
            The figures below may not be the reviewed data.
          </p>
        ) : null}
      </header>

      <div className="flex flex-col gap-6">
        {data.views.includes("TABLE_PREVIEW") ? (
          <div className="overflow-x-auto">
            <table className="text-body-sm w-full">
              <caption className="text-muted-foreground mb-2 text-left text-caption">
                First {previewRows} of {payload.rowCount.toLocaleString()} rows.
              </caption>
              <thead>
                <tr className="text-muted-foreground text-caption">
                  {dataset.columns.map((candidate) => (
                    <th key={candidate.key} scope="col" className="pb-1 pr-4 text-left font-medium">
                      {candidate.label}
                      {candidate.unit ? ` (${candidate.unit})` : ""}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: previewRows }, (_, row) => (
                  <tr key={row} className="border-border/60 border-t">
                    {dataset.columns.map((candidate) => (
                      <td key={candidate.key} className="py-1 pr-4 tabular-nums">
                        {payload.series[candidate.key]?.[row] ?? "—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {data.views.includes("HISTOGRAM") ? (
          <figure className="m-0">
            <DistributionPlot
              result={asSimulationResult}
              view="PDF"
              showHistogram
              showMean
              xLabel={column ? `${column.label}${column.unit ? ` (${column.unit})` : ""}` : undefined}
              distributionLabel={
                overlaySpec ? `candidate ${overlaySpec.label}` : "measured"
              }
            />
            {data.overlay ? (
              <figcaption className="text-muted-foreground mt-2 text-caption">
                The curve is a <strong>candidate model under test</strong>, not a
                conclusion.{" "}
                {data.overlay.parameterSource === "FITTED_FROM_DATA"
                  ? "Its parameters were estimated from this data."
                  : `Its parameters were set by the author. ${data.overlay.note ?? ""}`}
              </figcaption>
            ) : null}
          </figure>
        ) : null}

        {data.views.includes("ECDF") ? (
          <EcdfPlot
            samples={values}
            overlay={
              data.overlay && overlayParams
                ? { kind: data.overlay.distribution, params: overlayParams }
                : null
            }
            domain={domain}
            xLabel={column?.label}
            label={`Empirical cumulative distribution of ${payload.rowCount} ${
              column?.label ?? "values"
            }${data.overlay ? `, against a candidate ${data.overlay.distribution.toLowerCase()} model` : ""}.`}
          />
        ) : null}

        {data.views.includes("QQ_PLOT") && data.overlay && overlayParams ? (
          <QqPlot
            samples={values}
            kind={data.overlay.distribution}
            params={overlayParams}
            xLabel={`${data.overlay.distribution.toLowerCase()} quantile`}
            yLabel={column?.label ?? "observed"}
            label={`Quantile-quantile plot of ${payload.rowCount} measurements against a candidate ${data.overlay.distribution.toLowerCase()} model.`}
          />
        ) : null}

        {data.views.includes("SCATTER_2D") && secondary.length > 0 ? (
          <ScatterPlot
            points={values.map((x, index) => ({ x, y: secondary[index] }))}
            domain={domain}
            yDomain={[Math.min(...secondary), Math.max(...secondary)]}
            xLabel={column?.label}
            yLabel={secondaryColumn?.label}
            label={`Scatter of ${payload.rowCount} points, ${
              secondaryColumn?.label ?? "y"
            } against ${column?.label ?? "x"}.`}
            description="Look for even coverage rather than clusters or gaps — unevenness is the finding."
          />
        ) : null}

        {/*
          TIME_SERIES: the value against the clock, in the order it was
          recorded.

          `datasetViewSchema` has accepted this view since Phase 1E and
          `secondaryColumn` is *required* for it, but no branch rendered it
          until M4.2 needed one — a block could validate, seed, and then
          silently drop the only figure it existed to show. Zod cannot
          catch that: the schema describes the payload, not whether anyone
          reads it.

          Drawn as points rather than a connected line, deliberately. These
          are discrete events; a line between two of them would draw a
          value at instants when nothing happened, and M4.2's whole subject
          is that the gaps — not a continuous signal — are the quantity.
        */}
        {data.views.includes("TIME_SERIES") && secondary.length > 0 ? (
          <ScatterPlot
            points={secondary.map((t, index) => ({ x: t, y: values[index] }))}
            domain={[Math.min(...secondary), Math.max(...secondary)]}
            yDomain={domain}
            xLabel={
              secondaryColumn
                ? `${secondaryColumn.label}${secondaryColumn.unit ? ` (${secondaryColumn.unit})` : ""}`
                : undefined
            }
            yLabel={column?.label}
            label={`${payload.rowCount.toLocaleString()} values of ${
              column?.label ?? "the measurement"
            } plotted against ${secondaryColumn?.label ?? "time"}, in recorded order.`}
            description="Look for drift, bursts or a changing spread over time. A process whose behaviour changes as you watch is not one distribution."
          />
        ) : null}

        {data.views.includes("SUMMARY_STATS") ? (
          <StatisticalSummary
            result={asSimulationResult}
            unit={unit}
            showTheoretical={Boolean(data.overlay)}
          />
        ) : null}

        {dataset.provenance ? (
          <details>
            <summary className="text-body-sm cursor-pointer">
              How this data was collected
            </summary>
            <dl className="text-muted-foreground mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-caption">
              <dt>Sensor</dt>
              <dd>{dataset.provenance.sensor}</dd>
              <dt>Environment</dt>
              <dd>{dataset.provenance.environment}</dd>
              <dt>Sampling rate</dt>
              <dd>{dataset.provenance.samplingRateHz} Hz</dd>
              <dt>Duration</dt>
              <dd>{dataset.provenance.durationSeconds} s</dd>
              <dt>ROS 2</dt>
              <dd>{dataset.provenance.ros2Distro}</dd>
            </dl>
            <p className="text-muted-foreground mt-2 text-caption">
              Known limitations: {dataset.provenance.knownLimitations.join("; ")}
            </p>
          </details>
        ) : null}
      </div>
    </section>
  );
}
