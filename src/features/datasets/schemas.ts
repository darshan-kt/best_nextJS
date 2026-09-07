import { z } from "zod";

import { mediaSrcSchema } from "@/features/learning/schemas";
import { distributionKindSchema } from "@/features/statistics/schemas";

/**
 * `Dataset` and `DATASET_EXPLORER` validation
 * (PHASE_1A_ARCHITECTURE.md §18.3).
 *
 * Split in two, mirroring how `SPEC_TABLE` already works: the BLOCK
 * payload carries only view configuration, and the DATASET ROW carries the
 * data and its provenance. That split is what lets M3.9 render one dataset
 * three ways — histogram, empirical CDF, Q-Q — without copying a number,
 * and what stops the capstone's citation of a dataset drifting from the
 * lesson's.
 *
 * `columns` and `provenance` are Json columns, so they are external input
 * on read and validated here rather than trusted (§9).
 */

export const datasetLevelSchema = z.enum(["SYNTHETIC", "RECORDED", "PHYSICAL"]);
export type DatasetLevel = z.infer<typeof datasetLevelSchema>;

export const datasetFormatSchema = z.enum(["CSV", "JSON"]);

export const datasetColumnSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  unit: z.string().optional(),
  kind: z.enum(["NUMERIC", "TIMESTAMP", "CATEGORICAL"]),
});
export type DatasetColumn = z.infer<typeof datasetColumnSchema>;

/**
 * Spec §47. Required for RECORDED and PHYSICAL: a recorded dataset with no
 * provenance is an unreproducible number, which is exactly what this
 * course teaches learners not to trust.
 */
export const datasetProvenanceSchema = z.object({
  collectedAt: z.string().min(1),
  robotConfiguration: z.string().min(1),
  sensor: z.string().min(1),
  sensorConfiguration: z.string().min(1),
  environment: z.string().min(1),
  samplingRateHz: z.number().positive(),
  durationSeconds: z.number().positive(),
  ros2Distro: z.string().min(1),
  pythonVersion: z.string().min(1),
  packages: z
    .array(z.object({ name: z.string().min(1), version: z.string().min(1) }))
    .min(1),
  /** What could be wrong with this data. Required — spec §45. */
  knownLimitations: z.array(z.string().min(1)).min(1),
});
export type DatasetProvenance = z.infer<typeof datasetProvenanceSchema>;

export const datasetColumnsSchema = z.array(datasetColumnSchema).min(1);

/**
 * Write-boundary shape for a `Dataset` row (the seed validates against
 * this, as `hardwareDeviceInputSchema` does for devices).
 */
export const datasetInputSchema = z
  .object({
    slug: z
      .string()
      .min(1)
      .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Must be a lowercase, hyphenated slug"),
    title: z.string().min(1),
    summary: z.string().min(1),
    level: datasetLevelSchema,
    sourceUri: mediaSrcSchema,
    format: datasetFormatSchema,
    sampleCount: z.int().positive(),
    checksumSha256: z
      .string()
      .regex(/^[0-9a-f]{64}$/, "Must be a lowercase hex SHA-256 digest"),
    columns: datasetColumnsSchema,
    provenance: datasetProvenanceSchema.optional(),
  })
  .refine((dataset) => dataset.level === "SYNTHETIC" || dataset.provenance !== undefined, {
    message: "RECORDED and PHYSICAL datasets require provenance",
    path: ["provenance"],
  });
export type DatasetInput = z.infer<typeof datasetInputSchema>;

/* ------------------------------------------------ DATASET_EXPLORER block -- */

export const datasetViewSchema = z.enum([
  "TABLE_PREVIEW",
  "HISTOGRAM",
  "ECDF",
  "QQ_PLOT",
  "SUMMARY_STATS",
  "TIME_SERIES",
  "SCATTER_2D",
]);
export type DatasetView = z.infer<typeof datasetViewSchema>;

export const datasetExplorerBlockSchema = z
  .object({
    title: z.string().min(1),
    prompt: z.string().min(1),
    /**
     * Which column this block analyses. Cross-checked against the
     * referenced dataset's own `columns` in `learning/queries.ts` — a block
     * naming a column the dataset does not have degrades to INVALID rather
     * than rendering an empty chart (§28).
     */
    valueColumn: z.string().min(1),
    /** The y-axis column for SCATTER_2D, or the time axis for TIME_SERIES. */
    secondaryColumn: z.string().optional(),
    views: z.array(datasetViewSchema).min(1),
    binCount: z.int().min(5).max(120).default(40),
    /**
     * THEORY vs SIMULATION vs REALITY on shared axes.
     *
     * A fitted overlay is a HYPOTHESIS UNDER TEST, never an assertion. The
     * renderer labels it as one, and spec §63 forbids anything else — this
     * is the field through which "don't tell students their LiDAR data is
     * Gaussian" is enforced structurally rather than editorially.
     */
    overlay: z
      .object({
        distribution: distributionKindSchema,
        parameterSource: z.enum(["FITTED_FROM_DATA", "AUTHOR_SPECIFIED"]),
        parameters: z.record(z.string(), z.number()).optional(),
        note: z.string().optional(),
      })
      .optional(),
  })
  .refine((block) => !block.views.includes("SCATTER_2D") || !!block.secondaryColumn, {
    message: "SCATTER_2D requires secondaryColumn",
    path: ["secondaryColumn"],
  })
  .refine((block) => !block.views.includes("TIME_SERIES") || !!block.secondaryColumn, {
    message: "TIME_SERIES requires secondaryColumn (the time axis)",
    path: ["secondaryColumn"],
  })
  .refine(
    (block) =>
      block.overlay?.parameterSource !== "AUTHOR_SPECIFIED" ||
      (block.overlay.parameters !== undefined && block.overlay.note !== undefined),
    {
      message:
        "An AUTHOR_SPECIFIED overlay requires explicit parameters and a note explaining why they were not fitted",
      path: ["overlay"],
    }
  );

export type DatasetExplorerBlockData = z.infer<typeof datasetExplorerBlockSchema>;
