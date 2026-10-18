import type { ISO8601DateString } from '@/types/time'

/** Base64 of bytes the client encrypted or wrapped; the server cannot read it. */
export type Base64 = string

/** A user's key set (apps/server internal/models/vault.go). */
export interface UserKeys {
  user_id: string
  created_at: ISO8601DateString
  updated_at: ISO8601DateString
  kdf: 'argon2id'
  kdf_salt: Base64
  kdf_memory_kib: number
  kdf_iterations: number
  kdf_parallelism: number
  encrypted_vault_key: Base64
  public_key: Base64
  encrypted_private_key: Base64
}

/** What one user learns about another in order to share with them. */
/** Only what the caller typed comes back with the key, not the name. */
export interface PublicKey {
  user_id: string
  email: string
  public_key: Base64
}

export interface Folder {
  id: string
  created_at: ISO8601DateString
  updated_at: ISO8601DateString
  user_id: string
  encrypted_name: Base64
}

export type ItemRole = 'owner' | 'editor' | 'viewer'

/** A vault item as the signed-in member sees it. */
export interface Item {
  id: string
  created_at: ISO8601DateString
  updated_at: ISO8601DateString
  deleted_at?: ISO8601DateString | null
  owner_id: string
  type: string
  cipher_version: number
  encrypted_data: Base64
  revision: number
  role: ItemRole
  encrypted_item_key: Base64
  folder_id: string | null
  favorite: boolean
  /** When the caller last filled the item into a page; missing on an older server. */
  last_used_at?: ISO8601DateString | null
}

export interface ItemMember {
  user_id: string
  name: string
  email: string
  role: ItemRole
  created_at: ISO8601DateString
}
