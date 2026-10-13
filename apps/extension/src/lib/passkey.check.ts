// The self-check of src/lib/passkey.ts: a passkey is made, then signs in, and
// the signature is verified the way a site would.
// Run: node src/lib/passkey.check.ts

import assert from 'node:assert/strict'

// By address, so Node finds the file without the bundler's resolution.
const { assertPasskey, createPasskey, parseRequest, rpIdFor } = (await import(
  new URL('./passkey.ts', import.meta.url).href
)) as typeof import('./passkey')

const bytes = (value: string) => new Uint8Array(Buffer.from(value, 'base64url'))
const sha256 = async (data: Uint8Array<ArrayBuffer>) =>
  new Uint8Array(await crypto.subtle.digest('SHA-256', data))

const ORIGIN = 'https://login.example.com'
const RP_ID = 'example.com'

// The site a page may speak for.
assert.equal(rpIdFor(undefined, ORIGIN), 'login.example.com')
assert.equal(rpIdFor(RP_ID, `${ORIGIN}/sign-in`), RP_ID)
assert.equal(rpIdFor('example.com', 'https://example.com.evil.net'), null)
assert.equal(rpIdFor('evil.net', ORIGIN), null)
assert.equal(rpIdFor('login.example.com', 'https://example.com'), null)
assert.equal(rpIdFor('com', ORIGIN), null)
assert.equal(rpIdFor('github.io', 'https://evil.github.io'), null)
assert.equal(rpIdFor('co.uk', 'https://shop.example.co.uk'), null)
assert.equal(rpIdFor('example.co.uk', 'https://shop.example.co.uk'), 'example.co.uk')
assert.equal(rpIdFor(undefined, 'https://github.io'), 'github.io')
assert.equal(rpIdFor(RP_ID, 'http://login.example.com'), null)
assert.equal(rpIdFor('0.1', 'https://10.0.0.1'), null)
assert.equal(rpIdFor(undefined, 'http://localhost:5173'), 'localhost')

// What a page may send.
assert.equal(parseRequest(null), null)
assert.equal(parseRequest({ id: 'a', kind: 'get', challenge: 'not base64url!' }), null)
assert.equal(parseRequest({ id: 'a', kind: 'create', challenge: 'AAAA' }), null)

const register = parseRequest({
  id: 'a',
  kind: 'create',
  challenge: 'cmVnaXN0ZXI',
  rpId: RP_ID,
  user: { id: 'dXNlci0x', name: 'ada@example.com' },
  algs: [-7, -257],
  ids: [],
})!
const made = await createPasskey(register, RP_ID, ORIGIN)

const created = made.credential.response
const data = bytes(created.authenticatorData)
assert.deepEqual(data.subarray(0, 32), await sha256(new TextEncoder().encode(RP_ID)))
// Present, verified, backed up, with a credential attached.
assert.equal(data[32], 0x5d)
assert.equal(data.length, 148)
assert.deepEqual(data.subarray(55, 71), bytes(made.passkey.credentialId))
assert.equal(
  Buffer.from(bytes(created.attestationObject).subarray(0, 5)).toString('hex'),
  'a363666d74'
)
assert.deepEqual(bytes(created.attestationObject).subarray(-148), data)
assert.deepEqual(JSON.parse(Buffer.from(created.clientDataJSON, 'base64url').toString()), {
  type: 'webauthn.create',
  challenge: 'cmVnaXN0ZXI',
  origin: ORIGIN,
  crossOrigin: false,
})
assert.equal(made.passkey.userHandle, 'dXNlci0x')

// Signing in, checked against the public key the site was given.
const signIn = parseRequest({ id: 'b', kind: 'get', challenge: 'c2lnbi1pbg', rpId: RP_ID })!
const { response } = await assertPasskey(made.passkey, signIn, ORIGIN)
assert.equal(response.userHandle, 'dXNlci0x')
assert.equal(bytes(response.authenticatorData)[32], 0x1d)

// The signature back from ASN.1 to r and s side by side, as WebCrypto reads it.
const der = bytes(response.signature)
assert.equal(der[0], 0x30)
assert.equal(der[1], der.length - 2)
const raw = new Uint8Array(64)
let at = 2
for (const end of [32, 64]) {
  assert.equal(der[at], 0x02)
  const integer = der.subarray(at + 2, at + 2 + der[at + 1])
  const digits = integer[0] === 0 ? integer.subarray(1) : integer
  raw.set(digits, end - digits.length)
  at += 2 + der[at + 1]
}

const publicKey = await crypto.subtle.importKey(
  'spki',
  bytes(created.publicKey),
  { name: 'ECDSA', namedCurve: 'P-256' },
  false,
  ['verify']
)
const signed = new Uint8Array([
  ...bytes(response.authenticatorData),
  ...(await sha256(bytes(response.clientDataJSON))),
])
assert.ok(await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, publicKey, raw, signed))

console.log('passkey: ok')
