---
title: Release extension accepts plain http only for a server on this computer
author: Masb0ymas
date: 2026-11-08
branch: dev
cost: { minutes: 26, tokens: 307700 }
id: l-ef536cf7
scope: repo
status: active
src: agent
touches:
  - apps/app/src/components/block/folder/column.tsx
  - apps/app/src/components/block/folder/table.tsx
  - apps/app/src/routes/(app)/settings/ip-blocks/index.tsx
  - apps/server/cmd/api/integration_test.go
  - BACKLOG.md
  - ISSUES.md
  - pnpm-lock.yaml
  - pnpm-workspace.yaml
  - design/Screenshot 2026-11-08 at 10.23.18.png
  - design/embedded-image-1.png
---

## Decided
A release build of the extension still requires https for its server, so the account password, session tokens and TOTP codes never cross the network in the clear. The one exception is a loopback server (localhost, *.localhost, 127.x.x.x, [::1]): nothing sent there leaves the machine, and the user needs it to test a locally run self-hosted server with the release build.

## Watch out
- Development builds (`pnpm watch`) still accept any http URL; the loopback rule is what release builds add.
- A LAN address (192.168.x.x) or any other host over http stays refused. Do not widen it to "private networks": that traffic does cross a network.
- The server's CORS list does not need the extension: extension pages with host permissions are not subject to CORS.

In the code: `isLoopback` and `serverAllowed` in apps/extension/src/lib/origin.ts (self-check: `node src/lib/origin.check.ts` from apps/extension); the settings error text is NOT_HTTPS in apps/extension/src/lib/schemas.ts. The https rule came in with commit de54b98.
