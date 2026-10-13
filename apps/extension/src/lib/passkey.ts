import { getDomain } from 'tldts'

import type { Passkey } from '@/lib/crypto/vault'

// The authenticator side of WebAuthn: what a security key or the operating
// system does elsewhere. It runs in the prompt (src/inline/main.tsx), an
// extension page, and decides what is signed and for which site; the page
// that asked (src/passkey-page.ts) only carries the answer back.
// The self-check is src/lib/passkey.check.ts.

type Bytes = Uint8Array<ArrayBuffer>

/** The one algorithm offered: ECDSA on P-256 with SHA-256, which every site takes. */
export const ES256 = -7

/** What a page asked navigator.credentials for, as src/passkey-page.ts describes it. */
export interface PasskeyRequest {
  id: string
  kind: 'create' | 'get'
  /** Asked for the autofill menu: the page is not waiting on the user. */
  conditional: boolean
  /** base64url, like every id below. */
  challenge: string
  /** The relying party the page names; its own host when it names none. */
  rpId?: string
  /** The account a new passkey is for. */
  user?: { id: string; name: string }
  /** The algorithms the site takes for a new passkey. */
  algs: number[]
  /** The credentials that may sign in or, for a new passkey, that the account already has. */
  ids: string[]
  /** The site asked whether the new passkey can be found without naming it. */
  credProps: boolean
}

const BASE64URL = /^[A-Za-z0-9_-]+$/

const text = (value: unknown, max: number) =>
  typeof value === 'string' && value.length <= max ? value : undefined

const encoded = (value: unknown, max: number) => {
  const found = text(value, max)
  return found !== undefined && BASE64URL.test(found) ? found : undefined
}

/**
 * The request as the page sent it, or null for one that cannot be answered.
 * It comes from the page, so nothing in it is taken for granted.
 */
export function parseRequest(raw: unknown): PasskeyRequest | null {
  if (typeof raw !== 'object' || raw === null) return null
  const from = raw as Record<string, unknown>
  const user = (from.user ?? {}) as Record<string, unknown>

  const id = text(from.id, 64)
  const kind = from.kind === 'create' || from.kind === 'get' ? from.kind : undefined
  const challenge = encoded(from.challenge, 2048)
  // A user handle is at most 64 bytes.
  const userId = encoded(user.id, 86)
  if (!id || !kind || !challenge || (kind === 'create' && !userId)) return null

  const list = (value: unknown) => (Array.isArray(value) ? value : [])
  return {
    id,
    kind,
    conditional: from.conditional === true,
    challenge,
    rpId: text(from.rpId, 253),
    user: userId ? { id: userId, name: text(user.name, 320) ?? '' } : undefined,
    algs: list(from.algs).filter((alg) => typeof alg === 'number'),
    ids: list(from.ids).filter((value) => typeof value === 'string'),
    credProps: from.credProps === true,
  }
}

/**
 * The relying party a page may speak for, or null: its own host, or a parent
 * domain it names, as long as that parent is somebody's domain and not a
 * suffix many share (a.github.io may not name github.io). Only over https,
 * localhost aside.
 */
export function rpIdFor(requested: string | undefined, pageUrl: string): string | null {
  let url: URL
  try {
    url = new URL(pageUrl)
  } catch {
    return null
  }

  const host = url.hostname
  if (url.protocol !== 'https:' && host !== 'localhost') return null
  // An address is not a domain: WebAuthn has no relying party for it.
  if (/^[\d.]+$/.test(host) || host.includes(':')) return null

  const rpId = requested ?? host
  if (rpId === host) return host
  if (!host.endsWith(`.${rpId}`)) return null
  // No domain of its own: a public suffix, as the browser's list has them.
  return getDomain(rpId, { allowPrivateDomains: true }) ? rpId : null
}

const utf8 = (value: string): Bytes => new TextEncoder().encode(value)

// base64url, which is what WebAuthn speaks; the vault's own values are
// standard base64 (apps/app/src/lib/crypto/encoding.ts).
const toBase64Url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

const fromBase64Url = (value: string): Bytes =>
  Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/')), (char) => char.charCodeAt(0))

function concat(...parts: Uint8Array[]): Bytes {
  const out = new Uint8Array(parts.reduce((length, part) => length + part.length, 0))
  let at = 0
  for (const part of parts) {
    out.set(part, at)
    at += part.length
  }
  return out
}

const sha256 = async (data: Bytes): Promise<Bytes> =>
  new Uint8Array(await crypto.subtle.digest('SHA-256', data))

// The flags of the authenticator data.
const USER_PRESENT = 0x01
// The vault was unlocked with the master password, and locks itself again.
const USER_VERIFIED = 0x04
// A passkey in the vault is on every device the vault is.
const BACKUP_ELIGIBLE = 0x08
const BACKED_UP = 0x10
const ATTESTED = 0x40

/** @param attested the new credential, when this is the answer that makes it */
async function authenticatorData(rpId: string, attested?: Bytes): Promise<Bytes> {
  const flags =
    USER_PRESENT | USER_VERIFIED | BACKUP_ELIGIBLE | BACKED_UP | (attested ? ATTESTED : 0)
  // The four zeros are the signature counter, which a synced passkey has none of.
  return concat(
    await sha256(utf8(rpId)),
    Uint8Array.of(flags, 0, 0, 0, 0),
    attested ?? new Uint8Array()
  )
}

/** What the site checks the answer against: its challenge, and where it was asked. */
const clientData = (type: 'webauthn.create' | 'webauthn.get', challenge: string, origin: string) =>
  utf8(JSON.stringify({ type, challenge, origin, crossOrigin: false }))

/** WebCrypto signs as r and s side by side; WebAuthn wants them as ASN.1. */
function toDer(signature: Bytes): Bytes {
  const integer = (bytes: Uint8Array) => {
    let at = 0
    while (at < bytes.length - 1 && bytes[at] === 0) at++
    const trimmed = bytes.subarray(at)
    // A leading zero keeps a high first bit from reading as a minus sign.
    const body = trimmed[0] & 0x80 ? concat(Uint8Array.of(0), trimmed) : trimmed
    return concat(Uint8Array.of(0x02, body.length), body)
  }

  const r = integer(signature.subarray(0, 32))
  const s = integer(signature.subarray(32))
  return concat(Uint8Array.of(0x30, r.length + s.length), r, s)
}

const KEY = { name: 'ECDSA', namedCurve: 'P-256' }

/**
 * A new passkey for the account the request names: the part to keep in the
 * vault, and the credential to hand the site. Save the first before giving
 * out the second, or the site registers a key nobody has.
 *
 * @param rpId what rpIdFor made of the request
 * @param origin of the page, as the browser reports it
 */
export async function createPasskey(request: PasskeyRequest, rpId: string, origin: string) {
  const pair = await crypto.subtle.generateKey(KEY, true, ['sign', 'verify'])
  // 0x04, then x and y, 32 bytes each.
  const point = new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey))
  const spki = new Uint8Array(await crypto.subtle.exportKey('spki', pair.publicKey))
  const pkcs8 = new Uint8Array(await crypto.subtle.exportKey('pkcs8', pair.privateKey))
  const id = crypto.getRandomValues(new Uint8Array(16))

  // The public key as a COSE_Key, in CBOR: {1: 2 (EC2), 3: -7 (ES256), -1: 1 (P-256), -2: x, -3: y}.
  const cose = concat(
    Uint8Array.of(0xa5, 0x01, 0x02, 0x03, 0x26, 0x20, 0x01, 0x21, 0x58, 0x20),
    point.subarray(1, 33),
    Uint8Array.of(0x22, 0x58, 0x20),
    point.subarray(33)
  )
  // Sixteen zeros for the AAGUID: no make of authenticator is claimed.
  const data = await authenticatorData(
    rpId,
    concat(new Uint8Array(16), Uint8Array.of(0, id.length), id, cose)
  )
  // {"fmt": "none", "attStmt": {}, "authData": data}, in CBOR. The data is 148
  // bytes, so its length fits the one byte it is given.
  const attestation = concat(
    Uint8Array.of(0xa3, 0x63),
    utf8('fmt'),
    Uint8Array.of(0x64),
    utf8('none'),
    Uint8Array.of(0x67),
    utf8('attStmt'),
    Uint8Array.of(0xa0, 0x68),
    utf8('authData'),
    Uint8Array.of(0x58, data.length),
    data
  )

  const credentialId = toBase64Url(id)
  const passkey: Passkey = {
    credentialId,
    rpId,
    userHandle: request.user?.id ?? '',
    privateKey: toBase64Url(pkcs8),
  }

  return {
    passkey,
    credential: {
      id: credentialId,
      rawId: credentialId,
      type: 'public-key',
      authenticatorAttachment: 'platform',
      response: {
        clientDataJSON: toBase64Url(clientData('webauthn.create', request.challenge, origin)),
        authenticatorData: toBase64Url(data),
        attestationObject: toBase64Url(attestation),
        publicKey: toBase64Url(spki),
        publicKeyAlgorithm: ES256,
        transports: ['internal'],
      },
      clientExtensionResults: request.credProps ? { credProps: { rk: true } } : {},
    },
  }
}

/**
 * The credential that signs the request's challenge with a saved passkey.
 * The passkey answers for its own relying party only: the caller offers it
 * to no page that rpIdFor gives another one.
 *
 * @param origin of the page, as the browser reports it
 */
export async function assertPasskey(passkey: Passkey, request: PasskeyRequest, origin: string) {
  const key = await crypto.subtle.importKey(
    'pkcs8',
    fromBase64Url(passkey.privateKey),
    KEY,
    false,
    ['sign']
  )
  const data = await authenticatorData(passkey.rpId)
  const client = clientData('webauthn.get', request.challenge, origin)
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    concat(data, await sha256(client))
  )

  return {
    id: passkey.credentialId,
    rawId: passkey.credentialId,
    type: 'public-key',
    authenticatorAttachment: 'platform',
    response: {
      clientDataJSON: toBase64Url(client),
      authenticatorData: toBase64Url(data),
      signature: toBase64Url(toDer(new Uint8Array(signature))),
      userHandle: passkey.userHandle,
    },
    clientExtensionResults: {},
  }
}
