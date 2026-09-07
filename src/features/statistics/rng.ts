/**
 * Seeded pseudo-random number generation for the statistics course
 * (§40: ten lines of arithmetic, not a dependency).
 *
 * WHY NOT `Math.random`
 *
 * Reproducibility is a hard requirement of this course, not a nicety.
 * Spec §47 requires every experiment to be reproducible, and lesson prose
 * quotes concrete numbers — "with these parameters you should see a sample
 * mean near 2.00" — which has to be true on the reader's screen, in the
 * static figure `statsrobotics/figures.py` generated, and in the CI test
 * that checks the two agree. `Math.random` is seeded by the engine and
 * cannot promise any of that.
 *
 * The generator is mulberry32: a 32-bit state, one multiply-xorshift
 * round, and a period of 2^32. That period is far beyond anything a
 * lesson asks for (the largest sample count the block schema permits is
 * 50,000), and its output passes the statistical quality bar that matters
 * here — histograms, moments and quantiles of a few thousand draws. It is
 * NOT a cryptographic generator and must never be used as one; nothing in
 * this course generates a secret.
 */

/**
 * A uniform [0, 1) source. The same shape `Math.random` has, so every
 * consumer takes this rather than reaching for the global.
 */
export type Rng = () => number;

/**
 * Build a deterministic generator. The same seed always yields the same
 * sequence, in this process and in any other.
 *
 * `seed` is coerced to a 32-bit unsigned integer, so any finite number is
 * accepted and a non-integer or negative seed is stable rather than
 * undefined behaviour.
 */
export function createRng(seed: number): Rng {
  if (!Number.isFinite(seed)) {
    throw new RangeError(`Seed must be a finite number, received ${seed}`);
  }

  // >>> 0 coerces through ToUint32, which also truncates a fractional seed.
  let state = seed >>> 0;

  return function next(): number {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Draw `count` values from `draw`.
 *
 * Exists so that every sampling call site looks the same and none of them
 * hand-roll a loop that accidentally reuses a generator or draws one value
 * too few. `count` is validated because a sim block's sample count comes
 * from learner-facing slider state.
 */
export function drawSamples(count: number, draw: () => number): number[] {
  if (!Number.isInteger(count) || count < 0) {
    throw new RangeError(`Sample count must be a non-negative integer, received ${count}`);
  }

  const samples = new Array<number>(count);
  for (let i = 0; i < count; i += 1) {
    samples[i] = draw();
  }
  return samples;
}
