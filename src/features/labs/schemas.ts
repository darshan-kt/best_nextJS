import { z } from "zod";

import { richTextSchema } from "@/features/learning/schemas";

/**
 * `LAB_PROTOCOL` block payload (PHASE_1A_ARCHITECTURE.md §13, §18.3).
 *
 * A physical-lab protocol: everything a learner needs to run an experiment
 * on their own robot, on their own machine, with their own hands.
 *
 * WHAT THIS BLOCK IS NOT
 *
 * It is instructional content and nothing else. No rosbridge, no
 * browser-initiated motion, no live telemetry socket, no submission. The
 * learner reads the protocol here and runs it there; nothing in a lab
 * crosses the network into this application in either direction. That is
 * 1A's standing decision, re-confirmed for M2.6, and it is the reason this
 * is a *lightweight* block — a JSON payload and a Zod schema, with no
 * foreign key, no new table and no server action.
 *
 * WHY A NEW BLOCK TYPE RATHER THAN `EXERCISE:GUIDED`
 *
 * `EXERCISE:GUIDED` is `{goal, steps[]}`. It has no structural notion of
 * safety, of reproducibility, or of whether anyone has ever actually run
 * the thing. Those three are the difference between an exercise and an
 * experiment involving hardware that moves, and modelling them as prose
 * inside a `steps[]` entry would make them optional in practice.
 *
 * WHY FIFTEEN FLAT FIELDS
 *
 * The course spec names fifteen required lab sections. They are fifteen
 * required fields here rather than a smaller number of grouped ones, and
 * the reasoning is not "the spec listed fifteen" — nesting required fields
 * keeps them required, so grouping would not have weakened enforcement.
 * Three things decide it:
 *
 *   1. `safety` is not a phase. Its four sub-fields apply at different
 *      times — `preflight` before, `emergencyStop` during, `supervision`
 *      throughout, `speedLimits` only while the robot moves. Filing it
 *      under a "setup" group would model it as something done once at the
 *      start, and would invite a renderer that prints it where a learner
 *      reads it before it means anything.
 *   2. Visual grouping is a presentation concern (§5). `LabProtocolBlock`
 *      does render these in four phases, and it should. Baking that
 *      grouping into the payload would turn a later page redesign into a
 *      data migration across every seeded lab.
 *   3. Flat keys are the authoring checklist. "Did I write `cleanup`?" is
 *      answerable by looking for `cleanup`. Under nesting an author must
 *      first know which group owns it — a real cost, no validation gain.
 *
 * A tempting fourth consolidation was considered and rejected: six of the
 * fifteen (`workspaceSetup`, `robotPreparation`, `ros2Commands`,
 * `procedure`, `dataCollection`, `pythonAnalysis`) share an identical
 * `LabStep[]` shape and could collapse into `phases: {id, steps}[]`. An
 * array lets an author omit or reorder a phase, which is precisely what
 * six named required fields prevent. The shape duplication is already
 * handled by sharing `labStepSchema` — that is the right level of reuse.
 *
 * REFERENTIAL INTEGRITY WITHOUT A FOREIGN KEY
 *
 * `requiredHardware[].deviceSlug` and `simulationFallbackLessonSlug` are
 * plain strings, because most lab hardware (a tape measure, a matte target
 * board) will never be in the `HardwareDevice` catalog and a nullable FK
 * per item would be shape invented ahead of need. Zod cannot check that a
 * slug resolves — it validates the block in isolation. `seedContentBlock`
 * does check, and refuses to seed a lab whose device or fallback lesson
 * does not exist. A dangling link inside a safety document is not a
 * cosmetic defect.
 */

/**
 * One step with a verifiable stop-and-check.
 *
 * `checkpoint` is what makes "the student should not have to guess any
 * missing step" enforceable rather than aspirational: a step whose success
 * is unobservable IS a guess. Optional, because some steps genuinely have
 * no observable outcome ("open a second terminal") and a required field
 * that authors fill with "done" teaches nothing.
 */
export const labStepSchema = z.object({
  title: z.string().min(1),
  /**
   * Reuses `richTextSchema` rather than inventing a parallel rich-text
   * model (§34) — a diagram inside a lab step and one inside an exercise
   * step have identical shapes.
   */
  content: richTextSchema,
  /** What the learner should observe before moving on. */
  checkpoint: z.string().min(1).optional(),
});
export type LabStep = z.infer<typeof labStepSchema>;

/**
 * Symptom / likely cause / what to check.
 *
 * Three fields rather than free prose because the third is the one authors
 * drop. "The scan is empty — the driver probably is not running" leaves the
 * learner where they started; "…check that `ros2 topic hz /scan` reports a
 * non-zero rate" does not.
 */
export const troubleshootingEntrySchema = z.object({
  symptom: z.string().min(1),
  likelyCause: z.string().min(1),
  whatToCheck: z.string().min(1),
});
export type TroubleshootingEntry = z.infer<typeof troubleshootingEntrySchema>;

/** A lesson elsewhere in the platform that this lab deliberately does not re-teach. */
export const labCrossReferenceSchema = z.object({
  courseSlug: z.string().min(1),
  lessonSlug: z.string().min(1),
  label: z.string().min(1),
  /** Why a learner would follow it — never a bare "see also". */
  reason: z.string().min(1),
});
export type LabCrossReference = z.infer<typeof labCrossReferenceSchema>;

export const labValidationStatuses = [
  "THEORETICALLY_DESIGNED",
  "PHYSICALLY_VALIDATED",
] as const;

export const labProtocolBlockSchema = z
  .object({
    title: z.string().min(1),

    /* 1. Objective */
    objective: z.string().min(1),

    /* 2. Required hardware. `deviceSlug` links into the HardwareDevice
     *    catalog where the device is catalogued; free text where it is
     *    not, which is most of it. */
    requiredHardware: z
      .array(
        z.object({
          deviceSlug: z.string().min(1).optional(),
          label: z.string().min(1),
          note: z.string().min(1).optional(),
        })
      )
      .min(1),

    /* 3. Required software. Version REQUIRED, not optional (§47):
     *    "it worked on my machine" is a reproducibility failure, and the
     *    version is the field that turns it into a checkable claim. */
    requiredSoftware: z
      .array(z.object({ name: z.string().min(1), version: z.string().min(1) }))
      .min(1),

    /* 4. Workspace / environment setup */
    workspaceSetup: z.array(labStepSchema).min(1),
    /* 5. Robot preparation */
    robotPreparation: z.array(labStepSchema).min(1),
    /* 6. ROS 2 commands — bring-up and topic verification */
    ros2Commands: z.array(labStepSchema).min(1),
    /* 7. Experiment procedure */
    procedure: z.array(labStepSchema).min(1),
    /* 8. Data collection */
    dataCollection: z.array(labStepSchema).min(1),
    /* 9. Python analysis */
    pythonAnalysis: z.array(labStepSchema).min(1),

    /* 10. Expected observations — what a correct run looks like, so a
     *     learner can tell "unexpected result" from "broken setup". That
     *     distinction is the whole point of a statistics lab: without it,
     *     every surprising number reads as a mistake. */
    expectedObservations: z.array(z.string().min(1)).min(1),

    /* 11. Interpretation */
    interpretation: richTextSchema,

    /* 12. Troubleshooting */
    troubleshooting: z.array(troubleshootingEntrySchema).min(1),

    /**
     * Does the robot move under its own power during this lab?
     *
     * Not one of the spec's fifteen sections — it is the fact that makes
     * one of them decidable. `safety.speedLimits` is required for a lab
     * that moves and meaningless for one that does not, and something has
     * to say which this is.
     *
     * It replaces a keyword heuristic that scanned the safety prose for
     * words like "mov" and "drive". That heuristic was wrong in the most
     * predictable way possible: it fired on LAB 2 and LAB 3, whose safety
     * sections say the robot "moves nothing" and "moves under its own
     * power" only in order to state that it does not. A regex over prose
     * cannot read a negation, and safety-critical validation is the last
     * place to accept a rule that is right most of the time.
     */
    movesTheRobot: z.boolean(),

    /* 13. Safety. All of preflight/emergencyStop/supervision required —
     *     §44 and the non-negotiables make these structural, not
     *     editorial. `speedLimits` is optional because only labs that move
     *     the robot have one, and a required field that most labs fill
     *     with "n/a" is a field nobody reads. */
    safety: z.object({
      preflight: z.array(z.string().min(1)).min(1),
      emergencyStop: z.string().min(1),
      supervision: z.string().min(1),
      speedLimits: z.string().min(1).optional(),
    }),

    /* 14. Cleanup */
    cleanup: z.array(z.string().min(1)).min(1),

    /* 15. Challenge */
    challenge: richTextSchema.optional(),

    /**
     * §47 — reproducibility. Every field required. This is the block that
     * makes "the experiment should be reproducible" checkable rather than
     * aspirational: another person with this table and the protocol above
     * should get a comparable result, and if they do not, the table says
     * which variable to suspect.
     */
    reproducibility: z.object({
      ros2Distro: z.string().min(1),
      pythonVersion: z.string().min(1),
      packages: z
        .array(z.object({ name: z.string().min(1), version: z.string().min(1) }))
        .min(1),
      samplingRate: z.string().min(1),
      sampleCount: z.string().min(1),
      duration: z.string().min(1),
      environment: z.string().min(1),
    }),

    /**
     * Lessons this lab deliberately does NOT re-teach (1A §21). Empty is
     * legitimate — not every lab has a prerequisite elsewhere in the
     * platform — but where one exists, linking it is what stops a lab from
     * growing a second course inside itself.
     */
    crossReferences: z.array(labCrossReferenceSchema).default([]),

    /**
     * Mirrors the banner rule in
     * `docs/robotics-projects/PHASE_6_PHYSICAL_VALIDATION_CHECKLIST.md`.
     * Every lab ships THEORETICALLY_DESIGNED and is promoted only after a
     * real run, with a note naming the run that validates it. A learner
     * must never mistake a designed protocol for a proven one.
     */
    validationStatus: z.enum(labValidationStatuses),
    validationNote: z.string().min(1).optional(),

    /**
     * The simulation-first escape hatch (spec: SIMULATION-FIRST SAFETY).
     * Names the lesson a learner with no robot should do instead.
     *
     * Required, not optional, so "provide a simulation path whenever
     * practical" is structural rather than something an author remembers.
     * Every statistical objective in this course is reachable without
     * hardware; a lab is how you meet it on a real machine, never the only
     * way to meet it.
     */
    simulationFallbackLessonSlug: z.string().min(1),
  })
  .refine(
    (lab) =>
      lab.validationStatus !== "PHYSICALLY_VALIDATED" || Boolean(lab.validationNote),
    {
      message:
        "A PHYSICALLY_VALIDATED lab must record which run validates it",
      path: ["validationNote"],
    }
  )
  /**
   * A lab that moves the robot must state a speed limit.
   *
   * The failure mode this guards is an author adapting a static-sensor lab
   * into a moving one and carrying the old safety block across unchanged.
   * Keyed off `movesTheRobot` rather than off the prose — see that field
   * for why the prose-scanning version had to go.
   */
  .refine((lab) => !lab.movesTheRobot || Boolean(lab.safety.speedLimits), {
    message: "A lab that moves the robot must state safety.speedLimits",
    path: ["safety", "speedLimits"],
  });

export type LabProtocolBlockData = z.infer<typeof labProtocolBlockSchema>;
