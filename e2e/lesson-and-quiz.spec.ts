import { expect, test } from "@playwright/test";

/**
 * Open a lesson → mark it complete → take its quiz to a graded result
 * (CLAUDE.md §35's "Lesson completion" + "Quiz completion"). Targets the
 * one seeded lesson with real content and a quiz covering all four
 * implemented question types (`prisma/seed.ts`'s "structural-typing"
 * lesson in "typescript-foundations").
 *
 * Both steps tolerate the seeded student already having completed this
 * lesson / attempted this quiz from a prior run — assertions check the
 * resulting state, not which transition produced it.
 */

const COURSE_SLUG = "typescript-foundations";
const LESSON_SLUG = "structural-typing";

test.beforeEach(async ({ page }) => {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill("student@example.com");
  await page.getByLabel("Password").fill("seed-password-123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  // Seed data never enrolls the student in anything (see
  // catalog-and-enrollment.spec.ts) — enrolling here keeps this spec
  // self-sufficient regardless of run order or prior DB state.
  await page.goto(`/courses/${COURSE_SLUG}`);
  const enrollButton = page.getByRole("button", {
    name: "Enroll in this course",
  });
  const continueLink = page.getByRole("link", { name: "Continue learning" });

  // `.isVisible()` doesn't wait — resolve which state the page is
  // actually in first (polling), then branch on it.
  await expect(enrollButton.or(continueLink)).toBeVisible();
  if (await enrollButton.isVisible()) {
    await enrollButton.click();
    await expect(continueLink).toBeVisible();
  }

  await page.goto(`/courses/${COURSE_SLUG}/learn/${LESSON_SLUG}`);
});

test("opens the lesson and marks it complete", async ({ page }) => {
  await expect(
    page.getByText(/TypeScript compares the shape of two types/)
  ).toBeVisible();

  const markComplete = page.getByRole("button", { name: "Mark as complete" });
  if (await markComplete.isVisible().catch(() => false)) {
    await markComplete.click();
  }

  await expect(page.getByText("Completed", { exact: true })).toBeVisible();
});

test("takes the quiz and reaches a graded result", async ({ page }) => {
  await page
    .getByRole("button", { name: /Start quiz|Retake quiz/ })
    .click();

  await page
    .getByLabel("By comparing the shape of members")
    .check();
  await page
    .getByLabel("A value can satisfy an interface it never declares")
    .check();
  await page
    .getByLabel(
      "Two unrelated interfaces with identical members are mutually assignable"
    )
    .check();
  await page.getByLabel("False", { exact: true }).check();
  await page
    .getByPlaceholder("Type your answer")
    .fill("structural typing");

  await page.getByRole("button", { name: "Submit quiz" }).click();

  await expect(page.getByText("Passed", { exact: true })).toBeVisible();
  await expect(page.getByText(/100%/)).toBeVisible();
});
