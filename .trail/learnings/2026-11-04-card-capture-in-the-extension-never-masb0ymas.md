---
title: Card capture in the extension never takes the security code
author: Masb0ymas
date: 2026-11-04
branch: dev
cost: { minutes: 4, tokens: 40326 }
id: l-c1184cbf
scope: repo
status: active
src: agent
touches:
  - apps/docs/content/docs/clients/browser-extension.mdx
  - apps/extension/src/entrypoints/background.ts
  - apps/extension/src/entrypoints/content.ts
  - apps/extension/src/inline/main.tsx
  - apps/extension/src/lib/contact-capture.check.ts
  - apps/extension/src/lib/contact-capture.ts
  - apps/extension/src/lib/schemas.ts
  - apps/extension/src/lib/session.ts
  - apps/extension/src/lib/card-capture.ts
  - apps/extension/src/lib/card-capture.check.ts
---

## Decided
- The user chose to capture a submitted card's number, holder and expiry, but not the CVV/CVC. The code is typed into the vault by hand. The background drops it even if a page sends one; `card-capture.ts` never reads a `cc-csc` field.
- A card needs a 12-19 digit number that passes Luhn; the expiry is normalised to MM/YY or left empty, because the item form's schema rejects anything else.
- A form with both a card and an address is offered as the card (one pending slot per tab).
- Contact and card prompts share one component (`SaveDetails`); the login prompt stays separate because it fetches the site icon and checks by password.

## Watch out
- Cards inside a payment provider's iframe (Stripe Elements and the like) are not seen: the content script runs only in the top frame.

In the code: apps/extension/src/lib/card-capture.ts (+ .check.ts), content.ts `captureDetails`, background.ts `save:card`, inline/main.tsx `SaveDetails`.
