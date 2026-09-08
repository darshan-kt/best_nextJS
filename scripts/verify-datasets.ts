/**
 * Check every `Dataset` row against the file it points at.
 *
 *   pnpm verify:datasets
 *
 * WHY THIS IS A CI SCRIPT AND NOT A RENDER-TIME CHECK
 *
 * PHASE_1A_ARCHITECTURE.md §10 splits a dataset in two: metadata and
 * provenance in Postgres, the numbers in a static file under `public/`,
 * joined by `checksumSha256`. That split makes drift *possible*, so the
 * same section promises it will be "detectable rather than silent" and
 * names this script as the thing that detects it.
 *
 * `DatasetExplorer` already re-checksums on render and shows a warning
 * banner when the file has moved out from under the row. That banner is a
 * last line of defence for a learner, not the control: by the time it
 * fires, a lesson is live and quoting numbers nobody reviewed. The
 * detection belongs where a build can fail on it, which is here — the same
 * reasoning `scripts/verify-ros2-terminal-output.ts` follows for terminal
 * fixtures.
 *
 * WHAT IT CHECKS, per row
 *
 *   1. `columns` parses as `datasetColumnsSchema`.
 *   2. The file exists, is readable, and every declared column is present
 *      and finite through the whole file.
 *   3. SHA-256 of the file equals `checksumSha256`.
 *   4. The parsed row count equals `sampleCount`.
 *   5. `provenance` parses, and is present when `level` requires it.
 *
 * 2 and 3 come from `readDatasetPayload` — the same reader
 * `DATASET_EXPLORER` renders through, deliberately, so this script cannot
 * pass on data the renderer would choke on.
 *
 * EXIT CODES
 *   0  every row agrees with its file
 *   1  at least one row drifted, or a row could not be read at all
 */

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/db/generated/client";
import { readDatasetPayload } from "../src/features/datasets/loader";
import {
  datasetColumnsSchema,
  datasetProvenanceSchema,
} from "../src/features/datasets/schemas";

// The Prisma CLI is not running, so nothing has loaded `.env` yet — the
// same preamble `prisma/seed.ts` uses, for the same reason.
try {
  process.loadEnvFile();
} catch {
  // No .env file — fall through to the ambient environment.
}

interface RowReport {
  slug: string;
  problems: string[];
}

async function verifyDatasets(prisma: PrismaClient): Promise<RowReport[]> {
  const datasets = await prisma.dataset.findMany({
    select: {
      slug: true,
      level: true,
      sourceUri: true,
      format: true,
      sampleCount: true,
      checksumSha256: true,
      columns: true,
      provenance: true,
    },
    orderBy: { slug: "asc" },
  });

  const reports: RowReport[] = [];

  for (const dataset of datasets) {
    const problems: string[] = [];

    const columns = datasetColumnsSchema.safeParse(dataset.columns);
    if (!columns.success) {
      // Nothing further is checkable: the reader needs the column list to
      // know what to parse out of the file.
      problems.push(
        `columns does not validate: ${columns.error.issues
          .map((issue) => `${issue.path.join(".") || "(root)"} ${issue.message}`)
          .join("; ")}`
      );
      reports.push({ slug: dataset.slug, problems });
      continue;
    }

    // Provenance is independent of the file, so it is checked whether or
    // not the payload reads.
    if (dataset.level === "SYNTHETIC") {
      if (dataset.provenance !== null) {
        const provenance = datasetProvenanceSchema.safeParse(dataset.provenance);
        if (!provenance.success) {
          problems.push("provenance is present but does not validate");
        }
      }
    } else if (dataset.provenance === null) {
      problems.push(`level is ${dataset.level} but provenance is null`);
    } else {
      const provenance = datasetProvenanceSchema.safeParse(dataset.provenance);
      if (!provenance.success) {
        problems.push(
          `provenance does not validate: ${provenance.error.issues
            .map((issue) => `${issue.path.join(".") || "(root)"} ${issue.message}`)
            .join("; ")}`
        );
      }
    }

    try {
      const payload = await readDatasetPayload(
        dataset.sourceUri,
        dataset.format,
        columns.data
      );

      if (payload.checksumSha256 !== dataset.checksumSha256) {
        problems.push(
          `checksum drift — row says ${dataset.checksumSha256}, ` +
            `${dataset.sourceUri} hashes to ${payload.checksumSha256}`
        );
      }

      if (payload.rowCount !== dataset.sampleCount) {
        problems.push(
          `sampleCount drift — row says ${dataset.sampleCount}, ` +
            `file has ${payload.rowCount} rows`
        );
      }
    } catch (error) {
      problems.push(
        `could not read ${dataset.sourceUri}: ` +
          (error instanceof Error ? error.message : String(error))
      );
    }

    reports.push({ slug: dataset.slug, problems });
  }

  return reports;
}

async function main(): Promise<number> {
  // Imported after the environment is populated so that validation sees
  // the loaded values (the same ordering `prisma/seed.ts` documents).
  const { env } = await import("../src/config/env.js");

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: env.DATABASE_URL }),
    log: ["warn", "error"],
  });

  let reports: RowReport[];
  try {
    reports = await verifyDatasets(prisma);
  } finally {
    await prisma.$disconnect();
  }

  if (reports.length === 0) {
    console.log("No Dataset rows to verify.");
    return 0;
  }

  for (const report of reports) {
    if (report.problems.length === 0) {
      console.log(`  ok    ${report.slug}`);
    } else {
      console.error(`  FAIL  ${report.slug}`);
      for (const problem of report.problems) {
        console.error(`          ${problem}`);
      }
    }
  }

  const failed = reports.filter((report) => report.problems.length > 0);
  console.log(
    `\n${reports.length - failed.length} of ${reports.length} datasets verified.`
  );

  if (failed.length > 0) {
    console.error(
      "\nA Dataset row no longer describes the file it points at. Every " +
        "figure and every number a lesson quotes from these datasets is " +
        "computed from the file, not the row — so this is a content " +
        "correctness failure, not a bookkeeping one.\n" +
        "Either restore the file, or update the row in prisma/seed.ts " +
        "(checksumSha256 and sampleCount) to the file that is actually " +
        "shipping, and re-review the lessons that cite it."
    );
    return 1;
  }

  return 0;
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error: unknown) => {
    console.error("verify-datasets crashed:", error);
    process.exitCode = 1;
  });
