import { expect, test } from "@playwright/test";

/**
 * Open the course assistant drawer on a lesson, send one message, and
 * confirm a real reply renders (CLAUDE.md §35's "use assistant" leg of the
 * student learning flow, §16/§20). Isolated in its own spec, tagged `@ai`,
 * because it's the one spec in this suite that depends on a live network
 * call to Gemini via the provisioned `GEMINI_API_KEY` — the other two specs
 * stay reliable in any CI even where that key isn't available.
 */

const COURSE_SLUG = "typescript-foundations";
const LESSON_SLUG = "structural-typing";

test("@ai sends a message to the course assistant and gets a reply", async ({
  page,
}) => {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill("student@example.com");
  await page.getByLabel("Password").fill("seed-password-123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  // Seed data never enrolls the student in anything — see
  // catalog-and-enrollment.spec.ts.
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

  await page.getByRole("button", { name: "Course assistant" }).click();
  const conversation = page.getByRole("log", {
    name: "Conversation with the course assistant",
  });
  await expect(conversation).toBeVisible();

  const input = page.getByLabel("Message the course assistant");
  await input.fill("In one short sentence, what is this lesson about?");
  await page.getByRole("button", { name: "Send message" }).click();

  // A real model call — generous timeout rather than the default 5s, and
  // polled: the assistant bubble mounts empty (streaming) before the reply
  // is fully written into it.
  const bubbles = conversation.locator("> div");
  await expect(bubbles).toHaveCount(2, { timeout: 30_000 });
  await expect(bubbles.last()).not.toHaveText("", { timeout: 30_000 });
});
