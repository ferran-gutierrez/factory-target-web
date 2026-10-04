import { expect, test } from "@playwright/test";
import { footerText } from "../src/footerText";

test("home page footer text matches factory attribution for the current year", async ({
  page,
}) => {
  await page.goto("/");

  const year = new Date().getFullYear();
  await expect(page.locator("#app")).toBeAttached();
  await expect(page.locator("footer")).toHaveText(footerText(year));
});

test("footer is visible and flush with the viewport bottom within 2px", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/");

  const footer = page.locator("footer");
  await expect(footer).toBeVisible();

  const bottomGap = await page.evaluate(() => {
    const el = document.querySelector("footer");
    if (!el) {
      return null;
    }
    const rect = el.getBoundingClientRect();
    return Math.abs(rect.bottom - window.innerHeight);
  });

  expect(bottomGap).not.toBeNull();
  expect(bottomGap!).toBeLessThanOrEqual(2);
});
