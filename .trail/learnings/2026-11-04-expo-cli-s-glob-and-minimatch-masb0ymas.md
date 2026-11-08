---
title: "Expo CLI's glob and minimatch advisories are fixed by overrides; deepmerge still waits for a release"
author: Masb0ymas
date: 2026-11-04
branch: dev
cost: { minutes: 2, tokens: 11273 }
id: l-2c372792
scope: repo
status: active
replaces: l-35a208da
src: agent
touches:
  - ISSUES.md
  - apps/app/src/components/block/activity/activity-log.tsx
  - apps/app/src/components/block/billing/billing.tsx
  - apps/app/src/components/block/security/block-form.tsx
  - apps/app/src/components/block/security/ip-blocks.tsx
  - apps/app/src/lib/api/queries/security.ts
  - apps/app/src/lib/auth/email-auth.ts
  - apps/extension/src/entrypoints/content.ts
  - apps/extension/src/inline/main.tsx
  - apps/extension/src/lib/api.ts
---

## Decided
`pnpm audit --prod` findings all come from the mobile app through Expo's CLI. glob (GHSA-3g3m-2fjr-6pw4, fixed in 14.0.2) and minimatch (fixed in 11.0.1) are overridden in the workspace, scoped to the versions Expo pulls (glob 13, minimatch 10): glob 14 keeps 13's API and engines and only moves to minimatch 11. Checked with `expo config --type prebuild` and `expo export --platform android`, plus the extension and web app builds.

## Tried and ruled out
Overriding deepmerge to 4.3.2, the advisory's "patched" version: it was never published (npm's latest is 4.3.1), so install fails. It stays open (low).

## Watch out
Before adding an override for an advisory, check the patched version exists (`npm view <pkg> versions`). Keep overrides scoped to the vulnerable range, so other tools keep their major versions (glob 11, minimatch 3 are still in the tree).

In the code:
- pnpm-workspace.yaml overrides: 'glob@>=13.0.0 <14.0.2': 14.0.3, 'minimatch@>=10.0.0 <11.0.1': 11.0.4
