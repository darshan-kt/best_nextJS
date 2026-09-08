"""
LAB 1 generator: draw uniform random target positions inside a rectangular
workspace and write them to a CSV for dispatch.

Run:

    python3 uniform_target_generator.py --out targets.csv --count 40

Requires numpy only.

WHY THE COMMANDED TARGETS ARE SAVED, NOT JUST SENT
The lab compares where you TOLD the robot to go against where it actually
ended up. That comparison needs both halves on disk. Generating targets
and dispatching them in one step, without recording them, is the single
easiest way to end a lab session with data you cannot analyse.

REPRODUCIBILITY
The seed is an argument and it is written into the CSV header comment. Two
runs with the same seed produce the same target list, which is what lets
you repeat a run after changing something about the robot.
"""

import argparse

import numpy as np


def generate(rng: np.random.Generator, x_bounds, y_bounds, count):
    """Two independent uniform draws per target -- x and y are unrelated."""
    xs = rng.uniform(x_bounds[0], x_bounds[1], size=count)
    ys = rng.uniform(y_bounds[0], y_bounds[1], size=count)
    return xs, ys


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", default="targets.csv")
    parser.add_argument("--count", type=int, default=40)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--x-min", type=float, default=0.0)
    parser.add_argument("--x-max", type=float, default=2.0)
    parser.add_argument("--y-min", type=float, default=0.0)
    parser.add_argument("--y-max", type=float, default=2.0)
    args = parser.parse_args()

    rng = np.random.default_rng(args.seed)
    xs, ys = generate(rng, (args.x_min, args.x_max), (args.y_min, args.y_max), args.count)

    with open(args.out, "w") as handle:
        handle.write(
            f"# seed={args.seed} x=[{args.x_min},{args.x_max}] "
            f"y=[{args.y_min},{args.y_max}] count={args.count}\n"
        )
        handle.write("target_index,x_commanded,y_commanded\n")
        for i, (x, y) in enumerate(zip(xs, ys)):
            handle.write(f"{i},{x:.4f},{y:.4f}\n")

    print(f"wrote {args.count} targets to {args.out}")
    print(f"  commanded x mean {xs.mean():.4f} m   (model {(args.x_min + args.x_max) / 2:.4f} m)")
    print(f"  commanded y mean {ys.mean():.4f} m   (model {(args.y_min + args.y_max) / 2:.4f} m)")
    print()
    print("Those two means are close to the workspace centre but not equal to")
    print("it, and at n = 40 they are not going to be. That gap is sampling")
    print("variability in the COMMANDS, before the robot has moved at all --")
    print("worth measuring now, so you do not later attribute it to the base.")


if __name__ == "__main__":
    main()
