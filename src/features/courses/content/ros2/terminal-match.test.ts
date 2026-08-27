import { describe, expect, it } from "vitest";

import {
  matchTerminalOutput,
  normalizeTerminalOutput,
  significantLines,
  type TerminalMatcher,
} from "./terminal-match";

/**
 * The matcher is the part of the verification path that can be wrong without
 * anyone noticing: a matcher that is too loose reports green over drifted
 * course content, and a matcher that is too strict turns the weekly job red
 * for reasons that have nothing to do with accuracy. Neither failure mode is
 * visible from the job's own output, so it is tested here — the one piece of
 * this path that does not need a ROS 2 install to exercise.
 */

const ESC = String.fromCharCode(27);

describe("normalizeTerminalOutput", () => {
  it("strips carriage returns left by a pseudo-terminal", () => {
    expect(normalizeTerminalOutput("line one\r\nline two\r\n")).toBe("line one\nline two");
  });

  it("strips ANSI colour codes the CLI emits when it thinks it has a terminal", () => {
    expect(normalizeTerminalOutput(`${ESC}[1;32mjazzy${ESC}[0m`)).toBe("jazzy");
  });

  it("strips trailing whitespace per line and blank lines at either end", () => {
    expect(normalizeTerminalOutput("\n\n  jazzy   \t\n\n\n")).toBe("  jazzy");
  });

  it("preserves interior blank lines and leading indentation", () => {
    // Both carry meaning: argparse help separates sections with blank lines,
    // and `ros2 topic echo` indents message fields under their parent.
    const raw = "linear:\n  x: 2.0\n\nangular:\n  z: 0.0";
    expect(normalizeTerminalOutput(raw)).toBe(raw);
  });

  it("is idempotent", () => {
    const once = normalizeTerminalOutput("  a  \r\n\r\n b \n");
    expect(normalizeTerminalOutput(once)).toBe(once);
  });
});

describe("significantLines", () => {
  it("drops blank and whitespace-only lines", () => {
    expect(significantLines("a\n\n  \nb")).toEqual(["a", "b"]);
  });
});

describe("matchTerminalOutput — exact", () => {
  const matcher: TerminalMatcher = { kind: "exact", value: "jazzy" };

  it("accepts the exact value", () => {
    expect(matchTerminalOutput("jazzy", matcher).ok).toBe(true);
  });

  it("accepts a value differing only in trailing newline or colour codes", () => {
    expect(matchTerminalOutput("jazzy\n", matcher).ok).toBe(true);
    expect(matchTerminalOutput(`${ESC}[32mjazzy${ESC}[0m\r\n`, matcher).ok).toBe(true);
  });

  it("rejects a different distribution", () => {
    const result = matchTerminalOutput("humble", matcher);
    expect(result.ok).toBe(false);
    expect(result.failures[0]).toContain("first difference on line 1");
    expect(result.failures[0]).toContain('"humble"');
  });

  it("rejects extra output around the value", () => {
    // This is the "two distributions sourced" failure the course warns about:
    // ROS_DISTRO reads jazzy but something else printed too.
    expect(matchTerminalOutput("jazzy\nhumble", matcher).ok).toBe(false);
  });

  it("distinguishes empty output from a single blank line but not from padding", () => {
    const empty: TerminalMatcher = { kind: "exact", value: "" };
    expect(matchTerminalOutput("", empty).ok).toBe(true);
    expect(matchTerminalOutput("\n", empty).ok).toBe(true);
    expect(matchTerminalOutput("jazzy", empty).ok).toBe(false);
  });

  it("reports which line diverged when the difference is deep in the output", () => {
    const multi: TerminalMatcher = { kind: "exact", value: "a\nb\nc" };
    const result = matchTerminalOutput("a\nb\nX", multi);
    expect(result.ok).toBe(false);
    expect(result.failures[0]).toContain("line 3");
  });

  it("reports a truncated output rather than crashing on the missing line", () => {
    const multi: TerminalMatcher = { kind: "exact", value: "a\nb" };
    const result = matchTerminalOutput("a", multi);
    expect(result.ok).toBe(false);
    expect(result.failures[0]).toContain("<no such line>");
  });
});

describe("matchTerminalOutput — regex", () => {
  it("matches a multiline pattern with the m flag", () => {
    const matcher: TerminalMatcher = {
      kind: "regex",
      pattern: "^Release:\\s+24\\.04$",
      flags: "m",
    };
    const lsbRelease =
      "Distributor ID:\tUbuntu\nDescription:\tUbuntu 24.04.1 LTS\nRelease:\t24.04\nCodename:\tnoble";
    expect(matchTerminalOutput(lsbRelease, matcher).ok).toBe(true);
  });

  it("rejects the wrong Ubuntu release, which is the whole point of that fixture", () => {
    const matcher: TerminalMatcher = {
      kind: "regex",
      pattern: "^Release:\\s+24\\.04$",
      flags: "m",
    };
    expect(matchTerminalOutput("Release:\t22.04", matcher).ok).toBe(false);
  });

  it("does not anchor across lines without the m flag", () => {
    const matcher: TerminalMatcher = { kind: "regex", pattern: "^LANG=.*UTF-8$" };
    expect(matchTerminalOutput("LC_ALL=\nLANG=C.UTF-8", matcher).ok).toBe(false);
    expect(matchTerminalOutput("LANG=C.UTF-8", matcher).ok).toBe(true);
  });

  it("accepts any UTF-8 locale, since the lesson's claim is about the suffix", () => {
    const matcher: TerminalMatcher = { kind: "regex", pattern: "^LANG=.*UTF-8$", flags: "m" };
    expect(matchTerminalOutput("LANG=en_US.UTF-8\nLC_ALL=en_US.UTF-8", matcher).ok).toBe(true);
    expect(matchTerminalOutput("LANG=C.UTF-8\nLC_ALL=", matcher).ok).toBe(true);
    expect(matchTerminalOutput("LANG=C\nLC_ALL=", matcher).ok).toBe(false);
  });

  it("reports an unusable pattern as a fixture bug, not as content drift", () => {
    const matcher: TerminalMatcher = { kind: "regex", pattern: "([unclosed" };
    const result = matchTerminalOutput("anything", matcher);
    expect(result.ok).toBe(false);
    expect(result.failures[0]).toContain("fixture is invalid");
  });

  it("is not fooled by a stateful lastIndex across calls", () => {
    // A `g`-flagged pattern reused across fixtures would alternate pass/fail
    // if the RegExp object were shared. Each call must compile its own.
    const matcher: TerminalMatcher = { kind: "regex", pattern: "jazzy", flags: "g" };
    expect(matchTerminalOutput("jazzy", matcher).ok).toBe(true);
    expect(matchTerminalOutput("jazzy", matcher).ok).toBe(true);
  });
});

describe("matchTerminalOutput — shape", () => {
  const packageList = ["action_msgs", "ament_cmake", "rclcpp", "rclpy", "rviz2", "turtlesim"].join(
    "\n",
  );

  it("accepts a list containing every required entry, in any order", () => {
    const matcher: TerminalMatcher = {
      kind: "shape",
      includesLines: ["turtlesim", "rclpy"],
    };
    expect(matchTerminalOutput(packageList, matcher).ok).toBe(true);
    expect(matchTerminalOutput(packageList.split("\n").reverse().join("\n"), matcher).ok).toBe(
      true,
    );
  });

  it("tolerates entries the course does not mention", () => {
    // The reason `ros2 pkg list` is shape-matched: a Jazzy sync adding a
    // package must not turn the job red.
    const matcher: TerminalMatcher = { kind: "shape", includesLines: ["turtlesim"] };
    expect(matchTerminalOutput(`${packageList}\nbrand_new_package`, matcher).ok).toBe(true);
  });

  it("rejects a missing entry and names it", () => {
    const matcher: TerminalMatcher = {
      kind: "shape",
      includesLines: ["turtlesim", "demo_nodes_cpp"],
    };
    const result = matchTerminalOutput(packageList, matcher);
    expect(result.ok).toBe(false);
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0]).toContain("demo_nodes_cpp");
  });

  it("requires includesLines to match a whole line, not a substring", () => {
    // `/turtle1/cmd_vel` must not be satisfied by `/turtle1/cmd_vel_stamped`.
    const matcher: TerminalMatcher = { kind: "shape", includesLines: ["/turtle1/cmd_vel"] };
    expect(matchTerminalOutput("/turtle1/cmd_vel_stamped", matcher).ok).toBe(false);
    expect(matchTerminalOutput("/turtle1/cmd_vel_stamped\n/turtle1/cmd_vel", matcher).ok).toBe(
      true,
    );
  });

  it("lets includesText match a substring anywhere", () => {
    const matcher: TerminalMatcher = {
      kind: "shape",
      includesText: ["turtlesim_node", "turtle_teleop_key"],
    };
    expect(
      matchTerminalOutput("turtlesim turtlesim_node\nturtlesim turtle_teleop_key", matcher).ok,
    ).toBe(true);
  });

  it("enforces excludesText", () => {
    const matcher: TerminalMatcher = { kind: "shape", excludesText: ["command not found"] };
    expect(matchTerminalOutput("bash: ros2: command not found", matcher).ok).toBe(false);
    expect(matchTerminalOutput("jazzy", matcher).ok).toBe(true);
  });

  it("counts only non-blank lines for minLines and maxLines", () => {
    const matcher: TerminalMatcher = { kind: "shape", minLines: 3, maxLines: 3 };
    expect(matchTerminalOutput("a\n\nb\n\n\nc", matcher).ok).toBe(true);
    expect(matchTerminalOutput("a\nb", matcher).ok).toBe(false);
    expect(matchTerminalOutput("a\nb\nc\nd", matcher).ok).toBe(false);
  });

  it("catches a half-wired environment via minLines", () => {
    // The lesson's own diagnosis: "a short list, or no list, means your
    // environment is only partly wired up".
    const matcher: TerminalMatcher = { kind: "shape", minLines: 200 };
    const result = matchTerminalOutput(packageList, matcher);
    expect(result.ok).toBe(false);
    expect(result.failures[0]).toContain("at least 200");
    expect(result.failures[0]).toContain("got 6");
  });

  it("applies everyLineMatches to every non-blank line", () => {
    const matcher: TerminalMatcher = {
      kind: "shape",
      everyLineMatches:
        "^\\[INFO\\] \\[\\d+\\.\\d+\\] \\[talker\\]: Publishing: 'Hello World: \\d+'$",
    };
    const clean =
      "[INFO] [1699887654.123456789] [talker]: Publishing: 'Hello World: 1'\n" +
      "[INFO] [1699887655.187654321] [talker]: Publishing: 'Hello World: 2'";
    expect(matchTerminalOutput(clean, matcher).ok).toBe(true);

    const withWarning = `${clean}\n[WARN] [rmw]: something unexpected`;
    const result = matchTerminalOutput(withWarning, matcher);
    expect(result.ok).toBe(false);
    expect(result.failures[0]).toContain("1 line(s) do not match");
    expect(result.failures[0]).toContain("[WARN]");
  });

  it("reports every violated expectation in one pass, not just the first", () => {
    const matcher: TerminalMatcher = {
      kind: "shape",
      minLines: 10,
      includesLines: ["turtlesim", "demo_nodes_cpp"],
      includesText: ["nowhere"],
    };
    const result = matchTerminalOutput("rclpy", matcher);
    expect(result.ok).toBe(false);
    // minLines + two missing lines + one missing substring.
    expect(result.failures).toHaveLength(4);
  });

  it("treats an empty shape matcher as a pass, so a fixture must opt in to strictness", () => {
    expect(matchTerminalOutput("anything at all", { kind: "shape" }).ok).toBe(true);
  });

  it("reports an unusable everyLineMatches as a fixture bug", () => {
    const matcher: TerminalMatcher = { kind: "shape", everyLineMatches: "([unclosed" };
    const result = matchTerminalOutput("a", matcher);
    expect(result.ok).toBe(false);
    expect(result.failures[0]).toContain("fixture is invalid");
  });
});
