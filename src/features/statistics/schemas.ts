import { z } from "zod";

import { DISTRIBUTIONS, type DistributionKind } from "./distributions";

/**
 * `DISTRIBUTION_SIM` block payload (PHASE_1A_ARCHITECTURE.md §18.2).
 *
 * A lightweight block: the payload lives in `LessonContentBlock.data`, an
 * untyped JSON column, so it is external input the moment it leaves the
 * database and is validated before anything trusts it (§9) — the same
 * contract every schema in `features/learning/schemas.ts` follows.
 *
 * What is unusual here, and deliberate: the schema validates against the
 * DISTRIBUTION REGISTRY. An author cannot ship a σ slider for a Uniform,
 * or omit λ for an Exponential, because `superRefine` below checks the
 * declared controls against `DISTRIBUTIONS[kind].parameters`. That keeps
 * the block data and the mathematics from drifting apart, which no amount
 * of field-level validation would catch.
 */

export const distributionKindSchema = z.enum([
  "UNIFORM",
  "GAUSSIAN",
  "EXPONENTIAL",
]);

export const distributionViewSchema = z.enum([
  "PDF",
  "CDF",
  "HISTOGRAM",
  "SCATTER_2D",
  "SUMMARY_STATS",
  "THEORETICAL_OVERLAY",
]);
export type DistributionView = z.infer<typeof distributionViewSchema>;

export const parameterControlSchema = z
  .object({
    key: z.string().min(1),
    label: z.string().min(1),
    min: z.number(),
    max: z.number(),
    step: z.number().positive(),
    default: z.number(),
    unit: z.string().optional(),
    /** Rendered read-only — a lesson varying one parameter at a time. */
    locked: z.boolean().default(false),
  })
  .refine((control) => control.min < control.max, {
    message: "min must be less than max",
    path: ["max"],
  })
  .refine(
    (control) => control.default >= control.min && control.default <= control.max,
    {
      message: "default must lie within [min, max]",
      path: ["default"],
    }
  );

export const distributionSimBlockSchema = z
  .object({
    distribution: distributionKindSchema,
    title: z.string().min(1),
    /**
     * What the learner should notice. Required, not optional: a slider
     * with no question attached is a toy, and spec §38 forbids visuals
     * that do not teach.
     */
    prompt: z.string().min(1),
    controls: z.array(parameterControlSchema).min(1),
    views: z.array(distributionViewSchema).min(1),
    /**
     * Deterministic sampling. Lesson prose quotes concrete numbers and the
     * static figures `figures.py` renders must match what the learner
     * sees; spec §47 requires reproducibility. `Math.random` promises
     * neither.
     */
    seed: z.int().nonnegative().default(42),
    maxSamples: z.int().positive().max(50_000).default(5_000),
    binCount: z.int().min(5).max(120).default(40),
    /**
     * Pins the x-axis so several simulators share axes — M5.2 puts three
     * distributions side by side, and three independently auto-scaled
     * figures would defeat the comparison.
     */
    xDomain: z.tuple([z.number(), z.number()]).optional(),
    /**
     * Read-only mode: the curve with no controls, for a theory lesson that
     * needs a numerically accurate figure rather than an interaction.
     * Replaces what would otherwise be a hand-drawn IMAGE (spec §54), and
     * renders entirely on the server.
     */
    interactive: z.boolean().default(true),
    unit: z.string().optional(),
    xLabel: z.string().optional(),
  })
  .refine((block) => block.xDomain === undefined || block.xDomain[0] < block.xDomain[1], {
    message: "xDomain must be [min, max] with min < max",
    path: ["xDomain"],
  })
  .refine(
    (block) =>
      block.views.includes("SCATTER_2D") === (block.distribution === "UNIFORM"),
    {
      message:
        "SCATTER_2D is the 2D workspace view and is meaningful only for UNIFORM",
      path: ["views"],
    }
  )
  .superRefine((block, ctx) => {
    // The registry is the single source of truth for which parameters
    // exist. Without this check a lesson could ship a control the
    // simulator silently ignores, or omit one it needs and fall back to a
    // default the prose never mentions.
    const spec = DISTRIBUTIONS[block.distribution as DistributionKind];
    const declared = new Set(spec.parameters.map((parameter) => parameter.key));

    for (const control of block.controls) {
      if (!declared.has(control.key) && control.key !== "n") {
        ctx.addIssue({
          code: "custom",
          message: `"${control.key}" is not a parameter of ${block.distribution}`,
          path: ["controls"],
        });
      }
    }

    for (const parameter of spec.parameters) {
      if (!block.controls.some((control) => control.key === parameter.key)) {
        ctx.addIssue({
          code: "custom",
          message: `${block.distribution} requires a control for "${parameter.key}"`,
          path: ["controls"],
        });
      }
    }
  });

export type DistributionSimBlockData = z.infer<typeof distributionSimBlockSchema>;
