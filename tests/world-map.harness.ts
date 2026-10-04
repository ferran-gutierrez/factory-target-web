import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, type Browser, type Page } from "playwright";
import { createServer, type ViteDevServer } from "vite";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

let sharedServer: ViteDevServer | undefined;
let sharedBrowser: Browser | undefined;
let serverRefCount = 0;
let cachedBaseUrl: string | undefined;

async function ensureServer(): Promise<ViteDevServer> {
  if (!sharedServer) {
    sharedServer = await createServer({
      configFile: false,
      root: projectRoot,
      server: { port: 0, strictPort: false },
    });
    await sharedServer.listen();
    cachedBaseUrl = sharedServer.resolvedUrls?.local[0];
    if (!cachedBaseUrl) {
      throw new Error("Vite dev server did not publish a local URL");
    }
  }
  serverRefCount += 1;
  return sharedServer;
}

async function releaseServer(): Promise<void> {
  serverRefCount -= 1;
  if (serverRefCount <= 0 && sharedServer) {
    await sharedServer.close();
    sharedServer = undefined;
    cachedBaseUrl = undefined;
    serverRefCount = 0;
  }
}

let browsersInstalled = false;

function installChromiumIfNeeded(): void {
  if (browsersInstalled) {
    return;
  }

  const result = spawnSync(
    "npx",
    ["playwright", "install", "chromium"],
    {
      cwd: projectRoot,
      encoding: "utf8",
      stdio: "pipe",
    },
  );

  if (result.status !== 0) {
    const detail = result.stderr || result.stdout || "unknown error";
    throw new Error(`Failed to install Playwright Chromium: ${detail}`);
  }

  browsersInstalled = true;
}

async function ensureBrowser(): Promise<Browser> {
  if (!sharedBrowser) {
    installChromiumIfNeeded();
    sharedBrowser = await chromium.launch();
  }
  return sharedBrowser;
}

export async function closeWorldMapHarness(): Promise<void> {
  if (sharedBrowser) {
    await sharedBrowser.close();
    sharedBrowser = undefined;
  }
  if (sharedServer) {
    await sharedServer.close();
    sharedServer = undefined;
    cachedBaseUrl = undefined;
    serverRefCount = 0;
  }
}

export async function withWorldMapPage(
  run: (page: Page) => Promise<void>,
): Promise<void> {
  await ensureServer();
  const browser = await ensureBrowser();
  const page = await browser.newPage();
  try {
    await run(page);
  } finally {
    await page.close();
    await releaseServer();
  }
}

export function getWorldMapBaseUrl(): string {
  if (!cachedBaseUrl) {
    throw new Error("World map dev server has not been started");
  }
  return cachedBaseUrl;
}

export async function gotoWorldMapHome(page: Page): Promise<void> {
  const baseUrl = getWorldMapBaseUrl();
  await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
}
