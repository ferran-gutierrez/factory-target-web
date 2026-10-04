import { mountTaskApp } from "./taskApp";

const app = document.querySelector<HTMLElement>("#app");
if (!app) {
  throw new Error("Missing #app root");
}

mountTaskApp(app);
