/**
 * REQ-3 reference paths in fixtures/natural-earth-admin0-path-d-by-iso-a3.json use
 * equirectangular projection (1000×500, two decimal places) from Natural Earth
 * ne_10m_admin_0_countries without vertex dropping.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { NATURAL_EARTH_10M_ADMIN0_FEATURE_COUNT, NATURAL_EARTH_COUNTRY_MANIFEST } from "./fixtures/natural-earth-country-manifest";

const referencePathDByIsoA3 = JSON.parse(
  readFileSync(
    join(fileURLToPath(new URL(".", import.meta.url)), "fixtures/natural-earth-admin0-path-d-by-iso-a3.json"),
    "utf8",
  ),
) as Record<string, string[]>;
import { buildWorldMapSvg } from "../src/world-map/render-world-map";
import { getCountryFeatures } from "../src/world-map/countries";

const WORLD_MAP_SRC_DIR = join(process.cwd(), "src/world-map");

function listTypeScriptSources(dir: string): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listTypeScriptSources(fullPath));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(".ts")) {
      files.push(fullPath);
    }
  }
  return files;
}

describe("world map (REQ-1, REQ-2, REQ-3, REQ-4)", () => {
  it("REQ-1: builds one root SVG with inline path elements for country geometry", () => {
    const markup = buildWorldMapSvg();
    expect(markup.trim().startsWith("<svg")).toBe(true);
    expect(markup.match(/<svg\b/g)?.length ?? 0).toBe(1);
    expect(markup.match(/<path\b/g)?.length ?? 0).toBeGreaterThanOrEqual(
      NATURAL_EARTH_10M_ADMIN0_FEATURE_COUNT,
    );
  });

  it("REQ-2: renders every Natural Earth 1:10m Admin 0 country feature", () => {
    const features = getCountryFeatures();
    expect(features).toHaveLength(NATURAL_EARTH_10M_ADMIN0_FEATURE_COUNT);

    const codes = new Set(features.map((feature) => feature.isoA3));
    expect(codes.size).toBe(NATURAL_EARTH_10M_ADMIN0_FEATURE_COUNT);

    for (const isoA3 of Object.keys(NATURAL_EARTH_COUNTRY_MANIFEST)) {
      expect(codes.has(isoA3)).toBe(true);
    }
  });

  it("REQ-3: preserves full Natural Earth path d sequences without simplification", () => {
    const features = getCountryFeatures();

    for (const feature of features) {
      const referencePaths = referencePathDByIsoA3[feature.isoA3 as keyof typeof referencePathDByIsoA3];
      expect(referencePaths, `missing reference geometry for ${feature.isoA3}`).toBeDefined();
      expect([...feature.pathD]).toEqual(referencePaths);
    }
  });

  it("REQ-4: ships map geometry via static sources without runtime fetch loaders", () => {
    const sources = listTypeScriptSources(WORLD_MAP_SRC_DIR);
    expect(sources.length).toBeGreaterThan(0);

    for (const file of sources) {
      const content = readFileSync(file, "utf8");
      expect(content).not.toMatch(/\bfetch\s*\(/);
      expect(content).not.toMatch(/\bXMLHttpRequest\b/);
      expect(content).not.toMatch(/import\s*\(\s*['"]https?:/);
    }
  });
});
