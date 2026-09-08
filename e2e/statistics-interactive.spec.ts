import { readFileSync } from "node:fs";
import { join } from "node:path";

import { expect, test, type Page } from "@playwright/test";

/**
 * The Statistical Distributions course, exercised rather than merely loaded.
 *
 * `lesson-render-sweep.spec.ts` proves every lesson in the platform paints
 * and links nowhere broken. It never touches a control. That leaves the
 * entire interactive surface of this course — which is most of its value —
 * covered by nothing: a simulator whose sliders no longer redraw, a dataset
 * view that renders its heading and an empty chart, or a lab that collapses
 * to a title would all sail through the sweep.
 *
 * This spec is the other half. It drives each of the seven lessons'
 * controls and asserts the output actually changed, checks the keyboard
 * path, and runs axe over the course.
 *
 * Deliberately scoped to one course. The interactions are specific to
 * `DISTRIBUTION_SIM`, `DATASET_EXPLORER` and `LAB_PROTOCOL`, and a generic
 * "click everything everywhere" spec would assert much less about each.
 */

interface AxeResults {
  violations: {
    id: string;
    impact: "minor" | "moderate" | "serious" | "critical" | null;
    help: string;
    nodes: { target: string[] }[];
  }[];
}

const COURSE = "statistical-distributions-in-robotics";

/** The seven lessons of blueprint revision 3, in curriculum order. */
const LESSONS = [
  "why-statistics-matters",
  "random-variables-and-densities",
  "mean-variance-and-sampling",
  "uniform-where",
  "gaussian-how",
  "exponential-when",
  "three-ways-in-my-robot",
] as const;

async function signIn(page: Page) {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill("student@example.com");
  await page.getByLabel("Password").fill("seed-password-123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

const lessonPath = (slug: string) => `/courses/${COURSE}/learn/${slug}`;

test.describe("statistics course interactive surface", () => {
  test("every simulator responds to its controls", async ({ page }) => {
    test.setTimeout(5 * 60 * 1000);
    await signIn(page);

    let simsDriven = 0;
    let locked = 0;

    for (const slug of LESSONS) {
      await page.goto(lessonPath(slug), { waitUntil: "networkidle" });

      // Interactive simulators are the ones with range inputs; the static
      // figures in L1 and L7 legitimately have none.
      const sliders = page.locator('input[type="range"]');
      const count = await sliders.count();

      for (let i = 0; i < count; i += 1) {
        const slider = sliders.nth(i);

        // A LOCKED control is disabled on purpose and must not move — L2
        // pins mu and sigma so only the sample count varies, which is the
        // whole point of that figure. Asserting it stays put is the real
        // check; asserting it moves would be asserting the lesson is wrong.
        if (await slider.isDisabled()) {
          const pinned = await slider.inputValue();
          await slider.focus();
          await page.keyboard.press("ArrowRight");
          await page.waitForTimeout(100);
          expect(
            await slider.inputValue(),
            `${slug}: slider ${i} is locked but its value changed`
          ).toBe(pinned);
          locked += 1;
          continue;
        }

        const before = await slider.inputValue();

        // Step AWAY from whichever end the control currently sits at.
        // L5's sample slider opens at its maximum on purpose (the lesson
        // asks the learner to drag it DOWN and watch the bars go ragged),
        // so pressing ArrowRight there moves nothing and would look like a
        // dead control rather than a control already at its ceiling.
        const max = Number(await slider.getAttribute("max"));
        const atCeiling = Number(before) >= max;
        const key = atCeiling ? "ArrowLeft" : "ArrowRight";

        await slider.focus();
        for (let k = 0; k < 5; k += 1) await page.keyboard.press(key);
        await page.waitForTimeout(200);

        const after = await slider.inputValue();
        expect(
          after,
          `${slug}: slider ${i} did not move with ${key} — the control is ` +
            `rendered but not operable, which no page-load check would catch.`
        ).not.toBe(before);
        simsDriven += 1;
      }

      // Whatever the lesson draws, it must still be drawn after the
      // parameter changes above — a simulator that throws on a new
      // parameter value leaves the figure blank rather than erroring.
      const figures = await page.locator("svg, canvas").count();
      expect(figures, `${slug}: no figure rendered`).toBeGreaterThan(0);
    }

    expect(
      simsDriven,
      "No sliders were driven anywhere in the course — the selector no longer matches."
    ).toBeGreaterThan(0);
    console.log(
      `drove ${simsDriven} simulator controls across ${LESSONS.length} lessons ` +
        `(${locked} locked control(s) correctly held their value)`
    );
  });

  test("dataset explorers render all three configured views", async ({ page }) => {
    await signIn(page);

    // L4, L5 and L6 each carry one DATASET_EXPLORER, configured for
    // TABLE_PREVIEW + HISTOGRAM + SUMMARY_STATS with no overlay
    // (blueprint revision 3 §4 — "what to expect", not a fit assessment).
    const withData = ["uniform-where", "gaussian-how", "exponential-when"];

    for (const slug of withData) {
      await page.goto(lessonPath(slug), { waitUntil: "networkidle" });
      const body = await page.locator("body").innerText();

      // TABLE_PREVIEW: the caption the renderer writes for every preview.
      expect(body, `${slug}: no dataset table preview`).toMatch(/First \d+ of [\d,]+ rows/);

      // The provenance line, which is what keeps a synthetic file honest.
      expect(body, `${slug}: dataset provenance label missing`).toContain(
        "mathematically generated"
      );

      // SUMMARY_STATS renders numeric statistics; HISTOGRAM renders a plot.
      const table = page.locator("table").first();
      await expect(table, `${slug}: preview table not visible`).toBeVisible();
      expect(
        await page.locator("svg").count(),
        `${slug}: histogram did not render`
      ).toBeGreaterThan(0);

      // No overlay: the renderer only writes this caption when one exists,
      // and revision 3 removed them all.
      expect(body, `${slug}: an overlay caption appeared — revision 3 removed overlays`).not.toContain(
        "candidate model under test"
      );
    }
  });

  test("lab protocols render their safety and validation sections", async ({ page }) => {
    await signIn(page);

    for (const slug of ["uniform-where", "gaussian-how", "exponential-when"]) {
      await page.goto(lessonPath(slug), { waitUntil: "networkidle" });

      const lab = page.locator('section[aria-label^="Physical lab:"]');
      await expect(lab, `${slug}: no lab protocol rendered`).toHaveCount(1);

      // The three parts that make a lab a lab rather than an exercise.
      await expect(
        lab.locator('[aria-label="Validation status"]'),
        `${slug}: lab is missing its validation banner`
      ).toBeVisible();

      const labText = await lab.innerText();
      expect(labText, `${slug}: lab has no safety section`).toContain("Emergency stop");
      expect(labText, `${slug}: lab has no hardware list`).toContain("Hardware");
    }
  });

  test("simulators and quizzes are operable by keyboard alone", async ({ page }) => {
    await signIn(page);

    for (const slug of ["uniform-where", "gaussian-how"]) {
      await page.goto(lessonPath(slug), { waitUntil: "networkidle" });

      // Every range input must carry an accessible name. `ParameterControl`
      // uses a real <label for>, so this checks the wiring rather than the
      // presence of an aria-label attribute.
      const named = await page.locator('input[type="range"]').evaluateAll((inputs) =>
        inputs.map((input) => {
          const id = input.getAttribute("id");
          const label = id ? document.querySelector(`label[for="${CSS.escape(id)}"]`) : null;
          return {
            name: label?.textContent?.trim() ?? "",
            described: Boolean(input.getAttribute("aria-describedby")),
          };
        })
      );
      expect(named.length, `${slug}: no parameter controls found`).toBeGreaterThan(0);
      for (const [index, control] of named.entries()) {
        expect(control.name, `${slug}: slider ${index} has no <label for>`).not.toBe("");
        expect(
          control.described,
          `${slug}: slider ${index} has no aria-describedby`
        ).toBe(true);
      }

      // Reaching a control by Tab, and operating it without a mouse.
      const slider = page.locator('input[type="range"]').first();
      const before = await slider.inputValue();
      await slider.focus();
      await expect(slider).toBeFocused();
      await page.keyboard.press("ArrowRight");
      await page.waitForTimeout(150);
      expect(await slider.inputValue(), `${slug}: keyboard did not change the value`).not.toBe(
        before
      );

      // The quiz's start control must be reachable and activatable by
      // keyboard — Enter on a focused button, not a click.
      const start = page.getByRole("button", { name: /Start quiz|Retake quiz/ }).first();
      if (await start.isVisible().catch(() => false)) {
        await start.focus();
        await expect(start).toBeFocused();
        await start.press("Enter");
        await expect(
          page.getByRole("radio").or(page.getByRole("checkbox")).or(page.getByRole("textbox")).first(),
          `${slug}: quiz did not open to an answerable control via keyboard`
        ).toBeVisible({ timeout: 10_000 });
      }
    }
  });

  test("prefers-reduced-motion is honoured", async ({ browser }) => {
    // §25: motion is a garnish, never the mechanism. `globals.css` collapses
    // every animation and transition under the reduce preference except
    // elements marked `data-motion="essential"`. Asserted here rather than
    // trusted, because the content rewrite touched the lessons that host
    // these components.
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    await signIn(page);
    await page.goto(lessonPath("gaussian-how"), { waitUntil: "networkidle" });

    const slow = await page.evaluate(() => {
      const offenders: string[] = [];
      for (const element of Array.from(document.querySelectorAll("*")).slice(0, 4000)) {
        if ((element as HTMLElement).dataset?.motion === "essential") continue;
        const style = getComputedStyle(element);
        const durations = [style.transitionDuration, style.animationDuration];
        for (const value of durations) {
          for (const part of value.split(",")) {
            const seconds = parseFloat(part);
            if (Number.isFinite(seconds) && seconds > 0.01) {
              offenders.push(`${element.tagName.toLowerCase()} ${part.trim()}`);
            }
          }
        }
      }
      return offenders.slice(0, 10);
    });

    expect(
      slow,
      `Elements still animate under prefers-reduced-motion: ${slow.join(", ")}`
    ).toEqual([]);
    await context.close();
  });

  test("no serious or critical axe violations across the course", async ({ page }) => {
    test.setTimeout(5 * 60 * 1000);
    await signIn(page);

    // `axe-core` is injected and driven directly rather than through
    // `@axe-core/playwright`. That wrapper types its `page` against its own
    // copy of `playwright-core`, and this repo resolves two versions of it,
    // so the wrapper's `Page` and `@playwright/test`'s `Page` are
    // structurally different types. Injecting the script is the same work
    // without a dependency conflict or a cast (§8, §40).
    // Read by path rather than resolved through `createRequire`: Playwright
    // transpiles specs to CJS, where `import.meta` is not available.
    const axeSource = readFileSync(
      join(process.cwd(), "node_modules/axe-core/axe.min.js"),
      "utf8"
    );

    const findings: string[] = [];

    for (const slug of LESSONS) {
      await page.goto(lessonPath(slug), { waitUntil: "networkidle" });
      await page.addScriptTag({ content: axeSource });

      const results = await page.evaluate(async () => {
        const runner = (window as unknown as {
          axe: {
            run: (
              context: Document,
              options: { runOnly: { type: string; values: string[] } }
            ) => Promise<AxeResults>;
          };
        }).axe;

        return runner.run(document, {
          runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] },
        });
      });

      for (const violation of results.violations) {
        // Serious and critical only. Minor/moderate findings are worth
        // knowing but are not a build gate, and gating on them would make
        // this spec fail for contrast ratios inside third-party embeds.
        if (violation.impact !== "serious" && violation.impact !== "critical") continue;
        findings.push(
          `${slug}: [${violation.impact}] ${violation.id} — ${violation.help} ` +
            `(${violation.nodes.length} node(s), first: ${violation.nodes[0]?.target.join(" ")})`
        );
      }
    }

    expect(findings, `axe findings:\n${findings.join("\n")}`).toEqual([]);
    console.log(`axe: 0 serious/critical violations across ${LESSONS.length} lessons`);
  });
});
