import { expect, test } from "@playwright/test";

/**
 * Every lesson a learner can reach, through the real player, asserting it
 * did not silently degrade.
 *
 * WHY THIS EXISTS AS AN E2E RATHER THAN A UNIT TEST
 *
 * `block-renderer.test.ts` proves every `ContentBlockType` has a case in
 * all three switch sites, and `datasets/schemas.test.ts` proves every
 * `datasetViewSchema` member has a branch in the renderer. Both read
 * source. Neither can see what a real row does on a real page, and the gap
 * between those two facts is where this course's defects have actually
 * lived:
 *
 *   * A `DATASET_EXPLORER` naming a column its dataset does not have
 *     degrades to INVALID at query time. It compiles, seeds, and renders a
 *     notice.
 *   * A `LAB_PROTOCOL` linking a `deviceSlug` whose home course is DRAFT
 *     renders a link to `/hardware/<slug>` that 404s. Nothing in the
 *     payload is wrong; the other side of the link is. This is a defect
 *     that shipped, and it is why link-following is in here.
 *   * Tightening a Zod refinement degrades every already-seeded row that
 *     no longer satisfies it, and the type checker stays perfectly happy.
 *
 * Each of those reaches a learner as a quiet notice inside a published
 * lesson. This is the tier that fails first instead.
 *
 * WHY IT CRAWLS RATHER THAN QUERYING THE DATABASE
 *
 * Enumerating lessons from Prisma would test content that exists; crawling
 * from `/dashboard` and `/courses` tests content a learner can actually
 * navigate to, which is the stronger claim and needs no database handle in
 * the spec. It also means a lesson that becomes unreachable — an outline
 * that stops linking it — shows up as a shrinking sweep rather than as a
 * silently still-passing test.
 *
 * WHAT IT ASSERTS, AND WHAT IT DELIBERATELY DOES NOT
 *
 * Asserted: HTTP 200, no uncaught page exception, none of the renderer's
 * degradation notices in the DOM, and no in-app link emitted by lesson
 * content resolving to 4xx/5xx.
 *
 * NOT asserted: console errors. A production build loading external sample
 * media (the TypeScript course's blocks point at MDN's CC0 assets) would
 * turn one flaky network response into a red suite, and a resource warning
 * is not the failure class this spec is for. Uncaught exceptions are, and
 * `pageerror` catches those.
 *
 * Links are deduplicated across the whole run, so shared chrome is fetched
 * once rather than once per lesson — that is what keeps a sweep of every
 * lesson to about a minute.
 */

/** The notices `UnsupportedBlock` and `DatasetExplorer` render on failure. */
const DEGRADATION_MARKERS = [
  // A stored payload that failed its Zod schema at query time.
  "couldn't be displayed",
  // An enum value with no renderer case.
  "isn't supported in the player yet",
  // The dataset file no longer matches the checksum on its row.
  "no longer matches the checksum recorded for it",
] as const;

test("no reachable lesson degrades, and none links to a 404", async ({ page }) => {
  // Breadth is the entire point, so the budget is generous rather than the
  // 30s default.
  test.setTimeout(12 * 60 * 1000);

  await page.goto("/sign-in");
  await page.getByLabel("Email").fill("student@example.com");
  await page.getByLabel("Password").fill("seed-password-123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  // Enrolled courses come from the dashboard, publicly listed ones from the
  // catalogue. The union is what this learner can open.
  const courseSlugs = new Set<string>();
  for (const entry of ["/dashboard", "/courses"]) {
    await page.goto(entry, { waitUntil: "networkidle" });
    const hrefs = await page
      .locator("a[href^='/courses/']")
      .evaluateAll((anchors) => anchors.map((a) => a.getAttribute("href") ?? ""));
    for (const href of hrefs) {
      const match = /^\/courses\/([a-z0-9-]+)$/.exec(href);
      if (match) courseSlugs.add(match[1]);
    }
  }

  expect(
    courseSlugs.size,
    "No courses reachable from /dashboard or /courses — is the database seeded? Run `pnpm db:seed`."
  ).toBeGreaterThan(0);

  // Lessons are linked from the `/learn` gate, not from the course detail
  // page: `CurriculumOutline` shows titles to a prospective learner but
  // links them only past the enrollment check (§12). A course this student
  // cannot open is skipped rather than failed — the catalogue lists courses
  // they are not enrolled in, and that is correct behaviour, not a defect.
  const lessonPaths = new Set<string>();
  for (const slug of courseSlugs) {
    const gate = await page.goto(`/courses/${slug}/learn`, { waitUntil: "networkidle" });
    if (gate?.status() !== 200) continue;

    const hrefs = await page
      .locator(`a[href^='/courses/${slug}/learn/']`)
      .evaluateAll((anchors) => anchors.map((a) => a.getAttribute("href") ?? ""));
    for (const href of hrefs) lessonPaths.add(href);
  }

  expect(
    lessonPaths.size,
    "No lesson links found behind any /learn gate — the curriculum outline may have stopped linking lessons."
  ).toBeGreaterThan(0);

  // Printed so a shrinking sweep is visible in CI output. A spec that
  // silently starts covering ten lessons instead of a hundred and fifty
  // still passes, and that is the failure this line is against.
  console.log(
    `sweeping ${lessonPaths.size} lessons across ${courseSlugs.size} reachable course(s)`
  );

  const failures: string[] = [];
  const checkedLinks = new Map<string, number>();

  page.on("pageerror", (error) => {
    failures.push(`${page.url()} — uncaught: ${String(error).slice(0, 200)}`);
  });

  for (const path of lessonPaths) {
    const response = await page.goto(path, { waitUntil: "networkidle" });

    const status = response?.status() ?? 0;
    if (status !== 200) {
      failures.push(`${path} — HTTP ${status}`);
      continue;
    }

    const body = await page.locator("body").innerText();
    for (const marker of DEGRADATION_MARKERS) {
      if (!body.includes(marker)) continue;
      const line =
        body.split("\n").find((candidate) => candidate.includes(marker))?.trim() ?? marker;
      failures.push(`${path} — ${line.slice(0, 160)}`);
    }

    // In-app links this lesson emits. `LAB_PROTOCOL` and `DEVICE_CARD` are
    // why this is here: `deviceSlug` and `simulationFallbackLessonSlug` are
    // plain strings with no foreign key, so following them is the only
    // thing that proves they resolve.
    //
    // NOT scoped to `main`. The first version of this spec wrote
    // `main a[href...]` to mean "the lesson body rather than the chrome" —
    // and the lesson player renders no `<main>` element at all, so the
    // selector matched nothing, zero links were followed, and this check
    // passed vacuously on every run while reporting success. Chrome links
    // are deduplicated across the whole sweep anyway, so the scoping bought
    // nothing even in the version where it would have worked.
    const hrefs = await page
      .locator("a[href^='/hardware/'], a[href^='/courses/']")
      .evaluateAll((anchors) => [
        ...new Set(anchors.map((anchor) => anchor.getAttribute("href") ?? "")),
      ]);

    for (const href of hrefs) {
      if (!href || checkedLinks.has(href)) continue;
      const linkResponse = await page.request.get(href);
      checkedLinks.set(href, linkResponse.status());
      if (linkResponse.status() >= 400) {
        failures.push(`${path} — links to ${href}, which returns ${linkResponse.status()}`);
      }
    }
  }

  // Reported on SUCCESS as well as failure, deliberately. A green run whose
  // link count is zero is the vacuous pass this check has already shipped
  // once — printing the number is what makes "clean" mean something.
  console.log(
    `swept ${lessonPaths.size} lessons, followed ${checkedLinks.size} unique in-app links`
  );

  expect(
    checkedLinks.size,
    "No in-app links were followed across the whole sweep. The link check is " +
      "not doing anything — verify the anchor selector still matches."
  ).toBeGreaterThan(0);

  expect(
    failures,
    `${failures.length} problem(s) across ${lessonPaths.size} lessons swept ` +
      `(${checkedLinks.size} unique in-app links followed):\n${failures.join("\n")}`
  ).toEqual([]);
});
