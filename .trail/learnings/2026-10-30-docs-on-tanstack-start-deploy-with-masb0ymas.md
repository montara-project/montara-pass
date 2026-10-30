---
title: Docs on TanStack Start deploy with the cf CLI and need the Tailwind Vite plugin
author: Masb0ymas
date: 2026-10-30
branch: dev
cost: { minutes: 4, tokens: 35482 }
id: l-b1b1fef3
scope: repo
status: active
replaces: l-39f274f2
src: agent
touches:
  - apps/docs/vite.config.ts
---

## Decided
apps/docs runs TanStack Start on Cloudflare Workers with the same config format as apps/web: `cloudflare.config.ts` (`defineWorker` from `cf/config`), the beta `cf` CLI and `@cloudflare/vite-plugin` 2 beta. The user chose this over the stable wrangler.jsonc path to keep one format in the monorepo. Content stays on the Fumadocs MDX Config API; `source` lives only in server functions and server routes. Pages sit at the root of docs.montarapass.com; the old /docs redirect is gone.

## Tried and ruled out
`@tailwindcss/postcss` with postcss.config.mjs: the build passed but the CSS had no Fumadocs UI classes and pages rendered unstyled. `@tailwindcss/vite` builds it fully.
wrangler.jsonc with `@cloudflare/vite-plugin` 1.x worked, then was replaced at the user's request.

## Watch out
Pick `cf` and `@cloudflare/vite-plugin` betas that share the same miniflare and `@cloudflare/config` versions, and that are more than a day old (pnpm minimumReleaseAge).
The build output goes to `.cloudflare/output`, not `dist`. `compatibilityDate` cannot be later than the bundled workerd date.
`vite preview` falls through to the next port when one is taken, so use `--strictPort` in smoke tests.

In the code:
- apps/docs/cloudflare.config.ts, apps/docs/vite.config.ts, apps/docs/src/routes/$.tsx
- `pnpm deploy:docs` runs `cf deploy`; `cf deploy --dry-run` checks without uploading
- Versions: cf 1.0.0-beta.25 with @cloudflare/vite-plugin 2.0.0-beta.v.7 (miniflare 5.20261023.2-beta)
