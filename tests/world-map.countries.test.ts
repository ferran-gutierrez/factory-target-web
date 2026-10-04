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

/** Sovereign states and common map dependencies that must appear in the bundled dataset. */
const REQUIRED_COUNTRY_CODES = [
  "AF",
  "AL",
  "DZ",
  "AD",
  "AO",
  "AG",
  "AR",
  "AM",
  "AU",
  "AT",
  "AZ",
  "BS",
  "BH",
  "BD",
  "BB",
  "BY",
  "BE",
  "BZ",
  "BJ",
  "BT",
  "BO",
  "BA",
  "BW",
  "BR",
  "BN",
  "BG",
  "BF",
  "BI",
  "CV",
  "KH",
  "CM",
  "CA",
  "CF",
  "TD",
  "CL",
  "CN",
  "CO",
  "KM",
  "CG",
  "CD",
  "CR",
  "CI",
  "HR",
  "CU",
  "CY",
  "CZ",
  "DK",
  "DJ",
  "DM",
  "DO",
  "EC",
  "EG",
  "SV",
  "GQ",
  "ER",
  "EE",
  "SZ",
  "ET",
  "FJ",
  "FI",
  "FR",
  "GA",
  "GM",
  "GE",
  "DE",
  "GH",
  "GR",
  "GD",
  "GT",
  "GN",
  "GW",
  "GY",
  "HT",
  "HN",
  "HU",
  "IS",
  "IN",
  "ID",
  "IR",
  "IQ",
  "IE",
  "IL",
  "IT",
  "JM",
  "JP",
  "JO",
  "KZ",
  "KE",
  "KI",
  "KP",
  "KR",
  "KW",
  "KG",
  "LA",
  "LV",
  "LB",
  "LS",
  "LR",
  "LY",
  "LI",
  "LT",
  "LU",
  "MG",
  "MW",
  "MY",
  "MV",
  "ML",
  "MT",
  "MH",
  "MR",
  "MU",
  "MX",
  "FM",
  "MD",
  "MC",
  "MN",
  "ME",
  "MA",
  "MZ",
  "MM",
  "NA",
  "NR",
  "NP",
  "NL",
  "NZ",
  "NI",
  "NE",
  "NG",
  "MK",
  "NO",
  "OM",
  "PK",
  "PW",
  "PA",
  "PG",
  "PY",
  "PE",
  "PH",
  "PL",
  "PT",
  "QA",
  "RO",
  "RU",
  "RW",
  "KN",
  "LC",
  "VC",
  "WS",
  "SM",
  "ST",
  "SA",
  "SN",
  "RS",
  "SC",
  "SL",
  "SG",
  "SK",
  "SI",
  "SB",
  "SO",
  "ZA",
  "SS",
  "ES",
  "LK",
  "SD",
  "SR",
  "SE",
  "CH",
  "SY",
  "TW",
  "TJ",
  "TZ",
  "TH",
  "TL",
  "TG",
  "TO",
  "TT",
  "TN",
  "TR",
  "TM",
  "TV",
  "UG",
  "UA",
  "AE",
  "GB",
  "US",
  "UY",
  "UZ",
  "VU",
  "VE",
  "VN",
  "YE",
  "ZM",
  "ZW",
  "HK",
  "PR",
  "GL",
  "GF",
  "NC",
  "PS",
] as const;

describe("REQ-2 map dataset coverage and path rendering", () => {
  it("includes required sovereign and dependency entries with unique ISO codes", () => {
    expect(mapCountries.length).toBeGreaterThanOrEqual(200);

    const codes = mapCountries.map((entry) => entry.code);
    expect(new Set(codes).size).toBe(codes.length);

    for (const code of REQUIRED_COUNTRY_CODES) {
      expect(codes, `missing dataset entry for ${code}`).toContain(code);
    }
  });

  it(
    "renders exactly one SVG path per dataset entry inside #app",
    { timeout: 60_000 },
    async () => {
      await withWorldMapPage(async (page) => {
        await gotoWorldMapHome(page);

        const paths = page.locator('#app svg path[data-country-code]');
        await playwrightExpect(paths).toHaveCount(mapCountries.length);

        for (const entry of mapCountries) {
          await playwrightExpect(
            page.locator(
              `#app svg path[data-country-code="${entry.code}"]`,
            ),
          ).toHaveCount(1);
        }
      });
    },
  );
});

describe("REQ-3 data-country-code attributes", () => {
  it(
    "matches each path data-country-code to the bundled dataset ISO alpha-2 code",
    { timeout: 60_000 },
    async () => {
      await withWorldMapPage(async (page) => {
        await gotoWorldMapHome(page);

        for (const entry of mapCountries) {
          const path = page.locator(
            `#app svg path[data-country-code="${entry.code}"]`,
          );
          await playwrightExpect(path).toHaveAttribute(
            "data-country-code",
            entry.code,
          );
        }
      });
    },
  );
});
