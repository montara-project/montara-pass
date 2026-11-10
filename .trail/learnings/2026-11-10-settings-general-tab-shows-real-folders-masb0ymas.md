---
title: "Settings' General tab shows real folders and shared items, not the design's share links"
author: Masb0ymas
date: 2026-11-10
branch: dev
cost: { minutes: 8, tokens: 153943 }
id: l-f5591b3a
scope: repo
status: active
src: agent
touches:
  - apps/app/src/components/block/settings/list.tsx
  - apps/app/src/components/block/settings/folders.tsx
  - apps/app/src/components/block/settings/shared.tsx
  - apps/app/src/components/layout/shell.tsx
---

## Decided
The sidebar's Settings now opens /settings, a page from the pen design "Wiring - Settings · General": a page head, tabs (General, Profile, Security) and two sections, Folders and Sharing (Cloud only). Profile and Security tabs link to the existing /profile and /security pages; Settings stays lit in the sidebar on all three.
The design's parts with no data behind them were left out rather than faked: share links with expiry and "Link only" access, per-folder "N shared" chips and icons, the "All changes saved" mark (nothing on General saves), and the System tab (no design for it).
Sharing rows map to the app's item sharing: the role chip (Owner, Can edit, Can view), Copy link copies the item's /vault?item= address (opens only for people who can already open it), owners get Manage (the existing share dialog, which re-encrypts on removal), members get Leave.
When shell.tsx was found reverted to the version before the account-menu commit, the user chose to restore it from that commit.

## Tried and ruled out
- A bulk "Stop sharing" for owners: removing members needs the item key rotated for whoever remains, which the share dialog already does; a second path would duplicate that.

## Watch out
- In the header's crumbs, /settings must come after /settings/ip-blocks: the first prefix match names the page.
- The two lists page on local state, not the URL, because they share one page.

In the code: apps/app/src/components/block/settings/ (settings.tsx, folders.tsx, shared.tsx, list.tsx), apps/app/src/routes/(app)/settings/index.tsx, apps/app/src/components/layout/shell.tsx (SETTINGS, SETTINGS_TABS, CRUMBS).
