import displayNamesByIsoA3 from "./country-display-names.json";
import { pathDataByIsoA3 } from "./path-shards";

export type CountryFeature = {
  isoA3: string;
  displayName: string;
  pathD: string[];
};

export function getCountryFeatures(): CountryFeature[] {
  const names = displayNamesByIsoA3 as Record<string, string>;
  const paths = pathDataByIsoA3 as Record<string, string[]>;

  return Object.keys(paths)
    .sort((a, b) => a.localeCompare(b))
    .map((isoA3) => ({
      isoA3,
      displayName: names[isoA3] ?? isoA3,
      pathD: paths[isoA3],
    }));
}
