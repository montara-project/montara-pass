---
title: "Activity log: who sees which rows, and why item rows carry no IP"
author: Masb0ymas
date: 2026-11-04
branch: dev
cost: { minutes: 12, tokens: 167005 }
id: l-3121c38d
scope: repo
status: active
src: agent
touches:
  - apps/docs/content/docs/clients/browser-extension.mdx
  - apps/extension/src/entrypoints/background.ts
  - apps/extension/src/entrypoints/content.ts
  - apps/extension/src/inline/main.tsx
  - apps/extension/src/lib/card-capture.check.ts
  - apps/extension/src/lib/card-capture.ts
  - apps/extension/src/lib/schemas.ts
  - apps/extension/src/lib/session.ts
  - apps/server/migrations/000009_activity_logs.up.sql
  - apps/server/migrations/000009_activity_logs.down.sql
---

## Decided
- One table, `activity_logs`, for sign-ins and item actions. A user sees: rows they did (actor), rows about them (subject: shared with, role changed, removed), and rows on an item while they were its member (`item_members.created_at <= row.created_at`). Leaving or a permanent delete ends that third kind of visibility.
- Sign-ins are recorded from Authula's `Sessions.AfterCreate` service hook, so password, magic link, Google and the TOTP step are all covered in one place. Only sign-in rows keep IP and User-Agent; item rows keep none because other members read them.
- The server only knows item id and type; the web app and the extension name the item from their decrypted vault, falling back to "a login"/"a card". Sentence text is shared in `packages/shared/src/activity.ts` so both clients read the same.
- 90-day retention, pruned lazily when the log is listed. A failed write is logged and never fails the request or the sign-in.
- Not recorded: filing/favorite, mark-as-used, key rotation (noise, or personal).

## Watch out
- `go test ./cmd/api` (TestIntegration) already failed at `billingFlow` ("discounted purchase: 0, checkout code LAUNCH20") on HEAD before this change; `vaultFlow`, which holds the activity checks, runs before it and passes.

In the code: apps/server/migrations/000009_activity_logs.up.sql, internal/repositories/activity.go (`activityVisible`), cmd/api/authula.go `recordSignIn`, internal/handlers/item.go `record`, apps/app/src/components/block/activity/activity-log.tsx, apps/extension/src/popup/views/activity.tsx.
