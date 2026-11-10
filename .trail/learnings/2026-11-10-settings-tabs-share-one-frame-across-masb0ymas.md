---
title: "Settings' tabs share one frame across /settings, /profile and /security, and General shows real folders and shared items"
author: Masb0ymas
date: 2026-11-10
branch: dev
cost: { minutes: 3, tokens: 33686 }
id: l-9d620154
scope: repo
status: active
replaces: l-f5591b3a
src: agent
touches:
  - apps/app/src/components/block/profile/profile.tsx
  - apps/app/src/components/block/security/account-security.tsx
  - apps/app/src/components/layout/shell.tsx
---

## Decided
The sidebar's Settings opens /settings, from the pen design "Wiring - Settings · General". General, Profile and Security are tabs of one Settings page: each of the three routes renders the same SettingsFrame (page head and tabs), so the tabs stay when switching. URLs are unchanged. The Profile and Security pages lost their own headers; Security keeps its TOTP/Passkeys/Sessions counts as a row at the top of its tab.
The design's parts with no data behind them were left out rather than faked: share links with expiry and "Link only" access, per-folder "N shared" chips and icons, the "All changes saved" mark, and the System tab (no design for it).
Sharing rows map to the app's item sharing: role chip (Owner, Can edit, Can view), Copy link copies the item's /vault?item= address, owners get Manage (the share dialog, which re-encrypts on removal), members get Leave.

## Tried and ruled out
- Tabs as plain links to the old /profile and /security pages: the tab strip vanished on those pages, leaving only the sidebar to get back.
- A bottom border on the tab strip with the active tab pulled down 1px (`-mb-px`): with `overflow-x-auto` the strip also scrolls vertically, so it grew a 1px scroll and a stray scrollbar. The rule is an inset box-shadow instead.
- A bulk "Stop sharing" for owners: removing members needs the item key rotated for whoever remains, which the share dialog already does.

## Watch out
- The header's crumbs match by prefix, first match wins: /settings must come after /settings/ip-blocks, and the Settings tab crumbs (Profile, Security) before the account menu's Profile.
- The two General lists page on local state, not the URL, because they share one page.

In the code: apps/app/src/components/block/settings/ (frame.tsx, settings.tsx, folders.tsx, shared.tsx, list.tsx), apps/app/src/components/block/profile/profile.tsx, apps/app/src/components/block/security/account-security.tsx, apps/app/src/components/layout/shell.tsx (SETTINGS, SETTINGS_TABS, CRUMBS).
