---
title: "The web app's tables share one plain table component styled like the IP block card"
author: Masb0ymas
date: 2026-11-11
branch: dev
cost: { minutes: 12, tokens: 72336 }
id: l-1ac500b7
scope: repo
status: active
src: agent
touches:
  - apps/app/src/components/block/common/react-table.tsx
  - apps/app/src/components/block/security/ip-blocks.tsx
  - apps/app/src/components/block/trash/table.tsx
  - apps/app/src/components/block/profile/time-zone-select.tsx
  - apps/app/src/components/layout/shell.tsx
  - apps/app/src/lib/api/services/security.ts
  - apps/app/src/lib/time-zone.ts
  - apps/extension/src/popup/vault-sidebar.tsx
  - apps/server/cmd/api/authula.go
---

## Decided
The user wanted the trash table to look like the IP block list, then wanted that look to live in the shared table component, and the IP block list to use it too. The shared table is now a plain HTML table rendered with TanStack Table: mono uppercase headings, ruled rows, the Settings rows-per-page footer, an optional toolbar line at the top of the card, and a fixed width only for columns given a `size`. Trash and IP blocks both render through it.

## Tried and ruled out
- Restyling the vendored DataGrid through its class hooks: its header carries column menus (resize, pin, move) the design does not have, so the shared table stopped using it. The data-grid UI files are now unused and were kept until the user decides.

## Watch out
- A column hides on a narrow card when its meta headerClassName and cellClassName carry WIDE_ONLY (a container query at 720px on the card).
- trail check reads a column's `size: 96` as a font size change; it is a width.

In the code: apps/app/src/components/block/common/react-table.tsx (ReactTable, WIDE_ONLY, props label, toolbar, emptyMessage), apps/app/src/components/block/trash/table.tsx, apps/app/src/components/block/security/ip-blocks.tsx; unused: apps/app/src/components/ui/data-grid.tsx, data-grid-table.tsx, data-grid-pagination.tsx.
