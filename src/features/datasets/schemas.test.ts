import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  datasetExplorerBlockSchema,
  datasetInputSchema,
  datasetViewSchema,
} from "./schemas";

/**
 * Dataset and `DATASET_EXPLORER` validation, following the adversarial
 * pattern in `features/learning/schemas.test.ts`.
 *
 * The two refinements worth the most here are the provenance requirement
 * and the AUTHOR_SPECIFIED overlay rule: both exist to stop a dataset or a
 * fitted curve being presented without saying where it came from, which is
 * the course's central scientific commitment (spec §45, §63), not a
 * formatting preference.
 */

const PROVENANCE = {
  collectedAt: "2026-09-01",
  robotConfiguration: "Stationary, motors disabled",
  sensor: "RPLIDAR A2",
  sensorConfiguration: "10 Hz, default baud",
  environment: "Indoor, matte drywall at 2.00 m",
  samplingRateHz: 10,
  durationSeconds: 500,
  ros2Distro: "jazzy",
  pythonVersion: "3.12",
  packages: [{ name: "numpy", version: "2.1.0" }],
  knownLimitations: ["Single distance only; no temperature control."],
};

const VALID_DATASET = {
  slug: "rplidar-wall-2m",
  title: "RPLIDAR wall readings at 2 m",
  summary: "Five thousand range readings of a stationary wall.",
  level: "RECORDED",
  sourceUri: "/datasets/statistics-robotics/rplidar-wall-2m.csv",
  format: "CSV",
  sampleCount: 5000,
  checksumSha256: "a".repeat(64),
  columns: [{ key: "range_m", label: "Range", unit: "m", kind: "NUMERIC" }],
  provenance: PROVENANCE,
};

describe("datasetInputSchema", () => {
  it("accepts a complete recorded dataset", () => {
    expect(datasetInputSchema.safeParse(VALID_DATASET).success).toBe(true);
  });

  it("requires provenance for RECORDED and PHYSICAL datasets", () => {
    // A recorded dataset with no provenance is an unreproducible number.
    const withoutProvenance = { ...VALID_DATASET, provenance: undefined };

    expect(datasetInputSchema.safeParse(withoutProvenance).success).toBe(false);
    expect(
      datasetInputSchema.safeParse({ ...withoutProvenance, level: "PHYSICAL" }).success
    ).toBe(false);
  });

  it("allows a SYNTHETIC dataset with no provenance", () => {
    const withoutProvenance = { ...VALID_DATASET, provenance: undefined };

    expect(
      datasetInputSchema.safeParse({ ...withoutProvenance, level: "SYNTHETIC" }).success
    ).toBe(true);
  });

  it("supports all three evidence levels", () => {
    for (const level of ["SYNTHETIC", "RECORDED", "PHYSICAL"] as const) {
      expect(
        datasetInputSchema.safeParse({ ...VALID_DATASET, level }).success
      ).toBe(true);
    }
  });

  it("requires provenance to state known limitations", () => {
    expect(
      datasetInputSchema.safeParse({
        ...VALID_DATASET,
        provenance: { ...PROVENANCE, knownLimitations: [] },
      }).success
    ).toBe(false);
  });

  it("rejects a malformed checksum", () => {
    expect(
      datasetInputSchema.safeParse({ ...VALID_DATASET, checksumSha256: "abc" }).success
    ).toBe(false);
    expect(
      datasetInputSchema.safeParse({
        ...VALID_DATASET,
        checksumSha256: "A".repeat(64),
      }).success
    ).toBe(false);
  });

  it("rejects a protocol-relative sourceUri", () => {
    // Same open-redirect-shaped value `mediaSrcSchema` already rejects.
    expect(
      datasetInputSchema.safeParse({ ...VALID_DATASET, sourceUri: "//evil/x.csv" }).success
    ).toBe(false);
  });

  it("rejects a non-slug slug and an empty column list", () => {
    expect(
      datasetInputSchema.safeParse({ ...VALID_DATASET, slug: "Not A Slug" }).success
    ).toBe(false);
    expect(
      datasetInputSchema.safeParse({ ...VALID_DATASET, columns: [] }).success
    ).toBe(false);
  });
});

const VALID_BLOCK = {
  title: "Real LiDAR, 5000 readings",
  prompt: "The fitted curve is a hypothesis. Where does the data leave it?",
  valueColumn: "range_m",
  views: ["HISTOGRAM", "ECDF"],
};

describe("datasetExplorerBlockSchema", () => {
  it("accepts a block with no overlay", () => {
    const parsed = datasetExplorerBlockSchema.safeParse(VALID_BLOCK);
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.binCount).toBe(40);
  });

  it("accepts a fitted overlay without explicit parameters", () => {
    expect(
      datasetExplorerBlockSchema.safeParse({
        ...VALID_BLOCK,
        views: ["HISTOGRAM", "QQ_PLOT"],
        overlay: { distribution: "GAUSSIAN", parameterSource: "FITTED_FROM_DATA" },
      }).success
    ).toBe(true);
  });

  it("requires parameters AND a note for an author-specified overlay", () => {
    // Pinning parameters by hand is a claim; the learner is owed the reason.
    const base = { ...VALID_BLOCK, overlay: { distribution: "GAUSSIAN" as const } };

    expect(
      datasetExplorerBlockSchema.safeParse({
        ...base,
        overlay: { ...base.overlay, parameterSource: "AUTHOR_SPECIFIED" },
      }).success
    ).toBe(false);

    expect(
      datasetExplorerBlockSchema.safeParse({
        ...base,
        overlay: {
          ...base.overlay,
          parameterSource: "AUTHOR_SPECIFIED",
          parameters: { mu: 2, sigma: 0.02 },
        },
      }).success
    ).toBe(false);

    expect(
      datasetExplorerBlockSchema.safeParse({
        ...base,
        overlay: {
          ...base.overlay,
          parameterSource: "AUTHOR_SPECIFIED",
          parameters: { mu: 2, sigma: 0.02 },
          note: "Pinned to the datasheet tolerance rather than fitted, so the lesson can contrast the two.",
        },
      }).success
    ).toBe(true);
  });

  it("requires secondaryColumn for SCATTER_2D and TIME_SERIES", () => {
    expect(
      datasetExplorerBlockSchema.safeParse({ ...VALID_BLOCK, views: ["SCATTER_2D"] }).success
    ).toBe(false);
    expect(
      datasetExplorerBlockSchema.safeParse({ ...VALID_BLOCK, views: ["TIME_SERIES"] }).success
    ).toBe(false);
    expect(
      datasetExplorerBlockSchema.safeParse({
        ...VALID_BLOCK,
        views: ["SCATTER_2D"],
        secondaryColumn: "target_y",
      }).success
    ).toBe(true);
  });

  it("rejects an empty prompt, title, valueColumn or view list", () => {
    expect(datasetExplorerBlockSchema.safeParse({ ...VALID_BLOCK, prompt: "" }).success).toBe(false);
    expect(datasetExplorerBlockSchema.safeParse({ ...VALID_BLOCK, title: "" }).success).toBe(false);
    expect(datasetExplorerBlockSchema.safeParse({ ...VALID_BLOCK, valueColumn: "" }).success).toBe(false);
    expect(datasetExplorerBlockSchema.safeParse({ ...VALID_BLOCK, views: [] }).success).toBe(false);
  });

  /**
   * VIEW COVERAGE — the `DATASET_EXPLORER` counterpart to
   * `block-renderer.test.ts`'s block-type coverage, and it exists because
   * the same hole opened here.
   *
   * `datasetViewSchema` gained `TIME_SERIES` in Phase 1E. `DatasetExplorer`
   * never grew a branch for it, and nothing failed: the schema validated
   * the payload, the seed wrote the row, and the renderer drew every OTHER
   * view in the list while silently dropping that one. A block whose whole
   * purpose was the time series would have shipped showing a table and a
   * summary, and the first person to notice would have been a learner.
   *
   * Zod cannot close this. It describes what a payload may contain, not
   * whether anything reads it. So, like the block-type test, this reads the
   * renderer's source and insists every view the schema admits is named
   * there. Blunt, and fails for exactly the right reason.
   */
  it("renders every view datasetViewSchema accepts", () => {
    const source = readFileSync(
      join(process.cwd(), "src/features/datasets/components/dataset-explorer.tsx"),
      "utf8"
    );

    for (const view of datasetViewSchema.options) {
      expect(
        source.includes(`data.views.includes("${view}")`),
        `dataset-explorer.tsx has no branch for the "${view}" view. A view the ` +
          `schema accepts but the renderer ignores fails silently — the block ` +
          `validates, seeds, and then draws nothing.`
      ).toBe(true);
    }
  });
});
