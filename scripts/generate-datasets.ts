/**
 * Regenerate every SYNTHETIC dataset file this course ships.
 *
 *   pnpm generate:datasets          # write the files, print each checksum
 *   pnpm generate:datasets --check  # regenerate into memory, diff, write nothing
 *
 * WHY A COMMITTED GENERATOR AND NOT AN AD-HOC SCRIPT
 *
 * `scripts/verify-datasets.ts` proves a file still matches the checksum in
 * its `Dataset` row. It cannot prove the file is the one the course meant
 * to ship — a corrupted file committed together with a matching checksum
 * passes verification forever. This script closes that: the numbers are
 * reproducible from a seed, so "is this the right file" is answerable by
 * regenerating it, and `--check` makes that a CI-able question.
 *
 * It is also the honesty mechanism the course's own subject demands. Every
 * row these files feed is labelled SYNTHETIC to a learner, and the claim
 * behind that label is "mathematically generated, reproducible, no robot
 * involved". This file is what makes the claim checkable rather than
 * asserted.
 *
 * WHY THE PROJECT'S OWN RNG RATHER THAN NUMPY
 *
 * These datasets sit beside `DISTRIBUTION_SIM` blocks drawing from
 * `createRng` + `DISTRIBUTIONS[kind].sample`. Generating the files from a
 * different generator would mean the simulated figure and the "recorded"
 * file a learner compares it against came from different mathematics, for
 * no reason. Reusing the registry (§34) also means a dataset cannot drift
 * from the distribution the lesson claims produced it. No new dependency
 * (§40), and no Python — which matters, because the machine that authored
 * this course has a matplotlib install that is ABI-broken against its own
 * numpy.
 */

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { DISTRIBUTIONS } from "../src/features/statistics/distributions";
import { createRng, drawSamples } from "../src/features/statistics/rng";

interface GeneratedDataset {
  /** Matches the `Dataset.slug` this file belongs to. */
  slug: string;
  /** Root-relative, and the same value as the row's `sourceUri`. */
  sourceUri: string;
  columns: string[];
  /** One row per event/reading, already rounded for the file. */
  rows: () => number[][];
}

/** The file format `readDatasetPayload` parses: header of keys, numeric body. */
const DECIMALS = 6;
const fixed = (value: number) => value.toFixed(DECIMALS);

/**
 * L6's reference figure (`exponential-when`).
 *
 * A Poisson process, emitted the way an event log actually arrives: an
 * absolute timestamp per event, with the gap since the previous one
 * alongside. Both columns ship because L6's ROS 2 section is about turning
 * the first into the second, and a learner who sees only the gaps has been
 * handed the answer to the conversion the lesson teaches.
 *
 * Rate 0.25/s, seed 42.
 */
const eventTimestamps: GeneratedDataset = {
  slug: "robot-event-timestamps-synthetic",
  sourceUri: "/datasets/statistics-robotics/robot-event-timestamps-synthetic.csv",
  columns: ["t_seconds", "gap_seconds"],
  rows: () => {
    const rng = createRng(42);
    const spec = DISTRIBUTIONS.EXPONENTIAL;
    const gaps = drawSamples(600, () => spec.sample(rng, { lambda: 0.25 }));

    let clock = 0;
    return gaps.map((gap) => {
      clock += gap;
      return [clock, gap];
    });
  },
};

/**
 * L5's reference figure (`gaussian-how`) — a stand-in for a capture that
 * does not exist.
 *
 * A real LiDAR staring at a wall produces quantization steps at the
 * sensor's range resolution, an asymmetric tail, and occasional genuine
 * outliers from multipath and specular returns. This file has none of
 * that: it is a clean Gaussian.
 *
 * Under revision 3 of the blueprint that is no longer a problem the way it
 * once was. The course no longer asks anyone to judge whether a model fits,
 * so this file is used only to show a learner the SHAPE of a few thousand
 * range readings before they collect their own. L5's own prompt says it is
 * mathematically generated rather than recorded, in the lesson rather than
 * only here.
 */
const lidarWallPlaceholder: GeneratedDataset = {
  slug: "lidar-wall-readings-synthetic",
  sourceUri: "/datasets/statistics-robotics/lidar-wall-readings-synthetic.csv",
  columns: ["distance_m"],
  rows: () => {
    const rng = createRng(2026);
    const spec = DISTRIBUTIONS.GAUSSIAN;
    // μ and σ match `gaussian_explore.py`'s worked example (2.00 m, 0.02 m)
    // so a learner meeting both sees one consistent scenario.
    return drawSamples(5_000, () => spec.sample(rng, { mu: 2.0, sigma: 0.02 })).map(
      (distance) => [distance]
    );
  },
};

const DATASETS: GeneratedDataset[] = [eventTimestamps, lidarWallPlaceholder];

function render(dataset: GeneratedDataset): string {
  const rows = dataset.rows();
  const lines = [dataset.columns.join(",")];
  for (const row of rows) {
    lines.push(row.map(fixed).join(","));
  }
  // Trailing newline: POSIX text file, and the loader tolerates it.
  return `${lines.join("\n")}\n`;
}

function main(): void {
  const check = process.argv.includes("--check");
  const publicRoot = join(process.cwd(), "public");
  let drifted = 0;

  for (const dataset of DATASETS) {
    const contents = render(dataset);
    const checksum = createHash("sha256").update(contents).digest("hex");
    const rowCount = contents.trimEnd().split("\n").length - 1;
    const target = join(publicRoot, dataset.sourceUri);

    if (check) {
      let current: string | null = null;
      try {
        current = readFileSync(target, "utf8");
      } catch {
        current = null;
      }
      if (current !== contents) {
        drifted += 1;
        console.error(
          `  DRIFT  ${dataset.slug}\n` +
            `         ${current === null ? "file is missing" : "file does not match the generator"}`
        );
        continue;
      }
      console.log(`  ok     ${dataset.slug}`);
      continue;
    }

    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, contents, "utf8");
    console.log(`  wrote  ${dataset.slug}`);
    console.log(`         sampleCount:    ${rowCount}`);
    console.log(`         checksumSha256: ${checksum}`);
  }

  if (check && drifted > 0) {
    console.error(
      `\n${drifted} dataset file(s) no longer match the generator. ` +
        `Run \`pnpm generate:datasets\` and update the checksum on the ` +
        `matching Dataset row in prisma/seed.ts.`
    );
    process.exit(1);
  }

  console.log(
    check
      ? `\n${DATASETS.length} of ${DATASETS.length} generated datasets match their files.`
      : `\n${DATASETS.length} file(s) written. Copy each checksum into its Dataset row in prisma/seed.ts.`
  );
}

main();
