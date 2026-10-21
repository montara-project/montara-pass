import { importAesKey } from './symmetric'

/** Argon2id parameters, stored next to the salt so they can be raised later. */
export interface KDFParams {
  memoryKiB: number
  iterations: number
  parallelism: number
}

// OWASP's second Argon2id configuration: 64 MiB, 3 passes. The API refuses
// anything below 19 MiB and 2 passes.
export const DEFAULT_KDF_PARAMS: KDFParams = {
  memoryKiB: 65536,
  iterations: 3,
  parallelism: 1,
}

export const KDF_SALT_LENGTH = 16

const MASTER_KEY_LENGTH = 32

/**
 * Stretch the master password into the master key. This is the slow step
 * (about a second) that makes guessing the password expensive; the master
 * password and the key never leave the browser.
 */
export async function deriveMasterKey(
  masterPassword: string,
  salt: Uint8Array,
  params: KDFParams
): Promise<CryptoKey> {
  // Argon2id is the largest thing a client loads, and only unlocking or
  // setting a master password needs it: fetched then, not with every page.
  const { argon2id } = await import('hash-wasm')
  const raw = await argon2id({
    // Normalized so the same password typed on another keyboard or OS
    // produces the same key.
    password: masterPassword.normalize('NFKC'),
    salt,
    memorySize: params.memoryKiB,
    iterations: params.iterations,
    parallelism: params.parallelism,
    hashLength: MASTER_KEY_LENGTH,
    outputType: 'binary',
  })

  return importAesKey(new Uint8Array(raw))
}
