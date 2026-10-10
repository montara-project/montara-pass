import type { Models } from '@/lib/api/models'
import type { ItemSecret } from '@/lib/crypto/vault'

/** A folder with its name decrypted. */
export type VaultFolder = Models.Folder & {
  name: string
}

/**
 * An item with its content decrypted. `secret` is null when it could not be
 * decrypted, for example when the item key was rotated while this page was
 * showing the old one.
 */
export type VaultItem = Models.Item & {
  secret: ItemSecret | null
}
