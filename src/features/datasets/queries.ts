import { prisma } from "@/db/client";

import {
  datasetColumnsSchema,
  datasetProvenanceSchema,
  type DatasetColumn,
  type DatasetProvenance,
} from "./schemas";

/**
 * Dataset data access (application layer, §5).
 *
 * A dataset embedded in a lesson is not fetched through this file — it
 * rides along with `getLessonContentBlocks`, which is already gated by
 * that lesson's own `course:learn` authorization check before any block is
 * read. Exactly the arrangement `features/hardware/queries.ts` documents
 * for `SPEC_TABLE` / `DEVICE_CARD` (§12).
 */

/** The columns a `DATASET_EXPLORER` block needs, selected once. */
export const datasetSelect = {
  id: true,
  slug: true,
  title: true,
  summary: true,
  level: true,
  sourceUri: true,
  format: true,
  sampleCount: true,
  checksumSha256: true,
  columns: true,
  provenance: true,
  hardwareDevice: { select: { slug: true, name: true } },
} as const;

/**
 * A dataset row with its two JSON columns validated (§9).
 *
 * `columns` is required and a dataset whose columns fail validation is
 * unusable — the caller degrades the block to INVALID. `provenance` is
 * nullable by design (SYNTHETIC datasets have none) and, when present but
 * malformed, is dropped to null rather than failing the whole block: a
 * histogram is still correct without its provenance panel, and losing the
 * chart over a bad metadata field would be a worse trade (§28).
 */
export interface DatasetDetail {
  id: string;
  slug: string;
  title: string;
  summary: string;
  level: "SYNTHETIC" | "RECORDED" | "PHYSICAL";
  sourceUri: string;
  format: "CSV" | "JSON";
  sampleCount: number;
  checksumSha256: string;
  columns: DatasetColumn[];
  provenance: DatasetProvenance | null;
  hardwareDevice: { slug: string; name: string } | null;
}

type RawDataset = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  level: "SYNTHETIC" | "RECORDED" | "PHYSICAL";
  sourceUri: string;
  format: "CSV" | "JSON";
  sampleCount: number;
  checksumSha256: string;
  columns: unknown;
  provenance: unknown;
  hardwareDevice: { slug: string; name: string } | null;
};

/** Returns null when `columns` is unusable — the block then renders INVALID. */
export function toDatasetDetail(raw: RawDataset): DatasetDetail | null {
  const columns = datasetColumnsSchema.safeParse(raw.columns);
  if (!columns.success) return null;

  const provenance = datasetProvenanceSchema.safeParse(raw.provenance);

  return {
    id: raw.id,
    slug: raw.slug,
    title: raw.title,
    summary: raw.summary,
    level: raw.level,
    sourceUri: raw.sourceUri,
    format: raw.format,
    sampleCount: raw.sampleCount,
    checksumSha256: raw.checksumSha256,
    columns: columns.data,
    provenance: provenance.success ? provenance.data : null,
    hardwareDevice: raw.hardwareDevice,
  };
}

/** Standalone lookup, for a future `/datasets/[slug]` provenance page. */
export async function getDatasetBySlug(slug: string): Promise<DatasetDetail | null> {
  const raw = await prisma.dataset.findUnique({
    where: { slug },
    select: datasetSelect,
  });

  return raw ? toDatasetDetail(raw) : null;
}
