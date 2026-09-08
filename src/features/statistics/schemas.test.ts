import { describe, expect, it } from "vitest";

import { distributionSimBlockSchema } from "./schemas";

/**
 * `DISTRIBUTION_SIM` payload validation (§9), following the adversarial
 * pattern `features/learning/schemas.test.ts` established: every schema
 * gets an accepting case, a rejecting case, and the specific edge its
 * refinement exists to catch.
 *
 * The registry cross-check is the interesting part — no other block schema
 * in this codebase validates against another module's data, and it is what
 * stops a lesson's sliders drifting away from the mathematics they drive.
 */

const GAUSSIAN_CONTROLS = [
  { key: "mu", label: "Mean", min: -5, max: 5, step: 0.1, default: 0 },
  { key: "sigma", label: "Sigma", min: 0.01, max: 3, step: 0.01, default: 1 },
];

const VALID = {
  distribution: "GAUSSIAN",
  title: "Sensor noise, simulated",
  prompt: "Set sigma to 0.02. How many readings land outside two sigma?",
  controls: GAUSSIAN_CONTROLS,
  views: ["PDF"],
};

describe("distributionSimBlockSchema", () => {
  it("accepts a complete block and applies defaults", () => {
    const parsed = distributionSimBlockSchema.safeParse(VALID);

    expect(parsed.success).toBe(true);
    if (!parsed.success) return;

    expect(parsed.data.seed).toBe(42);
    expect(parsed.data.binCount).toBe(40);
    expect(parsed.data.maxSamples).toBe(5_000);
    expect(parsed.data.interactive).toBe(true);
  });

  it("rejects an empty prompt", () => {
    // A slider with no question attached is a toy (spec §38).
    expect(
      distributionSimBlockSchema.safeParse({ ...VALID, prompt: "" }).success
    ).toBe(false);
  });

  it("rejects a block with no controls or no views", () => {
    expect(
      distributionSimBlockSchema.safeParse({ ...VALID, controls: [] }).success
    ).toBe(false);
    expect(
      distributionSimBlockSchema.safeParse({ ...VALID, views: [] }).success
    ).toBe(false);
  });

  describe("registry cross-check", () => {
    it("rejects a control for a parameter the distribution does not have", () => {
      const parsed = distributionSimBlockSchema.safeParse({
        ...VALID,
        distribution: "EXPONENTIAL",
        controls: [
          { key: "lambda", label: "Rate", min: 0.1, max: 5, step: 0.1, default: 1 },
          { key: "sigma", label: "Sigma", min: 0, max: 1, step: 0.1, default: 0.5 },
        ],
      });

      expect(parsed.success).toBe(false);
      if (parsed.success) return;
      expect(parsed.error.issues.map((issue) => issue.message)).toContain(
        '"sigma" is not a parameter of EXPONENTIAL'
      );
    });

    it("rejects a block missing a control the distribution requires", () => {
      const parsed = distributionSimBlockSchema.safeParse({
        ...VALID,
        controls: [GAUSSIAN_CONTROLS[0]],
      });

      expect(parsed.success).toBe(false);
      if (parsed.success) return;
      expect(parsed.error.issues.map((issue) => issue.message)).toContain(
        'GAUSSIAN requires a control for "sigma"'
      );
    });

    it('allows the universal "n" sample-count control', () => {
      expect(
        distributionSimBlockSchema.safeParse({
          ...VALID,
          controls: [
            ...GAUSSIAN_CONTROLS,
            { key: "n", label: "Samples", min: 10, max: 5000, step: 10, default: 1000 },
          ],
        }).success
      ).toBe(true);
    });
  });

  describe("control bounds", () => {
    it("rejects min >= max", () => {
      expect(
        distributionSimBlockSchema.safeParse({
          ...VALID,
          controls: [{ ...GAUSSIAN_CONTROLS[0], min: 5, max: 5 }, GAUSSIAN_CONTROLS[1]],
        }).success
      ).toBe(false);
    });

    it("rejects a default outside its own range", () => {
      expect(
        distributionSimBlockSchema.safeParse({
          ...VALID,
          controls: [{ ...GAUSSIAN_CONTROLS[0], default: 99 }, GAUSSIAN_CONTROLS[1]],
        }).success
      ).toBe(false);
    });

    it("rejects a non-positive step", () => {
      expect(
        distributionSimBlockSchema.safeParse({
          ...VALID,
          controls: [{ ...GAUSSIAN_CONTROLS[0], step: 0 }, GAUSSIAN_CONTROLS[1]],
        }).success
      ).toBe(false);
    });
  });

  describe("SCATTER_2D is tied to UNIFORM", () => {
    it("rejects SCATTER_2D on a Gaussian", () => {
      expect(
        distributionSimBlockSchema.safeParse({
          ...VALID,
          views: ["PDF", "SCATTER_2D"],
        }).success
      ).toBe(false);
    });

    it("allows a Uniform with or without SCATTER_2D", () => {
      // Deliberately NOT a biconditional. An earlier version required
      // every UNIFORM block to carry the scatter view; seeding the uniform
      // module produced four uniform figures that legitimately do not want
      // it (the density/CDF pair, the mean-and-variance demo, the
      // histogram-unevenness explorer, and the three-way comparison in
      // `side-by-side`). The constraint is one-way: the view needs a
      // uniform, a uniform does not need the view.
      const uniformControls = [
        { key: "a", label: "Min", min: -5, max: 5, step: 0.1, default: 0 },
        { key: "b", label: "Max", min: -5, max: 5, step: 0.1, default: 1 },
      ];

      expect(
        distributionSimBlockSchema.safeParse({
          ...VALID,
          distribution: "UNIFORM",
          controls: uniformControls,
          views: ["PDF"],
        }).success
      ).toBe(true);

      expect(
        distributionSimBlockSchema.safeParse({
          ...VALID,
          distribution: "UNIFORM",
          controls: uniformControls,
          views: ["PDF", "SCATTER_2D"],
        }).success
      ).toBe(true);
    });
  });

  describe("xDomain", () => {
    it("accepts an ordered domain", () => {
      expect(
        distributionSimBlockSchema.safeParse({ ...VALID, xDomain: [-3, 3] }).success
      ).toBe(true);
    });

    it("rejects a reversed or zero-width domain", () => {
      expect(
        distributionSimBlockSchema.safeParse({ ...VALID, xDomain: [3, -3] }).success
      ).toBe(false);
      expect(
        distributionSimBlockSchema.safeParse({ ...VALID, xDomain: [1, 1] }).success
      ).toBe(false);
    });
  });

  it("caps maxSamples at the simulation ceiling", () => {
    expect(
      distributionSimBlockSchema.safeParse({ ...VALID, maxSamples: 50_001 }).success
    ).toBe(false);
  });

  it("rejects a bin count outside the renderable range", () => {
    expect(distributionSimBlockSchema.safeParse({ ...VALID, binCount: 4 }).success).toBe(false);
    expect(distributionSimBlockSchema.safeParse({ ...VALID, binCount: 121 }).success).toBe(false);
  });
});
