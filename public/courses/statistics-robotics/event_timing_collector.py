"""
LAB 3 collector: record the TIMES at which something crosses in front of
the robot, so you can turn them into waiting times.

Run:

    python3 event_timing_collector.py --out crossings.csv --duration 600

WHY THIS LOGS TIMESTAMPS AND NOT INTERVALS
The thing the robot observes is an event at a moment. The waiting time is
a DERIVED quantity -- the difference between consecutive moments -- and
computing it here would hide the step where the modelling decision
actually happens. M4.2 is about that step, so this file leaves it undone
on purpose. The CSV is timestamps; you take the differences yourself.

WHAT COUNTS AS AN EVENT
A crossing begins when the closest range inside the front sector drops
below `--threshold` and ends when it rises back above it plus a hysteresis
margin. Only the START of a crossing is logged: an object that lingers is
one event, not a burst of them.

Hysteresis is not a detail. Without it a target sitting exactly at the
threshold generates hundreds of "events" per minute as noise pushes it
back and forth across the line -- and those events are emphatically not
independent, which would break the exponential model in a way that looks
like data rather than like a bug.
"""

import argparse
import csv
import math
import time

import rclpy
from rclpy.node import Node
from rclpy.qos import QoSProfile, ReliabilityPolicy, HistoryPolicy
from sensor_msgs.msg import LaserScan


class CrossingLogger(Node):
    def __init__(self, out_path: str, threshold: float, hysteresis: float,
                 sector_deg: float, duration_s: float):
        super().__init__("crossing_logger")

        qos = QoSProfile(
            reliability=ReliabilityPolicy.BEST_EFFORT,
            history=HistoryPolicy.KEEP_LAST,
            depth=10,
        )

        self.threshold = threshold
        self.release = threshold + hysteresis
        self.half_sector = math.radians(sector_deg) / 2.0
        self.deadline = time.monotonic() + duration_s
        self.occupied = False
        self.count = 0

        self.file = open(out_path, "w", newline="")
        self.writer = csv.writer(self.file)
        self.writer.writerow(["event_index", "stamp_sec", "closest_range_m"])

        self.subscription = self.create_subscription(
            LaserScan, "/scan", self.on_scan, qos
        )
        self.get_logger().info(
            f"watching a {sector_deg:.0f} deg sector, threshold {threshold:.2f} m "
            f"(release {self.release:.2f} m), for {duration_s:.0f} s"
        )

    def on_scan(self, msg: LaserScan) -> None:
        if time.monotonic() > self.deadline:
            self.get_logger().info(f"window elapsed: {self.count} events")
            self.file.flush()
            raise SystemExit(0)

        closest = math.inf
        for i, value in enumerate(msg.ranges):
            if not math.isfinite(value):
                continue
            angle = msg.angle_min + i * msg.angle_increment
            if abs(angle) <= self.half_sector and value < closest:
                closest = value

        if not math.isfinite(closest):
            return

        stamp = msg.header.stamp.sec + msg.header.stamp.nanosec * 1e-9

        if not self.occupied and closest < self.threshold:
            # Rising edge: a crossing has begun.
            self.occupied = True
            self.writer.writerow([self.count, f"{stamp:.6f}", f"{closest:.4f}"])
            self.count += 1
            self.get_logger().info(f"event {self.count} at {closest:.2f} m")
        elif self.occupied and closest > self.release:
            self.occupied = False


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", default="crossings.csv")
    parser.add_argument("--threshold", type=float, default=1.5,
                        help="metres; closer than this inside the sector is an event")
    parser.add_argument("--hysteresis", type=float, default=0.3,
                        help="metres the target must retreat before a new event can fire")
    parser.add_argument("--sector-deg", type=float, default=60.0)
    parser.add_argument("--duration", type=float, default=600.0, help="seconds")
    args = parser.parse_args()

    rclpy.init()
    node = CrossingLogger(args.out, args.threshold, args.hysteresis,
                          args.sector_deg, args.duration)
    try:
        rclpy.spin(node)
    except (KeyboardInterrupt, SystemExit):
        pass
    finally:
        node.file.close()
        node.destroy_node()
        rclpy.try_shutdown()
        print(f"wrote {node.count} events to {args.out}")


if __name__ == "__main__":
    main()
