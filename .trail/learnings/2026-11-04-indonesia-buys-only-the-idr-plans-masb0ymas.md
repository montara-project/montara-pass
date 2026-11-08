---
title: "Indonesia buys only the IDR plans and everyone else only the USD ones, by a country header from the proxy"
author: Masb0ymas
date: 2026-11-04
branch: dev
cost: { minutes: 12, tokens: 456520 }
id: l-6d9cb74e
scope: repo
status: active
src: agent
touches:
  - BACKLOG.md
  - apps/app/src/components/block/activity/activity-log.tsx
  - apps/app/src/components/layout/shell.tsx
  - apps/app/src/lib/api/queries/activity.ts
  - apps/app/src/lib/api/queries/index.ts
  - apps/app/src/lib/api/services/activity.ts
  - apps/app/src/lib/api/services/index.ts
  - apps/app/src/routeTree.gen.ts
  - apps/app/src/routes/(app)/activity/index.tsx
  - apps/docs/content/docs/api-reference/activity.mdx
---

## Decided
- The user chose a trusted proxy header (Cloudflare's CF-IPCountry) over an embedded APNIC range list or a MaxMind database, and a strict split over defaulting the tab: Indonesia (ID) is sold only IDR plans through BorderPay, everyone else only USD plans through Lemon Squeezy.
- Off by default: with no header configured every plan is on offer to everyone, as before. Configured, a missing or unknown country, or a header that did not come from a trusted proxy, counts as abroad.
- The server enforces it at checkout (403 "this plan is not sold in your country"). `GET /api/v1/plans` still lists every plan, because the website reads it server-side from its Worker, and names the caller's currency in `metadata.currency`; the web app and extension then show only that currency and hide the USD/IDR tabs.
- The website reads the visitor's `cf-ipcountry` itself (it runs on Cloudflare Workers), so the home and pricing pages render per request now.

## Watch out
- Fiber's `IsProxyTrusted()` answers true when TrustProxy is off, so without TRUSTED_PROXIES any client could send the header. Deploys set TRUSTED_PROXIES; Traefik still passes client headers through, so the header is only trustworthy when Cloudflare (which overwrites it) is the only way in.
- Production served no IDR plans when this was written: turning the header on before the IDR plans and BorderPay key are live leaves Indonesian visitors with nothing to buy.
- A VPN changes the country; this is the proxy's word on the connection, not on the customer.

In the code: apps/server/internal/handlers/billing.go `regionCurrency`, `soldIn`; flag/env `COUNTRY_HEADER`; apps/web/components/pricing/offer.ts `visitorRegion`; apps/app billing query `region`; apps/extension `listPlans` region.
