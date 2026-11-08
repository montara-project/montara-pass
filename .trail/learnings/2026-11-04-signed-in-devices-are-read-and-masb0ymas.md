---
title: "Signed-in devices are read and signed out straight from Authula's sessions table"
author: Masb0ymas
date: 2026-11-04
branch: dev
cost: { minutes: 11, tokens: 133896 }
id: l-e0cefb5e
scope: repo
status: active
src: agent
touches:
  - apps/extension/src/popup/styles.css
  - apps/app/src/components/block/billing/billing.tsx
  - apps/app/src/lib/api/queries/billing.ts
  - apps/app/src/lib/api/services/billing.ts
  - apps/docs/content/docs/getting-started/configuration.mdx
  - apps/extension/src/lib/api.ts
  - apps/extension/src/popup/views/billing.tsx
  - apps/server/.env.example
  - apps/server/cmd/api/flag.go
  - apps/server/internal/config/config.go
---

## Decided
The account page lists the devices signed in (live Authula sessions) and signs them out one at a time or all but the current one. Authula has no "list a user's sessions" API (SessionService only has GetByUserID, which returns one), so the server reads and deletes rows in `authula.sessions` itself, with the user id in the WHERE so nobody can touch another user's session.
Deleting the row is the whole revoke: refresh tokens go with it (FK ON DELETE CASCADE), and access tokens die on the next request because the Authorization middleware and Authula's bearer routes look the session up. Checked: /v1 routes, /auth/me and /auth/token all answer 401 for a revoked device's token.
The current session cannot be revoked through these routes (400): that is sign-out, which also clears the session cookie.

## Tried and ruled out
Authula's own `POST /auth/sign-out {session_id}` can end one other session, but has no "all but this one" (sign_out_all includes the caller) and no list, so it covers only part of the feature.

## Watch out
Authula stores times as UTC in `timestamp` columns without a zone: compare with `now() AT TIME ZONE 'UTC'`, not `now()`.

In the code:
- GET/DELETE /api/v1/sessions, DELETE /api/v1/sessions/:id (apps/server/internal/handlers/session.go, repositories/session.go)
- The middleware now stores the request's session id: lib.ContextGetSessionID
- App: apps/app/src/components/block/profile/devices.tsx on the Account page
