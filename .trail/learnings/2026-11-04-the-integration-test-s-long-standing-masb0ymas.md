---
title: "The integration test's long-standing LAUNCH20 failure was the checkout writing a price of 0"
author: Masb0ymas
date: 2026-11-04
branch: dev
cost: { minutes: 7, tokens: 578170 }
id: l-67f67b58
scope: repo
status: active
src: agent
touches:
  - apps/app/src/components/block/auth/login-form.tsx
  - apps/app/src/components/block/profile/devices.tsx
  - apps/app/src/components/block/profile/passkeys.tsx
  - apps/app/src/components/block/profile/profile.tsx
  - apps/app/src/components/block/vault/vault-gate.tsx
  - apps/app/src/lib/api/queries/index.ts
  - apps/app/src/lib/api/queries/passkey.ts
  - apps/app/src/lib/api/queries/session.ts
  - apps/app/src/lib/api/services/auth.ts
  - apps/app/src/lib/api/services/index.ts
---

## Decided
The billing flow failure ("discounted purchase: 0, checkout code LAUNCH20") that earlier sessions noted as pre-existing was a real bug: the Lemon Squeezy checkout returned a settled amount of 0 whenever the first checkout succeeded, and the caller then wrote 0 as the order's price. Settled now starts at the amount asked. With it fixed, the whole integration test passes.

## Watch out
The integration test signs in user@example.com close to the per-email limit (10 a minute): a new flow that signs in more must use the super user's account, or the password reset step gets 429.

In the code:
- apps/server/internal/handlers/billing.go planCheckout
- apps/server/cmd/api/integration_test.go sessionFlow runs on the super user
