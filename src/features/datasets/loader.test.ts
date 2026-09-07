import { describe, expect, it } from "vitest";

import {
  DatasetLoadError,
  loadDatasetPayload,
  parseDatasetCsv,
  parseDatasetJson,
} from "./loader";

/**
 * Dataset parsing (§9: the file is external input the moment it is read).
 *
 * The rejection cases matter more than the accepting one. A silently
 * dropped or coerced value in a statistics course is a wrong mean that
 * nobody notices, so the parser fails loudly on anything it cannot read
 * rather than skipping the row.
 */

const COLUMNS = [
  { key: "target_x", label: "X", unit: "m", kind: "NUMERIC" as const },
  { key: "target_y", label: "Y", unit: "m", kind: "NUMERIC" as const },
];

describe("parseDatasetCsv", () => {
  it("reads declared columns by header name, not position", () => {
    const series = parseDatasetCsv("target_y,target_x\n1,2\n3,4\n", COLUMNS);

    expect(series.target_x).toEqual([2, 4]);
    expect(series.target_y).toEqual([1, 3]);
  });

  it("skips blank lines and comments", () => {
    const series = parseDatasetCsv(
      "# collected 2026-09-01\ntarget_x,target_y\n1,2\n\n3,4\n",
      COLUMNS
    );

    expect(series.target_x).toEqual([1, 3]);
  });

  it("rejects a missing declared column", () => {
    expect(() => parseDatasetCsv("target_x\n1\n", COLUMNS)).toThrow(DatasetLoadError);
  });

  it("rejects a non-numeric cell rather than coercing it", () => {
    expect(() => parseDatasetCsv("target_x,target_y\n1,oops\n", COLUMNS)).toThrow(
      /not a finite number/
    );
  });

  it("rejects a ragged row rather than padding it", () => {
    expect(() => parseDatasetCsv("target_x,target_y\n1\n", COLUMNS)).toThrow(
      /expected 2/
    );
  });

  it("rejects a file with no data rows", () => {
    expect(() => parseDatasetCsv("target_x,target_y\n", COLUMNS)).toThrow(
      /no data rows/
    );
  });
});

describe("parseDatasetJson", () => {
  it("reads column arrays", () => {
    const series = parseDatasetJson(
      JSON.stringify({ target_x: [1, 2], target_y: [3, 4] }),
      COLUMNS
    );

    expect(series.target_x).toEqual([1, 2]);
  });

  it("rejects columns of differing lengths", () => {
    expect(() =>
      parseDatasetJson(JSON.stringify({ target_x: [1, 2], target_y: [3] }), COLUMNS)
    ).toThrow(/differing lengths/);
  });

  it("rejects a non-finite value", () => {
    expect(() =>
      parseDatasetJson(JSON.stringify({ target_x: [1, null], target_y: [3, 4] }), COLUMNS)
    ).toThrow(/non-finite/);
  });

  it("rejects malformed JSON", () => {
    expect(() => parseDatasetJson("{", COLUMNS)).toThrow(/not valid JSON/);
  });
});

describe("loadDatasetPayload", () => {
  const SOURCE = "/datasets/statistics-robotics/uniform-targets-synthetic.csv";

  it("loads the committed synthetic dataset and checksums it", async () => {
    const payload = await loadDatasetPayload(SOURCE, "CSV", COLUMNS);

    expect(payload.rowCount).toBe(800);
    expect(payload.series.target_x).toHaveLength(800);
    // The digest recorded when the file was generated. A change to the
    // file without a matching row update is exactly the drift the
    // Dataset row's own checksum exists to surface.
    expect(payload.checksumSha256).toBe(
      "66baadd5da3d13bb36050a9239dd98b11aa16788ded8d3b057fcd94188c7ed5e"
    );
  });

  it("rejects a path that escapes the public directory", async () => {
    // sourceUri is authored content, but it is still assembled into a
    // filesystem read (§29).
    await expect(
      loadDatasetPayload("/../../etc/passwd", "CSV", COLUMNS)
    ).rejects.toThrow(DatasetLoadError);
  });

  it("rejects an absolute URL and a protocol-relative path", async () => {
    await expect(
      loadDatasetPayload("https://example.com/x.csv", "CSV", COLUMNS)
    ).rejects.toThrow(/root-relative/);
    await expect(
      loadDatasetPayload("//example.com/x.csv", "CSV", COLUMNS)
    ).rejects.toThrow(/root-relative/);
  });

  it("reports a missing file rather than throwing an ENOENT", async () => {
    await expect(
      loadDatasetPayload("/datasets/does-not-exist.csv", "CSV", COLUMNS)
    ).rejects.toThrow(/not found/);
  });
});
