import { labProtocolBlockSchema } from "@/features/labs/schemas";
import { distributionSimBlockSchema } from "@/features/statistics/schemas";

import {
  calloutBlockSchema,
  codeBlockSchema,
  embedBlockSchema,
  fileBlockSchema,
  imageBlockSchema,
  textBlockSchema,
  videoBlockSchema,
} from "./schemas";

/**
 * One schema per lightweight block type — the types that own their JSON
 * payload rather than pointing at a row (§11).
 *
 * WHY THIS IS ITS OWN MODULE
 *
 * It lived at the bottom of `schemas.ts` until Phase 1F, which is where it
 * stopped working. This registry is an AGGREGATION POINT: it necessarily
 * depends on every feature that contributes a block payload, so any feature
 * whose schema is built out of `schemas.ts`'s own primitives closes an
 * import cycle the moment it is registered.
 *
 * `LAB_PROTOCOL` is exactly that case. `labProtocolBlockSchema` reuses
 * `richTextSchema` (PHASE_1A_ARCHITECTURE.md §18.3, so a diagram inside a
 * lab step and one inside an exercise step stay one shape), and
 * `richTextSchema` is built from `imageBlockSchema` and `codeBlockSchema`.
 * Registering the lab schema inside `schemas.ts` therefore produced
 * `schemas -> labs -> schemas`, and with ES modules that is not a style
 * complaint: the labs module evaluated while `richTextSchema` was still in
 * its temporal dead zone and threw
 * `Cannot read properties of undefined (reading 'optional')` at import
 * time. The block-coverage test caught it on the first run.
 *
 * `DISTRIBUTION_SIM` only ever avoided the same fate by luck of direction —
 * `features/statistics` happens not to import back. Moving the aggregation
 * into a leaf module that everything else can depend on makes the
 * arrangement deliberate rather than lucky, and means the next block type
 * cannot reintroduce the cycle.
 */
export const lightweightBlockSchemas = {
  TEXT: textBlockSchema,
  IMAGE: imageBlockSchema,
  VIDEO: videoBlockSchema,
  CODE: codeBlockSchema,
  EMBED: embedBlockSchema,
  CALLOUT: calloutBlockSchema,
  FILE: fileBlockSchema,
  /// Statistical Distributions course (Phase 1D). Its schema lives in
  /// `features/statistics/schemas.ts` because it validates against the
  /// distribution registry — the payload and the mathematics are one
  /// contract, and splitting them across two features would let them drift.
  DISTRIBUTION_SIM: distributionSimBlockSchema,
  /// Physical-lab protocols (Phase 1F). Its schema lives in
  /// `features/labs` rather than in the statistics feature because a lab
  /// protocol is not a statistics concept — the hardware course is the
  /// obvious second consumer — and it is lightweight rather than
  /// relational because a lab references nothing in the database: the
  /// learner reads it here and runs it on their own machine.
  LAB_PROTOCOL: labProtocolBlockSchema,
} as const;

export type LightweightBlockType = keyof typeof lightweightBlockSchemas;
