import z from 'zod'

import { ITEM_TYPES, SHARE_ROLES } from '@/lib/constants/vault'
import { optionalString, requiredEnum, requiredString } from '@/lib/validation'

// Two kinds of schema live here. The *Form* schemas validate what the user
// types, in the clear. The *Request* types describe what actually leaves the
// browser: ciphertext and wrapped keys as base64 (see lib/crypto/vault.ts).

/** Minimum length of a master password. It is the only thing protecting the vault. */
export const MIN_MASTER_PASSWORD_LENGTH = 12

const masterPassword = (attribute: string) =>
  requiredString(attribute).min(
    MIN_MASTER_PASSWORD_LENGTH,
    `The ${attribute} must be at least ${MIN_MASTER_PASSWORD_LENGTH} characters.`
  )

export const UnlockFormSchema = z.object({
  master_password: requiredString('master password'),
})

export type UnlockFormDto = z.infer<typeof UnlockFormSchema>

export const SetupVaultFormSchema = z
  .object({
    master_password: masterPassword('master password'),
    confirm_password: requiredString('confirmation'),
  })
  .refine((value) => value.master_password === value.confirm_password, {
    message: 'The confirmation does not match the master password.',
    path: ['confirm_password'],
  })

export type SetupVaultFormDto = z.infer<typeof SetupVaultFormSchema>

export const ChangeMasterPasswordFormSchema = z
  .object({
    current_password: requiredString('current master password'),
    master_password: masterPassword('new master password'),
    confirm_password: requiredString('confirmation'),
  })
  .refine((value) => value.master_password === value.confirm_password, {
    message: 'The confirmation does not match the new master password.',
    path: ['confirm_password'],
  })

export type ChangeMasterPasswordFormDto = z.infer<typeof ChangeMasterPasswordFormSchema>

export const FolderFormSchema = z.object({
  name: requiredString('name').max(100, 'The name must be at most 100 characters.'),
})

export type FolderFormDto = z.infer<typeof FolderFormSchema>

export const ItemFormSchema = z.object({
  type: requiredEnum(ITEM_TYPES, 'type'),
  name: requiredString('name').max(200, 'The name must be at most 200 characters.'),
  username: optionalString('username'),
  password: optionalString('password'),
  url: optionalString('url'),
  notes: optionalString('notes'),
  // '' means "no folder"; a select cannot hold null.
  folder_id: optionalString('folder'),
})

export type ItemFormDto = z.infer<typeof ItemFormSchema>

export const ShareFormSchema = z.object({
  email: requiredString('email').email('email must be a valid email address'),
  role: requiredEnum(SHARE_ROLES, 'role'),
})

export type ShareFormDto = z.infer<typeof ShareFormSchema>

/** KDF parameters and the vault key they protect; they change together. */
export type KDFRequest = {
  kdf_salt: string
  kdf_memory_kib: number
  kdf_iterations: number
  kdf_parallelism: number
  encrypted_vault_key: string
}

export type UserKeysRequest = KDFRequest & {
  public_key: string
  encrypted_private_key: string
}

export type FolderRequest = {
  encrypted_name: string
}

export type ItemCreateRequest = {
  type: string
  encrypted_data: string
  encrypted_item_key: string
  folder_id?: string | null
  favorite?: boolean
}

export type ItemUpdateRequest = {
  type?: string
  encrypted_data: string
  revision: number
}

export type ItemPlacementRequest = {
  folder_id: string | null
  favorite: boolean
}

export type ItemShareRequest = {
  user_id: string
  role: string
  encrypted_item_key: string
}

export type ItemRotateKeyRequest = {
  encrypted_data: string
  revision: number
  member_keys: { user_id: string; encrypted_item_key: string }[]
}

export type ItemListParams = {
  offset?: number
  limit?: number
  folder_id?: string
  type?: string
  trashed?: boolean
}
