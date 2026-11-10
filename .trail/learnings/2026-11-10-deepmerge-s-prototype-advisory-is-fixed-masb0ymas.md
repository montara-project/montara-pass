---
title: "deepmerge's prototype advisory is fixed by a local patch, since the fixed release was never published"
author: Masb0ymas
date: 2026-11-10
branch: dev
cost: { minutes: 3, tokens: 32326 }
id: l-3a028cce
scope: repo
status: active
replaces: l-2c372792
src: agent
touches:
  - apps/app/src/components/block/billing/billing.tsx
  - apps/app/DESIGN.md
  - apps/app/src/components/layout/sidebar/app-sidebar.tsx
  - apps/extension/DESIGN.md
  - apps/extension/src/popup/sidebar.css
  - apps/extension/src/popup/styles.css
  - apps/extension/src/popup/vault-sidebar.tsx
  - apps/extension/src/popup/views/full-vault.tsx
---

## Decided
`pnpm audit --prod` reported one advisory, GHSA-gcqx-w48m-w2h4 (low), in deepmerge, which reaches the mobile app through Expo's CLI. The advisory's fixed version, 4.3.2, is still unpublished (npm's latest is 4.3.1), so deepmerge 4.3.1 is patched with `pnpm patch`. The bug was on the target side: an own `__proto__` key in the first object (as JSON.parse makes) set the merged result's prototype. The patch skips `__proto__` on both sides. Because pnpm audit reads versions, not patches, the advisory is ignored in the workspace with the reason beside it.
The earlier overrides still stand: glob (GHSA-3g3m-2fjr-6pw4) and minimatch, scoped to the versions Expo pulls.

## Tried and ruled out
- Overriding deepmerge to 4.3.2: never published, so install fails.
- Only the source-side check: deepmerge already refuses an inherited `__proto__` from the source; the leak was the target loop.

## Watch out
- When a fixed deepmerge ships, replace the patch with an override and remove the ignore entry.
- pnpm 11.10 reads `auditConfig.ignoreGhsas`; newer pnpm calls it `audit.ignore` but still reads the old name.
- After the patch, an unpatched `deepmerge@4.3.1` folder may linger in node_modules/.pnpm; nothing links to it.

In the code: patches/deepmerge@4.3.1.patch, pnpm-workspace.yaml (overrides, patchedDependencies, auditConfig.ignoreGhsas). Checked with `npx expo config --type prebuild` in apps/mobile.
