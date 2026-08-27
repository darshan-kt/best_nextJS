import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  ROS2_BEFORE_AND_AFTER_TRANSCRIPT,
  ROS2_INSTALL_SCRIPT,
  ROS2_LOCALE_FIX_SCRIPT,
  ROS2_TERMINAL_FIXTURES,
  findTerminalFixture,
  terminalOutput,
} from "./terminal-fixtures";
import { matchTerminalOutput } from "./terminal-match";

describe("fixture invariants", () => {
  it("has unique ids", () => {
    const ids = ROS2_TERMINAL_FIXTURES.map((fixture) => fixture.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("gives every skipped-in-ci fixture a reason", () => {
    for (const fixture of ROS2_TERMINAL_FIXTURES) {
      if (fixture.ci.status === "skipped-in-ci") {
        expect(fixture.ci.reason.length, `${fixture.id} needs a real reason`).toBeGreaterThan(40);
      }
    }
  });

  it("never asks a clean shell to run a command that needs sourcing", () => {
    // A `clean` fixture runs in a shell that has never seen setup.bash. Any
    // `ros2` subcommand there would fail for the trivial reason rather than
    // the interesting one — the sole legitimate exception is the fixture
    // whose whole subject is that failure.
    for (const fixture of ROS2_TERMINAL_FIXTURES) {
      if (fixture.shell !== "clean") continue;
      if (fixture.id === "m3-l3-ros2-missing-before-sourcing") continue;
      expect(fixture.command.startsWith("ros2 "), `${fixture.id} needs a sourced shell`).toBe(
        false,
      );
    }
  });

  it("only attaches a session to fixtures that observe a running system", () => {
    for (const fixture of ROS2_TERMINAL_FIXTURES) {
      if (fixture.session === undefined) continue;
      expect(fixture.shell).toBe("ros-sourced");
    }
  });

  it("gives every never-exiting command a capture window", () => {
    // Without one the runner would block forever. These are the commands the
    // course tells the learner to stop with Ctrl+C.
    const neverExits = ["ros2 run ", "ros2 topic echo"];
    for (const fixture of ROS2_TERMINAL_FIXTURES) {
      if (fixture.ci.status !== "run") continue;
      if (!neverExits.some((prefix) => fixture.command.startsWith(prefix))) continue;
      expect(fixture.capture, `${fixture.id} would block forever`).toBeDefined();
    }
  });

  it("satisfies its own matcher wherever the rendered output is not abridged", () => {
    // A fixture whose course text fails its own assertion is incoherent: CI
    // would then be checking something the lesson does not actually claim.
    for (const fixture of ROS2_TERMINAL_FIXTURES) {
      if (fixture.abridged) continue;
      const result = matchTerminalOutput(fixture.expectedOutput, fixture.matcher);
      expect(result.failures, `${fixture.id}: ${result.failures.join("; ")}`).toEqual([]);
    }
  });

  it("covers every command the Module 4 design document calls out", () => {
    const required = [
      "ros2 pkg executables turtlesim",
      "ros2 node list",
      "ros2 topic list",
      "ros2 service list",
      "ros2 action list",
      "ros2 topic echo /turtle1/cmd_vel",
    ];
    const commands = ROS2_TERMINAL_FIXTURES.map((fixture) => fixture.command);
    for (const command of required) {
      expect(commands, `missing a fixture for \`${command}\``).toContain(command);
    }
  });
});

describe("terminalOutput", () => {
  it("returns the rendered output for a known id", () => {
    expect(terminalOutput("m3-l3-ros-distro-after-sourcing")).toBe("jazzy");
  });

  it("throws with the known ids when the id is wrong, so the seed fails loudly", () => {
    expect(() => terminalOutput("no-such-fixture")).toThrow(/Unknown ROS 2 terminal fixture/);
    expect(() => terminalOutput("no-such-fixture")).toThrow(/m3-l4-talker/);
  });

  it("returns undefined rather than throwing from the lookup helper", () => {
    expect(findTerminalFixture("no-such-fixture")).toBeUndefined();
  });
});

/**
 * Parity with the course content that is currently still inline in the seed.
 *
 * The wiring step replaces those literals with imports from this module. That
 * step must be a pure substitution — it is a content-verification change, not
 * a content change, and a learner should not find the lesson reworded because
 * of it. These tests prove the substitution is safe.
 *
 * They retire themselves: once the seed imports these constants the literals
 * are gone, the extraction returns nothing, and the assertion is skipped
 * rather than failing. They are also skipped if the seed has been reformatted
 * out of the shape the extractor understands — a formatting change in another
 * workstream should not fail this repo's unit tests.
 */
function extractSeedCodeBlock(filename: string): string | undefined {
  let seed: string;
  try {
    seed = readFileSync(join(process.cwd(), "prisma", "seed.ts"), "utf8");
  } catch {
    return undefined;
  }

  const anchor = `filename: ${JSON.stringify(filename)},`;
  const anchorIndex = seed.indexOf(anchor);
  if (anchorIndex === -1) return undefined;

  const codeIndex = seed.indexOf("code: ", anchorIndex);
  if (codeIndex === -1) return undefined;

  // The seed writes these as single-line double-quoted JS string literals,
  // which JSON.parse reads exactly.
  const literal = seed.slice(codeIndex + "code: ".length).match(/^"(?:[^"\\]|\\.)*"/u);
  if (literal === null) return undefined;

  try {
    const parsed: unknown = JSON.parse(literal[0]);
    return typeof parsed === "string" ? parsed : undefined;
  } catch {
    return undefined;
  }
}

describe("parity with prisma/seed.ts", () => {
  const cases: readonly (readonly [string, string])[] = [
    ["install-ros2-jazzy.sh", ROS2_INSTALL_SCRIPT],
    ["before-and-after.sh", ROS2_BEFORE_AND_AFTER_TRANSCRIPT],
    ["fix-locale.sh", ROS2_LOCALE_FIX_SCRIPT],
  ];

  for (const [filename, constant] of cases) {
    const seeded = extractSeedCodeBlock(filename);

    it.skipIf(seeded === undefined)(
      `reproduces the ${filename} block byte for byte`,
      () => {
        expect(constant).toBe(seeded);
      },
    );
  }
});
