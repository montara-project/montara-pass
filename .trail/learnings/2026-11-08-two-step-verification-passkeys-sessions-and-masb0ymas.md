---
title: "Two-step verification, passkeys, sessions and the activity log live on one Security page"
author: Masb0ymas
date: 2026-11-08
branch: dev
cost: { minutes: 30, tokens: 282791 }
id: l-822d1d77
scope: repo
status: active
src: agent
touches:
  - apps/app/src/components/block/common/rich-text-editor.tsx
  - apps/app/src/components/block/profile/profile.tsx
  - apps/app/src/components/block/security/account-security.tsx
  - apps/app/src/components/block/security/audit-log.tsx
  - apps/app/src/components/block/security/devices.tsx
  - apps/app/src/components/block/security/passkeys.tsx
  - apps/app/src/components/block/security/section.tsx
  - apps/app/src/components/block/security/two-factor.tsx
---

## Decided
The web app's Security page holds two-step verification, passkeys, active sessions and the audit log. The old activity address redirects there. The Account page keeps only the profile and the master password. The extension shows the same page, but two-step verification and passkeys are status only, with a link to the web app. Setting them up needs the web app's forms. The extension can revoke sessions.

## Tried and ruled out
- The design's "Details" column in the audit log: no detail view exists.
- The sign-in method line ("Email and password"): activity rows don't record it.
- A hidden secure note showing its length: the app never reveals that while a note is hidden.

## Watch out
- In development, adding a route regenerates the route tree and reloads the page. That locks the vault, so unlock it again before checking the page.

In the code: apps/app/src/components/block/security/ (account-security, section, two-factor, passkeys, devices, audit-log), routes/(app)/security, routes/(app)/activity (redirect), apps/extension/src/popup/views/activity.tsx (Security view), apps/extension/src/lib/api.ts (listSessions, revokeSession).
