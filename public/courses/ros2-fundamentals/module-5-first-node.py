#!/usr/bin/env python3
"""
ROS 2 Fundamentals — Module 5, Lesson 3
Your first ROS 2 node.

This is the finished stage-3 script. If you fought a typo while writing your
own, diff against this rather than starting over.

Run it with:

    python3 module-5-first-node.py

Not with `ros2 run` — that needs a package, and this deliberately isn't one.
Packages are Module 10. This is a plain Python file, and it works because
sourcing /opt/ros/jazzy/setup.bash put ROS 2's Python libraries on your path.

Stop it with Ctrl+C.
"""

import rclpy
from rclpy.node import Node


class MyFirstNode(Node):
    """A node that does one job: say it's alive, once a second."""

    def __init__(self) -> None:
        # "my_first_node" is the name this node announces to the rest of the
        # system — the name that shows up in `ros2 node list`. It is hard-coded
        # here, which is exactly why running this script twice produces two
        # nodes with the same name. See Lesson 4.
        super().__init__("my_first_node")

        self.count = 0

        # Ask ROS 2 to call self.on_timer() once every second. Your code lives
        # in callbacks like this one, not in a loop you write yourself.
        self.create_timer(1.0, self.on_timer)

        self.get_logger().info("Node started. Press Ctrl+C to stop.")

    def on_timer(self) -> None:
        self.count += 1
        # Prefer this over print(): log lines carry the node's name and a
        # timestamp, and they show up on /rosout alongside every other node's.
        self.get_logger().info(f"Still here. Tick {self.count}.")


def main() -> None:
    # 1. Start ROS 2 for this process.
    rclpy.init()

    # 2. Create the node.
    node = MyFirstNode()

    # 3. Hand control to ROS 2: keep this node alive, and call its callbacks
    #    when something happens. This is what stops the program exiting.
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        # Ctrl+C is the normal way to stop a node. Catching it keeps the
        # shutdown tidy instead of printing a traceback at the learner.
        pass
    finally:
        # 4. Clean up, in order: the node first, then ROS 2 itself.
        node.destroy_node()
        rclpy.shutdown()


if __name__ == "__main__":
    main()
