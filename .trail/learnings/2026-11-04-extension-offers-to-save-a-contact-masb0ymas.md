---
title: "Extension offers to save a contact from a submitted form, sharing the login's pending slot"
author: Masb0ymas
date: 2026-11-04
branch: dev
cost: { minutes: 12, tokens: 165428 }
id: l-fa68d6dc
scope: repo
status: active
src: agent
touches:
  - apps/extension/src/lib/contact-capture.ts
  - apps/extension/src/lib/contact-capture.check.ts
  - apps/extension/src/entrypoints/background.ts
  - apps/extension/src/entrypoints/content.ts
  - apps/extension/src/inline/main.tsx
---

## Decided
- A form sent without a filled password is read for a contact; it is offered only when it has a name plus an address, city, state, postal code, country, phone or company. A name with only an email is a sign-up or "contact us" message and is not offered.
- The contact uses the same per-tab pending slot, TTL, alarm and `#save` frame as a login: a tab holds one or the other, the last one sent. No second storage key, so tab close and the alarm clean both.
- Only the form around what sent it is read (the submitted form, or the clicked button's form), so a header search box does not count.
- Fields are mapped by `autocomplete` first; a field whose autocomplete names something else (username, cc-*) is skipped, not guessed by name. Name/id fallback includes Indonesian words (alamat, kota, kode_pos, nama).

## Watch out
- The background re-filters the contact to the known keys as strings (max 500 chars): the page controls what is sent. Keep `CONTACT_KEYS` in background.ts in sync with `CONTACT_FIELDS`.
- `content.ts` imports `lib/contact-capture.ts`, which must stay free of runtime imports (type imports only).

In the code: apps/extension/src/lib/contact-capture.ts (+ .check.ts, run with node), content.ts `captureContact`, background.ts `save:contact`, inline/main.tsx `SavePrompt` / `SaveContact`.
