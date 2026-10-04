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

async function isPathHighlighted(
  page: import("playwright").Page,
  code: string,
): Promise<boolean> {
  const path = page.locator(`#app svg path[data-country-code="${code}"]`);
  const dataHighlighted = await path.getAttribute("data-highlighted");
  if (dataHighlighted === "true") {
    return true;
  }
  const className = (await path.getAttribute("class")) ?? "";
  return className.split(/\s+/).includes("highlighted");
}

async function countHighlightedPaths(
  page: import("playwright").Page,
): Promise<number> {
  let count = 0;
  for (const entry of mapCountries) {
    if (await isPathHighlighted(page, entry.code)) {
      count += 1;
    }
  }
  return count;
}

describe("REQ-6 hover country name display", () => {
  it(
    "shows the dataset English short name for the hovered country code",
    { timeout: 60_000 },
    async () => {
      await withWorldMapPage(async (page) => {
        await gotoWorldMapHome(page);

        const sample = mapCountries.filter((entry) =>
          ["FR", "BR", "JP", "CA", "NG"].includes(entry.code),
        );
        expect(sample.length).toBeGreaterThan(0);

        for (const entry of sample) {
          await page
            .locator(`#app svg path[data-country-code="${entry.code}"]`)
            .hover();
          await playwrightExpect(page.getByTestId("country-name")).toHaveText(
            entry.name,
          );
        }
      });
    },
  );
});

describe("REQ-7 hover highlight exclusivity", () => {
  it(
    "highlights only the hovered country path",
    { timeout: 60_000 },
    async () => {
      await withWorldMapPage(async (page) => {
        await gotoWorldMapHome(page);

        const target = mapCountries.find((entry) => entry.code === "DE");
        expect(target).toBeDefined();

        await page
          .locator(`#app svg path[data-country-code="${target!.code}"]`)
          .hover();

        expect(await isPathHighlighted(page, target!.code)).toBe(true);
        expect(await countHighlightedPaths(page)).toBe(1);

        for (const entry of mapCountries) {
          if (entry.code === target!.code) {
            continue;
          }
          expect(await isPathHighlighted(page, entry.code)).toBe(false);
        }
      });
    },
  );
});

describe("REQ-8 hover leave clears highlight and label", () => {
  it(
    "returns to the initial neutral state when the pointer leaves the map",
    { timeout: 60_000 },
    async () => {
      await withWorldMapPage(async (page) => {
        await gotoWorldMapHome(page);

        const target = mapCountries.find((entry) => entry.code === "IT");
        expect(target).toBeDefined();

        const path = page.locator(
          `#app svg path[data-country-code="${target!.code}"]`,
        );
        await path.hover();
        await playwrightExpect(page.getByTestId("country-name")).toHaveText(
          target!.name,
        );
        expect(await isPathHighlighted(page, target!.code)).toBe(true);

        await page.mouse.move(0, 0);
        await page.waitForTimeout(50);

        expect(await countHighlightedPaths(page)).toBe(0);
        const label =
          (await page.getByTestId("country-name").textContent()) ?? "";
        expect(isNeutralCountryName(label)).toBe(true);
      });
    },
  );
});
