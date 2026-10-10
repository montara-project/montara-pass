import type {
  ItemRotateKeyRequest,
  KDFRequest,
  UserKeysRequest,
} from '@/lib/api/dtos/vault/schema'
import type { Models } from '@/lib/api/models'

import {
  generateKeyPair,
  importPrivateKey,
  importPublicKey,
  unwrapWithPrivateKey,
  wrapForPublicKey,
} from './asymmetric'
import { fromBase64, randomBytes, toBase64, utf8Decode, utf8Encode } from './encoding'
import { DEFAULT_KDF_PARAMS, deriveMasterKey, KDF_SALT_LENGTH, type KDFParams } from './kdf'
import { AES_KEY_LENGTH, importAesKey, open, seal } from './symmetric'

/*
 * The vault's key hierarchy, all of it on the client:
 *
 *   master password --Argon2id--> master key
 *   master key      --unwraps-->  vault key      (encrypts folder names and the private key)
 *   private key     --unwraps-->  item key       (one per item, wrapped once per member)
 *   item key        --decrypts--> item content
 *
 * The server stores only the wrapped and encrypted forms, so it can serve and
 * share the vault without being able to read it.
 */

/** The keys of an unlocked vault. They live in memory only (lib/stores/vault.ts). */
export interface VaultKeys {
  vaultKey: CryptoKey
  privateKey: CryptoKey
  publicKey: CryptoKey
}

/** What an item holds once decrypted. `type` decides which fields are used. */
export interface ItemSecret {
  name: string
  username?: string
  password?: string
  url?: string
  notes?: string
}

export class WrongMasterPasswordError extends Error {
  constructor() {
    super('The master password is incorrect.')
    this.name = 'WrongMasterPasswordError'
  }
}

async function wrapVaultKey(
  masterPassword: string,
  vaultKey: Uint8Array<ArrayBuffer>
): Promise<KDFRequest> {
  const salt = randomBytes(KDF_SALT_LENGTH)
  const masterKey = await deriveMasterKey(masterPassword, salt, DEFAULT_KDF_PARAMS)

  return {
    kdf_salt: toBase64(salt),
    kdf_memory_kib: DEFAULT_KDF_PARAMS.memoryKiB,
    kdf_iterations: DEFAULT_KDF_PARAMS.iterations,
    kdf_parallelism: DEFAULT_KDF_PARAMS.parallelism,
    encrypted_vault_key: toBase64(await seal(masterKey, vaultKey)),
  }
}

/** Open the vault key with the master password; throws when it is wrong. */
async function unwrapVaultKey(
  masterPassword: string,
  keys: Models.UserKeys
): Promise<Uint8Array<ArrayBuffer>> {
  const params: KDFParams = {
    memoryKiB: keys.kdf_memory_kib,
    iterations: keys.kdf_iterations,
    parallelism: keys.kdf_parallelism,
  }
  const masterKey = await deriveMasterKey(masterPassword, fromBase64(keys.kdf_salt), params)

  try {
    return await open(masterKey, fromBase64(keys.encrypted_vault_key))
  } catch {
    throw new WrongMasterPasswordError()
  }
}

/**
 * Create a new user's key set: what POST /v1/keys stores, and the unlocked
 * keys to start working with.
 */
export async function createUserKeys(
  masterPassword: string
): Promise<{ request: UserKeysRequest; keys: VaultKeys }> {
  const vaultKeyRaw = randomBytes(AES_KEY_LENGTH)
  const [kdf, pair, vaultKey] = await Promise.all([
    wrapVaultKey(masterPassword, vaultKeyRaw),
    generateKeyPair(),
    importAesKey(vaultKeyRaw),
  ])

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
}

/**
 * The unlocked keys as bytes, base64-encoded. The web app never holds them in
 * this form; the browser extension does, because its popup is torn down every
 * time it closes and the only place it can keep the keys in between is the
 * browser's in-memory session storage, which stores strings.
 */
export interface VaultMaterial {
  vaultKey: string
  /** PKCS#8. */
  privateKey: string
  /** SPKI. */
  publicKey: string
}

/** Open the vault's keys with the master password; throws WrongMasterPasswordError. */
export async function unlockVaultMaterial(
  masterPassword: string,
  keys: Models.UserKeys
): Promise<VaultMaterial> {
  const vaultKeyRaw = await unwrapVaultKey(masterPassword, keys)
  const vaultKey = await importAesKey(vaultKeyRaw)
  const privateKeyRaw = await open(vaultKey, fromBase64(keys.encrypted_private_key))

  return {
    vaultKey: toBase64(vaultKeyRaw),
    privateKey: toBase64(privateKeyRaw),
    publicKey: keys.public_key,
  }
}

/** Import key material as keys that cannot be exported again. */
export async function importVaultMaterial(material: VaultMaterial): Promise<VaultKeys> {
  const [vaultKey, privateKey, publicKey] = await Promise.all([
    importAesKey(fromBase64(material.vaultKey)),
    importPrivateKey(fromBase64(material.privateKey)),
    importPublicKey(fromBase64(material.publicKey)),
  ])
  return { vaultKey, privateKey, publicKey }
}

/** Unlock a vault with the master password; throws WrongMasterPasswordError. */
export async function unlockVault(
  masterPassword: string,
  keys: Models.UserKeys
): Promise<VaultKeys> {
  return importVaultMaterial(await unlockVaultMaterial(masterPassword, keys))
}

/**
 * Re-wrap the vault key under a new master password. Nothing else in the
 * vault changes, which is why the vault key exists.
 */
export async function changeMasterPassword(
  currentPassword: string,
  newPassword: string,
  keys: Models.UserKeys
): Promise<KDFRequest> {
  return wrapVaultKey(newPassword, await unwrapVaultKey(currentPassword, keys))
}

export async function encryptFolderName(keys: VaultKeys, name: string): Promise<string> {
  return toBase64(await seal(keys.vaultKey, utf8Encode(name)))
}

export async function decryptFolderName(keys: VaultKeys, encryptedName: string): Promise<string> {
  return utf8Decode(await open(keys.vaultKey, fromBase64(encryptedName)))
}

async function sealSecret(itemKey: Uint8Array<ArrayBuffer>, secret: ItemSecret): Promise<string> {
  const key = await importAesKey(itemKey)
  return toBase64(await seal(key, utf8Encode(JSON.stringify(secret))))
}

/** The raw item key of an item the user is a member of. */
function unwrapItemKey(keys: VaultKeys, item: Models.Item): Promise<Uint8Array<ArrayBuffer>> {
  return unwrapWithPrivateKey(keys.privateKey, fromBase64(item.encrypted_item_key))
}

/** Encrypt a new item under a fresh item key, wrapped for its owner. */
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

/** Re-encrypt an edited item under its existing item key. */
export async function encryptItemUpdate(
  keys: VaultKeys,
  item: Models.Item,
  secret: ItemSecret
): Promise<string> {
  return sealSecret(await unwrapItemKey(keys, item), secret)
}

export async function decryptItem(keys: VaultKeys, item: Models.Item): Promise<ItemSecret> {
  const key = await importAesKey(await unwrapItemKey(keys, item))
  const plaintext = await open(key, fromBase64(item.encrypted_data))
  return JSON.parse(utf8Decode(plaintext)) as ItemSecret
}

/** Wrap an item's key for the user it is being shared with. */
export async function wrapItemKeyFor(
  keys: VaultKeys,
  item: Models.Item,
  recipient: Models.PublicKey
): Promise<string> {
  const [itemKey, publicKey] = await Promise.all([
    unwrapItemKey(keys, item),
    importPublicKey(fromBase64(recipient.public_key)),
  ])
  return toBase64(await wrapForPublicKey(publicKey, itemKey))
}

/**
 * Re-encrypt an item under a new item key for the members that are left
 * after someone was removed, who may still hold the old key.
 */
export async function rotateItemKey(
  item: Models.Item,
  secret: ItemSecret,
  members: Models.PublicKey[]
): Promise<ItemRotateKeyRequest> {
  const itemKey = randomBytes(AES_KEY_LENGTH)

  const memberKeys = await Promise.all(
    members.map(async (member) => {
      const publicKey = await importPublicKey(fromBase64(member.public_key))
      return {
        user_id: member.user_id,
        encrypted_item_key: toBase64(await wrapForPublicKey(publicKey, itemKey)),
      }
    })
  )

  return {
    encrypted_data: await sealSecret(itemKey, secret),
    revision: item.revision,
    member_keys: memberKeys,
  }
}
