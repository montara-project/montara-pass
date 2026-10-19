import { randomBytes } from './encoding'

// AES-256-GCM. A sealed value is nonce || ciphertext || tag; the nonce is
// random per message, which is safe for the number of messages one key sees
// here.

const NONCE_LENGTH = 12

export const AES_KEY_LENGTH = 32

export function importAesKey(raw: Uint8Array<ArrayBuffer>): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt'])
}

export async function seal(
  key: CryptoKey,
  plaintext: Uint8Array<ArrayBuffer>
): Promise<Uint8Array<ArrayBuffer>> {
  const nonce = randomBytes(NONCE_LENGTH)
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, key, plaintext)

  const sealed = new Uint8Array(NONCE_LENGTH + ciphertext.byteLength)
  sealed.set(nonce)
  sealed.set(new Uint8Array(ciphertext), NONCE_LENGTH)
  return sealed
}

/**
 * Open a sealed value. Rejects when the key is wrong or the value was
 * tampered with: GCM authenticates what it decrypts.
 */
export async function open(
  key: CryptoKey,
  sealed: Uint8Array<ArrayBuffer>
): Promise<Uint8Array<ArrayBuffer>> {
  const nonce = sealed.subarray(0, NONCE_LENGTH)
  const ciphertext = sealed.subarray(NONCE_LENGTH)
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: nonce }, key, ciphertext)
  return new Uint8Array(plaintext)
}
