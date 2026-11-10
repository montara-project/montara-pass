---
title: "The account menu holds only Profile, Billing, Lock vault and Sign out; sharing and IP blocks moved to the sidebar"
author: Masb0ymas
date: 2026-11-10
branch: dev
cost: { minutes: 6, tokens: 71311 }
id: l-9e3cf016
scope: repo
status: active
src: agent
touches:
  - apps/app/src/components/layout/shell.tsx
  - apps/extension/src/popup/vault-sidebar.tsx
  - apps/extension/src/popup/sidebar.css
---

## Decided
The user cut the web app's account dropdown to Profile, Billing (Cloud only), Lock vault, then a rule and Sign out in the danger colour. Lock vault is also an icon button beside the avatar. Pages that lost their menu entry moved: Sharing (Cloud only) and IP blocks (super user only) now sit in the sidebar's System group under Settings. Manage folders is reached from the vault page's footer button only.
The extension's full tab got the same lock button and danger Sign out, but keeps its own menu items (its Settings is the extension's own settings, not the account's).

## Tried and ruled out
- Keeping IP blocks in the dropdown for the super user: not chosen, the user wanted the menu at four items.
- Dropping Sharing and IP blocks from the UI (URL only): rejected, it left Cloud users and the super user with no way in.

## Watch out
- A shared component class the extension never used before needs its colour token in the extension's sidebar.css `@theme`: the destructive menu item had no colour there until `--color-danger` was added.
- The menu draws a rule above any action marked `destructive`.

In the code: apps/app/src/components/layout/shell.tsx (MENU, FOLDERS, SYSTEM, ADMIN, CRUMBS, BarAccount), apps/app/src/components/layout/sidebar/user-menu.tsx (onLock, separator before destructive), apps/extension/src/popup/vault-sidebar.tsx, apps/extension/src/popup/sidebar.css (--color-danger).
