---
title: "Settings' Security tab follows the design with real data, and the extension keeps its own audit table"
author: Masb0ymas
date: 2026-11-10
branch: dev
cost: { minutes: 8, tokens: 115633 }
id: l-dcb6e3e4
scope: repo
status: active
src: agent
touches:
  - apps/app/src/components/block/security/section.tsx
  - apps/app/src/components/block/security/devices.tsx
  - apps/app/src/components/block/security/audit-log.tsx
  - apps/app/src/components/block/security/ip-blocks.tsx
  - apps/extension/src/popup/views/activity.tsx
---

## Decided
The Security tab follows the pen design "Wiring - Settings · Security". Two-step verification and Passkeys are side-by-side cards; a card being set up spans the row. Active sessions and the audit log are row lists with the shared Settings footer (rows per page and pager). The super user also gets an IP block section with a server-side search.
Data the API lacks is left out: session location, the TOTP "added" date, and the audit log's Details button (there is no detail view). Revoke, sign out of every other device, passkey removal and the status filter on the IP blocks page are kept, though the design does not show them.

## Tried and ruled out
- Restyling the shared AuditTable: the extension's Security page uses it, so the web app's audit log got its own row list and AuditTable stays as it was.

## Watch out
- The audit log pages through the URL (?page, ?pageSize) and the IP blocks page does too. Embedded in the Security tab, the IP block list keeps its page in local state so the two do not share ?page.

In the code: apps/app/src/components/block/security/ (section.tsx MethodCard and Chip, two-factor.tsx, passkeys.tsx, devices.tsx, audit-log.tsx, ip-blocks.tsx IpBlockCard and IpBlockSection, account-security.tsx); apps/extension/src/popup/views/activity.tsx still imports audit-table.tsx.
