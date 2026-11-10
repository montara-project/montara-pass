---
title: "The extension's full tab mirrors the web app's sidebar and account menu, with its own Settings and a Profile that opens the web app"
author: Masb0ymas
date: 2026-11-10
branch: dev
cost: { minutes: 4, tokens: 30543 }
id: l-78f15ab1
scope: repo
status: active
src: agent
touches:
  - apps/app/src/components/block/form/text-field.tsx
  - apps/app/src/components/block/profile/change-master-password-form.tsx
  - apps/app/src/components/block/profile/profile.tsx
  - apps/app/src/components/block/security/account-security.tsx
  - apps/app/src/components/block/security/audit-log.tsx
  - apps/app/src/components/block/security/block-form.tsx
  - apps/app/src/components/block/security/devices.tsx
  - apps/app/src/components/block/security/ip-blocks.tsx
  - apps/app/src/components/block/security/passkeys.tsx
  - apps/app/src/components/block/security/section.tsx
---

## Decided
The extension's full-tab sidebar uses the web app's groups: Vault (the filters), Tools, and System with Settings (the extension's own settings screen), Security, Sharing (Cloud Edition only), then Open web app last. Both apps show the same links out at the sidebar's foot from one shared list.
The account menu matches the web app's: Profile, Billing (Cloud Edition only), Lock vault, then Sign out in the danger colour under a rule. The extension has no profile page, so Profile opens the web app's /profile in a new tab; without a web app address it is left out.

## Watch out
- Settings in the extension's sidebar opens a separate screen that replaces the vault frame, as it did from the menu.
- The extension's full tab has no Trash; the trash and the folders stay in the web app.

In the code: apps/extension/src/popup/vault-sidebar.tsx (SYSTEM_TOOLS, actions), apps/app/src/components/layout/sidebar/nav-secondary.tsx (LINKS_OUT, used by apps/app/src/components/layout/shell.tsx too).
