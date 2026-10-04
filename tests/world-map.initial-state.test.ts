import { expect as playwrightExpect } from "@playwright/test";
import { afterAll, describe, expect, it } from "vitest";
import { mapCountries } from "../src/world-map/dataset.js";
import {
  closeWorldMapHarness,
  gotoWorldMapHome,
  withWorldMapPage,
} from "./world-map.harness.js";

afterAll(async () => {
  await closeWorldMapHarness();
});

function isNeutralCountryName(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return true;
  }
  return /hover|select|country|move pointer/i.test(trimmed);
}

async function countHighlightedPaths(
  page: import("playwright").Page,
): Promise<number> {
  const highlightedByData = await page
    .locator('#app svg path[data-highlighted="true"]')
    .count();
  const highlightedByClass = await page
    .locator("#app svg path.highlighted")
    .count();
  return highlightedByData + highlightedByClass;
}

describe("REQ-5 initial map state", () => {
  it(
    "shows no highlighted countries and a neutral country name display before hover",
    { timeout: 60_000 },
    async () => {
      await withWorldMapPage(async (page) => {
        await gotoWorldMapHome(page);

        expect(await countHighlightedPaths(page)).toBe(0);

        for (const entry of mapCountries) {
          const path = page.locator(
            `#app svg path[data-country-code="${entry.code}"]`,
          );
          await playwrightExpect(path).not.toHaveAttribute(
            "data-highlighted",
            "true",
          );
          await playwrightExpect(path).not.toHaveClass(/highlighted/);
        }

        const countryName = page.getByTestId("country-name");
        await playwrightExpect(countryName).toBeVisible();
        const label = (await countryName.textContent()) ?? "";
        expect(isNeutralCountryName(label)).toBe(true);
        expect(
          mapCountries.some((entry) => entry.name === label.trim()),
        ).toBe(false);
      });
    },
  );
});
