---
title: "Account passkeys sign in and unlock the vault through PRF, with a relying party built per ceremony"
author: Masb0ymas
date: 2026-11-04
branch: dev
cost: { minutes: 22, tokens: 292895 }
id: l-f3a44094
scope: repo
status: active
src: agent
touches:
  - apps/server/internal/repositories/passkey.go
  - apps/server/internal/lib/passkey/passkey.go
  - apps/server/cmd/api/passkey_test.go
  - packages/shared/src/auth/passkey.ts
  - apps/app/src/components/block/profile/passkeys.tsx
---

## Decided
The user chose passkeys that sign in AND unlock the vault (WebAuthn PRF), in the server, the web app and the extension. Authula has no passkey plugin, so go-webauthn is used and the sign-in is a custom Authula route: it creates the session like the magic-link exchange (actor, session id/token, auth success values), so the session cookie and JWT pair come from the existing hooks, and the sign-in shows up in the activity log through the session hook.
PRF: every passkey is asked over one fixed input; HKDF of the output seals the raw vault key; the sealed copy is stored with the passkey; the PRF output is never sent (clientExtensionResults is sent empty). Adding a passkey asks the master password because the unlocked vault key in the web app is a non-extractable CryptoKey, and the account password because the server guards new ways in like TOTP enable.
Unlocking (no sign-in) uses the sign-in options only for rpId and a challenge and never finishes the ceremony: only the PRF output is needed.
The extension popup calls WebAuthn itself (Chrome 122+/Firefox 150 allow an extension the RP ID of hosts in its host permissions); passkeys are only made in the web app. The extension no longer offers its vault passkey provider on Montara Pass's own site, or it would catch the account passkey (no PRF, stored inside the vault it should unlock).

## Tried and ruled out
WithRegistrationOrigin/WithLoginOrigin per ceremony: go-webauthn refuses an origin that is not already in RPOrigins. Instead a webauthn.WebAuthn is built per ceremony with the base URL plus the Origin header that began it, when allowed (web origin under the RP ID, or chrome-extension/moz-extension as RPOpaqueOrigins); the origin is held with the ceremony for the finish.

## Watch out
safari-web-extension is not an opaque origin go-webauthn accepts, so Safari's extension is not let in.
Changing PASSKEY_RP_ID orphans every passkey.
Browser tests: Playwright CDP WebAuthn.addVirtualAuthenticator with hasPrf: true does the whole flow; the extension needs an http dev server allowed, so build it with `NODE_ENV=production npx wxt build --mode development` (plain --mode development fails the react-dom check) and load dist/chrome-dev; the virtual authenticator stays with the tab, so register in the web app and then navigate the same tab to chrome-extension://<id>/popup.html.

In the code:
- apps/server/cmd/api/passkey.go (sign-in routes), internal/lib/passkey (ceremonies, origin rule), internal/handlers/passkey.go, migrations/000010_passkeys
- packages/shared/src/auth/passkey.ts, crypto/vault.ts (sealVaultKeyForPasskey, unlockVaultMaterialWithPasskey)
- apps/server/cmd/api/passkey_test.go: a software authenticator for the integration test
