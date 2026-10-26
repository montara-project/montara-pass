---
title: "WXT overrides parts of the extension manifest and aliases, so wxt.config.ts hooks put them back"
author: Masb0ymas
date: 2026-10-26
branch: dev
cost: { minutes: 22, tokens: 145389 }
id: l-dbf2ab51
scope: repo
status: active
src: agent
touches:
  - README.md
  - apps/docs/content/docs/clients/browser-extension.mdx
  - apps/extension/.gitignore
  - apps/extension/package.json
  - apps/extension/src/entrypoints/background.ts
  - apps/extension/src/entrypoints/content.ts
  - apps/extension/src/entrypoints/inline.html
  - apps/extension/src/entrypoints/offscreen.html
---

## Decided
- `apps/extension` builds with WXT (`wxt.config.ts`), output kept in `dist/chrome`, `dist/firefox` (and `-ce`) so README/docs and store uploads stay the same.
- The released manifest must stay identical to the pre-WXT one (permissions, host permissions, matches, gecko ids). Only the content script paths changed (`content-scripts/*.js`); nothing loads them by path (executeScript uses `func`).
- `zip.zipSources: false`: a sources ZIP of `apps/extension` would miss `apps/app/src` and `packages/shared`, which the build imports.

## Tried and ruled out
- Setting `alias['@']` in config: WXT always sets `@` to srcDir after user aliases. The `config:resolved` hook rewrites it to `../app/src`.
- Checking the flagged-code rules in a Vite `buildEnd`: WXT runs a separate Vite build per group (pages+background, each content script), so groups without zod/react-dom fail. The check runs in `build:done`, only for `command === 'build'`.
- Setting `manifest.icons` or popup title in config: WXT merges in every `public/icons/*.png` (adds 256) and takes `default_title` from the popup `<title>`. Both are set in `build:manifestGenerated`.

## Watch out
- WXT builds Firefox as MV2 by default; `manifestVersion: 3` keeps it MV3.
- Dev mode (`pnpm watch`) adds `tabs` and `http://localhost/*` to the manifest; that is WXT's dev reloader, not a release change.
- After changing the config, compare `dist/*/manifest.json` with the last released manifest before shipping.
