---
title: Billing page feature lists name only shipped features; unbuilt ones go to BACKLOG.md
author: Masb0ymas
date: 2026-10-26
branch: dev
cost: { minutes: 1, tokens: 1138 }
id: l-e7d78284
scope: repo
status: active
src: agent
touches:
  - packages/shared/src/plan.ts
  - apps/app/src/components/block/billing/billing.tsx
  - apps/extension/src/popup/views/billing.tsx
  - PRODUCT.md
  - BACKLOG.md
---

## Decided
`PLAN_INCLUDES` and `BILLING_TERMS` in `packages/shared/src/plan.ts` feed the
"Every plan includes" / "How billing works" lists on both billing pages
(`apps/app/src/components/block/billing/billing.tsx`,
`apps/extension/src/popup/views/billing.tsx`). An entry goes in only once the
code backs it, because PRODUCT.md forbids claims the product can't keep.
Competitor plan features (NordPass Business) that we lack are tracked in
`BACKLOG.md`; move one into `PLAN_INCLUDES` when it ships.

## Watch out
nordpass.com/plans/business returns 403 to WebFetch and to curl with a browser
user agent. Use support.nordpass.com or reviews via web search instead.
