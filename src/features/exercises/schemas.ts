import { z } from "zod";

import { richTextSchema } from "@/features/learning/schemas";

/**
 * `Exercise.config` payload shapes (§19, §11 of ROS2_COURSE_DESIGN.md).
 *
 * `config: Json?` already existed on `Exercise` before this — added in an
 * earlier milestone as "method-specific configuration... lets evaluation
 * strategies evolve without a migration." This reuses that same escape
 * hatch for the three exercise *pedagogical* types (a different axis from
 * `evaluationMethod`, which is about grading, not structure) rather than
 * adding new columns, mirroring how `Quiz`'s own question payloads are
 * JSON for exactly the same reason.
 *
 * These are content-only exercises — the learner runs ROS 2/Turtlesim on
 * their own machine (see ROS2_COURSE_KICKOFF_PROMPTS.md's locked-in
 * decisions), not something submitted into this app for grading. That's
 * why there's no `submission`/`answer` field anywhere below:
 * `ExerciseSubmission`/`ExerciseEvaluation` stay unused by this content
 * model, available if a genuinely submission-graded exercise type is
 * ever needed later.
 */

/**
 * `inlineVisualSchema` and `richTextSchema` MOVED to
 * `features/learning/schemas.ts` when `LAB_PROTOCOL` arrived (Phase 1F),
 * and are re-exported here so this module's public surface is unchanged.
 *
 * They had to move. Both are defined in terms of `imageBlockSchema` and
 * `codeBlockSchema`, which live in `learning/schemas.ts`; once
 * `labProtocolBlockSchema` reused `richTextSchema` — as
 * PHASE_1A_ARCHITECTURE.md §18.3 specifies, so that a diagram inside a lab
 * step and one inside an exercise step stay one shape — the import graph
 * would have closed a cycle: learning -> labs -> exercises -> learning.
 * That is not a lint preference; with ES modules the exercises module would
 * evaluate while `imageBlockSchema` was still uninitialised and
 * `z.discriminatedUnion` would throw at import time.
 *
 * Their new home is also the more honest one: a shape built out of
 * lightweight block schemas belongs beside them, not in the first feature
 * that happened to need it.
 */
export {
  inlineVisualSchema,
  richTextSchema,
  type InlineVisual,
  type RichText,
} from "@/features/learning/schemas";

const guidedStepSchema = z.object({
  title: z.string().min(1),
  content: richTextSchema,
});

/** "Learner follows detailed steps." (§11) */
const guidedExerciseSchema = z.object({
  type: z.literal("GUIDED"),
  goal: richTextSchema,
  steps: z.array(guidedStepSchema).min(1),
});
export type GuidedExerciseConfig = z.infer<typeof guidedExerciseSchema>;

/** "Learner receives a goal with fewer instructions." (§11) */
const independentExerciseSchema = z.object({
  type: z.literal("INDEPENDENT"),
  goal: richTextSchema,
  successCriteria: z.array(z.string().min(1)).min(1),
  /** Revealed progressively, same reveal mechanism as DEBUGGING's —
   *  optional because "fewer instructions" doesn't mean none ever help. */
  hints: z.array(z.string().min(1)).optional(),
});
export type IndependentExerciseConfig = z.infer<
  typeof independentExerciseSchema
>;

/**
 * "Provide a broken system... Do not immediately reveal the solution.
 * Teach systematic debugging." (§11) `hints` are revealed one at a time by
 * the learner; `solution` only after that, or on an explicit reveal — see
 * `hint-reveal.tsx`. Both are required (unlike INDEPENDENT's optional
 * hints): a debugging exercise with no hints and no solution isn't
 * teaching systematic debugging, it's just a stuck learner.
 */
const debuggingExerciseSchema = z.object({
  type: z.literal("DEBUGGING"),
  /** What's broken, from the learner's point of view — e.g. "the
   *  subscriber receives no messages." */
  scenario: richTextSchema,
  hints: z.array(z.string().min(1)).min(1),
  solution: richTextSchema,
  /** Optional deeper explanation of *why*, shown alongside the solution —
   *  distinct from the fix itself so a learner can read the fix without
   *  the full root-cause essay if they just want to get unblocked. */
  rootCause: richTextSchema.optional(),
});
export type DebuggingExerciseConfig = z.infer<typeof debuggingExerciseSchema>;

export const exerciseConfigSchema = z.discriminatedUnion("type", [
  guidedExerciseSchema,
  independentExerciseSchema,
  debuggingExerciseSchema,
]);
export type ExerciseConfig = z.infer<typeof exerciseConfigSchema>;
