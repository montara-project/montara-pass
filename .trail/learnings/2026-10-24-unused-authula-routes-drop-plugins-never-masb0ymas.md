---
title: "Unused Authula routes: drop plugins, never their route mappings"
author: Masb0ymas
date: 2026-10-24
branch: dev
cost: { minutes: 7, tokens: 164821 }
id: l-596bb4f5
scope: repo
status: active
touches:
  - ".oxfmtrc.json"
  - ".oxlintrc.json"
  - apps/server/cmd/api/authula.go
---

## Decided
Endpoint audit (2026-10-24) across apps/app, apps/extension, apps/web and montara-pass-internal/apps/admin.
No client calls: GET /api/v1/items/:id, /auth/oauth2/* (Google), POST /auth/token (only serves Google
redirect sessions), /auth/magic-link/*, email-password request-password-reset, change-password,
request-email-change, send-email-verification. GET /api/health (Docker healthcheck), the Lemon Squeezy
webhook and GET verify-email (email link) have no client caller but are used.

## Watch out
Routes the email-password plugin serves exist whether or not they are in authRouteMappings
(apps/server/cmd/api/authula.go). Removing a mapping leaves the route live without sessionAuth; to
drop one, disable the plugin or feature, never the mapping.
Password reset has no client page, yet docs (architecture/overview.mdx) and the password_reset_request
email promise it: build the page in app and extension or fix the docs, don't delete silently.
apps/docs api-reference documents GET /items/:id, magic links and Google: removing them is a
breaking change for self-hosters, note it in CHANGELOG.
