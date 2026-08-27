#!/usr/bin/env python3
"""
ROS 2 Fundamentals — Module 6, Lesson 4
A closed loop: subscribe to the turtle's position, publish a steering
command in response.

This is the finished node from Lesson 4 — a subscriber and a publisher in
one node, reversing direction when the turtle gets close to the right or
left edge of the window. It does not stay inside all four edges; keeping
it inside the whole box is Lesson 4's independent exercise, and there is
deliberately no downloadable answer key for that part.

Run it with:

    python3 module-6-turtle-loop.py

alongside a plain `ros2 run turtlesim turtlesim_node` — no driver, no
teleop, nothing else. This node supplies its own commands based only on
where the turtle already is. Stop it with Ctrl+C.
"""

import rclpy
from rclpy.node import Node
from geometry_msgs.msg import Twist
from turtlesim.msg import Pose


class TurtleLoop(Node):
    """Reads /turtle1/pose, decides, writes /turtle1/cmd_vel — repeatedly."""

    # Turtlesim's window is roughly 11 units square. Turning a couple of
    # units before the actual wall gives the turtle room to come back
    # around instead of clipping the edge.
    LEFT_EDGE = 1.5
    RIGHT_EDGE = 9.5

    def __init__(self) -> None:
        super().__init__("turtle_loop")

        self.direction = 1.0  # +1 = turning one way, -1 = the other

        self.publisher_ = self.create_publisher(Twist, "/turtle1/cmd_vel", 10)

        # The subscription's queue size (10) is the same kind of QoS
        # setting as the publisher's — Module 9 again.
        self.subscription = self.create_subscription(
            Pose, "/turtle1/pose", self.on_pose, 10
        )

        self.get_logger().info(
            "Patrolling left/right. Ctrl+C to stop. (Staying inside all "
            "four edges is the exercise — this node only handles two.)"
        )

    def on_pose(self, msg: Pose) -> None:
        # This callback runs every time turtlesim publishes a new pose —
        # not on a timer. The trigger is data arriving, not time passing.
        if msg.x < self.LEFT_EDGE or msg.x > self.RIGHT_EDGE:
            self.direction *= -1.0

        cmd = Twist()
        cmd.linear.x = 2.0
        cmd.angular.z = 1.0 * self.direction
        self.publisher_.publish(cmd)


def main() -> None:
    rclpy.init()
    node = TurtleLoop()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.destroy_node()
        rclpy.shutdown()


if __name__ == "__main__":
    main()
