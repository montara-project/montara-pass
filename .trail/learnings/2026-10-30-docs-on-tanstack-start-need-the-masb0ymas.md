---
title: "Docs on TanStack Start need the Tailwind Vite plugin, not PostCSS"
author: Masb0ymas
date: 2026-10-30
branch: dev
cost: { minutes: 14, tokens: 178435 }
id: l-39f274f2
scope: repo
status: active
src: agent
touches:
  - apps/docs/package.json
  - apps/docs/vite.config.ts
  - apps/docs/wrangler.jsonc
  - apps/docs/tsconfig.json
  - apps/docs/.gitignore
  - apps/docs/src/lib/source.ts
  - apps/docs/src/lib/layout.shared.tsx
  - apps/docs/src/router.tsx
  - apps/docs/src/start.ts
  - apps/docs/src/routes/__root.tsx
---

## Decided
apps/docs moved from Next.js to TanStack Start on Cloudflare Workers (@cloudflare/vite-plugin 1.x + wrangler.jsonc, the stable path), not the beta `cf` CLI that apps/web uses. Content stays on the Fumadocs MDX Config API; pages render through `collections/browser` client loaders, with `source` only in server fns and server routes.

## Tried and ruled out
Keeping `@tailwindcss/postcss` + postcss.config.mjs: the build passed but the CSS came out at 12 KB with no Fumadocs UI classes, so the page rendered unstyled. `@tailwindcss/vite` builds the full ~82 KB.

## Watch out
`vite preview` falls through to the next port when 3001 is taken by another project, so smoke tests can hit the wrong site. Use `--strictPort`.

In the code: apps/docs/vite.config.ts, apps/docs/wrangler.jsonc, apps/docs/src/routes/$.tsx
