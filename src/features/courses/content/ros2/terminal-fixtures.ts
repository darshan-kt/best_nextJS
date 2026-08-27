/**
 * ROS 2 Fundamentals — verified terminal output.
 *
 * WHY THIS FILE EXISTS
 *
 * Every terminal output in Modules 3 and 4 was *authored*, not captured: it
 * was researched against the official Jazzy documentation, but no command was
 * ever run on a real Ubuntu 24.04 + ROS 2 Jazzy machine. That is a live
 * content risk rather than a theoretical one — a learner compares their own
 * screen against ours line by line, and a wrong string reads to them as a
 * broken install, not as a typo in the course.
 *
 * This module is the single source of truth for those strings. The seed
 * (`prisma/seed.ts`) renders its CODE blocks from the constants exported
 * here, and the weekly `ros2-terminal-verification` workflow performs a real
 * ROS 2 Jazzy install on an `ubuntu-24.04` runner, runs each fixture's
 * command, and diffs the captured output against the matcher declared
 * alongside it. Because both consumers read the same constants, verifying the
 * fixtures *is* verifying the course content — there is no second copy that
 * can silently drift.
 *
 * WHY MATCHING MODES
 *
 * `echo $ROS_DISTRO` prints `jazzy` or the install is broken; that is worth
 * asserting exactly. `ros2 pkg list` prints several hundred package names
 * whose exact set moves with every Jazzy point release; asserting it exactly
 * would produce a permanently red job, and a red job nobody believes is worse
 * than no job. So each fixture carries the comparison it actually deserves.
 * See `./terminal-match.ts`.
 *
 * SCOPE
 *
 * Module 3 fixtures are transcribed from the CODE blocks already in the seed
 * (`install-ros2-jazzy.sh`, `before-and-after.sh`, `fix-locale.sh`) and from
 * the checkpoint prose in its Lesson 4. Module 4 fixtures come from the
 * approved design at `docs/course-design/module-4-design.md`, which is being
 * implemented in parallel; their `expectedOutput` is the abridged form the
 * lesson will render, per that document's own instruction that long outputs
 * must be visibly elided rather than promised as an exact match.
 */

import type { TerminalMatcher } from "./terminal-match";

/**
 * Which shell environment the command is run in.
 *
 * `clean` matters: Module 3 Lesson 3 teaches by deliberately showing failure
 * first, and "ros2 is not on PATH" can only be verified in a shell that has
 * never sourced the setup script.
 */
export type FixtureShell = "ros-sourced" | "clean";

/**
 * A live system the fixture's command needs to observe.
 *
 * `turtlesim` means `turtlesim_node` (under an X display) plus
 * `turtle_teleop_key` (under a pseudo-terminal, since it reads raw
 * keystrokes) must both be running and discoverable before the command runs.
 */
export type FixtureSession = "turtlesim";

/**
 * Whether the fixture can be verified on a CI runner at all.
 *
 * A fixture that cannot run is recorded here with its reason rather than
 * quietly omitted, so the gap between "verified" and "in the course" stays
 * visible in the data instead of living in someone's memory.
 */
export type FixtureCiPlan =
  | { readonly status: "run" }
  | { readonly status: "skipped-in-ci"; readonly reason: string };

/** How the string in `expectedOutput` came to exist. */
export type FixtureProvenance =
  | "authored-from-seed"
  | "authored-from-design-doc";

export interface TerminalFixture {
  /** Stable identifier; used on the CLI (`--only`) and in the report table. */
  readonly id: string;
  /** Human-readable location in the course. */
  readonly source: string;
  /** The command the lesson tells the learner to run. */
  readonly command: string;
  /** The output the lesson shows, exactly as it will be rendered. */
  readonly expectedOutput: string;
  /**
   * `expectedOutput` is a visibly elided excerpt of a much longer real
   * output, so it is not itself expected to satisfy `matcher`. Every
   * non-abridged fixture is checked against its own matcher by the unit
   * tests — a fixture whose rendered text fails its own assertion is
   * incoherent, and that is worth catching without a runner.
   */
  readonly abridged?: true;
  /** How a captured output is compared against the course's claim. */
  readonly matcher: TerminalMatcher;
  readonly shell: FixtureShell;
  readonly session?: FixtureSession;
  /** The command needs a controlling terminal (it reads raw keystrokes). */
  readonly pty?: true;
  /**
   * The command never exits on its own (`echo`, a publisher loop). Capture
   * for this long, optionally driving it with `stimulus` meanwhile, then
   * interrupt it the way the lesson tells the learner to (Ctrl+C).
   */
  readonly capture?: { readonly durationMs: number; readonly stimulus?: string };
  readonly ci: FixtureCiPlan;
  readonly provenance: FixtureProvenance;
  /** Anything a future reader needs to know about this fixture's judgement. */
  readonly note?: string;
}

/* -------------------------------------------------------------------------
 * Module 3 — scripts the lesson hands the learner verbatim.
 *
 * These are not *output*; they are the commands themselves. They live here
 * so the verification workflow can execute the literal text the course
 * teaches, rather than a paraphrase of it. That is the whole point of the
 * exercise for the install script in particular: running it for real is what
 * turns the pinned-signing-key staleness risk from an unmonitored one into a
 * monitored one, because a rotated or moved key breaks this job the week it
 * happens rather than the week a learner reports it.
 * ---------------------------------------------------------------------- */

/** Module 3 · Lesson 2 · CODE block `install-ros2-jazzy.sh`. */
export const ROS2_INSTALL_SCRIPT = `# 1. Make sure the base system is up to date and can fetch over HTTPS.
sudo apt update && sudo apt install -y software-properties-common curl
sudo add-apt-repository universe

# 2. Add the ROS 2 repository's signing key, then the repository itself.
sudo curl -sSL https://raw.githubusercontent.com/ros/rosdistro/master/ros.key \\
  -o /usr/share/keyrings/ros-archive-keyring.gpg

echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/ros-archive-keyring.gpg] \\
http://packages.ros.org/ros2/ubuntu $(. /etc/os-release && echo $UBUNTU_CODENAME) main" \\
  | sudo tee /etc/apt/sources.list.d/ros2.list > /dev/null

# 3. Install the desktop bundle. This is the long step.
sudo apt update
sudo apt install -y ros-jazzy-desktop`;

/** Module 3 · Lesson 4 · CODE block `fix-locale.sh`. */
export const ROS2_LOCALE_FIX_SCRIPT = `# Diagnose: is this shell using a UTF-8 locale?
locale
#   LANG=C           <- the problem
#   LANG=en_US.UTF-8 <- what you want

# Fix it, then re-check.
sudo apt update && sudo apt install -y locales
sudo locale-gen en_US en_US.UTF-8
sudo update-locale LC_ALL=en_US.UTF-8 LANG=en_US.UTF-8
export LANG=en_US.UTF-8

locale   # confirm LANG and LC_ALL now end in UTF-8`;

/** Where the distribution lands, and the script that connects a shell to it. */
export const ROS2_SETUP_SCRIPT_PATH = "/opt/ros/jazzy/setup.bash";

/* -------------------------------------------------------------------------
 * Output fixtures.
 * ---------------------------------------------------------------------- */

const ROS2_HELP_OUTPUT = `usage: ros2 [-h] Call \`ros2 <command> -h\` for more detailed usage. ...

ros2 is an extensible command-line tool for ROS 2.

optional arguments:
  -h, --help            show this help message and exit

Commands:
  action     Various action related sub-commands
  bag        Various rosbag related sub-commands
  node       Various node related sub-commands
  param      Various param related sub-commands
  pkg        Various package related sub-commands
  run        Run a package specific executable
  topic      Various topic related sub-commands
  ...`;

const MODULE_3_FIXTURES: readonly TerminalFixture[] = [
  {
    id: "m3-l1-ubuntu-release",
    source: "Module 3 · Lesson 4 · troubleshooting branch 'Wrong Ubuntu version'",
    command: "lsb_release -a",
    expectedOutput: `Distributor ID:\tUbuntu
Description:\tUbuntu 24.04 LTS
Release:\t24.04
Codename:\tnoble`,
    // Regex, not exact: the point-release suffix in Description moves
    // ("24.04 LTS" -> "24.04.1 LTS") without invalidating anything the lesson
    // says, and `lsb_release` writes an "No LSB modules are available."
    // notice to stderr on a minimal install. The lesson's actual claim is
    // narrow and stable: the Release line must read exactly 24.04.
    matcher: { kind: "regex", pattern: "^Release:\\s+24\\.04$", flags: "m" },
    shell: "clean",
    ci: { status: "run" },
    provenance: "authored-from-seed",
  },
  {
    id: "m3-l2-install-tree",
    source: "Module 3 · Lesson 2 · exercise step 3 (`ls /opt/ros/jazzy/`)",
    command: "ls /opt/ros/jazzy/",
    expectedOutput: `bin  include  lib  setup.bash  share`,
    // Shape: the install tree diagram names five entries the lesson asks the
    // learner to spot, but a real /opt/ros/jazzy also contains setup.sh,
    // setup.zsh, local_setup.*, _local_setup_util*.py, COLCON_IGNORE and
    // more. Asserting the exact five would fail on a correct install.
    matcher: {
      kind: "shape",
      includesText: ["bin", "include", "lib", "share", "setup.bash"],
      minLines: 1,
    },
    shell: "clean",
    ci: { status: "run" },
    provenance: "authored-from-seed",
    note:
      "The diagram in this lesson shows five entries; the directory holds more. " +
      "The lesson's wording ('check you can see the entries from the diagram') " +
      "is already shape-language, which is correct — keep it that way.",
  },
  {
    id: "m3-l3-ros2-missing-before-sourcing",
    source: "Module 3 · Lesson 3 · CODE `before-and-after.sh`, 'Before' section",
    command: "ros2 --help",
    expectedOutput: "ros2: command not found",
    // Regex on the invariant half only. See `note` — the prefix is shell
    // dependent and the course's rendering is not what bash prints.
    matcher: { kind: "regex", pattern: "command not found" },
    shell: "clean",
    ci: { status: "run" },
    provenance: "authored-from-seed",
    note:
      "SUSPECTED CONTENT DRIFT: bash prints 'bash: ros2: command not found' and " +
      "zsh prints 'zsh: command not found: ros2'. No shell prints the bare " +
      "'ros2: command not found' the seed currently shows. The matcher " +
      "deliberately asserts only the stable substring so the job does not go red " +
      "over a prefix, but the rendered string should be corrected once the first " +
      "capture confirms the exact wording on Ubuntu 24.04's bash.",
  },
  {
    id: "m3-l3-ros-distro-unset",
    source: "Module 3 · Lesson 3 · CODE `before-and-after.sh`, 'Before' section",
    command: "echo $ROS_DISTRO",
    expectedOutput: "",
    // Exact, and exactly the point: an unsourced shell must print nothing at
    // all. Anything here means a stray source line or a second distribution.
    matcher: { kind: "exact", value: "" },
    shell: "clean",
    ci: { status: "run" },
    provenance: "authored-from-seed",
  },
  {
    id: "m3-l3-ros-distro-after-sourcing",
    source: "Module 3 · Lesson 3 · CODE `before-and-after.sh`, 'After' section",
    command: "echo $ROS_DISTRO",
    expectedOutput: "jazzy",
    // Exact. This is the single most invariant string in the module and the
    // one the troubleshooting tree tells the learner to compare literally
    // ("confirm it reads exactly jazzy").
    matcher: { kind: "exact", value: "jazzy" },
    shell: "ros-sourced",
    ci: { status: "run" },
    provenance: "authored-from-seed",
  },
  {
    id: "m3-l3-ros2-help",
    source: "Module 3 · Lesson 3 · CODE `before-and-after.sh`, 'After' section",
    command: "ros2 --help",
    expectedOutput: ROS2_HELP_OUTPUT,
    // Shape: the course prints this abridged (note the trailing '...'), and
    // the subcommand list grows between releases. What the lesson actually
    // asserts is that ros2 identifies itself and lists the seven subcommands
    // Checkpoint 1 names, so that is what is checked.
    matcher: {
      kind: "shape",
      includesText: [
        "usage: ros2",
        "ros2 is an extensible command-line tool for ROS 2.",
        "Commands:",
        "  action",
        "  bag",
        "  node",
        "  param",
        "  pkg",
        "  run",
        "  topic",
      ],
      minLines: 10,
    },
    shell: "ros-sourced",
    ci: { status: "run" },
    provenance: "authored-from-seed",
    note:
      "SUSPECTED CONTENT DRIFT: the rendered block says 'optional arguments:'. " +
      "Python's argparse renamed that heading to 'options:' in 3.10, and Ubuntu " +
      "24.04 ships Python 3.12, so Jazzy almost certainly prints 'options:'. The " +
      "matcher deliberately does not assert either heading — a speculative " +
      "assertion would just turn a content question into a red job. The first " +
      "run's captured-output artifact settles it; correct the rendered string then.",
  },
  {
    id: "m3-l4-pkg-list",
    source: "Module 3 · Lesson 4 · Checkpoint 2",
    command: "ros2 pkg list",
    expectedOutput: `action_msgs
action_tutorials_cpp
ament_cmake
...
rclcpp
rclpy
...
rviz2
...
turtlesim`,
    abridged: true,
    // Shape, emphatically. The lesson's own words are "a long alphabetical
    // list — several hundred entries", which is a claim about magnitude and
    // membership, not identity. The exact set changes with every Jazzy sync;
    // pinning it would guarantee a red job within weeks.
    matcher: {
      kind: "shape",
      minLines: 200,
      includesLines: [
        "action_msgs",
        "ament_cmake",
        "demo_nodes_cpp",
        "rclcpp",
        "rclpy",
        "rviz2",
        "turtlesim",
      ],
    },
    shell: "ros-sourced",
    ci: { status: "run" },
    provenance: "authored-from-seed",
    note:
      "The lesson names action_msgs, ament_cmake, rclpy, rviz2 and turtlesim; " +
      "demo_nodes_cpp is added here because Checkpoint 3 depends on it and a " +
      "missing demo_nodes_cpp is the specific half-installed state the lesson " +
      "warns about.",
  },
  {
    id: "m3-l4-talker",
    source: "Module 3 · Lesson 4 · Checkpoint 3",
    command: "ros2 run demo_nodes_cpp talker",
    expectedOutput: `[INFO] [1699887654.123456789] [talker]: Publishing: 'Hello World: 1'
[INFO] [1699887655.187654321] [talker]: Publishing: 'Hello World: 2'`,
    // Regex: the skeleton is fixed and the timestamp and counter are not.
    // Every captured line must look like a talker publication — a stray
    // warning line in the middle is exactly the kind of drift worth catching.
    matcher: {
      kind: "shape",
      minLines: 2,
      everyLineMatches:
        "^\\[INFO\\] \\[\\d+\\.\\d+\\] \\[talker\\]: Publishing: 'Hello World: \\d+'$",
    },
    shell: "ros-sourced",
    // Never exits; the lesson says "Press Ctrl+C to stop it", so the runner
    // does exactly that after collecting a few seconds of the one-per-second
    // stream.
    capture: { durationMs: 6_000 },
    ci: { status: "run" },
    provenance: "authored-from-seed",
  },
  {
    id: "m3-l4-locale",
    source: "Module 3 · Lesson 4 · CODE `fix-locale.sh` / the locale callout",
    command: "locale",
    expectedOutput: `LANG=en_US.UTF-8
LC_ALL=en_US.UTF-8`,
    // Regex: the lesson's claim is about the *suffix* ("something ending in
    // UTF-8"), not about which UTF-8 locale. A runner defaults to C.UTF-8,
    // which satisfies the lesson and would fail an exact match.
    matcher: { kind: "regex", pattern: "^LANG=.*UTF-8$", flags: "m" },
    shell: "clean",
    ci: { status: "run" },
    provenance: "authored-from-seed",
  },
  {
    id: "m3-l4-ros2-doctor",
    source: "Module 3 · Lesson 4 · Checkpoint 1 (optional fuller check)",
    command: "ros2 doctor",
    expectedOutput: "All checks passed",
    matcher: { kind: "shape", includesText: ["All checks passed"] },
    shell: "ros-sourced",
    ci: {
      status: "skipped-in-ci",
      reason:
        "The lesson itself says a warning or two about network interfaces is " +
        "common and not necessarily a problem. A GitHub runner's virtualised " +
        "networking reliably produces exactly those warnings, so asserting " +
        "'All checks passed' would be permanently red for a reason that has " +
        "nothing to do with course accuracy. Verify on a real desktop install " +
        "instead.",
    },
    provenance: "authored-from-seed",
  },
  {
    id: "m3-l4-talker-permission-denied",
    source: "Module 3 · Lesson 4 · DEBUGGING exercise scenario",
    command: "ros2 run demo_nodes_cpp talker",
    expectedOutput: `$ ros2 run demo_nodes_cpp talker
[ERROR] [rcl]: Failed to create log directory: /home/you/.ros/log
  Permission denied
[ros2run]: Process exited with failure 1`,
    matcher: {
      kind: "shape",
      includesText: ["Permission denied", "[ros2run]: Process exited with failure"],
    },
    shell: "ros-sourced",
    ci: {
      status: "skipped-in-ci",
      reason:
        "Reproducing this requires deliberately root-owning ~/.ros before " +
        "running the node. Doing that mid-run would corrupt the environment " +
        "every later fixture depends on, and the exact rcl error wording is a " +
        "logging-implementation detail that drifts between patch releases — a " +
        "brittle assertion guarding an intentionally-broken state. The " +
        "exercise's teaching value is the diagnosis, not the string.",
    },
    provenance: "authored-from-seed",
  },
];

/* -------------------------------------------------------------------------
 * Module 4 — from docs/course-design/module-4-design.md.
 *
 * The design document is explicit that this module's exposure is larger than
 * Module 3's: its outputs are "long, enumerable, and machine-specific", and a
 * single missing or extra entry reads to a learner as a broken install. It
 * therefore requires long outputs to be rendered as visibly abridged and the
 * prose to lean on shape rather than an exact count. The fixtures below
 * follow that instruction: `expectedOutput` carries the visible elision, and
 * the matchers assert membership, never identity.
 *
 * None of the four `list` fixtures uses `everyLineMatches`, deliberately.
 * Each of those commands joins the ROS graph, and a middleware transport
 * warning on the way in ("failed to create shared-memory segment" and its
 * relatives are a known hosted-runner symptom) would land in the captured
 * stream and fail an every-line assertion for a reason that has nothing to do
 * with what the lesson claims. The lesson's claim is membership — "several
 * entries, including one containing cmd_vel" — so membership is what is
 * asserted. The commands that do keep an every-line assertion (`talker`,
 * `topic echo`, `pkg executables`) keep it because the *shape of every line*
 * is the thing that lesson is actually teaching.
 * ---------------------------------------------------------------------- */

const MODULE_4_FIXTURES: readonly TerminalFixture[] = [
  {
    id: "m4-l1-pkg-executables-turtlesim",
    source: "Module 4 · Lesson 1 · block 3",
    command: "ros2 pkg executables turtlesim",
    expectedOutput: `turtlesim draw_square
turtlesim mimic
turtlesim turtle_teleop_key
turtlesim turtlesim_node`,
    // Shape: the exercise's stated success criterion is that turtlesim_node
    // and turtle_teleop_key are both listed. draw_square and mimic are real
    // but incidental, and a future Jazzy sync adding a fifth executable is
    // not a course error.
    matcher: {
      kind: "shape",
      minLines: 2,
      includesText: ["turtlesim_node", "turtle_teleop_key"],
      everyLineMatches: "^turtlesim [a-z0-9_]+$",
    },
    shell: "ros-sourced",
    ci: { status: "run" },
    provenance: "authored-from-design-doc",
  },
  {
    id: "m4-l1-display-check",
    source: "Module 4 · Lesson 1 · block 7 (display diagnostics)",
    command: "echo $DISPLAY",
    expectedOutput: ":0",
    // Regex: the lesson's tell is "empty is the problem", so the assertion is
    // that a working graphical environment reports *a* display, not which
    // one. CI runs under Xvfb, which will report something like :99.
    matcher: { kind: "regex", pattern: "^:\\d+(\\.\\d+)?$" },
    shell: "clean",
    ci: { status: "run" },
    provenance: "authored-from-design-doc",
    note:
      "Under Xvfb this reports the virtual display, not :0. The fixture proves " +
      "the diagnostic behaves as the lesson describes; it cannot prove a window " +
      "actually appeared, which is why Lesson 1's exercise keeps a visual " +
      "success criterion rather than an exit-code one.",
  },
  {
    id: "m4-l2-teleop-banner",
    source: "Module 4 · Lesson 2 · block 3 (teleop usage banner)",
    command: "ros2 run turtlesim turtle_teleop_key",
    expectedOutput: `Reading from keyboard
---------------------------
Use arrow keys to move the turtle.
Use G|B|V|C|D|E|R|T keys to rotate to absolute orientations. 'F' to cancel a rotation.
'Q' to quit.`,
    // Shape: the banner's middle line enumerates rotation keys and is the
    // most likely part to change; the lesson's claim is that a banner appears
    // and explains the arrow keys, which is what gets asserted.
    matcher: {
      kind: "shape",
      includesText: ["Reading from keyboard", "Use arrow keys to move the turtle", "'Q' to quit"],
    },
    shell: "ros-sourced",
    // teleop reads raw keystrokes and puts its terminal into cbreak mode; it
    // exits immediately without a controlling terminal, so it is run under a
    // pty. It never exits on its own either.
    pty: true,
    capture: { durationMs: 5_000 },
    ci: { status: "run" },
    provenance: "authored-from-design-doc",
  },
  {
    id: "m4-l3-node-list",
    source: "Module 4 · Lesson 3 · block 2 (the four list commands)",
    command: "ros2 node list",
    expectedOutput: `/teleop_turtle
/turtlesim`,
    // Shape rather than exact only because node ordering is not guaranteed
    // and a stray daemon node would be noise, not an error. Both entries are
    // asserted: the exercise question "how many separate ROS 2 programs are
    // running right now?" has the answer two, and that answer is the lesson.
    matcher: {
      kind: "shape",
      includesLines: ["/teleop_turtle", "/turtlesim"],
    },
    shell: "ros-sourced",
    session: "turtlesim",
    ci: { status: "run" },
    provenance: "authored-from-design-doc",
  },
  {
    id: "m4-l3-topic-list",
    source: "Module 4 · Lesson 3 · block 2 (the four list commands)",
    command: "ros2 topic list",
    expectedOutput: `/parameter_events
/rosout
/turtle1/cmd_vel
/turtle1/color_sensor
/turtle1/pose`,
    // Shape: these five are what turtlesim plus the two universal topics
    // guarantee. The design document is explicit that a learner will compare
    // this list line by line, which is exactly why the course must promise
    // membership and not identity.
    matcher: {
      kind: "shape",
      includesLines: [
        "/parameter_events",
        "/rosout",
        "/turtle1/cmd_vel",
        "/turtle1/color_sensor",
        "/turtle1/pose",
      ],
    },
    shell: "ros-sourced",
    session: "turtlesim",
    ci: { status: "run" },
    provenance: "authored-from-design-doc",
  },
  {
    id: "m4-l3-service-list",
    source: "Module 4 · Lesson 3 · block 2 (the four list commands)",
    command: "ros2 service list",
    expectedOutput: `/clear
/kill
/reset
/spawn
/turtle1/set_pen
/turtle1/teleport_absolute
/turtle1/teleport_relative
...  (each node also exposes six /…/…_parameters services)`,
    abridged: true,
    // Shape: every node exposes six parameter services of its own, so the
    // real list is roughly twenty entries for two nodes. The lesson shows the
    // seven that are actually turtlesim's, with a visible elision — and the
    // exercise asks "how many services does Turtlesim offer?", which is
    // answered from the turtlesim-specific entries.
    matcher: {
      kind: "shape",
      includesLines: [
        "/clear",
        "/kill",
        "/reset",
        "/spawn",
        "/turtle1/set_pen",
        "/turtle1/teleport_absolute",
        "/turtle1/teleport_relative",
      ],
    },
    shell: "ros-sourced",
    session: "turtlesim",
    ci: { status: "run" },
    provenance: "authored-from-design-doc",
    note:
      "The parenthetical in expectedOutput is the visible elision the design " +
      "document requires. Confirm the parameter-service count against the first " +
      "capture before the wording ships.",
  },
  {
    id: "m4-l3-action-list",
    source: "Module 4 · Lesson 3 · block 2 (the four list commands)",
    command: "ros2 action list",
    expectedOutput: "/turtle1/rotate_absolute",
    // Shape rather than exact: turtlesim offers exactly one action, but
    // asserting "exactly one line" would break the moment an unrelated node
    // is running, and the exercise only asks the learner to name one.
    matcher: {
      kind: "shape",
      includesLines: ["/turtle1/rotate_absolute"],
      minLines: 1,
    },
    shell: "ros-sourced",
    session: "turtlesim",
    ci: { status: "run" },
    provenance: "authored-from-design-doc",
  },
  {
    id: "m4-l3-topic-echo-cmd-vel",
    source: "Module 4 · Lesson 3 · block 7 (echo with an arrow keypress)",
    command: "ros2 topic echo /turtle1/cmd_vel",
    expectedOutput: `linear:
  x: 2.0
  y: 0.0
  z: 0.0
angular:
  x: 0.0
  y: 0.0
  z: 0.0
---`,
    // Shape: the lesson's subject is the *structure* of a Twist message — the
    // linear/angular split, x/y/z under each, the one field the keypress
    // changed, and the --- separator. The specific magnitude depends on which
    // key was pressed, so it is not asserted.
    matcher: {
      kind: "shape",
      includesText: ["linear:", "angular:", "x:", "y:", "z:", "---"],
      everyLineMatches: "^(linear:|angular:|  [xyz]: -?\\d|---)",
    },
    shell: "ros-sourced",
    session: "turtlesim",
    // `echo` blocks forever waiting for traffic. In the lesson the traffic
    // comes from an arrow keypress in a focused teleop terminal; CI has no
    // keyboard focus to give, so an equivalent publisher stands in. It
    // publishes the same message on the same topic, which is what the lesson
    // is actually asserting the shape of.
    capture: {
      durationMs: 8_000,
      stimulus:
        'ros2 topic pub -r 2 /turtle1/cmd_vel geometry_msgs/msg/Twist ' +
        '"{linear: {x: 2.0, y: 0.0, z: 0.0}, angular: {x: 0.0, y: 0.0, z: 0.0}}"',
    },
    ci: { status: "run" },
    provenance: "authored-from-design-doc",
    note:
      "The publisher stands in for the arrow keypress; driving teleop's pty with " +
      "synthetic escape sequences would verify the keyboard handler rather than " +
      "the message shape, which is not what this block teaches.",
  },
];

/** Every fixture, in the order the course presents them. */
export const ROS2_TERMINAL_FIXTURES: readonly TerminalFixture[] = [
  ...MODULE_3_FIXTURES,
  ...MODULE_4_FIXTURES,
];

/**
 * Look a fixture up by id.
 *
 * Returns `undefined` rather than throwing so callers decide what a missing
 * id means — the CLI reports it as a usage error, the seed would treat it as
 * a build failure.
 */
export function findTerminalFixture(id: string): TerminalFixture | undefined {
  return ROS2_TERMINAL_FIXTURES.find((fixture) => fixture.id === id);
}

/**
 * The output a fixture promises, or throw.
 *
 * This is the accessor `prisma/seed.ts` should use when rendering a CODE
 * block, so that a renamed or deleted fixture fails the seed loudly instead
 * of quietly emitting `undefined` into course content.
 */
export function terminalOutput(id: string): string {
  const fixture = findTerminalFixture(id);
  if (fixture === undefined) {
    throw new Error(
      `Unknown ROS 2 terminal fixture "${id}". ` +
        `Known ids: ${ROS2_TERMINAL_FIXTURES.map((f) => f.id).join(", ")}`,
    );
  }
  return fixture.expectedOutput;
}

/**
 * Module 3 · Lesson 3 · CODE block `before-and-after.sh`.
 *
 * Composed from the fixtures above rather than written out again, so the
 * transcript the learner reads and the strings CI verifies cannot diverge.
 * The prose framing (the section rules, the inline comment) is layout, not
 * output, and stays here.
 */
export const ROS2_BEFORE_AND_AFTER_TRANSCRIPT = [
  "# --- Before ---------------------------------------------------------",
  "$ ros2 --help",
  terminalOutput("m3-l3-ros2-missing-before-sourcing"),
  "",
  "$ echo $ROS_DISTRO          # empty: nothing has told this shell about ROS 2",
  "",
  "",
  "# --- Source it ------------------------------------------------------",
  `$ source ${ROS2_SETUP_SCRIPT_PATH}`,
  "",
  "",
  "# --- After ----------------------------------------------------------",
  "$ echo $ROS_DISTRO",
  terminalOutput("m3-l3-ros-distro-after-sourcing"),
  "",
  "$ ros2 --help",
  terminalOutput("m3-l3-ros2-help"),
].join("\n");
