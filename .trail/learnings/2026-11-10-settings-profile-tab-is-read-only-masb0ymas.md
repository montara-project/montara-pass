---
title: "Settings' Profile tab is read-only, and the account password changes through the reset email"
author: Masb0ymas
date: 2026-11-10
branch: dev
cost: { minutes: 4, tokens: 54988 }
id: l-adac0a1d
scope: repo
status: active
src: agent
touches:
  - apps/app/src/components/block/profile/profile.tsx
  - apps/app/src/components/block/profile/change-master-password-form.tsx
  - apps/server/cmd/api/authula.go
---

## Decided
The user chose to build the pen design "Wiring - Settings · Profile" from data the API already has. The API cannot change a user's name, time zone or photo, or change the account password while signed in. So the profile details are shown read-only (the time zone is the browser's), there is no Change photo or Save changes, and the account password is changed through the reset link sent by email. The master password form stays, restyled like the design's Password card, with a four-bar strength meter.

## Tried and ruled out
- Adding server endpoints for name, email and signed-in password changes: offered, not chosen. That would be new auth work in the Go server.

## Watch out
- The design's Two-step verification card is not on Profile; it lives on the Security tab.

In the code: apps/app/src/components/block/profile/profile.tsx (ProfileBlock, AccountPassword), apps/app/src/components/block/profile/change-master-password-form.tsx (StrengthMeter), apps/server/cmd/api/authula.go (authRouteMappings lists the auth routes the API exposes).
