import { footerText } from "./footerText";

export function mountApp(root: HTMLElement | null): void {
  if (!root) {
    return;
  }

  const heading = document.createElement("h1");
  heading.textContent = "Factory Target Web";
  root.append(heading);

  const footer = document.createElement("footer");
  footer.textContent = footerText(new Date().getFullYear());
  root.append(footer);
}
