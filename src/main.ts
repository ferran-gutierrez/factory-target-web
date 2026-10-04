import { mapCountries } from "./world-map/dataset.js";

const app = document.querySelector<HTMLElement>("#app");
if (!app) {
  throw new Error("#app element is missing");
}

const heading = document.createElement("h1");
heading.textContent = "Factory Target Web";

const countryName = document.createElement("p");
countryName.dataset.testid = "country-name";
countryName.textContent = "Hover over a country";

const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
svg.setAttribute("viewBox", "0 0 960 480");
svg.setAttribute("role", "img");
svg.setAttribute("aria-label", "World map");
svg.style.display = "block";
svg.style.width = "100%";
svg.style.maxWidth = "960px";
svg.style.height = "auto";

const pathsByCode = new Map<string, SVGPathElement>();

const renderOrder = [...mapCountries].sort((a, b) => a.d.length - b.d.length);

for (const entry of renderOrder) {
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", entry.d);
  path.setAttribute("data-country-code", entry.code);
  path.setAttribute("fill", "#c5d4e8");
  path.setAttribute("stroke", "rgba(0,0,0,0.001)");
  path.setAttribute("stroke-width", "12");
  path.setAttribute("stroke-linejoin", "round");
  pathsByCode.set(entry.code, path);
  svg.append(path);
}

let highlightedCode: string | null = null;

function setHighlight(code: string | null): void {
  if (highlightedCode === code) {
    return;
  }

  if (highlightedCode) {
    const previous = pathsByCode.get(highlightedCode);
    previous?.removeAttribute("data-highlighted");
    previous?.classList.remove("highlighted");
  }

  highlightedCode = code;

  if (code) {
    const path = pathsByCode.get(code);
    path?.setAttribute("data-highlighted", "true");
    path?.classList.add("highlighted");
    const entry = mapCountries.find((item) => item.code === code);
    countryName.textContent = entry?.name ?? "";
    return;
  }

  countryName.textContent = "Hover over a country";
}

function isCountryPathTarget(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    target.closest("path[data-country-code]") !== null
  );
}

for (const entry of mapCountries) {
  const path = pathsByCode.get(entry.code);
  path?.addEventListener("mouseenter", () => {
    setHighlight(entry.code);
  });
  path?.addEventListener("mouseleave", (event) => {
    if (isCountryPathTarget(event.relatedTarget)) {
      return;
    }
    setHighlight(null);
  });
}

svg.addEventListener("mouseleave", () => {
  setHighlight(null);
});

app.append(heading, countryName, svg);
