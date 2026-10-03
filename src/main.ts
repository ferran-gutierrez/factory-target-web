const app = document.querySelector<HTMLElement>("#app");

if (app) {
  const heading = document.createElement("h1");
  heading.textContent = "Factory Target Web";
  app.append(heading);
}
