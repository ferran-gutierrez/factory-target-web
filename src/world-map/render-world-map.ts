import { getCountryFeatures } from "./countries";

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildWorldMapSvg(): string {
  const features = getCountryFeatures();
  const pathParts: string[] = [];

  for (const feature of features) {
    for (const d of feature.pathD) {
      pathParts.push(
        `<path data-country-code="${escapeXml(feature.isoA3)}" d="${escapeXml(d)}"/>`,
      );
    }
  }

  return [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 500" role="img" aria-label="World map">',
    ...pathParts,
    '<text data-testid="world-map-country-label" x="10" y="24" visibility="hidden"></text>',
    "</svg>",
  ].join("");
}
