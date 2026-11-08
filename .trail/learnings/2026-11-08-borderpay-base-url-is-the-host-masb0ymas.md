---
title: BorderPay base URL is the host; the client adds /api/v1
author: Masb0ymas
date: 2026-11-08
branch: dev
cost: { minutes: 4, tokens: 60792 }
id: l-8fd51b83
scope: repo
status: active
src: agent
touches:
  - apps/extension/src/entrypoints/content.ts
  - apps/extension/src/inline/main.tsx
  - apps/extension/src/lib/passkey.ts
  - apps/extension/src/popup/item-tile.tsx
  - apps/extension/src/popup/views/activity.tsx
  - apps/extension/src/popup/views/billing.tsx
  - apps/extension/src/popup/views/full-vault.tsx
  - apps/extension/src/popup/views/items.tsx
  - apps/extension/src/popup/views/password-health.tsx
  - apps/extension/src/popup/views/sharing.tsx
---

## Decided
BORDERPAY_BASE_URL names BorderPay's host (https://borderpay.id), as montara-mail-agent and .env.example have it. The client accepts it with or without /api/v1 and always calls <host>/api/v1/payments.

## Tried and ruled out
The client used to treat the base URL as the API root (default https://borderpay.id/api/v1) and append only /payments. With the .env value https://borderpay.id every checkout went to https://borderpay.id/payments, which answers a 404 HTML page, so IDR payments failed. The real endpoint answers JSON (401/404 with {"error":{"code",...}}).

## Watch out
- BORDERPAY_RETURN_URL was in .env.example but never read; the return link was the API's own /billing, wrong when the web app runs elsewhere (dev: :5173). It is read now, defaulting to <auth-base-url>/billing?checkout=done.
- return_url must be https; only a test key may use http://localhost.
- A super_user cannot subscribe ("only user accounts can subscribe or buy a plan"): test checkouts with a regular account.
- BorderPay cannot reach a localhost webhook; locally a payment stays pending unless the webhook is tunnelled or simulated (docs ?s=simulate).

In the code: New in apps/server/internal/lib/borderpay/borderpay.go (TestBaseURL), flags borderpay-base-url and borderpay-return-url in apps/server/cmd/api/flag.go, planCheckout in apps/server/internal/handlers/billing.go.
