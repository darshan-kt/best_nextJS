import Link from "next/link";

import { RichTextView } from "@/features/exercises/components/rich-text-view";
import type { LabProtocolBlockData, LabStep } from "@/features/labs/schemas";

/**
 * `LAB_PROTOCOL` adapter — a physical robot lab, rendered read-only.
 *
 * NO JAVASCRIPT, DELIBERATELY
 *
 * A Server Component with no client boundary anywhere in it. That is not a
 * performance note, it is the architecture: this block is instructional
 * content and nothing more. No rosbridge, no browser-initiated motion, no
 * telemetry socket, no submission. The learner reads it here and runs it
 * on their own machine, with their own hands on the robot.
 *
 * FIFTEEN FLAT FIELDS, FOUR VISUAL PHASES
 *
 * The payload keeps the fifteen spec sections as fifteen required
 * top-level fields (see `labProtocolBlockSchema` for why). The grouping
 * into phases happens *here*, in the presentation layer, so a later
 * redesign of this page is a change to this file rather than a data
 * migration across every seeded lab (§5).
 *
 * SAFETY APPEARS TWICE, AND THAT IS THE POINT
 *
 * Once at the top, before any step, where a learner reads it before
 * touching anything; and again immediately before the procedure, where the
 * robot actually starts moving. A safety section read only at the top is a
 * safety section read once and forgotten, and its four parts do not all
 * apply at the same moment — preflight before, emergency stop during,
 * supervision throughout. Duplicating it is cheaper than the alternative.
 *
 * THE VALIDATION BANNER IS NOT A BADGE
 *
 * `THEORETICALLY_DESIGNED` renders as a full-width banner at the top,
 * mirroring the rule already in force in
 * `docs/robotics-projects/PHASE_6_PHYSICAL_VALIDATION_CHECKLIST.md`. A
 * learner must not be able to mistake a protocol that has been designed
 * for one that has been run.
 */

function LabSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-6 first:mt-0">
      <h4 className="text-title-sm mb-2">{title}</h4>
      {children}
    </section>
  );
}

/**
 * An ordered list of steps, each with its optional stop-and-check.
 *
 * `<ol>` rather than styled divs so the numbering is real: a screen reader
 * announces "3 of 7", and "go back to step 3" means something.
 */
function StepList({ steps }: { steps: readonly LabStep[] }) {
  return (
    <ol className="flex list-decimal flex-col gap-4 pl-5">
      {steps.map((step, index) => (
        <li key={index} className="pl-1">
          <p className="text-body font-medium">{step.title}</p>
          <div className="mt-1">
            <RichTextView content={step.content} />
          </div>
          {step.checkpoint ? (
            <p className="border-primary bg-accent/40 text-body-sm mt-2 border-l-2 py-1.5 pl-3">
              <span className="font-medium">Check before continuing: </span>
              {step.checkpoint}
            </p>
          ) : null}
        </li>
      ))}
    </ol>
  );
}

function SafetyPanel({
  safety,
  movesTheRobot,
  compact = false,
}: {
  safety: LabProtocolBlockData["safety"];
  movesTheRobot: boolean;
  compact?: boolean;
}) {
  return (
    <div
      className="border-destructive/40 bg-destructive/5 rounded-md border p-4"
      role="note"
      aria-label={compact ? "Safety reminder" : "Safety"}
    >
      <p className="text-title-sm text-destructive">
        {compact ? "Before you start the run" : "Safety"}
      </p>

      {/* Stated first and in plain words, because it is the single fact
          that determines how much of the rest matters. A learner skimming
          should not have to infer it from the presence of a speed limit. */}
      <p className="text-body-sm mt-2 font-medium">
        {movesTheRobot
          ? "This lab moves the robot under its own power."
          : "This lab moves nothing. The robot and the sensor stay where you put them."}
      </p>

      <dl className="mt-3 flex flex-col gap-3">
        <div>
          <dt className="text-body-sm font-medium">Pre-flight checks</dt>
          <dd>
            <ul className="text-body-sm mt-1 list-disc space-y-1 pl-5">
              {safety.preflight.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </dd>
        </div>

        <div>
          <dt className="text-body-sm font-medium">Emergency stop</dt>
          <dd className="text-body-sm mt-1">{safety.emergencyStop}</dd>
        </div>

        <div>
          <dt className="text-body-sm font-medium">Supervision</dt>
          <dd className="text-body-sm mt-1">{safety.supervision}</dd>
        </div>

        {safety.speedLimits ? (
          <div>
            <dt className="text-body-sm font-medium">Speed limits</dt>
            <dd className="text-body-sm mt-1">{safety.speedLimits}</dd>
          </div>
        ) : null}
      </dl>
    </div>
  );
}

export function LabProtocolBlock({
  data,
  courseSlug,
}: {
  data: LabProtocolBlockData;
  courseSlug: string;
}) {
  const validated = data.validationStatus === "PHYSICALLY_VALIDATED";

  return (
    <section
      className="border-border bg-card rounded-lg border p-4 sm:p-6"
      aria-label={`Physical lab: ${data.title}`}
    >
      <header>
        <p className="text-caption text-muted-foreground uppercase tracking-wide">
          Physical robot lab
        </p>
        <h3 className="text-title mt-1">{data.title}</h3>
      </header>

      {/* The banner, not a badge. */}
      <div
        role="note"
        aria-label="Validation status"
        className={
          validated
            ? "border-border bg-accent/40 text-body-sm mt-4 rounded-md border p-3"
            : "border-warning/50 bg-warning/10 text-body-sm mt-4 rounded-md border p-3"
        }
      >
        {validated ? (
          <>
            <span className="font-medium">Physically validated. </span>
            {data.validationNote}
          </>
        ) : (
          <>
            <span className="font-medium">
              Theoretically designed — not yet run on hardware.{" "}
            </span>
            This protocol has been written and reviewed but never executed on a
            real robot. Expect to find gaps. Treat the expected observations
            below as predictions rather than measurements, and stop if anything
            behaves in a way the troubleshooting section does not cover.
          </>
        )}
      </div>

      <LabSection title="Objective">
        <p className="text-body text-pretty">{data.objective}</p>
      </LabSection>

      {/* Safety, first pass: before any step at all. */}
      <div className="mt-6">
        <SafetyPanel safety={data.safety} movesTheRobot={data.movesTheRobot} />
      </div>

      <LabSection title="No robot? Do this instead">
        <p className="text-body-sm">
          Every statistical objective in this lab is reachable without hardware.{" "}
          <Link
            className="text-accent-foreground underline underline-offset-2"
            href={`/courses/${courseSlug}/learn/${data.simulationFallbackLessonSlug}`}
          >
            Take the simulation route
          </Link>{" "}
          and come back to this page if and when a robot is available.
        </p>
      </LabSection>

      {data.crossReferences.length > 0 ? (
        <LabSection title="What this lab does not teach">
          <p className="text-body-sm text-muted-foreground mb-2">
            These are covered properly elsewhere on the platform, and this lab
            starts from the state they leave you in.
          </p>
          <ul className="flex flex-col gap-2">
            {data.crossReferences.map((reference) => (
              <li key={`${reference.courseSlug}/${reference.lessonSlug}`}>
                <Link
                  className="text-accent-foreground text-body-sm underline underline-offset-2"
                  href={`/courses/${reference.courseSlug}/learn/${reference.lessonSlug}`}
                >
                  {reference.label}
                </Link>
                <span className="text-muted-foreground text-body-sm">
                  {" "}
                  — {reference.reason}
                </span>
              </li>
            ))}
          </ul>
        </LabSection>
      ) : null}

      {/* ---------------------------------------------- phase 1: bring */}
      <LabSection title="What you need">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <h5 className="text-body-sm mb-1 font-medium">Hardware</h5>
            <ul className="text-body-sm list-disc space-y-1 pl-5">
              {data.requiredHardware.map((item) => (
                <li key={item.label}>
                  {item.deviceSlug ? (
                    <Link
                      className="text-accent-foreground underline underline-offset-2"
                      href={`/hardware/${item.deviceSlug}`}
                    >
                      {item.label}
                    </Link>
                  ) : (
                    item.label
                  )}
                  {item.note ? (
                    <span className="text-muted-foreground"> — {item.note}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h5 className="text-body-sm mb-1 font-medium">Software</h5>
            <ul className="text-body-sm list-disc space-y-1 pl-5">
              {data.requiredSoftware.map((item) => (
                <li key={item.name}>
                  {item.name}{" "}
                  <span className="text-muted-foreground tabular-nums">
                    {item.version}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </LabSection>

      {/* ---------------------------------------------- phase 2: set up */}
      <LabSection title="1 · Set up the workspace">
        <StepList steps={data.workspaceSetup} />
      </LabSection>

      <LabSection title="2 · Prepare the robot">
        <StepList steps={data.robotPreparation} />
      </LabSection>

      <LabSection title="3 · Bring up ROS 2 and verify the topics">
        <StepList steps={data.ros2Commands} />
      </LabSection>

      {/* Safety, second pass: immediately before anything happens. */}
      <div className="mt-6">
        <SafetyPanel
          safety={data.safety}
          movesTheRobot={data.movesTheRobot}
          compact
        />
      </div>

      {/* ---------------------------------------------- phase 3: run */}
      <LabSection title="4 · Run the experiment">
        <StepList steps={data.procedure} />
      </LabSection>

      <LabSection title="5 · Collect the data">
        <StepList steps={data.dataCollection} />
      </LabSection>

      <LabSection title="6 · Analyse it in Python">
        <StepList steps={data.pythonAnalysis} />
      </LabSection>

      {/* ---------------------------------------------- phase 4: after */}
      <LabSection title="What a correct run looks like">
        <p className="text-body-sm text-muted-foreground mb-2">
          If your results differ from these, that is not automatically a
          mistake — but it is the moment to check the setup before
          interpreting the numbers.
        </p>
        <ul className="text-body-sm list-disc space-y-1 pl-5">
          {data.expectedObservations.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </LabSection>

      <LabSection title="Interpreting what you measured">
        <RichTextView content={data.interpretation} />
      </LabSection>

      <LabSection title="When it goes wrong">
        {/* A real table: three columns that are genuinely three columns.
            `whatToCheck` is the one authors drop, so it gets a heading of
            its own rather than being folded into the cause. */}
        <div className="overflow-x-auto">
          <table className="text-body-sm w-full border-collapse text-left">
            <thead>
              <tr className="border-border border-b">
                <th scope="col" className="py-2 pr-4 font-medium">
                  Symptom
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  Likely cause
                </th>
                <th scope="col" className="py-2 font-medium">
                  What to check
                </th>
              </tr>
            </thead>
            <tbody>
              {data.troubleshooting.map((entry) => (
                <tr key={entry.symptom} className="border-border/60 border-b">
                  <th scope="row" className="py-2 pr-4 font-normal align-top">
                    {entry.symptom}
                  </th>
                  <td className="text-muted-foreground py-2 pr-4 align-top">
                    {entry.likelyCause}
                  </td>
                  <td className="py-2 align-top">{entry.whatToCheck}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </LabSection>

      <LabSection title="Before you leave">
        <ul className="text-body-sm list-disc space-y-1 pl-5">
          {data.cleanup.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </LabSection>

      {data.challenge ? (
        <LabSection title="Going further">
          <RichTextView content={data.challenge} />
        </LabSection>
      ) : null}

      <LabSection title="Reproducibility record">
        <p className="text-body-sm text-muted-foreground mb-2">
          Write these down with your results. Someone repeating this lab — you,
          in six months — needs them to tell a real difference from a different
          setup.
        </p>
        <div className="overflow-x-auto">
          <table className="text-body-sm w-full border-collapse text-left">
            <tbody>
              {[
                ["ROS 2 distribution", data.reproducibility.ros2Distro],
                ["Python", data.reproducibility.pythonVersion],
                [
                  "Packages",
                  data.reproducibility.packages
                    .map((p) => `${p.name} ${p.version}`)
                    .join(", "),
                ],
                ["Sampling rate", data.reproducibility.samplingRate],
                ["Sample count", data.reproducibility.sampleCount],
                ["Duration", data.reproducibility.duration],
                ["Environment", data.reproducibility.environment],
              ].map(([label, value]) => (
                <tr key={label} className="border-border/60 border-b">
                  <th scope="row" className="w-48 py-2 pr-4 font-medium">
                    {label}
                  </th>
                  <td className="py-2">{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </LabSection>
    </section>
  );
}
