# factory-target-web

A minimal Vite + TypeScript web app with Vitest unit tests and Playwright E2E. Work arrives as factory tasks; `.factory/contract.json` defines the checks that decide pass or fail.

## Stack
Language: TypeScript (strict) · Runtime: Node 22 · Package manager: npm · Bundler: Vite · Unit tests: Vitest · E2E: Playwright (Chromium)

## Commands
- Install: `npm ci`
- Dev server: `npm run dev` (port 5173)
- Typecheck: `npm run typecheck`
- Unit tests: `npm test`
- Build: `npm run build`
- Bundle budget: `npm run check:size` (after `npm run build`)
- E2E: `npm run test:e2e`

## Layout
- `index.html` and `src/` hold the app. `public/` holds static assets.
- Unit tests live in `tests/**/*.test.ts` and run in Node.
- E2E journeys live in `e2e/**/*.spec.ts`. Playwright records a video for every test.
- Specs live in `specs/`.

## Rules
- The gzip size of the built JavaScript in `dist/assets/*.js` must stay at or below 60 KB.
- Do not edit `scripts/**`, `.factory/**`, `.github/**`, `AGENTS.md`, `playwright.config.ts`, `vite.config.ts`, `vitest.config.ts` or `tsconfig.json`.
- Changes stay inside `src/**`, `tests/**`, `e2e/**`, `specs/**`, `index.html`, `public/**`, `package.json` and `package-lock.json`.
- No secrets and no network services at runtime; the app runs fully in the browser.
