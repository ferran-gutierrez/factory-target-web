import { getCountryFeatures } from "./world-map/countries";
import { buildWorldMapSvg } from "./world-map/render-world-map";

const app = document.querySelector<HTMLElement>("#app");

if (app) {
  app.innerHTML = buildWorldMapSvg();

  const svg = app.querySelector("svg");
  const label = app.querySelector<SVGTextElement>('[data-testid="world-map-country-label"]');
  const nameByCode = new Map(getCountryFeatures().map((f) => [f.isoA3, f.displayName]));

  function setHighlight(isoA3: string | null): void {
    for (const path of svg?.querySelectorAll("path[data-country-code]") ?? []) {
      if (isoA3 && path.getAttribute("data-country-code") === isoA3) {
        path.setAttribute("data-highlighted", "true");
        path.classList.add("world-map-highlight");
      } else {
        path.removeAttribute("data-highlighted");
        path.classList.remove("world-map-highlight");
      }
    }

    if (label) {
      if (isoA3) {
        label.textContent = nameByCode.get(isoA3) ?? isoA3;
        label.setAttribute("visibility", "visible");
      } else {
        label.textContent = "";
        label.setAttribute("visibility", "hidden");
      }
    }
  }

  for (const path of svg?.querySelectorAll("path[data-country-code]") ?? []) {
    const isoA3 = path.getAttribute("data-country-code");
    if (!isoA3) continue;
    path.addEventListener("mouseenter", () => setHighlight(isoA3));
    path.addEventListener("mouseleave", () => setHighlight(null));
  }
}
