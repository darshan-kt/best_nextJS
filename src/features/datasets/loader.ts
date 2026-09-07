import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join, normalize } from "node:path";
import { cache } from "react";

import { logger } from "@/lib/logger";

import { datasetColumnsSchema, type DatasetColumn } from "./schemas";

/**
 * Reads a dataset's numeric payload (§5: infrastructure layer).
 *
 * WHY SERVER-SIDE `fs` RATHER THAN A CLIENT `fetch`
 *
 * PHASE_1A_ARCHITECTURE.md §10 said the payload would be fetched from the
 * app's own origin and validated client-side. Reading it here instead is a
 * deliberate refinement, recorded rather than slipped in:
 *
 *   * It keeps `DATASET_EXPLORER` a Server Component. Every view M3.9
 *     needs — table preview, histogram, eCDF, Q-Q — is static once the
 *     numbers are known, so a client fetch would ship both the parser and
 *     several thousand samples to the browser to render an image the
 *     server could have rendered (§7, §26).
 *   * It removes a request waterfall: page → block → fetch → parse →
 *     paint becomes one server render.
 *
 * The file still lives under `public/`, so a future client-side view (a
 * brushable time series, say) can fetch the same URL without moving it.
 *
 * PATH SAFETY (§29)
 *
 * `sourceUri` comes from a database row, which is authored content rather
 * than user input — but it is still a path assembled into a filesystem
 * read, so it is treated as untrusted: only root-relative paths are
 * accepted, the result is normalized, and anything that escapes `public/`
 * is rejected rather than read.
 */

export interface DatasetPayload {
  columns: DatasetColumn[];
  /** Column key -> values, in file order. */
  series: Record<string, number[]>;
  rowCount: number;
  /** SHA-256 of the file as read, for drift detection against the row. */
  checksumSha256: string;
}

export class DatasetLoadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DatasetLoadError";
  }
}

const PUBLIC_ROOT = join(process.cwd(), "public");

function resolveLocalPath(sourceUri: string): string {
  if (!sourceUri.startsWith("/") || sourceUri.startsWith("//")) {
    throw new DatasetLoadError(
      `Only root-relative dataset paths can be read from disk, got "${sourceUri}"`
    );
  }

  const resolved = normalize(join(PUBLIC_ROOT, sourceUri));
  if (!resolved.startsWith(PUBLIC_ROOT)) {
    throw new DatasetLoadError("Dataset path escapes the public directory");
  }

  return resolved;
}

/**
 * Parse a CSV whose first row is a header of column keys and whose body is
 * numeric.
 *
 * Deliberately not a CSV library (§40): the collector node writes these
 * files and the format is fixed — comma-separated, no quoting, no embedded
 * newlines, numeric body. A general parser would be dependency weight for
 * a format we control on both ends. A row that does not match is rejected
 * loudly rather than coerced, because a silently-dropped NaN in a
 * statistics course is a wrong mean nobody notices.
 */
export function parseDatasetCsv(text: string, columns: DatasetColumn[]): DatasetPayload["series"] {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"));

  if (lines.length < 2) {
    throw new DatasetLoadError("Dataset file has no data rows");
  }

  const header = lines[0].split(",").map((cell) => cell.trim());
  const series: Record<string, number[]> = {};

  for (const column of columns) {
    if (!header.includes(column.key)) {
      throw new DatasetLoadError(
        `Dataset file is missing declared column "${column.key}"`
      );
    }
    series[column.key] = [];
  }

  for (let lineIndex = 1; lineIndex < lines.length; lineIndex += 1) {
    const cells = lines[lineIndex].split(",");
    if (cells.length !== header.length) {
      throw new DatasetLoadError(
        `Row ${lineIndex} has ${cells.length} cells, expected ${header.length}`
      );
    }

    for (const column of columns) {
      const value = Number(cells[header.indexOf(column.key)]);
      if (!Number.isFinite(value)) {
        throw new DatasetLoadError(
          `Row ${lineIndex}, column "${column.key}" is not a finite number`
        );
      }
      series[column.key].push(value);
    }
  }

  return series;
}

/** JSON form: `{ "<columnKey>": number[] }`, all arrays the same length. */
export function parseDatasetJson(
  text: string,
  columns: DatasetColumn[]
): DatasetPayload["series"] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new DatasetLoadError("Dataset file is not valid JSON");
  }

  if (typeof parsed !== "object" || parsed === null) {
    throw new DatasetLoadError("Dataset JSON must be an object of column arrays");
  }

  const record = parsed as Record<string, unknown>;
  const series: Record<string, number[]> = {};
  let expectedLength: number | null = null;

  for (const column of columns) {
    const values = record[column.key];
    if (!Array.isArray(values)) {
      throw new DatasetLoadError(`Dataset JSON is missing column "${column.key}"`);
    }
    if (!values.every((value): value is number => typeof value === "number" && Number.isFinite(value))) {
      throw new DatasetLoadError(`Column "${column.key}" contains a non-finite value`);
    }
    if (expectedLength !== null && values.length !== expectedLength) {
      throw new DatasetLoadError("Dataset columns have differing lengths");
    }

    expectedLength = values.length;
    series[column.key] = values;
  }

  return series;
}

/**
 * Load and parse a dataset's payload.
 *
 * Wrapped in React's `cache` so a lesson rendering three blocks over the
 * same dataset (M3.9 does exactly that) reads and parses the file once per
 * request rather than three times (§26).
 */
export const loadDatasetPayload = cache(
  async (
    sourceUri: string,
    format: "CSV" | "JSON",
    rawColumns: unknown
  ): Promise<DatasetPayload> => {
    const columns = datasetColumnsSchema.parse(rawColumns);
    const path = resolveLocalPath(sourceUri);

    let text: string;
    try {
      text = await readFile(path, "utf8");
    } catch {
      throw new DatasetLoadError(`Dataset file not found: ${sourceUri}`);
    }

    const series =
      format === "CSV"
        ? parseDatasetCsv(text, columns)
        : parseDatasetJson(text, columns);

    const rowCount = series[columns[0].key]?.length ?? 0;
    const checksumSha256 = createHash("sha256").update(text).digest("hex");

    return { columns, series, rowCount, checksumSha256 };
  }
);

/**
 * Load a payload, returning null instead of throwing.
 *
 * A missing or malformed dataset file is a bad row, not a bad request: the
 * block degrades to an inline notice and the rest of the lesson still
 * renders (§28) — the same posture `getLessonContentBlocks` already takes
 * for JSON that fails validation.
 */
export async function tryLoadDatasetPayload(
  sourceUri: string,
  format: "CSV" | "JSON",
  rawColumns: unknown
): Promise<DatasetPayload | null> {
  try {
    return await loadDatasetPayload(sourceUri, format, rawColumns);
  } catch (error) {
    logger.error("Failed to load dataset payload", {
      sourceUri,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
