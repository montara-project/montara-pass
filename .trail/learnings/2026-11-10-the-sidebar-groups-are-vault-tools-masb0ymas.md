---
title: "The sidebar groups are Vault, Tools and System, and their names are quieter than the rows"
author: Masb0ymas
date: 2026-11-10
branch: dev
cost: { minutes: 8, tokens: 88935 }
id: l-c95adbfa
scope: repo
status: active
src: agent
touches:
  - apps/app/src/components/layout/shell.tsx
  - apps/app/src/styles.css
  - apps/extension/src/popup/styles.css
  - apps/extension/src/popup/sidebar.css
  - apps/extension/src/popup/vault-sidebar.tsx
---

## Decided
The user regrouped the sidebar of the web app: Vault (All items, Logins, Secure notes, Cards, Contacts, Favorites, Trash), Tools (Password generator, Password health), System (Settings). Settings is the old Security link renamed, still opening /security; no /settings page was built. The extension's full tab uses the same group names (Vault, Tools, System); its System keeps Security and Open web app, because the extension already has its own Settings in the account menu.
Group names and the links out at the foot (Documentation, GitHub, Feedback) are a step quieter than the rows (the user's choice: dimmer, not darker in both modes).

## Tried and ruled out
- Dimming with opacity on the muted colour: light mode has almost no room left above 4.5:1, so one opacity can't serve both modes. A `subtle` token with its own value per mode was used instead.

## Watch out
- Light `subtle` (#616f8b) sits at 4.51:1 on the background, right at AA. Don't make it lighter.

In the code: apps/app/src/components/layout/shell.tsx (GROUPS, SETTINGS, CRUMBS), apps/app/src/components/layout/sidebar/app-sidebar.tsx and nav-secondary.tsx (text-subtle-foreground), apps/app/src/styles.css and apps/extension/src/popup/styles.css (--subtle), apps/extension/src/popup/sidebar.css (--color-subtle-foreground), apps/extension/src/popup/vault-sidebar.tsx (groups).
