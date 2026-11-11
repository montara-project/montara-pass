---
title: "The clock's timezone is saved on the account, so the web app and the extension show the same zone"
author: Masb0ymas
date: 2026-11-11
branch: dev
cost: { minutes: 5, tokens: 120409 }
id: l-8e62f83a
scope: repo
status: active
replaces: l-f32f0d33
src: agent
touches:
  - apps/server/cmd/api/authula.go
  - apps/server/internal/handlers/ip_block.go
  - apps/app/src/lib/time-zone.ts
  - apps/app/src/components/block/profile/time-zone-select.tsx
  - apps/app/src/components/layout/shell.tsx
  - apps/extension/src/popup/vault-sidebar.tsx
---

## Decided
The timezone picked on Settings' Profile tab is saved in the database (users.time_zone, default 'UTC'), not only in the browser. GET /me answers it as time_zone (an Authula after-hook, like totp_enabled), and PUT /api/v1/me/time-zone saves it. localStorage stays as a per-browser copy so the clock shows the zone before /me answers; the web app's Shell and the extension's full-tab sidebar copy profile.time_zone into it. The extension still has no picker; it follows the web app.

## Tried and ruled out
- A separate GET /api/v1/me/time-zone: both clients already fetch /me, so the zone rides on it instead.

## Watch out
- time-zone.ts is shared with the extension through the `@` alias, so it must not import the web app's API client; each app syncs with its own client.
- The server checks the name with time.LoadLocation, which needs tzdata in the image (the Dockerfile installs it) and accepts "" and "Local", which are refused by hand.
- The activity log and other dates still use the browser's own zone.

In the code: apps/server/migrations/000011_add_users_time_zone.up.sql, registerTimeZoneOnMe in apps/server/cmd/api/authula.go, meHandler.SetTimeZone in apps/server/internal/handlers/ip_block.go, apps/app/src/lib/time-zone.ts, apps/app/src/components/block/profile/time-zone-select.tsx, apps/app/src/components/layout/shell.tsx, apps/extension/src/popup/vault-sidebar.tsx.
