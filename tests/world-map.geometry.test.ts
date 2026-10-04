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

function isNonPlaceholderPath(d: string): boolean {
  const trimmed = d.trim();
  if (trimmed.length === 0) {
    return false;
  }
  if (/^M[\d.\s,-]+[zZ]$/.test(trimmed) && trimmed.length < 24) {
    return false;
  }
  return true;
}

describe("REQ-4 country border geometry", () => {
  it("stores non-empty path data for every dataset entry", () => {
    for (const entry of mapCountries) {
      expect(entry.d.trim().length, entry.code).toBeGreaterThan(0);
      expect(isNonPlaceholderPath(entry.d), entry.code).toBe(true);
    }
  });

  it(
    "renders each country path with a non-empty d attribute in the DOM",
    { timeout: 60_000 },
    async () => {
      await withWorldMapPage(async (page) => {
        await gotoWorldMapHome(page);

        for (const entry of mapCountries) {
          const path = page.locator(
            `#app svg path[data-country-code="${entry.code}"]`,
          );
          const d = await path.getAttribute("d");
          expect(d?.trim().length ?? 0, entry.code).toBeGreaterThan(0);
          expect(isNonPlaceholderPath(d ?? ""), entry.code).toBe(true);
        }
      });
    },
  );
});
