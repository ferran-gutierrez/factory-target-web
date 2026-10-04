import { expect, test } from "@playwright/test";

test("home page shows the world map", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#app svg")).toHaveCount(1);
  await expect(page.locator("#app svg path")).not.toHaveCount(0);
});
