import { expect, test } from "@playwright/test";

const COUNTRY_LABEL_TEST_ID = "world-map-country-label";

function isHighlightedCountryPath(className: string | null, dataHighlighted: string | null): boolean {
  const hasHighlightClass = className?.split(/\s+/).some((token) => /highlight/i.test(token)) ?? false;
  return hasHighlightClass || dataHighlighted === "true";
}

test.describe("world map journey", () => {
  test("REQ-1: home view renders a single root SVG map with country paths", async ({ page }) => {
    await page.goto("/");

    const app = page.locator("#app");
    await expect(app.locator("svg")).toHaveCount(1);
    await expect(app.locator("svg path")).not.toHaveCount(0);
  });

  test("REQ-6 & REQ-7: hover shows English name and highlights the country path", async ({ page }) => {
    await page.goto("/");

    const france = page.locator('[data-country-code="FRA"]').first();
    await france.hover();

    const label = page.getByTestId(COUNTRY_LABEL_TEST_ID);
    await expect(label).toBeVisible();
    await expect(label).toHaveText("France");

    const className = await france.getAttribute("class");
    const dataHighlighted = await france.getAttribute("data-highlighted");
    expect(isHighlightedCountryPath(className, dataHighlighted)).toBe(true);
  });

  test("REQ-8: sequential hovers show France, Egypt, and Australia", async ({ page }) => {
    await page.goto("/");

    const label = page.getByTestId(COUNTRY_LABEL_TEST_ID);
    const targets = [
      { code: "FRA", name: "France" },
      { code: "EGY", name: "Egypt" },
      { code: "AUS", name: "Australia" },
    ] as const;

    for (const { code, name } of targets) {
      await page.locator(`[data-country-code="${code}"]`).first().hover();
      await expect(label).toHaveText(name);
    }
  });

  test("REQ-4 & REQ-9: map journey does not fetch map geometry or country lists over the network", async ({
    page,
  }) => {
    const fetchLikeRequests: string[] = [];

    page.on("request", (request) => {
      const type = request.resourceType();
      if (type !== "fetch" && type !== "xhr") {
        return;
      }
      fetchLikeRequests.push(request.url());
    });

    await page.goto("/");

    const app = page.locator("#app");
    await expect(app.locator("svg")).toHaveCount(1);

    for (const { code } of [
      { code: "FRA" },
      { code: "EGY" },
      { code: "AUS" },
    ]) {
      await page.locator(`[data-country-code="${code}"]`).first().hover();
    }

    expect(fetchLikeRequests).toEqual([]);
  });
});
