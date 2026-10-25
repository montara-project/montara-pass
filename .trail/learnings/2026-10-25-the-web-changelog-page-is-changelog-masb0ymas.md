---
title: "The web changelog page is CHANGELOG.md inlined at build, so it updates only on redeploy"
author: Masb0ymas
date: 2026-10-25
branch: dev
cost: { minutes: 21, tokens: 140672 }
id: l-58bfd8fe
scope: repo
status: active
src: agent
touches:
  - apps/web/app/changelog/page.tsx
  - apps/web/app/sitemap.ts
  - apps/web/components/site-footer.tsx
  - apps/web/lib/changelog.ts
  - apps/extension/RELEASE_NOTES.md
  - CHANGELOG.md
---

## Decided
`apps/web/app/changelog/page.tsx` renders `apps/web/lib/changelog.ts`, which imports the root
`CHANGELOG.md` with Vite's `?raw` and parses the release-please format (`## version`, `### group`,
`* **scope:** text ([sha](url))`, indented continuation lines for breaking-change notes).
No version list is kept by hand. The worker cannot read files at runtime, which is why it is inlined.

## Watch out
- After a release on `main`, the page shows the new version only once `apps/web` is rebuilt and deployed.
- A change to CHANGELOG.md's format (another release tool, a new heading style) needs `parseChangelog`
  changed with it; unknown lines are dropped silently.
- `?raw` needs `/// <reference types="vite/client" />`; `vinext/types` does not declare it.
- Headless Chrome's `--window-size` will not go below ~500px wide, so a 390px shot looks clipped.
  Set the width with CDP `Emulation.setDeviceMetricsOverride` to check mobile.
