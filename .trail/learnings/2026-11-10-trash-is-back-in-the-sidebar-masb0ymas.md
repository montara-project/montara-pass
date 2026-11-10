---
title: "Trash is back in the sidebar's Vault group, and the account menu keeps only four items"
author: Masb0ymas
date: 2026-11-10
branch: dev
cost: { minutes: 1, tokens: 12097 }
id: l-b23d064f
scope: repo
status: active
replaces: l-77d79972
src: agent
touches:
  - apps/app/DESIGN.md
  - apps/app/src/components/block/vault/item-detail.tsx
  - apps/app/src/components/block/vault/vault.tsx
  - apps/app/src/components/layout/shell.tsx
  - apps/app/src/components/layout/sidebar/app-sidebar.tsx
  - apps/app/src/components/layout/sidebar/nav-item.tsx
  - apps/app/src/components/layout/sidebar/nav-secondary.tsx
  - apps/app/src/components/layout/sidebar/topbar.tsx
  - apps/app/src/components/layout/sidebar/user-menu.tsx
---

## Decided
The user changed the Nov 8 layout. The web app's sidebar is Vault (All items, Logins, Secure notes, Cards, Contacts, Favorites, Trash), Tools (Password generator, Password health) and System (Settings, Sharing in Cloud, IP blocks for the super user). Settings is the old Security link and still opens /security. The account menu keeps only Profile, Billing (Cloud), Lock vault and Sign out. Folders is reached from the vault page's footer.
The rest of the Nov 8 decision still holds: counts ask the server for one item per filter, and Favorites needs the server's `favorite=true` filter.

## Tried and ruled out
- Trash and Folders only in the account menu (the Nov 8 layout): replaced at the user's request.

## Watch out
- The extension's full tab has no Trash; its trash and folders stay in the web app.

In the code: apps/app/src/components/layout/shell.tsx (GROUPS, TRASH, MENU, SYSTEM, ADMIN, FOLDERS), apps/extension/src/popup/vault-sidebar.tsx.
