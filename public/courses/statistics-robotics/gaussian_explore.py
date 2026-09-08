"""
Gaussian distribution: generate, summarize, and compare against theory.

Run:
    python3 gaussian_explore.py

Requires numpy and matplotlib only -- not the course's `statsrobotics`
package, so it runs on your machine today.

REPRODUCIBILITY
The seed is fixed, so these are the numbers M3.6 quotes. If yours differ,
check your numpy version before suspecting anything else.
"""

import numpy as np
import matplotlib.pyplot as plt

SEED = 42
MU, SIGMA = 2.00, 0.02   # metres: a wall at 2 m, 2 cm of noise
N = 5000


def gaussian_pdf(x: np.ndarray, mu: float, sigma: float) -> np.ndarray:
    """Written out rather than imported, so every term is visible."""
    normalizer = 1.0 / (sigma * np.sqrt(2.0 * np.pi))
    return normalizer * np.exp(-0.5 * ((x - mu) / sigma) ** 2)


def main() -> None:
    rng = np.random.default_rng(SEED)
    samples = rng.normal(MU, SIGMA, size=N)

    print(f"n = {N}, mu = {MU}, sigma = {SIGMA}, seed = {SEED}")
    print(f"  sample mean     {samples.mean():.5f} m   (model {MU:.5f} m)")
    print(f"  sample st.dev.  {samples.std(ddof=1):.5f} m   "
          f"(model {SIGMA:.5f} m)")
    print()

    # The 68-95-99.7 rule, checked rather than asserted.
    for k in (1, 2, 3):
        within = np.mean(np.abs(samples - MU) < k * SIGMA)
        print(f"  within {k} sigma: {within * 100:.2f}%")
    print()
    print("Close to 68 / 95 / 99.7, not equal to it. The difference is")
    print("sampling variability, and it shrinks as n grows -- rerun with")
    print("N = 200 and watch it get worse.")

    grid = np.linspace(MU - 4 * SIGMA, MU + 4 * SIGMA, 400)

    fig, ax = plt.subplots(figsize=(7, 4))
    ax.hist(samples, bins=50, density=True, alpha=0.65,
            label=f"{N} samples")
    ax.plot(grid, gaussian_pdf(grid, MU, SIGMA), linewidth=2,
            label="model density")
    ax.set_xlabel("Measured distance (m)")
    ax.set_ylabel("Density (1/m)")
    ax.set_title("Sampled histogram against the model it came from")
    ax.legend()
    fig.tight_layout()
    fig.savefig("gaussian_explore.png", dpi=140)
    print("\nWrote gaussian_explore.png")


if __name__ == "__main__":
    main()
