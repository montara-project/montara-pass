# Montara Pass - Audit Findings Detail

This document contains in-depth technical analysis, exact trace pathways, reproduction instructions, and minimal effective code changes for each confirmed High and Medium vulnerability identified during the security audit.

---

## Table of Contents

1. [SEC-CRYPTO-01: Unauthenticated User Public Key Substitution](#sec-crypto-01-unauthenticated-user-public-key-substitution)
2. [SEC-SERVER-01: Password Verification & Automated IP-Block Bypass via Trailing Slash](#sec-server-01-password-verification--automated-ip-block-bypass-via-trailing-slash)
3. [SEC-CLIENT-01: Master Password Cleartext Capture on Self-Hosted Vaults](#sec-client-01-master-password-cleartext-capture-on-self-hosted-vaults)
4. [SEC-CRYPTO-02: Missing AAD Context Binding in AES-GCM Ciphertexts](#sec-crypto-02-missing-aad-context-binding-in-aes-gcm-ciphertexts)
5. [SEC-SERVER-02: Unbounded Argon2id KDF Memory Client DoS](#sec-server-02-unbounded-argon2id-kdf-memory-client-dos)
6. [SEC-SERVER-03: Missing Automated IP-Block Accounting for Passkey Sign-In](#sec-server-03-missing-automated-ip-block-accounting-for-passkey-sign-in)
7. [SEC-SERVER-04: Per-Account Rate Limiter Bypass via Form-Encoded Submissions](#sec-server-04-per-account-rate-limiter-bypass-via-form-encoded-submissions)
8. [SEC-SERVER-05: Existing User Sessions Survive Master Password Rotation](#sec-server-05-existing-user-sessions-survive-master-password-rotation)
9. [SEC-CLIENT-02: Extension Presence and Authentication State Oracle](#sec-client-02-extension-presence-and-authentication-state-oracle)
10. [SEC-CLIENT-03: Firefox Extension Framed Storage Proxy Circumvents Isolation](#sec-client-03-firefox-extension-framed-storage-proxy-circumvents-isolation)
11. [SEC-CRYPTO-03: Lack of Out-of-Band Public Key Verification in Item Sharing](#sec-crypto-03-lack-of-out-of-band-public-key-verification-in-item-sharing)

---

### SEC-CRYPTO-01: Unauthenticated User Public Key Substitution

- **Severity:** High
- **Affected Files:**
  - `packages/shared/src/crypto/vault.ts`: lines 200–224, 248–260, 384–395
  - `apps/server/internal/handlers/key.go`: lines 39–63
  - `apps/server/internal/repositories/user_key.go`: lines 18–27

#### Technical Mechanics
During vault initialization (`createUserKeys`), an RSA-3072 key pair is generated:
```typescript
// packages/shared/src/crypto/vault.ts:210-221
const [encryptedPrivateKey, privateKey, publicKey] = await Promise.all([
  seal(vaultKey, pair.privateKey),
  importPrivateKey(pair.privateKey),
  importPublicKey(pair.publicKey),
])

return {
  request: {
    ...kdf,
    public_key: toBase64(pair.publicKey),
    encrypted_private_key: toBase64(encryptedPrivateKey),
  },
  keys: { vaultKey, privateKey, publicKey },
}
```
The private key is sealed under `vaultKey` with AES-256-GCM, but `public_key` is transmitted in plaintext and stored directly into `user_keys.public_key`.

Upon vault unlock, `materialFromVaultKey` unwraps the private key from `encrypted_private_key`, but takes `publicKey` directly from the server-supplied `keys.public_key`:
```typescript
// packages/shared/src/crypto/vault.ts:248-260
async function materialFromVaultKey(
  vaultKeyRaw: Uint8Array<ArrayBuffer>,
  keys: Models.UserKeys
): Promise<VaultMaterial> {
  const vaultKey = await importAesKey(vaultKeyRaw)
  const privateKeyRaw = await open(vaultKey, fromBase64(keys.encrypted_private_key))

  return {
    vaultKey: toBase64(vaultKeyRaw),
    privateKey: toBase64(privateKeyRaw),
    publicKey: keys.public_key, // Trusted without verification
  }
}
```
When creating new items, `encryptNewItem` wraps the freshly generated 32-byte AES `itemKey` using `keys.publicKey`:
```typescript
// packages/shared/src/crypto/vault.ts:385-395
export async function encryptNewItem(
  keys: VaultKeys,
  secret: ItemSecret
): Promise<{ encrypted_data: string; encrypted_item_key: string }> {
  const itemKey = randomBytes(AES_KEY_LENGTH)
  const [encryptedData, wrappedKey] = await Promise.all([
    sealSecret(itemKey, secret),
    wrapForPublicKey(keys.publicKey, itemKey),
  ])
  return { encrypted_data: encryptedData, encrypted_item_key: toBase64(wrappedKey) }
}
```
If an attacker compromises the server or database and replaces `user_keys.public_key` with an attacker-controlled public key, the victim client wraps all newly created `itemKey`s for the attacker, allowing the attacker to decrypt all subsequent secrets.

#### Remediation
1. Seal `public_key` alongside `private_key` under `vaultKey` during setup, or
2. In `materialFromVaultKey`, mathematically verify that `keys.public_key` corresponds to `privateKeyRaw` (e.g. by encrypting a nonce with `publicKey` and decrypting with `privateKeyRaw`) before accepting it.

---

### SEC-SERVER-01: Password Verification & Automated IP-Block Bypass via Trailing Slash

- **Severity:** High
- **Affected Files:**
  - `apps/server/cmd/api/authula.go`: lines 267–271, 290–293
  - `apps/server/cmd/api/routes.go`: lines 59–68, 73–83

#### Technical Mechanics
Fiber routes URLs with or without trailing slashes. In `requirePassword`:
```go
// apps/server/cmd/api/authula.go:290-293
return func(c fiber.Ctx) error {
	if c.Method() != fiber.MethodPost || !slices.Contains(passwordPaths, c.Path()) {
		return c.Next()
	}
```
And in `failedAttempt`:
```go
// apps/server/cmd/api/routes.go:77-81
case http.StatusUnauthorized, http.StatusForbidden:
	return slices.Contains(guessPaths, c.Path()) || strings.HasPrefix(c.Path(), authBasePath+"/magic-link/") ||
		// A wrong account password on a master password change.
		(c.Method() == fiber.MethodPut && strings.TrimSuffix(c.Path(), "/") == apiPrefix+"/v1/keys")
```
Notice line 80 explicitly trimmed trailing slashes for `/api/v1/keys`, but lines 78 and 291 used `c.Path()` directly.
When a request is sent to `POST /api/v1/auth/totp/disable/` or `POST /api/v1/auth/email-password/sign-in/`, `c.Path()` is `/api/v1/auth/totp/disable/`.
`slices.Contains(passwordPaths, "/api/v1/auth/totp/disable/")` returns `false`, so `requirePassword` returns `c.Next()`, completely bypassing account password and TOTP validation.
Similarly, `failedAttempt` returns `false`, preventing the automated IP-block limiter from recording failures.

#### Remediation
Normalize `c.Path()` with `strings.TrimSuffix(c.Path(), "/")` in both functions:
```go
normalizedPath := strings.TrimSuffix(c.Path(), "/")
if c.Method() != fiber.MethodPost || !slices.Contains(passwordPaths, normalizedPath) {
	return c.Next()
}
```

---

### SEC-CLIENT-01: Master Password Cleartext Capture on Self-Hosted Vaults

- **Severity:** High
- **Affected Files:**
  - `apps/extension/src/entrypoints/content.ts`: lines 443–477, 540–550
  - `apps/extension/src/entrypoints/background.ts`: lines 204–232

#### Technical Mechanics
`content.ts` attaches global event listeners to intercept form submit and button clicks:
```typescript
document.addEventListener('submit', (e) => e.isTrusted && capture(e.target), true)
```
In `capture`, all password inputs are read and sent to the background script:
```typescript
void toBackground({
  type: 'save:capture',
  username: username?.value ?? '',
  password: password.value,
})
```
In `background.ts`:
```typescript
const ownSite = (stored: Record<string, unknown>) => {
  const settings = stored[SETTINGS_KEY] as { apiUrl?: string; appUrl?: string } | undefined
  return [
    settings?.apiUrl ?? import.meta.env.VITE_DEFAULT_API_URL,
    settings?.appUrl ?? import.meta.env.VITE_DEFAULT_APP_URL,
  ]
    .map(originOf)
    .includes(url)
}
```
If a user is on a self-hosted instance (`https://vault.company.com`) and has not explicitly set `appUrl` in the extension settings:
1. `ownSite(stored)` returns `false`.
2. `background.ts` stores `{ username, password, url }` in `chrome.storage.session` under `pending:${tabId}`.
3. `inline.html#save` prompts the user: *"Save this password to your vault?"*
If accepted, the user's master password is saved into the database as a vault item.

#### Remediation
In `content.ts`, check for a dedicated DOM marker on the page before capturing credentials:
```typescript
if (document.querySelector('meta[name="montara-pass-app"]') || document.documentElement.hasAttribute('data-montara-app')) {
  return;
}
```

---

### SEC-CRYPTO-02: Missing AAD Context Binding in AES-GCM Ciphertexts

- **Severity:** Medium
- **Affected Files:**
  - `packages/shared/src/crypto/symmetric.ts`: lines 15–40
  - `packages/shared/src/crypto/vault.ts`: lines 366–410

#### Technical Mechanics
`seal()` and `open()` in `symmetric.ts` invoke `crypto.subtle.encrypt` and `decrypt` without the `additionalData` parameter.
1. `encryptFolderName` and `encrypted_private_key` both use `keys.vaultKey` without domain separation:
   - Placing `encrypted_private_key` into a folder's `encrypted_name` decrypts the private key bytes when listing folders.
2. Item contents are encrypted under `itemKey` with no AAD binding `item.type`. Because `item.type` is stored in plaintext on the server:
   - Tampering with `item.type = 'login'` on a `secure_note` causes the extension to offer the note contents for autofilling into web forms.

#### Remediation
Add optional `aad` parameter to `seal()` and `open()`, and supply context bindings:
```typescript
export async function seal(
  key: CryptoKey,
  plaintext: Uint8Array<ArrayBuffer>,
  aad?: Uint8Array
): Promise<Uint8Array<ArrayBuffer>> {
  const nonce = randomBytes(NONCE_LENGTH)
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce, ...(aad ? { additionalData: aad } : {}) },
    key,
    plaintext
  )
  ...
}
```

---

### SEC-SERVER-02: Unbounded Argon2id KDF Memory Client DoS

- **Severity:** Medium
- **Affected Files:**
  - `apps/server/internal/dtos/vault.go`: lines 24–31
  - `packages/shared/src/crypto/kdf.ts`: lines 27–48

#### Technical Mechanics
`dtos/vault.go` defines `maxKDFMemoryKiB = 4 * 1024 * 1024` (4 GiB).
When the client unlocks the vault, `deriveMasterKey` in `kdf.ts` passes `params.memoryKiB` directly into `hash-wasm`'s `argon2id` WebAssembly module.
WebAssembly 32-bit linear memory is capped by browser implementations (typically 1–2 GiB maximum). Passing 4 GiB triggers an unhandled WebAssembly memory allocation exception or crashes the browser tab.

#### Remediation
1. In `apps/server/internal/dtos/vault.go`, reduce `maxKDFMemoryKiB` to `262144` (256 MiB).
2. In `packages/shared/src/crypto/kdf.ts`, validate that `params.memoryKiB <= 262144` and `params.iterations <= 10` before invoking `argon2id`.

---

### SEC-SERVER-03: Missing Automated IP-Block Accounting for Passkey Sign-In

- **Severity:** Medium
- **Affected Files:**
  - `apps/server/cmd/api/routes.go`: lines 59–68, 73–83
  - `apps/server/cmd/api/passkey.go`: lines 71–117

#### Technical Mechanics
`routes.go` defines `guessPaths` to record failed authentication attempts toward the 20-failure IP-block threshold.
While `apiPrefix + "/v1/passkeys/register/begin"` is included in `guessPaths`, `authBasePath + "/passkey/sign-in"` was omitted.
When passkey authentication fails, `passkey.go` returns 401 Unauthorized, but `failedAttempt` returns `false`.

#### Remediation
Add `authBasePath + "/passkey/sign-in"` to `guessPaths` in `routes.go`.

---

### SEC-SERVER-04: Per-Account Rate Limiter Bypass via Form-Encoded Submissions

- **Severity:** Medium
- **Affected Files:**
  - `apps/server/internal/middlewares/rate_limit.go`: lines 55–74

#### Technical Mechanics
`RateLimitEmail` relies on `bodyEmail(c)`:
```go
func bodyEmail(c fiber.Ctx) string {
	var body struct {
		Email string `json:"email"`
	}
	_ = json.Unmarshal(c.Body(), &body)
	return strings.ToLower(strings.TrimSpace(body.Email))
}
```
When a client sends credentials using `Content-Type: application/x-www-form-urlencoded`, `json.Unmarshal` fails, `bodyEmail` returns `""`, and `RateLimitKey`'s `Next` hook evaluates to `true`, skipping the rate limit.

#### Remediation
Fall back to `c.FormValue("email")` when JSON parsing returns empty.

---

### SEC-SERVER-05: Existing User Sessions Survive Master Password Rotation

- **Severity:** Medium
- **Affected Files:**
  - `apps/server/internal/handlers/key.go`: lines 66–94
  - `apps/server/cmd/api/authula.go`: lines 648–658

#### Technical Mechanics
When changing account passwords, `BeforeChangePassword` calls `auth.CoreServices().SessionService.DeleteAllByUserID`.
However, in `keyHandler.UpdateKDF`, when the master password is changed and the vault key re-wrapped, the server updates `user_keys` but leaves all user sessions active. Stolen session tokens continue to have full API access.

#### Remediation
In `keyHandler.UpdateKDF`, invoke `SessionService.DeleteOthers` or `DeleteAllByUserID`.

---

### SEC-CLIENT-02: Extension Presence and Authentication State Oracle

- **Severity:** Medium
- **Affected Files:**
  - `apps/extension/src/entrypoints/content.ts`: lines 382–403, 723–731
  - `apps/extension/src/entrypoints/background.ts`: lines 291–296

#### Technical Mechanics
`content.ts` broadcasts `window.postMessage({ montaraPass: 'passkey:ready' }, ORIGIN)` on every web page load. Any third-party script can listen for this to fingerprint the extension.
Furthermore, web scripts can post `{ montaraPass: 'passkey:ask', kind: 'available' }`, which queries `background.ts` and replies with `{ available: true/false }`, revealing the user's login state.

#### Remediation
Eliminate the indiscriminate `passkey:ready` broadcast on load and do not reflect global authentication state to untrusted page scripts.

---

### SEC-CLIENT-03: Firefox Extension Framed Storage Proxy Circumvents Isolation

- **Severity:** Medium
- **Affected Files:**
  - `apps/extension/src/entrypoints/background.ts`: lines 88–119, 186–196
  - `apps/extension/src/inline/firefox.ts`: lines 16–70

#### Technical Mechanics
Firefox isolates extension pages embedded in third-party frames from accessing `storage.session`. `background.ts` bridges this by offering `frame:call`. It checks only `sender.url.startsWith('.../inline.html')` and runs `session.get(args[0])` unrestricted, allowing any script running in the frame to dump the entire session storage (including unlocked `vault` keys).

#### Remediation
Enforce key allowlists in `frameCall` (disallowing `'vault'`) and verify the per-frame handshake greeting token.

---

### SEC-CRYPTO-03: Lack of Out-of-Band Public Key Verification in Item Sharing

- **Severity:** Medium
- **Affected Files:**
  - `packages/shared/src/crypto/vault.ts`: lines 412–423
  - `apps/app/src/components/block/vault/share-form.tsx`: lines 118–126

#### Technical Mechanics
When sharing an item, the client fetches the recipient's public key from `GET /api/v1/keys/public?email=...` and immediately encrypts the item key with it without safety numbers or TOFU pinning. A compromised server can return an attacker's public key to intercept shared items.

#### Remediation
Display SHA-256 public key fingerprints in the sharing UI and implement Trust-On-First-Use (TOFU) key pinning.
