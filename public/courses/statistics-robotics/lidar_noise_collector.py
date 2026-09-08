"""
LAB 2 collector: log range readings of a static target from /scan.

Run (from a workspace where rclpy is available and /scan is publishing):

    python3 lidar_noise_collector.py --out wall_2m.csv --samples 1000

WHAT THIS NODE DOES, AND WHAT IT DELIBERATELY DOES NOT
It subscribes to /scan, takes ONE range value per message -- the beam
closest to straight ahead -- and appends it to a CSV with a timestamp. It
does not average, does not filter, does not discard anything it considers
an outlier, and does not stop early. Every one of those would be a
modelling decision made before you have looked at the data, which is the
mistake this whole module is about.

It is also not a ROS 2 package. A single file you can read top to bottom
is the right shape for a lab whose subject is the data, not the build
system; `ros2 pkg create` when you want this in a launch file.

PROVENANCE COLUMNS
Every row carries the ROS timestamp and the beam angle actually used. When
your analysis produces something surprising, the first question is always
"which beam, and when" -- a CSV of bare numbers cannot answer it.
"""

import argparse
import csv
import math
import sys

import rclpy
from rclpy.node import Node
from rclpy.qos import QoSProfile, ReliabilityPolicy, HistoryPolicy
from sensor_msgs.msg import LaserScan


class RangeLogger(Node):
    def __init__(self, out_path: str, target_samples: int, angle_deg: float):
        super().__init__("range_logger")

        # SENSOR_DATA-style QoS: BEST_EFFORT. A LiDAR driver publishes
        # best-effort, and a RELIABLE subscription silently receives
        # nothing from it -- the single most common reason a collector
        # like this logs zero rows while `ros2 topic hz` looks fine.
        qos = QoSProfile(
            reliability=ReliabilityPolicy.BEST_EFFORT,
            history=HistoryPolicy.KEEP_LAST,
            depth=10,
        )

        self.target_samples = target_samples
        self.angle_rad = math.radians(angle_deg)
        self.count = 0
        self.rejected = 0

        self.file = open(out_path, "w", newline="")
        self.writer = csv.writer(self.file)
        self.writer.writerow(["sample_index", "stamp_sec", "beam_angle_rad", "range_m"])

        self.subscription = self.create_subscription(
            LaserScan, "/scan", self.on_scan, qos
        )
        self.get_logger().info(
            f"logging beam at {angle_deg:.1f} deg to {out_path}; "
            f"target {target_samples} samples"
        )

    def on_scan(self, msg: LaserScan) -> None:
        index = int(round((self.angle_rad - msg.angle_min) / msg.angle_increment))
        if index < 0 or index >= len(msg.ranges):
            self.get_logger().warn("requested angle is outside this scan's field of view")
            return

        value = msg.ranges[index]

        # inf and nan mean "no return", which is not a measurement of
        # anything and is not an outlier either. Counted, not silently
        # dropped: a high reject rate is itself a finding about the target
        # surface, and you want to know it before you trust the rest.
        if not math.isfinite(value):
            self.rejected += 1
            return

        stamp = msg.header.stamp.sec + msg.header.stamp.nanosec * 1e-9
        self.writer.writerow([self.count, f"{stamp:.6f}", f"{self.angle_rad:.6f}", value])
        self.count += 1

        if self.count % 100 == 0:
            self.get_logger().info(f"{self.count} / {self.target_samples}")

        if self.count >= self.target_samples:
            self.get_logger().info(
                f"done: {self.count} samples, {self.rejected} non-finite returns skipped"
            )
            self.file.flush()
            raise SystemExit(0)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", default="wall_2m.csv")
    parser.add_argument("--samples", type=int, default=1000)
    parser.add_argument(
        "--angle-deg",
        type=float,
        default=0.0,
        help="beam to log, in degrees from straight ahead",
    )
    args = parser.parse_args()

    rclpy.init()
    node = RangeLogger(args.out, args.samples, args.angle_deg)
    try:
        rclpy.spin(node)
    except (KeyboardInterrupt, SystemExit):
        pass
    finally:
        node.file.close()
        node.destroy_node()
        rclpy.try_shutdown()
        print(f"wrote {node.count} rows to {args.out}", file=sys.stderr)


if __name__ == "__main__":
    main()
