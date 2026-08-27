#!/usr/bin/env python3
"""
ROS 2 Fundamentals — Module 6, Lesson 3
Your first publisher.

This is the finished driver from Lesson 3. If you fought a typo while
writing your own, diff against this rather than starting over.

Run it with:

    python3 module-6-turtle-driver.py

Not with `ros2 run` — same reason as Module 5's node: no package, no build
step, just a plain Python file. Run turtlesim first, in its own terminal:

    ros2 run turtlesim turtlesim_node

Then run this one alongside it. teleop does not need to be running — in
fact, close it. Nothing here reads a keyboard; the turtle should trace a
steady circle on its own. Stop this script with Ctrl+C.
"""

import rclpy
from rclpy.node import Node
from geometry_msgs.msg import Twist


class TurtleDriver(Node):
    """Publishes a constant velocity command, twice a second, forever."""

    def __init__(self) -> None:
        super().__init__("turtle_driver")

        # Same topic name and type turtlesim subscribes to — confirmed with
        # `ros2 topic info /turtle1/cmd_vel` in Lesson 2, not guessed. The
        # queue size (10) is a QoS setting; Module 9 covers what that means
        # and how to choose a different one. 10 is the right default here.
        self.publisher_ = self.create_publisher(Twist, "/turtle1/cmd_vel", 10)

        # 0.5s = 2 Hz. Comfortably inside turtlesim's one-second command
        # timeout (Lesson 1), so the turtle never stutters. Try changing
        # this to 2.0 and you will see exactly why that number matters.
        self.create_timer(0.5, self.on_timer)

        self.get_logger().info(
            "Driving. Nothing is reading a keyboard — this is the only "
            "thing steering the turtle. Ctrl+C to stop."
        )

    def on_timer(self) -> None:
        # A message is only ever "sent" here, inside the callback that a
        # timer triggers. create_publisher() alone sends nothing.
        msg = Twist()
        msg.linear.x = 2.0
        msg.angular.z = 1.8
        self.publisher_.publish(msg)


def main() -> None:
    rclpy.init()
    node = TurtleDriver()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.destroy_node()
        rclpy.shutdown()


if __name__ == "__main__":
    main()
