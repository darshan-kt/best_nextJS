/**
 * Capture real ROS 2 terminal output and diff it against the course fixtures.
 *
 * Run on a machine that actually has ROS 2 Jazzy installed — in practice the
 * `ros2-terminal-verification` workflow's `ubuntu-24.04` runner, weekly:
 *
 *   xvfb-run -a pnpm exec tsx scripts/verify-ros2-terminal-output.ts
 *
 * WHY TYPESCRIPT AND NOT A SHELL SCRIPT
 *
 * The comparison rules are the interesting part of this path, and they are
 * shared with the course content: `src/features/courses/content/ros2/
 * terminal-fixtures.ts` is what `prisma/seed.ts` renders its CODE blocks
 * from, and `terminal-match.ts` is what decides whether a captured output
 * still supports what the lesson claims. Written in bash, those rules would
 * have to be reimplemented in a second language, drift from the fixtures, and
 * become untestable — and they are precisely the part most likely to be
 * subtly wrong. Reading the fixtures directly means "the fixtures verify" and
 * "the course content verifies" are the same statement. The shelling out that
 * is genuinely shell work still happens in bash, below.
 *
 * EXIT CODES
 *   0  every runnable fixture matched
 *   1  at least one fixture drifted, or a session could not be brought up
 *   2  usage error
 */

import { spawn, type ChildProcess } from "node:child_process";
import { appendFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  ROS2_INSTALL_SCRIPT,
  ROS2_LOCALE_FIX_SCRIPT,
  ROS2_SETUP_SCRIPT_PATH,
  ROS2_TERMINAL_FIXTURES,
  type TerminalFixture,
} from "../src/features/courses/content/ros2/terminal-fixtures";
import { matchTerminalOutput } from "../src/features/courses/content/ros2/terminal-match";

/** Hard ceiling for a command that is expected to exit on its own. */
const DEFAULT_TIMEOUT_MS = 120_000;
/** Grace between the Ctrl+C the lesson describes and an unconditional kill. */
const SIGKILL_GRACE_MS = 3_000;
/** How long to wait for a node to appear in `ros2 node list`. */
const SESSION_READY_TIMEOUT_MS = 90_000;
const SESSION_POLL_INTERVAL_MS = 2_000;

/* ------------------------------------------------------------------ env -- */

/**
 * A shell environment that has never seen `setup.bash`.
 *
 * The workflow sources ROS before invoking this script, which is what a
 * learner's `~/.bashrc` does too — so `process.env` arrives contaminated, and
 * the fixtures whose entire subject is the unsourced failure would silently
 * pass for the wrong reason. Stripping it here rather than relying on the
 * caller keeps the script correct however it is invoked.
 */
function cleanEnv(): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env };

  for (const key of Object.keys(env)) {
    if (/^(ROS_|AMENT_|RMW_|COLCON_)/.test(key)) delete env[key];
  }
  delete env.CMAKE_PREFIX_PATH;

  for (const key of ["PATH", "LD_LIBRARY_PATH", "PYTHONPATH"] as const) {
    const value = env[key];
    if (value === undefined) continue;
    const kept = value.split(":").filter((entry) => !entry.startsWith("/opt/ros/"));
    if (kept.length > 0) {
      env[key] = kept.join(":");
    } else {
      delete env[key];
    }
  }

  return env;
}

/** The snippet a fixture's command runs inside, per its declared shell. */
function shellSnippet(fixture: Pick<TerminalFixture, "command" | "shell">): string {
  if (fixture.shell === "clean") {
    return `${fixture.command}\n`;
  }
  return [
    `if ! source ${ROS2_SETUP_SCRIPT_PATH} > /dev/null 2>&1; then`,
    `  echo "verify-ros2: could not source ${ROS2_SETUP_SCRIPT_PATH}" >&2`,
    `  exit 90`,
    `fi`,
    fixture.command,
    "",
  ].join("\n");
}

/* -------------------------------------------------------------- capture -- */

interface CaptureResult {
  readonly output: string;
  readonly exitCode: number | null;
  readonly interrupted: boolean;
  readonly timedOut: boolean;
}

interface RunOptions {
  readonly snippet: string;
  /** Give the command a controlling terminal (it reads raw keystrokes). */
  readonly pty?: boolean;
  /** The command never exits: capture for this long, then Ctrl+C it. */
  readonly captureMs?: number;
  /** Hard ceiling for a command that is expected to exit on its own. */
  readonly timeoutMs?: number;
}

let scratchDir = "";
let snippetCounter = 0;

function writeSnippet(snippet: string): string {
  const path = join(scratchDir, `snippet-${(snippetCounter += 1)}.sh`);
  writeFileSync(path, snippet, { mode: 0o700 });
  return path;
}

function spawnSnippet(options: RunOptions, env: NodeJS.ProcessEnv): ChildProcess {
  const path = writeSnippet(options.snippet);

  // `detached` puts the command in its own process group so a Ctrl+C reaches
  // everything it started — `ros2 run` launches the node as a child, and
  // signalling only the wrapper leaves an orphaned node holding the graph.
  if (options.pty === true) {
    // `script` allocates a pty; `-e` propagates the child's exit status.
    // stdin stays an open pipe because a program in cbreak mode exits at once
    // on EOF, which is exactly what we are trying not to do.
    return spawn("script", ["-q", "-e", "-c", `bash ${path}`, "/dev/null"], {
      env,
      detached: true,
      stdio: ["pipe", "pipe", "pipe"],
    });
  }

  return spawn("bash", [path], {
    env,
    detached: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function killGroup(child: ChildProcess, signal: NodeJS.Signals): void {
  if (child.pid === undefined || child.exitCode !== null) return;
  try {
    process.kill(-child.pid, signal);
  } catch {
    // Already gone, or never got a process group. Fall back to the pid.
    try {
      child.kill(signal);
    } catch {
      // Nothing left to signal.
    }
  }
}

function runSnippet(options: RunOptions, env: NodeJS.ProcessEnv): Promise<CaptureResult> {
  return new Promise((resolve) => {
    const child = spawnSnippet(options, env);
    const chunks: string[] = [];
    let interrupted = false;
    let timedOut = false;

    // Combined stream: a lesson's transcript shows stdout and stderr the way
    // the learner's terminal does, interleaved.
    child.stdout?.setEncoding("utf8");
    child.stderr?.setEncoding("utf8");
    child.stdout?.on("data", (chunk: string) => chunks.push(chunk));
    child.stderr?.on("data", (chunk: string) => chunks.push(chunk));

    const timers: NodeJS.Timeout[] = [];

    if (options.captureMs !== undefined) {
      timers.push(
        setTimeout(() => {
          interrupted = true;
          // The Ctrl+C the lesson tells the learner to press.
          killGroup(child, "SIGINT");
          timers.push(setTimeout(() => killGroup(child, "SIGKILL"), SIGKILL_GRACE_MS));
        }, options.captureMs),
      );
    } else {
      timers.push(
        setTimeout(() => {
          timedOut = true;
          killGroup(child, "SIGKILL");
        }, options.timeoutMs ?? DEFAULT_TIMEOUT_MS),
      );
    }

    const finish = (exitCode: number | null): void => {
      for (const timer of timers) clearTimeout(timer);
      resolve({ output: chunks.join(""), exitCode, interrupted, timedOut });
    };

    child.on("error", (error: Error) => {
      chunks.push(`verify-ros2: could not start command: ${error.message}\n`);
      finish(null);
    });
    child.on("close", (code) => finish(code));
  });
}

/* -------------------------------------------------------------- session -- */

const sessionProcesses: ChildProcess[] = [];

function startBackground(command: string, pty: boolean): ChildProcess {
  const child = spawnSnippet(
    { snippet: shellSnippet({ command, shell: "ros-sourced" }), pty },
    cleanEnv(),
  );
  // Drain, or a full pipe buffer stalls the node we are trying to observe.
  child.stdout?.resume();
  child.stderr?.resume();
  sessionProcesses.push(child);
  return child;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForNode(nodeName: string): Promise<boolean> {
  const deadline = Date.now() + SESSION_READY_TIMEOUT_MS;

  while (Date.now() < deadline) {
    const result = await runSnippet(
      { snippet: shellSnippet({ command: "ros2 node list", shell: "ros-sourced" }), timeoutMs: 20_000 },
      cleanEnv(),
    );
    if (result.output.split("\n").some((line) => line.trim() === nodeName)) return true;
    await delay(SESSION_POLL_INTERVAL_MS);
  }

  return false;
}

/**
 * Bring up the live system Module 4's inspection commands observe.
 *
 * Both halves are real: `turtlesim_node` needs an X display (hence
 * `xvfb-run`, and the display check below is deliberately a hard failure —
 * silently running headless would make every Module 4 fixture pass for a
 * system the lesson does not describe), and `turtle_teleop_key` reads raw
 * keystrokes, so it needs a pty or it exits immediately and `/teleop_turtle`
 * never appears in `ros2 node list`.
 */
async function startTurtlesimSession(): Promise<string | undefined> {
  if (process.env.DISPLAY === undefined || process.env.DISPLAY === "") {
    return (
      "DISPLAY is unset, so turtlesim_node has nowhere to draw. Run this script " +
      "under `xvfb-run -a`, or export DISPLAY for a real X server."
    );
  }

  startBackground("ros2 run turtlesim turtlesim_node", false);
  if (!(await waitForNode("/turtlesim"))) {
    return "turtlesim_node never appeared in `ros2 node list` — see the captured session logs.";
  }

  startBackground("ros2 run turtlesim turtle_teleop_key", true);
  if (!(await waitForNode("/teleop_turtle"))) {
    return "turtle_teleop_key never appeared in `ros2 node list` — see the captured session logs.";
  }

  return undefined;
}

function stopSession(): void {
  for (const child of sessionProcesses.splice(0)) {
    killGroup(child, "SIGINT");
    killGroup(child, "SIGKILL");
  }
}

/* --------------------------------------------------------------- report -- */

type Verdict = "pass" | "fail" | "skipped";

interface FixtureReport {
  readonly fixture: TerminalFixture;
  readonly verdict: Verdict;
  readonly detail: readonly string[];
  readonly captured?: string;
}

async function verifyFixture(fixture: TerminalFixture): Promise<FixtureReport> {
  const capture = await runSnippet(
    {
      snippet: shellSnippet(fixture),
      pty: fixture.pty === true,
      captureMs: fixture.capture?.durationMs,
    },
    cleanEnv(),
  );

  const detail: string[] = [];

  if (capture.timedOut) {
    detail.push(
      `command did not exit within ${DEFAULT_TIMEOUT_MS / 1000}s — it was killed, so the ` +
        "capture below may be incomplete",
    );
  }
  if (capture.exitCode === 90) {
    detail.push(`could not source ${ROS2_SETUP_SCRIPT_PATH} — is ROS 2 Jazzy installed?`);
  }

  const result = matchTerminalOutput(capture.output, fixture.matcher);
  detail.push(...result.failures);

  return {
    fixture,
    verdict: detail.length === 0 ? "pass" : "fail",
    detail,
    captured: capture.output,
  };
}

/** Drive a never-exiting command with the traffic the lesson's keypress makes. */
async function verifyFixtureWithStimulus(fixture: TerminalFixture): Promise<FixtureReport> {
  const stimulus = fixture.capture?.stimulus;
  if (stimulus === undefined) return verifyFixture(fixture);

  const publisher = spawnSnippet(
    { snippet: shellSnippet({ command: stimulus, shell: "ros-sourced" }) },
    cleanEnv(),
  );
  publisher.stdout?.resume();
  publisher.stderr?.resume();

  try {
    return await verifyFixture(fixture);
  } finally {
    killGroup(publisher, "SIGINT");
    killGroup(publisher, "SIGKILL");
  }
}

const ICONS: Record<Verdict, string> = { pass: "PASS", fail: "FAIL", skipped: "SKIP" };

function renderTable(reports: readonly FixtureReport[]): string {
  const idWidth = Math.max(...reports.map((r) => r.fixture.id.length), 2);
  const modeWidth = 5;

  const rows = reports.map((report) => {
    const { fixture } = report;
    return [
      ICONS[report.verdict].padEnd(4),
      fixture.id.padEnd(idWidth),
      fixture.matcher.kind.padEnd(modeWidth),
      fixture.command,
    ].join("  ");
  });

  return [
    ["----", "-".repeat(idWidth), "-".repeat(modeWidth), "-".repeat(30)].join("  "),
    ...rows,
    ["----", "-".repeat(idWidth), "-".repeat(modeWidth), "-".repeat(30)].join("  "),
  ].join("\n");
}

function writeStepSummary(reports: readonly FixtureReport[]): void {
  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (summaryPath === undefined || summaryPath === "") return;

  const lines = [
    "## ROS 2 terminal-output verification",
    "",
    "| Result | Fixture | Mode | Command |",
    "| --- | --- | --- | --- |",
    ...reports.map((report) => {
      const emoji =
        report.verdict === "pass" ? "✅" : report.verdict === "fail" ? "❌" : "⏭️";
      return `| ${emoji} | \`${report.fixture.id}\` | ${report.fixture.matcher.kind} | \`${report.fixture.command}\` |`;
    }),
    "",
  ];

  const failures = reports.filter((report) => report.verdict === "fail");
  if (failures.length > 0) {
    lines.push("### Drifted fixtures", "");
    for (const report of failures) {
      lines.push(
        `<details><summary><code>${report.fixture.id}</code></summary>`,
        "",
        ...report.detail.map((line) => `- ${line}`),
        "",
        "```",
        (report.captured ?? "").split("\n").slice(0, 40).join("\n"),
        "```",
        "",
        "</details>",
        "",
      );
    }
  }

  appendFileSync(summaryPath, lines.join("\n"));
}

/* ----------------------------------------------------------------- main -- */

interface Options {
  readonly only: readonly string[];
  readonly logDir: string;
  readonly emitInstallScript?: string;
  readonly emitLocaleScript?: string;
}

function parseArgs(argv: readonly string[]): Options | string {
  const only: string[] = [];
  let logDir = join(process.cwd(), "ros2-capture");
  let emitInstallScript: string | undefined;
  let emitLocaleScript: string | undefined;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const value = argv[i + 1];

    switch (arg) {
      case "--only":
        if (value === undefined) return "--only needs a fixture id";
        only.push(value);
        i += 1;
        break;
      case "--log-dir":
        if (value === undefined) return "--log-dir needs a path";
        logDir = value;
        i += 1;
        break;
      case "--emit-install-script":
        if (value === undefined) return "--emit-install-script needs a path";
        emitInstallScript = value;
        i += 1;
        break;
      case "--emit-locale-script":
        if (value === undefined) return "--emit-locale-script needs a path";
        emitLocaleScript = value;
        i += 1;
        break;
      default:
        return `unknown argument ${JSON.stringify(arg)}`;
    }
  }

  for (const id of only) {
    if (!ROS2_TERMINAL_FIXTURES.some((fixture) => fixture.id === id)) {
      return `unknown fixture id ${JSON.stringify(id)}`;
    }
  }

  return { only, logDir, emitInstallScript, emitLocaleScript };
}

async function main(): Promise<number> {
  const parsed = parseArgs(process.argv.slice(2));
  if (typeof parsed === "string") {
    console.error(`verify-ros2-terminal-output: ${parsed}`);
    return 2;
  }

  // Emit-only modes exist so the workflow installs ROS 2 by running the
  // literal script the course teaches, rather than a paraphrase of it. That
  // is what makes this job a check on the taught install path — including its
  // pinned signing key — and not just on the fixtures.
  if (parsed.emitInstallScript !== undefined) {
    writeFileSync(parsed.emitInstallScript, `${ROS2_INSTALL_SCRIPT}\n`, { mode: 0o700 });
    console.log(`Wrote install-ros2-jazzy.sh to ${parsed.emitInstallScript}`);
  }
  if (parsed.emitLocaleScript !== undefined) {
    writeFileSync(parsed.emitLocaleScript, `${ROS2_LOCALE_FIX_SCRIPT}\n`, { mode: 0o700 });
    console.log(`Wrote fix-locale.sh to ${parsed.emitLocaleScript}`);
  }
  if (parsed.emitInstallScript !== undefined || parsed.emitLocaleScript !== undefined) {
    return 0;
  }

  scratchDir = mkdtempSync(join(tmpdir(), "verify-ros2-"));
  mkdirSync(parsed.logDir, { recursive: true });

  const selected =
    parsed.only.length > 0
      ? ROS2_TERMINAL_FIXTURES.filter((fixture) => parsed.only.includes(fixture.id))
      : ROS2_TERMINAL_FIXTURES;

  const reports: FixtureReport[] = [];
  let sessionError: string | undefined;

  try {
    // Session-less fixtures first, so nothing else is holding the graph while
    // `ros2 node list` is being asserted, and so the session is only paid for
    // if something actually needs it.
    for (const fixture of selected.filter((f) => f.session === undefined)) {
      if (fixture.ci.status === "skipped-in-ci") {
        reports.push({ fixture, verdict: "skipped", detail: [fixture.ci.reason] });
        continue;
      }
      console.log(`… ${fixture.id}: ${fixture.command}`);
      reports.push(await verifyFixtureWithStimulus(fixture));
    }

    const sessionFixtures = selected.filter((f) => f.session === "turtlesim");
    const runnable = sessionFixtures.filter((f) => f.ci.status === "run");

    for (const fixture of sessionFixtures.filter((f) => f.ci.status !== "run")) {
      const reason = fixture.ci.status === "skipped-in-ci" ? fixture.ci.reason : "";
      reports.push({ fixture, verdict: "skipped", detail: [reason] });
    }

    if (runnable.length > 0) {
      console.log("… starting turtlesim + teleop session");
      sessionError = await startTurtlesimSession();

      for (const fixture of runnable) {
        if (sessionError !== undefined) {
          reports.push({ fixture, verdict: "fail", detail: [sessionError] });
          continue;
        }
        console.log(`… ${fixture.id}: ${fixture.command}`);
        reports.push(await verifyFixtureWithStimulus(fixture));
      }
    }
  } finally {
    stopSession();
    if (scratchDir !== "") rmSync(scratchDir, { recursive: true, force: true });
  }

  // Always keep the full captures, passing or not: a green run's artifact is
  // the evidence that settles the open questions recorded in the fixtures'
  // `note` fields, and there is no other way to read the real output of a
  // machine nobody has shell access to.
  for (const report of reports) {
    if (report.captured === undefined) continue;
    writeFileSync(
      join(parsed.logDir, `${report.fixture.id}.txt`),
      [`$ ${report.fixture.command}`, "", report.captured].join("\n"),
    );
  }

  console.log(`\n${renderTable(reports)}\n`);

  const failures = reports.filter((report) => report.verdict === "fail");
  for (const report of failures) {
    const annotation = process.env.GITHUB_ACTIONS === "true" ? "::error::" : "";
    console.error(`\n${annotation}FIXTURE DRIFTED: ${report.fixture.id}`);
    console.error(`  source:  ${report.fixture.source}`);
    console.error(`  command: ${report.fixture.command}`);
    for (const line of report.detail) {
      console.error(`  - ${line.replace(/\n/g, "\n    ")}`);
    }
    console.error("  captured output:");
    for (const line of (report.captured ?? "").split("\n").slice(0, 40)) {
      console.error(`    | ${line}`);
    }
    console.error("  course currently shows:");
    for (const line of report.fixture.expectedOutput.split("\n").slice(0, 40)) {
      console.error(`    | ${line}`);
    }
  }

  writeStepSummary(reports);

  const passed = reports.filter((r) => r.verdict === "pass").length;
  const skipped = reports.filter((r) => r.verdict === "skipped").length;
  console.log(
    `${passed} passed, ${failures.length} failed, ${skipped} skipped-in-ci. ` +
      `Full captures in ${parsed.logDir}.`,
  );

  if (failures.length > 0) {
    console.error(
      "\nThe course shows terminal output that this machine did not produce. " +
        "Update the fixtures in src/features/courses/content/ros2/terminal-fixtures.ts " +
        "to what a real Jazzy install prints — the seed renders its CODE blocks from " +
        "them, so fixing the fixture fixes the lesson.",
    );
    return 1;
  }

  return 0;
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error: unknown) => {
    stopSession();
    console.error("verify-ros2-terminal-output crashed:", error);
    process.exitCode = 1;
  });
