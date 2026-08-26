import { expect, test } from "@playwright/test";

/**
 * Browse → view → enroll (CLAUDE.md §35's "Course access" +
 * the first leg of "Student learning flow"). Uses the seeded student
 * (`prisma/seed.ts`) against a course that seed data never enrolls it in,
 * so the spec is meaningful whether it's the first run or a repeat —
 * `EnrollButton` is idempotent, and "Continue learning" is the assertion
 * either way (see `EnrollmentPanel` in `courses/[slug]/page.tsx`).
 */

const COURSE_TITLE = "Web Accessibility in Practice";
const COURSE_SLUG = "web-accessibility-in-practice";

async function signIn(page: import("@playwright/test").Page) {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill("student@example.com");
  await page.getByLabel("Password").fill("seed-password-123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

test("browse the catalogue, open a course, and enroll", async ({ page }) => {
  await signIn(page);

  await page.goto("/courses");
  await expect(
    page.getByRole("heading", { name: /catalog/i }).or(page.locator("h1"))
  ).toBeVisible();

  await page.getByRole("link", { name: COURSE_TITLE }).click();
  await expect(page).toHaveURL(new RegExp(`/courses/${COURSE_SLUG}$`));
  await expect(page.getByRole("heading", { name: COURSE_TITLE })).toBeVisible();

  const enrollButton = page.getByRole("button", {
    name: "Enroll in this course",
  });
  const continueLink = page.getByRole("link", { name: "Continue learning" });

  // `.isVisible()` doesn't wait — resolve which state the page is
  // actually in first (polling), then branch on it.
  await expect(enrollButton.or(continueLink)).toBeVisible();
  if (await enrollButton.isVisible()) {
    await enrollButton.click();
  }

  await expect(continueLink).toBeVisible();
  await expect(
    page.getByText("You have full access to this course.")
  ).toBeVisible();

  await continueLink.click();
  await expect(page).toHaveURL(
    new RegExp(`/courses/${COURSE_SLUG}/learn$`)
  );
});
