// RSA-OAEP key pairs. The public key wraps item keys for a user (their own
// items and items shared with them); only that user's private key unwraps
// them.

const ALGORITHM = {
  name: 'RSA-OAEP',
  modulusLength: 3072,
  publicExponent: new Uint8Array([1, 0, 1]),
  hash: 'SHA-256',
} as const

const IMPORT_PARAMS = { name: 'RSA-OAEP', hash: 'SHA-256' } as const

export interface ExportedKeyPair {
  /** SPKI. */
  publicKey: Uint8Array<ArrayBuffer>
  /** PKCS#8; encrypt it before it goes anywhere. */
  privateKey: Uint8Array<ArrayBuffer>
}

export async function generateKeyPair(): Promise<ExportedKeyPair> {
  const pair = await crypto.subtle.generateKey(ALGORITHM, true, ['encrypt', 'decrypt'])
  const [publicKey, privateKey] = await Promise.all([
    crypto.subtle.exportKey('spki', pair.publicKey),
    crypto.subtle.exportKey('pkcs8', pair.privateKey),
  ])
  return { publicKey: new Uint8Array(publicKey), privateKey: new Uint8Array(privateKey) }
}

/**
 * Import someone's public key. It comes from the server, so a key shorter
 * than the ones made here is refused: an item key wrapped with it would be
 * only as safe as that key.
 */
export async function importPublicKey(spki: Uint8Array<ArrayBuffer>): Promise<CryptoKey> {
  const key = await crypto.subtle.importKey('spki', spki, IMPORT_PARAMS, false, ['encrypt'])
  if ((key.algorithm as RsaHashedKeyAlgorithm).modulusLength < ALGORITHM.modulusLength) {
    throw new Error('This public key is too short to be trusted.')
  }
  return key
}

/** The imported private key cannot be exported again from this page. */
export function importPrivateKey(pkcs8: Uint8Array<ArrayBuffer>): Promise<CryptoKey> {
  return crypto.subtle.importKey('pkcs8', pkcs8, IMPORT_PARAMS, false, ['decrypt'])
}

export async function wrapForPublicKey(
  publicKey: CryptoKey,
  secret: Uint8Array<ArrayBuffer>
): Promise<Uint8Array<ArrayBuffer>> {
  return new Uint8Array(await crypto.subtle.encrypt(IMPORT_PARAMS, publicKey, secret))
}

export async function unwrapWithPrivateKey(
  privateKey: CryptoKey,
  wrapped: Uint8Array<ArrayBuffer>
): Promise<Uint8Array<ArrayBuffer>> {
  return new Uint8Array(await crypto.subtle.decrypt(IMPORT_PARAMS, privateKey, wrapped))
}
