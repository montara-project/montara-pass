# Montara Pass - Security Audit Report

## Executive Summary

A comprehensive, source-first defensive security audit of **Montara Pass** was conducted across all core components: the Go API server (`apps/server`), cryptographic protocols and shared packages (`packages/shared`), the browser extension (`apps/extension`), the user web application (`apps/app`), and the marketing website (`apps/web`).

Montara Pass demonstrates a well-architected zero-knowledge foundation with rigorous client-side encryption primitives (AES-256-GCM, Argon2id, WebAuthn PRF), strict CSP policies, and multi-tenant database isolation. However, the audit identified **15 confirmed findings** across cryptographic protocol boundaries, backend authentication controls, and client-side credential handling, including **3 High-severity vulnerabilities** that could compromise zero-knowledge guarantees or bypass re-authentication controls.

---

## Audit Metadata & Scope

| Field | Value |
|---|---|
| **Target Repository** | `montara-pass` (commit HEAD) |
| **Audit Methodology** | Source-First Defensive Verification (per `.agents/skills/security-audit/`) |
| **Audited Scope** | `apps/server`, `packages/shared`, `apps/extension`, `apps/app`, `apps/web`, `deploy/` |
| **Execution Policy** | Sandboxed source-and-local verification |
| **Audit Status** | **Complete** — all streams reviewed and verified |

---

## Summary of Findings by Severity

| Severity | Count | Summary |
|---|:---:|---|
| **Critical** | 0 | None identified |
| **High** | 3 | Zero-knowledge public key substitution, Trailing-slash auth/IP-block bypass, Self-hosted master password capture |
| **Medium** | 7 | Missing AES-GCM AAD context binding, Unbounded KDF memory DoS, Passkey IP-block omission, Form-encoded rate-limit bypass, Session non-invalidation on master password rotation, Extension postMessage auth oracle, Firefox storage proxy RPC |
| **Low** | 5 | Shared item revocation race condition, Secure cookie deletion omission, Redundant read-endpoint activity pruning, Permissive Chrome extension CSRF origin matching, In-memory key retention |
| **Rejected / Hardening** | 1 | Client-side cookie token storage (reclassified as architecture note) |

---

## Confirmed Findings Matrix

| Finding ID | Severity | Title | Affected Component | Core Impact |
|---|:---:|---|---|---|
| **SEC-CRYPTO-01** | **High** | Unauthenticated User Public Key Substitution | `packages/shared/src/crypto/vault.ts`, `apps/server` | Compromised DB/server substitutes public key to decrypt newly created private items |
| **SEC-SERVER-01** | **High** | Auth Verification & Automated IP-Block Bypass via Trailing Slash | `apps/server/cmd/api/authula.go`, `routes.go` | Bypasses password/TOTP re-prompt on sensitive actions and evades IPBlock lockout |
| **SEC-CLIENT-01** | **High** | Master Password Cleartext Capture on Self-Hosted Vaults | `apps/extension/src/entrypoints/content.ts`, `background.ts` | Captures master password into session storage and prompts to save as vault item |
| **SEC-CRYPTO-02** | **Medium** | Missing AAD Context Binding in AES-GCM Ciphertexts | `packages/shared/src/crypto/symmetric.ts`, `vault.ts` | Cross-context ciphertext swapping and item type confusion leading to autofill exfiltration |
| **SEC-SERVER-02** | **Medium** | Unbounded Argon2id KDF Memory Client DoS | `apps/server/internal/dtos/vault.go`, `packages/shared` | Server accepts 4 GiB KDF memory, triggering WebAssembly OOM/crash on client unlock |
| **SEC-SERVER-03** | **Medium** | Missing IP-Block Accounting for Failed Passkey Sign-In | `apps/server/cmd/api/routes.go`, `passkey.go` | Failed passkey authentication does not count toward automated IP-block lockout |
| **SEC-SERVER-04** | **Medium** | Per-Account Rate Limiter Bypass via Form-Encoded Requests | `apps/server/internal/middlewares/rate_limit.go` | Non-JSON bodies cause `bodyEmail` to return empty, bypassing brute-force rate limit |
| **SEC-SERVER-05** | **Medium** | Sessions Survive Master Password Rotation | `apps/server/internal/handlers/key.go` | Active session and refresh tokens remain valid after master password change |
| **SEC-CLIENT-02** | **Medium** | Extension Presence & Auth State Oracle via `window.postMessage` | `apps/extension/src/entrypoints/content.ts` | Arbitrary web origins detect extension presence and probe user login status |
| **SEC-CLIENT-03** | **Medium** | Firefox Extension Framed Storage Proxy Isolation Bypass | `apps/extension/src/entrypoints/background.ts` | `frame:call` RPC proxies unrestricted `session.get` to framed pages in external sites |
| **SEC-CRYPTO-03** | **Medium** | Lack of Out-of-Band Public Key Verification in Item Sharing | `packages/shared/src/crypto/vault.ts`, `apps/app` | MITM or malicious server can substitute public keys for shared item recipients |
| **SEC-CLIENT-04** | **Low** | Asynchronous Key Rotation Race on Member Revocation | `apps/app/src/components/block/vault/share-form.tsx` | Revoked member deleted on server before item re-encryption completes |
| **SEC-CLIENT-05** | **Low** | Flawed Cookie Deletion in `removeCookie` on HTTPS | `apps/app/src/lib/auth/token-storage.ts` | Omission of `; Secure` attribute in deletion string leaves cookies in strict browsers |
| **SEC-SERVER-06** | **Low** | Synchronous Table-Locking Activity Log Pruning on Read | `apps/server/internal/handlers/activity.go` | Read handler issues `DELETE` query, risking database lock contention |
| **SEC-SERVER-07** | **Low** | Permissive Chrome Extension CSRF Origin Whitelisting | `apps/server/internal/middlewares/cross_origin.go` | Any third-party Chrome extension is exempted from CSRF origin checks |

---

## Detailed Findings Analysis

### High Severity Findings

#### [SEC-CRYPTO-01] Unauthenticated User Public Key Substitution Enables Interception of Newly Created Private Vault Items
- **Location:** `packages/shared/src/crypto/vault.ts:219, 258, 392`; `apps/server/internal/handlers/key.go:50`
- **Trust Boundary:** Zero-knowledge boundary between server/database and client private vault secrets.
- **Vulnerability:** `createUserKeys` generates an RSA-3072 key pair, sealing the private key under `vaultKey` while sending `public_key` in plaintext. The server stores this in `user_keys.public_key` without MAC or signature. On vault unlock, `materialFromVaultKey` blindly assigns `keys.public_key` without verifying that it mathematically matches `privateKeyRaw`. When creating new items, `encryptNewItem` wraps the AES `itemKey` using `keys.publicKey`. A compromised database or server administrator can replace `public_key` with their own key, allowing them to unwrap `itemKey` and decrypt all new items created by the victim.
- **Remediation:** Seal `public_key` together with `private_key` under `vaultKey` during vault initialization, and in `materialFromVaultKey` verify that `keys.publicKey` corresponds to `privateKeyRaw` before accepting it.

#### [SEC-SERVER-01] Account Password Verification and Automated IP-Block Lockout Bypass via Trailing Slash Mismatch
- **Location:** `apps/server/cmd/api/authula.go:291`; `apps/server/cmd/api/routes.go:78`
- **Trust Boundary:** Re-authentication boundary on sensitive operations and automated brute-force IP protection.
- **Vulnerability:** Fiber routes requests matching routes with or without trailing slashes. `requirePassword` uses `slices.Contains(passwordPaths, c.Path())` and `failedAttempt` uses `slices.Contains(guessPaths, c.Path())`. When a request path carries a trailing slash (e.g. `POST /api/v1/auth/totp/disable/` or `POST /api/v1/auth/email-password/sign-in/`), `c.Path()` retains the slash. `slices.Contains` evaluates to `false`, bypassing the password and TOTP requirement in `requirePassword` and preventing `failedAttempt` from incrementing the failure counter in `IPBlock`.
- **Remediation:** Normalize paths using `strings.TrimSuffix(c.Path(), "/")` prior to checking membership in `passwordPaths` and `guessPaths`.

#### [SEC-CLIENT-01] Master Password Cleartext Capture and Persistence on Self-Hosted Vault Instances
- **Location:** `apps/extension/src/entrypoints/content.ts:443-477`; `apps/extension/src/entrypoints/background.ts:205-231`
- **Trust Boundary:** Zero-knowledge master encryption password boundary.
- **Vulnerability:** `content.ts` intercepts password submissions on all pages. In `background.ts`, `ownSite()` checks only default `VITE_DEFAULT_APP_URL` (`app.montarapass.com`) unless `settings.appUrl` has been manually configured. On self-hosted deployments (e.g. `vault.mycorp.com` or localhost), `ownSite()` returns `false`. When a user submits their master password on the web vault, `background.ts` captures the master password in cleartext, writes it to `chrome.storage.session` under `pending:${tabId}`, and opens `inline.html#save` offering to store it into the vault.
- **Remediation:** Embed a recognizable DOM marker (e.g. `<meta name="montara-pass-app">`) in the web app and inspect it in `content.ts` to suppress credential capture regardless of extension configuration.

---

### Medium Severity Findings

#### [SEC-CRYPTO-02] Lack of Additional Authenticated Data (AAD) in AES-GCM Ciphertexts
- **Location:** `packages/shared/src/crypto/symmetric.ts:20, 38`; `packages/shared/src/crypto/vault.ts:367, 376`
- **Vulnerability:** `seal()` and `open()` invoke AES-GCM without `additionalData`. Folder names and `encrypted_private_key` share `keys.vaultKey` without domain separation. Furthermore, item ciphertexts do not bind `item.type`. Modifying `item.type` from `secure_note` to `login` on the server causes the extension to treat private notes as logins and offer to autofill them into web pages.
- **Remediation:** Bind `{ itemId, type, cipherVersion }` in item AAD, `{ folderId, 'folder' }` in folder AAD, and `{ userId, 'private_key' }` in private key AAD.

#### [SEC-SERVER-02] Unbounded Argon2id KDF Memory Permitting Persistent Client Denial of Service
- **Location:** `apps/server/internal/dtos/vault.go:26`; `packages/shared/src/crypto/kdf.ts:35-45`
- **Vulnerability:** Server permits `kdf_memory_kib` up to 4,194,304 KiB (4 GiB). Allocating 4 GiB inside WebAssembly linear memory exceeds browser engine limits, triggering unhandled Out-Of-Memory exceptions or freezing the client tab upon unlock.
- **Remediation:** Lower `maxKDFMemoryKiB` in `dtos/vault.go` to 262,144 KiB (256 MiB) and enforce client-side clamping in `kdf.ts`.

#### [SEC-SERVER-03] Missing Automated IP-Block Accounting for Failed Passkey Sign-In Attempts
- **Location:** `apps/server/cmd/api/routes.go:67, 78`; `apps/server/cmd/api/passkey.go:115`
- **Vulnerability:** `guessPaths` omits `authBasePath + "/passkey/sign-in"`. Failed passkey authentication returns 401 Unauthorized, but `failedAttempt` returns `false`, allowing unthrottled passkey assertion replays without triggering IP lockout.
- **Remediation:** Add `authBasePath + "/passkey/sign-in"` to `guessPaths` in `routes.go`.

#### [SEC-SERVER-04] Per-Account Rate Limiter Bypass via Form-Encoded Credential Submissions
- **Location:** `apps/server/internal/middlewares/rate_limit.go:56-74`
- **Vulnerability:** `bodyEmail` only parses JSON. Non-JSON or form-encoded submissions return an empty string, causing `RateLimitKey`'s `Next` hook to return `true` and skip rate limiting.
- **Remediation:** Fall back to `c.FormValue("email")` or form parsing when JSON unmarshaling returns empty.

#### [SEC-SERVER-05] Existing User Sessions Survive Master Password Rotation
- **Location:** `apps/server/internal/handlers/key.go:66-94`
- **Vulnerability:** Changing the master password via `PUT /api/v1/keys` (`UpdateKDF`) updates `user_keys` but fails to invalidate active user sessions in Authula, allowing compromised sessions to persist.
- **Remediation:** In `keyHandler.UpdateKDF`, call `SessionService.DeleteOthers` or `DeleteAllByUserID`.

#### [SEC-CLIENT-02] Extension Presence and Authentication State Oracle via Global `window.postMessage`
- **Location:** `apps/extension/src/entrypoints/content.ts:386-401, 730`
- **Vulnerability:** Broadcasting `passkey:ready` on every page load allows arbitrary web scripts to detect extension presence, and querying `passkey:ask` reflects whether the user is logged into the vault.
- **Remediation:** Remove global readiness broadcast and restrict auth status responses.

#### [SEC-CLIENT-03] Firefox Extension Framed Storage Proxy Circumvents Browser Sandbox Isolation
- **Location:** `apps/extension/src/entrypoints/background.ts:88-119, 186-196`; `apps/extension/src/inline/firefox.ts:16-70`
- **Vulnerability:** `background.ts` exposes `frame:call` which proxies `session.get`, `session.set`, and `session.remove` without key allowlists or frame greeting token validation.
- **Remediation:** Enforce key allowlists (disallow `'vault'`) and bind calls to the per-frame handshake token.

#### [SEC-CRYPTO-03] Lack of Out-of-Band Public Key Verification or TOFU Pinning in Item Sharing Protocol
- **Location:** `packages/shared/src/crypto/vault.ts:412-423`; `apps/app/src/components/block/vault/share-form.tsx:120`
- **Vulnerability:** Clients directly wrap item keys with server-returned public keys without fingerprinting or TOFU pinning, allowing a compromised server to MITM shared items.
- **Remediation:** Introduce SHA-256 public key fingerprints in the sharing UI and implement TOFU verification.

---

### Low Severity Findings

- **[SEC-CLIENT-04] Asynchronous Key Rotation Race Condition on Member Revocation:** `handleRemove` deletes member access on the server before re-encrypting the item key; failure or navigation leaves the old key in use.
- **[SEC-CLIENT-05] Flawed Cookie Deletion in `removeCookie` on HTTPS:** Omission of `; Secure` attribute in `document.cookie` deletion string can fail to delete cookies in strict RFC 6265bis user agents.
- **[SEC-SERVER-06] Redundant Synchronous Activity Log Pruning on Read Endpoint:** `repo.Prune` invoked inside `activityHandler.List` introduces database lock contention on read requests.
- **[SEC-SERVER-07] Permissive Chrome Extension Scheme Whitelisting in CSRF Middleware:** `isExtensionOrigin` checks only `chrome-extension://` prefix without validating specific extension IDs.

---

## Hardening Notes & Reclassifications

1. **Client-Side Auth Token Storage:** The candidate proposing that storing tokens in client cookies is a Medium vulnerability was **rejected** as a vulnerability finding and reclassified as an architectural defense-in-depth note. In an SPA architecture, storing tokens without an accompanying XSS vector does not cross a trust boundary.
2. **Subresource Integrity (SRI) on Marketing Site:** `apps/web` loads an external analytics script without SRI; while recommended for defense-in-depth, `apps/web` does not handle vault secrets or authentication data.
3. **Passkey PRF HKDF Salt:** `passkeyKey` uses an all-zero salt of 32 bytes. While compliant with RFC 5869, using credential or user ID bytes provides superior domain separation.
