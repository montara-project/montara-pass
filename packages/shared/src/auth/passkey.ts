import { fromBase64, randomBytes, toBase64, utf8Encode } from '../crypto/encoding'

/*
 * Passkeys on the Montara Pass account (apps/server cmd/api/passkey.go and
 * internal/handlers/passkey.go): the browser side of signing in with one,
 * registering one, and asking one for its PRF output, which unlocks the vault
 * (crypto/vault.ts). The server sends WebAuthn options as JSON, binary fields
 * base64url-encoded; the browser wants them as bytes, and its answer goes
 * back as JSON the same way.
 *
 * PRF: every passkey is asked for its PRF output over the same input. Each
 * answers with a value only it can give, so that value can seal the vault key
 * as the master password does. It is never sent to the server.
 */

/** The input every PRF evaluation is asked for. */
const PRF_INPUT = utf8Encode('Montara Pass vault key')

const PRF_EXTENSION = { prf: { eval: { first: PRF_INPUT } } }

// The options as go-webauthn writes them: { publicKey: {...} }.
type Json = Record<string, unknown>
type Descriptor = { type: 'public-key'; id: string; transports?: AuthenticatorTransport[] }
export interface PasskeyOptions {
  publicKey: Json
}

function fromBase64Url(value: string): Uint8Array<ArrayBuffer> {
  const b64 = value.replace(/-/g, '+').replace(/_/g, '/')
  return fromBase64(b64 + '='.repeat((4 - (b64.length % 4)) % 4))
}

function toBase64Url(bytes: ArrayBuffer | Uint8Array): string {
  return toBase64(new Uint8Array(bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

const descriptors = (list: unknown) =>
  ((list as Descriptor[] | undefined) ?? []).map((c) => ({ ...c, id: fromBase64Url(c.id) }))

/** Whether this browser can use passkeys at all. */
export function passkeysSupported(): boolean {
  return typeof window !== 'undefined' && typeof window.PublicKeyCredential === 'function'
}

/** The user dismissed the browser's passkey prompt, or it timed out. */
export function passkeyCancelled(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'NotAllowedError'
}

/**
 * The credential as JSON for the server. clientExtensionResults is left
 * empty on purpose: it holds the PRF output, which must stay here.
 */
function toJSON(credential: PublicKeyCredential): Json {
  const r = credential.response
  const response: Json = { clientDataJSON: toBase64Url(r.clientDataJSON) }
  if (r instanceof AuthenticatorAttestationResponse) {
    response.attestationObject = toBase64Url(r.attestationObject)
    response.transports = r.getTransports?.() ?? []
  } else {
    const a = r as AuthenticatorAssertionResponse
    response.authenticatorData = toBase64Url(a.authenticatorData)
    response.signature = toBase64Url(a.signature)
    response.userHandle = a.userHandle ? toBase64Url(a.userHandle) : null
  }
  return {
    id: credential.id,
    rawId: toBase64Url(credential.rawId),
    type: credential.type,
    authenticatorAttachment: credential.authenticatorAttachment,
    response,
    clientExtensionResults: {},
  }
}

function prfOutput(credential: PublicKeyCredential): Uint8Array<ArrayBuffer> | undefined {
  const first = credential.getClientExtensionResults().prf?.results?.first
  return first ? new Uint8Array(first as ArrayBuffer) : undefined
}

/** A passkey's answer: the JSON for the server, and its PRF output if it has PRF. */
export interface PasskeyResult {
  credential: Json
  credentialId: string
  prf?: Uint8Array<ArrayBuffer>
}

/**
 * Sign with a passkey: the server's sign-in options, or, to unlock the vault,
 * those options limited to the user's passkeys (allow, base64url ids).
 */
export async function getPasskey(
  options: PasskeyOptions,
  allow?: string[]
): Promise<PasskeyResult> {
  const pk = options.publicKey
  const credential = (await navigator.credentials.get({
    publicKey: {
      ...(pk as unknown as PublicKeyCredentialRequestOptions),
      challenge: fromBase64Url(pk.challenge as string),
      allowCredentials: allow
        ? allow.map((id) => ({ type: 'public-key' as const, id: fromBase64Url(id) }))
        : descriptors(pk.allowCredentials),
      extensions: PRF_EXTENSION,
    },
  })) as PublicKeyCredential | null
  if (!credential) throw new DOMException('No passkey was chosen', 'NotAllowedError')
  return { credential: toJSON(credential), credentialId: credential.id, prf: prfOutput(credential) }
}

/**
 * Make a passkey with the server's registration options, and get its PRF
 * output. Most authenticators give it only when signing, not when the passkey
 * is made: then the new passkey is asked to sign once more, which takes a
 * second touch. Without PRF the passkey signs in but cannot unlock.
 */
export async function createPasskey(options: PasskeyOptions): Promise<PasskeyResult> {
  const pk = options.publicKey
  const user = pk.user as Json
  const credential = (await navigator.credentials.create({
    publicKey: {
      ...(pk as unknown as PublicKeyCredentialCreationOptions),
      challenge: fromBase64Url(pk.challenge as string),
      user: {
        ...(user as unknown as PublicKeyCredentialUserEntity),
        id: fromBase64Url(user.id as string),
      },
      excludeCredentials: descriptors(pk.excludeCredentials),
      extensions: PRF_EXTENSION,
    },
  })) as PublicKeyCredential | null
  if (!credential) throw new DOMException('No passkey was made', 'NotAllowedError')

  let prf = prfOutput(credential)
  if (!prf && credential.getClientExtensionResults().prf?.enabled) {
    const again = (await navigator.credentials.get({
      publicKey: {
        challenge: randomBytes(32),
        rpId: (pk.rp as Json).id as string,
        allowCredentials: [{ type: 'public-key', id: credential.rawId }],
        userVerification: 'required',
        extensions: PRF_EXTENSION,
      },
    })) as PublicKeyCredential | null
    prf = again ? prfOutput(again) : undefined
  }
  return { credential: toJSON(credential), credentialId: credential.id, prf }
}
