# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Two audiences, in this order:

1. **Individuals who care about privacy**, keeping their own logins and secure
   notes on the hosted service (`app.montarapass.com`). They meet the product
   mostly through the browser extension, mid-task: a sign-in form is in front
   of them and they want it filled, or they just signed up somewhere and want
   the login kept.
2. **Technical self-hosters**, who run the server themselves (Docker, Dokploy)
   and point the clients at their own address.

The individual on the hosted service sets the default path. Self-hosting is
fully supported, but it must not add steps or choices to that default: it is
one switch and one URL, off unless asked for.

## Product Purpose

Montara Pass is an end-to-end encrypted password manager that can also be run
by its user. It stores logins, secure notes and passkeys in a vault only its
owner can open, fills them into the pages they belong to, and offers to keep
new ones.

Success is a login filled or saved without the user leaving the page they were
on, and without the server ever having been able to read it.

## Positioning

Zero-knowledge by construction, and open to inspection: everything is
encrypted in the browser before it leaves the device, the server stores
ciphertext and wrapped keys only, and the whole stack (server, web app,
extension) is MIT-licensed and self-hostable from one Docker image.

The server cannot read, search or sort what it stores. The item type (`login`,
`secure_note`) is the one thing kept in the clear.

## Operating Context

- **Two passwords.** The account password signs in and goes to the API. The
  master password unlocks the vault, is separate, is never stored and never
  reaches the server. Copy must keep them apart wherever either is asked for.
- **Four states a client can be in:** signed out, signed in with no vault yet,
  locked, unlocked.
- **Accounts and vaults are made in the web app.** Sign-up needs a verified
  email before it signs anyone in, and the vault and its master password are
  created there. The extension links out to it and does not repeat it.
- **The extension has three surfaces:** the toolbar popup (400×600, rebuilt
  from scratch each time it opens), the same page in a full tab
  (`popup.html?view=full`, also what Firefox for Android shows), and the
  inline menu framed under a login field on other people's pages.
- **The vault locks itself** after 15 minutes without use and when the browser
  closes. A reload of the web app locks it too.
- **Clients:** the web app (`apps/app`), the browser extension
  (`apps/extension`: Chrome and other Chromium browsers, Firefox 140+, Firefox
  for Android 142+). The marketing site (`apps/web`) and the documentation
  (`apps/docs`) are separate surfaces.

## Capabilities and Constraints

Confirmed capabilities:

- Logins and secure notes, in folders, with favorites and a trash.
- Fill a login into the current page; offer to save one a page just
  submitted; suggest a generated password on a sign-up form.
- Passkeys: the extension answers a page's request to create or use one.
- Password generator and a password health view.
- Share an item with another user as `editor` or `viewer`; revoke or leave.
- Sign-in by email and password, magic link, or Google (server); the
  extension signs in by email and password.

Constraints future work must keep:

- The extension and the web app share `packages/shared` (the crypto, the
  API models and the zod schemas), so both read and write the same ciphertext
  and check the same things in the same words.
- The extension stays light on dependencies: its own fetch client rather than
  the web app's axios, and nothing added for what a few lines can do.
- Extension pages run under a CSP that allows `'self'` and
  `'wasm-unsafe-eval'` only (Argon2id runs as WebAssembly). No remote scripts,
  styles or fonts.
- A popup closes whenever it loses focus. Nothing that needs the user to go
  elsewhere and come back (an inbox, another tab) can live in it.
- The extension keeps session tokens in `chrome.storage.local` and the
  unlocked keys in `chrome.storage.session`; content scripts are shut out of
  both where the browser allows.
- An item update names the revision it read; a stale one is refused (409) and
  the user is told to refresh.

Terminology: *vault*, *item*, *login*, *secure note*, *passkey*, *folder*,
*master password*, *account password*, *lock* / *unlock*, *sign in* /
*sign out*, *self-hosted*.

Undecided or not established:

- Password reset: the API has the route, no client has a page for it.
- Pricing and plans: the terms of service mention subscriptions, nothing in
  the product implements or describes them. Do not write pricing claims.

## Brand Commitments

- **Name:** Montara Pass, by Montara Project. Written in full; not "Montara"
  alone and not "MP".
- **Mark:** the "M" with a keyhole, at `apps/extension/public/icons/`
  (16, 32, 48, 128, 256 px).
- **Voice**, as the shipped copy has it: plain and declarative, in full
  sentences, saying what a thing does or what happened. No exclamation marks,
  no marketing adjectives, no reassurance. Controls name their action ("Unlock
  Montara Pass", "Create one"); errors name the problem and the way out ("This
  item was changed somewhere else. Refresh the vault and try again.").
- **Language:** English throughout the interface.

## Evidence on Hand

- Architecture and encryption, written up: `apps/docs/content/docs`
  (`architecture/`, `clients/browser-extension`), and the Vault section of
  `README.md`.
- A security audit with its findings and their status: `ISSUES.md`.
- Legal copy: terms and privacy pages in `apps/web`.
- Release history: `CHANGELOG.md`, `RELEASE_NOTES.md`, and the extension's
  own `apps/extension/RELEASE_NOTES.md` for what goes on addons.mozilla.org.

Absent, and not to be invented: customer names, testimonials, user counts,
benchmarks, third-party audit or certification claims, pricing.

## Product Principles

1. **The server learns nothing.** A feature that needs the server to read,
   search or sort vault content is designed differently or not built.
2. **Finish the task on the page.** Filling and saving happen where the user
   already is; the product does not ask them to come to it.
3. **Say which secret.** Account password and master password are never
   confusable, in copy or in layout.
4. **One default, one switch.** The hosted path has no settings to get
   through; self-hosting is a single, quiet option.
5. **Small and inspectable.** Less code and fewer dependencies in a client
   that holds keys is a security property, not only a preference.

## Accessibility & Inclusion

No standard has been formally adopted. The extension is built to WCAG 2.2 AA
in practice: text contrast at or above 4.5:1 in both themes, field borders at
3:1, a visible focus ring on every control, every transition paired with a
`prefers-reduced-motion` rule, labelled inputs, and errors announced and tied
to their field. New work holds that line.
