---
title: "The extension's full tab keeps only Settings and Open web app under System, and its tool pages use the web app's Settings frame"
author: Masb0ymas
date: 2026-11-10
branch: dev
cost: { minutes: 5, tokens: 51337 }
id: l-1d8c7b2e
scope: repo
status: active
replaces: l-78f15ab1
src: agent
touches:
  - apps/app/src/components/layout/shell.tsx
  - apps/app/src/components/layout/sidebar/nav-secondary.tsx
  - apps/extension/DESIGN.md
  - apps/extension/src/popup/sidebar.css
  - apps/extension/src/popup/vault-sidebar.tsx
  - apps/extension/src/popup/styles.css
---

## Decided
The user removed Security and Sharing from the extension's full tab. System holds the extension's own Settings, then Open web app; security, sharing, folders and the trash live in the web app. The Security and Sharing views, their CSS, and the web app's AuditTable (the extension's Security view was its last user) were deleted.
The account menu still matches the web app's: Profile (opens the web app's /profile in a new tab), Billing in the Cloud Edition, Lock vault, then Sign out under a rule.
The generator, health and billing pages use the web app's Settings frame: at most 1200px, 22px top, 28px gutters (20px under 640px), 32px bottom. The padding sits on the page's root, not on its header and body.

## Watch out
- Under 860px a generic `.detail-body { padding: 20px }` applies; the tool frame (`.detail-body.gen-page`) outranks it by specificity on purpose.

In the code: apps/extension/src/popup/vault-sidebar.tsx (Tool, items, actions), apps/extension/src/popup/styles.css (.detail-body.gen-page, .detail-col.tool-col, .tool-page-head, .gen-grid, .billing-body, .health-body), apps/extension/src/popup/sidebar.css (@source list).
