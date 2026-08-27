import { z } from "zod";

import { mediaSrcSchema } from "@/features/learning/schemas";

/**
 * Hardware device domain validation (Robotics Hardware & Sensors course,
 * Stage 1 — §36 plan, `docs/hardware/STAGE_1_SCHEMA_PLAN.md`).
 *
 * `HardwareDevice` is a real relational model, not a lightweight
 * content-block payload (see the schema comment in `prisma/schema.prisma`),
 * so — unlike `learning/schemas.ts` — these schemas validate write input at
 * the application boundary (§9) rather than a JSON column's contents.
 */

export const hardwareCategorySchema = z.enum(["RGB_D_CAMERA", "LIDAR_2D"]);

export const hardwareSupportStatusSchema = z.enum([
  "ACTIVELY_MAINTAINED",
  "COMMUNITY_MAINTAINED",
  "LEGACY",
  "DEPRECATED",
]);

export const hardwareDeviceSpecInputSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  value: z.string().min(1),
  unit: z.string().optional(),
  /// Required — §7, non-negotiables: never present a spec without
  /// explaining why it matters.
  whyItMatters: z.string().min(1),
  sortOrder: z.int(),
});
export type HardwareDeviceSpecInput = z.infer<
  typeof hardwareDeviceSpecInputSchema
>;

export const hardwareDeviceTopicInputSchema = z.object({
  topicName: z.string().min(1),
  messageType: z.string().min(1),
  description: z.string().min(1),
  sortOrder: z.int(),
});
export type HardwareDeviceTopicInput = z.infer<
  typeof hardwareDeviceTopicInputSchema
>;

/**
 * Write-boundary shape for a `HardwareDevice`. The
 * `supportStatusNote`-required-for-LEGACY/DEPRECATED rule lives here, not
 * as a DB `CHECK` constraint — the same place `embedBlockSchema`'s
 * start/end-seconds rule lives in `learning/schemas.ts`, so conditional
 * validation stays in one layer rather than split between Zod and SQL.
 */
export const hardwareDeviceInputSchema = z
  .object({
    slug: z
      .string()
      .min(1)
      .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Must be a lowercase, hyphenated slug"),
    name: z.string().min(1),
    manufacturer: z.string().min(1),
    category: hardwareCategorySchema,
    summary: z.string().min(1),
    heroImageSrc: mediaSrcSchema.optional(),
    heroImageAlt: z.string().optional(),
    driverPackage: z.string().min(1),
    driverRepoUrl: z.url(),
    rosDistroCompat: z.array(z.string().min(1)).min(1),
    supportStatus: hardwareSupportStatusSchema,
    supportStatusNote: z.string().min(1).optional(),
    homeSectionId: z.string().optional(),
    specs: z.array(hardwareDeviceSpecInputSchema),
    topics: z.array(hardwareDeviceTopicInputSchema),
  })
  .refine(
    (data) =>
      (data.supportStatus !== "LEGACY" && data.supportStatus !== "DEPRECATED") ||
      Boolean(data.supportStatusNote),
    {
      message:
        "supportStatusNote is required when supportStatus is LEGACY or DEPRECATED",
      path: ["supportStatusNote"],
    }
  );
export type HardwareDeviceInput = z.infer<typeof hardwareDeviceInputSchema>;

/**
 * Placement-only options for a `SPEC_TABLE` block's `data` column — the
 * device's own specs are the source of truth (never duplicated here);
 * this only ever narrows which of them show inline at this particular
 * point in a lesson. Absent `specKeys` means "show all".
 */
export const specTableBlockDataSchema = z.object({
  specKeys: z.array(z.string().min(1)).optional(),
});
export type SpecTableBlockData = z.infer<typeof specTableBlockDataSchema>;

/** `DEVICE_CARD` blocks currently need no placement options of their own. */
export const deviceCardBlockDataSchema = z.object({}).optional();
export type DeviceCardBlockData = z.infer<typeof deviceCardBlockDataSchema>;
