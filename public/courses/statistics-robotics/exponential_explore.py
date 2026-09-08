"""
Exponential distribution: inverse-CDF sampling, and estimating lambda.

Run:
    python3 exponential_explore.py

Requires numpy and matplotlib only.

WHY INVERSE-CDF SAMPLING IS SHOWN HERE
The exponential CDF inverts in closed form -- t = -ln(1-u)/lambda -- so
one uniform draw becomes one exponential draw with a single line of
arithmetic. That is not true of the Gaussian, which is why M3.6 calls a
library routine and this file does not have to.
"""

import numpy as np
import matplotlib.pyplot as plt

SEED = 42
LAMBDA = 0.25    # events per second, so a mean wait of 4 s
N = 2000


def sample_exponential(rng: np.random.Generator, rate: float,
                       size: int) -> np.ndarray:
    """Inverse-CDF sampling, written out."""
    u = rng.uniform(0.0, 1.0, size=size)
    # 1 - u rather than u so the log never sees exactly zero.
    return -np.log(1.0 - u) / rate


def main() -> None:
    rng = np.random.default_rng(SEED)
    waits = sample_exponential(rng, LAMBDA, N)

    lambda_hat = 1.0 / waits.mean()

    print(f"n = {N}, lambda = {LAMBDA} /s, seed = {SEED}")
    print(f"  mean wait       {waits.mean():.4f} s   "
          f"(model {1.0 / LAMBDA:.4f} s)")
    print(f"  median wait     {np.median(waits):.4f} s   "
          f"(model {np.log(2) / LAMBDA:.4f} s)")
    print(f"  lambda-hat      {lambda_hat:.4f} /s  (true {LAMBDA:.4f} /s)")
    print()
    print("The median is well below the mean -- the distribution is not")
    print("symmetric, so 'typical' and 'average' are different numbers.")
    print("Quoting only the mean of a waiting time hides that.")
    print()
    shortest_quarter = np.mean(waits < 1.0 / LAMBDA * 0.25)
    print(f"  {shortest_quarter * 100:.1f}% of waits are under a quarter of")
    print("  the mean. The most likely wait is near zero, and the mean is")
    print("  still 1/lambda. Both are true at once.")

    grid = np.linspace(0.0, waits.max(), 400)

    fig, ax = plt.subplots(figsize=(7, 4))
    ax.hist(waits, bins=40, density=True, alpha=0.65, label=f"{N} samples")
    ax.plot(grid, LAMBDA * np.exp(-LAMBDA * grid), linewidth=2,
            label="model density")
    ax.set_xlabel("Waiting time (s)")
    ax.set_ylabel("Density (1/s)")
    ax.set_title("Waiting times: most are short, a few are long")
    ax.legend()
    fig.tight_layout()
    fig.savefig("exponential_explore.png", dpi=140)
    print("\nWrote exponential_explore.png")


if __name__ == "__main__":
    main()
