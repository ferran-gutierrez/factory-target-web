import { expect, test } from "@playwright/test";

const HOVER_JOURNEY = [
  { code: "FR", label: "France" },
  { code: "BR", label: "Brazil" },
  { code: "JP", label: "Japan" },
] as const;

test.describe("REQ-9 world map hover journey", () => {
  test("shows France, Brazil, and Japan labels when hovered", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const countryName = page.getByTestId("country-name");
    await expect(countryName).toBeVisible();

    for (const { code, label } of HOVER_JOURNEY) {
      const countryPath = page.locator(
        `#app svg path[data-country-code="${code}"]`,
      );
      await expect(countryPath).toHaveCount(1);
      await countryPath.hover();
      await expect(countryName).toHaveText(label);
    }
  });
});
