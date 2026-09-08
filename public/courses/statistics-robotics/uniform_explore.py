"""
Uniform distribution: generate, summarize, and compare against theory.

Run:
    python3 uniform_explore.py

Requires numpy and matplotlib only. Deliberately NOT dependent on the
course's `statsrobotics` package -- this file is meant to run on your
machine today, with nothing installed beyond the two libraries above.

REPRODUCIBILITY
The seed below is fixed, so the numbers this prints are the numbers the
lesson quotes. Change SEED and they will change; that is the point of
M2.4, not a bug.
"""

import numpy as np
import matplotlib.pyplot as plt

SEED = 42
A, B = 0.0, 2.5      # workspace bounds, metres
N = 800              # how many targets to draw


def main() -> None:
    rng = np.random.default_rng(SEED)
    samples = rng.uniform(A, B, size=N)

    # What the model says, in closed form.
    theoretical_mean = (A + B) / 2
    theoretical_var = (B - A) ** 2 / 12

    print(f"n = {N}, a = {A}, b = {B}, seed = {SEED}")
    print(f"  sample mean     {samples.mean():.4f} m   "
          f"(model {theoretical_mean:.4f} m)")
    print(f"  sample variance {samples.var(ddof=1):.4f} m^2 "
          f"(model {theoretical_var:.4f} m^2)")
    print(f"  sample min/max  {samples.min():.4f} / {samples.max():.4f} m")
    print()
    print("The sample min is above a and the sample max is below b, every")
    print("time. No draw can land outside itself -- which is why estimating")
    print("the bounds from the data always gives an interval that is too")
    print("narrow. M2.4 is about that gap.")

    # Density, not counts: the bars and the flat line then share a y-axis
    # honestly. Plotting counts here is the most common way this figure is
    # drawn wrong.
    fig, ax = plt.subplots(figsize=(7, 4))
    ax.hist(samples, bins=25, range=(A, B), density=True,
            alpha=0.65, label=f"{N} samples")
    ax.axhline(1.0 / (B - A), linestyle="--", linewidth=2,
               label=f"model density 1/(b-a) = {1.0 / (B - A):.2f}")
    ax.set_xlabel("Target position (m)")
    ax.set_ylabel("Density (1/m)")
    ax.set_title("A finite sample is never perfectly flat")
    ax.legend()
    fig.tight_layout()
    fig.savefig("uniform_explore.png", dpi=140)
    print("\nWrote uniform_explore.png")


if __name__ == "__main__":
    main()
