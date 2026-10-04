import { expect as playwrightExpect } from "@playwright/test";
import { afterAll, describe, expect, it } from "vitest";
import {
  closeWorldMapHarness,
  getWorldMapBaseUrl,
  gotoWorldMapHome,
  withWorldMapPage,
} from "./world-map.harness.js";

afterAll(async () => {
  await closeWorldMapHarness();
});

const MAP_METADATA_URL_PATTERN =
  /\.(geojson|topojson)(\?|$)|\/(geo|map|countries|world)[/-]/i;

describe("REQ-1 offline world map", () => {
  it(
    "shows inline SVG in #app without network fetches for map geometry or metadata",
    { timeout: 60_000 },
    async () => {
      await withWorldMapPage(async (page) => {
        const mapDataRequests: string[] = [];

        page.on("request", (request) => {
          const url = request.url();
          if (url.startsWith(getWorldMapBaseUrl())) {
            return;
          }
          if (MAP_METADATA_URL_PATTERN.test(url)) {
            mapDataRequests.push(url);
          }
          if (
            /restcountries|naturalearth|openstreetmap|mapbox|geojson/i.test(url)
          ) {
            mapDataRequests.push(url);
          }
        });

        await gotoWorldMapHome(page);

        const svg = page.locator("#app svg");
        await playwrightExpect(svg).toBeVisible();

        const box = await svg.boundingBox();
        expect(box).not.toBeNull();
        expect((box?.width ?? 0) > 0 && (box?.height ?? 0) > 0).toBe(true);

        expect(mapDataRequests).toEqual([]);
      });
    },
  );
});
