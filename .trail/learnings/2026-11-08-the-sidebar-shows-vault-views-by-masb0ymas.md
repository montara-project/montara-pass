---
title: "The sidebar shows vault views by type, and the other pages live in the account menu"
author: Masb0ymas
date: 2026-11-08
branch: dev
cost: { minutes: 14, tokens: 305941 }
id: l-77d79972
scope: repo
status: active
src: agent
touches:
  - apps/app/src/components/layout/server-time.tsx
  - apps/app/src/components/layout/shell.tsx
  - apps/app/src/hooks/use-vault.ts
  - apps/app/src/components/ui/sidebar.tsx
  - apps/extension/src/popup/vault-sidebar.tsx
  - apps/extension/src/popup/sidebar.css
  - apps/server/internal/repositories/item.go
---

## Decided
The user chose to follow the pen design's sidebar in both the web app and the extension. The Vault group lists All items, Logins, Secure notes, Cards, Contacts and Favorites, each with a count. The bottom lists Password generator, Password health and Security. Pages the design leaves out stay reachable from the account dropdown: Account, Folders, Trash, Billing (Cloud only), and IP blocks for the super user. There is no Security page yet, so Security opens the activity log until the design's combined page (2FA, passkeys, devices, activity) is built.
The header shows a LIVE badge and a clock in UTC. The time is the browser's own clock, not the server's.

## Tried and ruled out
- Restyling only and keeping the old links (Vault/Folders/Trash, Activity, Billing): rejected, the user wanted the design's structure.
- A hybrid that kept Folders, Trash, Activity and Billing in the sidebar: rejected for the same reason.
- Counting by decrypting the whole vault: too slow (one RSA unwrap per item). Each count instead asks the server for one item of that filter and reads its total.

## Watch out
- Favorites needs the server's `favorite=true` list filter. An API server built before it ignores the parameter, so Favorites counts every item.
- The type select on the vault page is uncontrolled. It is keyed on the URL type so the sidebar can change it.
- The sidebar component is shared with the extension through the `@` alias. Any class it uses needs its token in the extension's sidebar.css `@theme` (card, good, radius-sm/md were added).

In the code: apps/app/src/components/layout/shell.tsx (VAULT_VIEWS, TOOLS, MENU, ADMIN), apps/app/src/hooks/use-vault.ts (useItemTotals), apps/app/src/components/layout/server-time.tsx, apps/app/src/components/ui/sidebar.tsx, apps/extension/src/popup/vault-sidebar.tsx (TOOLS, MENU_TOOLS), apps/extension/src/popup/sidebar.css, apps/server/internal/repositories/item.go (ItemListParams.Favorite).
