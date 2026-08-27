/**
 * Matching engine for verified terminal output.
 *
 * The ROS 2 course shows terminal output the learner is expected to compare
 * against their own screen. Some of that output is genuinely invariant
 * (`echo $ROS_DISTRO` prints `jazzy`, or the install is wrong); most of it is
 * not (`ros2 pkg list` prints several hundred package names whose exact set
 * moves with every Jazzy point release, and whose order is not contractual).
 *
 * Asserting an exact match on the variable kind produces a permanently red
 * verification job, which is strictly worse than having no job at all: a
 * check nobody believes stops being read. So a fixture declares *how* its
 * output should be compared, and this module is the single place that
 * comparison is implemented — pure, synchronous, and testable without ROS 2
 * installed, which matters because this is the part most likely to be
 * subtly wrong.
 */

/**
 * How a captured output is compared against what the course claims.
 *
 * - `exact` — the whole output must equal the expected string, after
 *   normalisation. Reserve for genuinely invariant output.
 * - `regex` — the output has a fixed skeleton around a variable part
 *   (timestamps, sequence numbers, version strings).
 * - `shape` — the output is a list, or is long enough that the lesson
 *   abridges it. Assert its structure: how many lines, which entries must be
 *   present, what every line has to look like.
 */
export type TerminalMatcher =
  | { readonly kind: "exact"; readonly value: string }
  | { readonly kind: "regex"; readonly pattern: string; readonly flags?: string }
  | {
      readonly kind: "shape";
      /** Minimum number of non-blank lines. */
      readonly minLines?: number;
      /** Maximum number of non-blank lines. */
      readonly maxLines?: number;
      /** Entries that must appear as a whole line of their own. */
      readonly includesLines?: readonly string[];
      /** Substrings that must appear somewhere in the output. */
      readonly includesText?: readonly string[];
      /** Substrings that must NOT appear anywhere in the output. */
      readonly excludesText?: readonly string[];
      /** Regex source that every non-blank line must match. */
      readonly everyLineMatches?: string;
    };

export interface TerminalMatchResult {
  readonly ok: boolean;
  /** One human-readable sentence per violated expectation. Empty when ok. */
  readonly failures: readonly string[];
}

/**
 * ANSI CSI sequences, built without a literal control character so the
 * pattern stays readable and does not depend on how the linter feels about
 * control characters in regex literals. ROS 2's CLI colourises some output
 * when it believes it is attached to a terminal, and a colour code is never
 * something a lesson is asserting.
 */
const ESC = String.fromCharCode(27);
const ANSI_PATTERN = new RegExp(`${ESC}\\[[0-9;?]*[ -/]*[@-~]`, "g");

/**
 * Put captured output into the form the course renders it in.
 *
 * Deliberately conservative: it removes only differences a lesson would
 * never be asserting — carriage returns from a pty, terminal colour codes,
 * trailing whitespace on a line, and blank lines at either end. Interior
 * blank lines and leading indentation are preserved, because both carry
 * meaning in ROS 2's YAML-ish message output and in argparse help text.
 */
export function normalizeTerminalOutput(raw: string): string {
  return raw
    .replace(ANSI_PATTERN, "")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/, ""))
    .join("\n")
    .replace(/^\n+/, "")
    .replace(/\n+$/, "");
}

/** Non-blank lines of a normalised output, in order. */
export function significantLines(normalized: string): readonly string[] {
  return normalized.split("\n").filter((line) => line.trim() !== "");
}

/** A short, quotable excerpt for failure messages. */
function excerpt(normalized: string, maxLines = 6): string {
  const lines = normalized.split("\n");
  const head = lines.slice(0, maxLines);
  const suffix =
    lines.length > maxLines ? `\n… (${lines.length - maxLines} more line(s))` : "";
  return head.join("\n") + suffix;
}

function firstDifference(actual: string, expected: string): string {
  const actualLines = actual.split("\n");
  const expectedLines = expected.split("\n");
  const limit = Math.max(actualLines.length, expectedLines.length);

  for (let i = 0; i < limit; i += 1) {
    if (actualLines[i] !== expectedLines[i]) {
      return [
        `first difference on line ${i + 1}:`,
        `  expected: ${JSON.stringify(expectedLines[i] ?? "<no such line>")}`,
        `  actual:   ${JSON.stringify(actualLines[i] ?? "<no such line>")}`,
      ].join("\n");
    }
  }

  return "outputs differ only in trailing content";
}

/**
 * Compare a captured terminal output against a fixture's matcher.
 *
 * Collects *every* violated expectation rather than stopping at the first,
 * so a drifted output reports its full story in one CI run instead of one
 * problem per run — this job runs weekly, so a one-failure-per-run loop
 * would take a month to surface a list that is wrong in four ways.
 */
export function matchTerminalOutput(
  rawOutput: string,
  matcher: TerminalMatcher,
): TerminalMatchResult {
  const actual = normalizeTerminalOutput(rawOutput);
  const failures: string[] = [];

  switch (matcher.kind) {
    case "exact": {
      const expected = normalizeTerminalOutput(matcher.value);
      if (actual !== expected) {
        failures.push(
          `output does not match exactly — ${firstDifference(actual, expected)}`,
        );
      }
      break;
    }

    case "regex": {
      let pattern: RegExp;
      try {
        pattern = new RegExp(matcher.pattern, matcher.flags);
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        return {
          ok: false,
          failures: [
            `fixture is invalid: ${matcher.pattern} is not a usable regex (${detail})`,
          ],
        };
      }
      if (!pattern.test(actual)) {
        failures.push(
          `output does not match /${matcher.pattern}/${matcher.flags ?? ""}\n${excerpt(actual)}`,
        );
      }
      break;
    }

    case "shape": {
      const lines = significantLines(actual);

      if (matcher.minLines !== undefined && lines.length < matcher.minLines) {
        failures.push(
          `expected at least ${matcher.minLines} non-blank line(s), got ${lines.length}`,
        );
      }
      if (matcher.maxLines !== undefined && lines.length > matcher.maxLines) {
        failures.push(
          `expected at most ${matcher.maxLines} non-blank line(s), got ${lines.length}`,
        );
      }

      for (const required of matcher.includesLines ?? []) {
        if (!lines.some((line) => line.trim() === required.trim())) {
          failures.push(`expected a line reading exactly ${JSON.stringify(required)}`);
        }
      }

      for (const required of matcher.includesText ?? []) {
        if (!actual.includes(required)) {
          failures.push(`expected the output to contain ${JSON.stringify(required)}`);
        }
      }

      for (const forbidden of matcher.excludesText ?? []) {
        if (actual.includes(forbidden)) {
          failures.push(`expected the output NOT to contain ${JSON.stringify(forbidden)}`);
        }
      }

      if (matcher.everyLineMatches !== undefined) {
        let linePattern: RegExp;
        try {
          linePattern = new RegExp(matcher.everyLineMatches);
        } catch (error) {
          const detail = error instanceof Error ? error.message : String(error);
          return {
            ok: false,
            failures: [
              `fixture is invalid: ${matcher.everyLineMatches} is not a usable regex (${detail})`,
            ],
          };
        }
        const offending = lines.filter((line) => !linePattern.test(line));
        if (offending.length > 0) {
          failures.push(
            `${offending.length} line(s) do not match /${matcher.everyLineMatches}/, ` +
              `first offender: ${JSON.stringify(offending[0])}`,
          );
        }
      }
      break;
    }
  }

  return { ok: failures.length === 0, failures };
}
