"use client";

import { useId } from "react";

import { cn } from "@/lib/utils";

import type { ParameterSpec } from "../distributions";

/**
 * One learner-facing parameter, rendered from its `ParameterSpec`.
 *
 * REGISTRY-DRIVEN, NOT PER-DISTRIBUTION
 *
 * This component never learns which distribution it belongs to. It is
 * handed a `ParameterSpec` — the same object the registry declares and the
 * block schema validates against — so mu, sigma, a, b and lambda are all
 * this one component. That is the mechanism by which three distributions
 * share one simulator rather than having three; see
 * `distribution-simulator.tsx`.
 *
 * ACCESSIBILITY (§24)
 *
 * A native `<input type="range">`, so keyboard interaction (arrows,
 * Home/End, PageUp/PageDown) comes from the platform rather than being
 * reimplemented. The label is a real `<label>`; the parameter's
 * description is wired through `aria-describedby` so it is announced, not
 * merely displayed; and the live value is in the label text itself, which
 * a screen reader reads on every change without needing a live region.
 */

export interface ParameterControlProps {
  parameter: ParameterSpec;
  value: number;
  onChange: (key: string, value: number) => void;
  /** Rendered read-only — a lesson varying one parameter at a time. */
  locked?: boolean;
  /** Overrides the registry's suggested slider bounds. */
  min?: number;
  max?: number;
  step?: number;
  className?: string;
}

export function ParameterControl({
  parameter,
  value,
  onChange,
  locked = false,
  min,
  max,
  step,
  className,
}: ParameterControlProps) {
  const inputId = useId();
  const descriptionId = `${inputId}-description`;

  const resolvedMin = min ?? parameter.suggestedMin;
  const resolvedMax = max ?? parameter.suggestedMax;
  const resolvedStep = step ?? parameter.suggestedStep;

  // Match the displayed precision to the step, so a 0.001 step does not
  // render "2" while the value is really 2.0004.
  const decimals = Math.max(0, Math.ceil(-Math.log10(resolvedStep)));
  const displayValue = value.toFixed(Number.isFinite(decimals) ? decimals : 2);

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <label
        htmlFor={inputId}
        className="flex items-baseline justify-between gap-3 text-body-sm"
      >
        <span>{parameter.label}</span>
        <span className="text-muted-foreground tabular-nums">
          {displayValue}
          {parameter.unit ? ` ${parameter.unit}` : ""}
          {locked ? " (fixed)" : ""}
        </span>
      </label>

      <input
        id={inputId}
        type="range"
        min={resolvedMin}
        max={resolvedMax}
        step={resolvedStep}
        value={value}
        disabled={locked}
        aria-describedby={descriptionId}
        onChange={(event) => onChange(parameter.key, event.target.valueAsNumber)}
        className={cn(
          "accent-primary h-2 w-full cursor-pointer",
          locked && "cursor-not-allowed opacity-60"
        )}
      />

      <p id={descriptionId} className="text-muted-foreground text-caption">
        {parameter.description}
      </p>
    </div>
  );
}

/**
 * Sample count is not a distribution parameter — it is a property of the
 * experiment, and every distribution has it. It gets its own spec here
 * rather than being added to each registry entry, so that the registry
 * stays a description of the *mathematics* and does not accumulate
 * simulation-UI concerns.
 *
 * The range runs to 5,000 rather than the schema's 50,000 ceiling: 5,000
 * is the flagship lab's sample count, and a slider whose useful range is
 * its first tenth is a bad control. A lesson needing more passes explicit
 * bounds.
 */
export const SAMPLE_COUNT_PARAMETER: ParameterSpec = {
  key: "n",
  label: "Samples",
  suggestedMin: 10,
  suggestedMax: 5_000,
  suggestedStep: 10,
  defaultValue: 1_000,
  description:
    "How many measurements to draw. Watch how much the statistics move when this is small.",
};
