---
title: Moving docs routes breaks typecheck until the stale apps/docs/.next/dev is deleted
author: Masb0ymas
date: 2026-10-26
branch: dev
cost: { minutes: 13, tokens: 40595 }
id: l-c5d4cc9b
scope: repo
status: active
src: agent
touches:
  - README.md
  - apps/docs/content/docs/api-reference/index.mdx
  - apps/docs/content/docs/api-reference/items.mdx
  - apps/docs/content/docs/api-reference/keys.mdx
  - apps/docs/content/docs/api-reference/members.mdx
  - apps/docs/content/docs/architecture/encryption.mdx
  - apps/docs/content/docs/architecture/sharing.mdx
  - apps/docs/content/docs/clients/browser-extension.mdx
  - apps/docs/content/docs/clients/marketing-site.mdx
  - apps/docs/content/docs/getting-started/configuration.mdx
---

## Decided
- After moving or deleting routes in `apps/docs/app`, delete `apps/docs/.next` (gitignored build output) before `pnpm typecheck`.

## Tried and ruled out
- Treating the typecheck errors as a code problem: they came from `.next/dev/types/validator.ts`, left by an earlier `next dev`, which still imports the old `app/docs/layout.js` and `app/page.js`. `next typegen` doesn't rewrite that dev folder. The fix to `next.config.mjs` was unrelated.

## Watch out
- `pnpm start` in `apps/docs` runs a `next-server` child process. Killing `next start` leaves that child holding port 3001, so later test runs answer from the old build. Stop whatever `lsof -tiTCP:3001 -sTCP:LISTEN` shows.
