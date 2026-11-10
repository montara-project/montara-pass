---
title: "The header clock shows the date and a timezone chosen on the profile, kept in the browser"
author: Masb0ymas
date: 2026-11-10
branch: dev
cost: { minutes: 5, tokens: 42229 }
id: l-f32f0d33
scope: repo
status: active
src: agent
touches:
  - apps/app/src/components/block/vault/vault.tsx
  - apps/app/src/components/layout/shell.tsx
  - apps/app/src/routeTree.gen.ts
  - apps/docs/content/docs/clients/web-app.mdx
  - apps/extension/src/popup/views/full-vault.tsx
  - CHANGELOG.md
---

## Decided
The header clock (shared by the web app and the extension's full tab) shows the date and the time in a chosen zone, labelled with its offset ("UTC+7"; plain "UTC" for UTC). The zone is chosen on Settings' Profile tab with a searchable combobox of every IANA zone, built like the project's other ReUI comboboxes (Button mode="input", Popover, Command). It is stored in the browser (localStorage), since the API has no field for it; the default stays UTC. The extension has no profile page, so its clock stays on UTC.

## Tried and ruled out
- Fetching ReUI's combobox-timezone example: its registry JSON returned 404, so the existing in-repo combobox pattern was reused.

## Watch out
- The setting is per browser; another device or the extension starts at UTC.
- The date hides under 768px so the header keeps room for the time.
- The activity log and other dates still use the browser's own zone, not this setting.

In the code: apps/app/src/lib/time-zone.ts (useTimeZone, setTimeZone, zoneOffset, timeZones), apps/app/src/components/layout/sidebar/header-clock.tsx (was utc-clock.tsx; the extension's sidebar.css @source names it), apps/app/src/components/block/profile/time-zone-select.tsx.
