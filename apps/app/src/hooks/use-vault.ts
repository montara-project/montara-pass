import type { ItemListParams } from '@montara-pass/shared/api/dtos/vault/schema'
import type { VaultFolder, VaultItem } from '@montara-pass/shared/types/vault'

import { decryptFolderName, decryptItem, type VaultKeys } from '@montara-pass/shared/crypto/vault'
import { useQuery } from '@tanstack/react-query'

import type { ApiListResponse } from '@/types/api'

import { FOLDER_QUERY_KEY } from '@/lib/api/queries/folder'
import { ITEM_QUERY_KEY, LIST_ITEM_QUERY_KEY } from '@/lib/api/queries/item'
import { services } from '@/lib/api/services'
import { useVaultStore } from '@/lib/stores/vault'

/**
 * The unlocked vault keys. Everything under VaultGate renders only while the
 * vault is unlocked, so a missing key there is a programming error.
 */
export function useVaultKeys(): VaultKeys {
  const keys = useVaultStore((state) => state.keys)
  if (!keys) {
    throw new Error('useVaultKeys must be used inside an unlocked VaultGate')
  }
  return keys
}

// The decrypted results below are cached by react-query, in memory only.
// VaultGate clears that cache when the vault locks.

/** The signed-in user's folders with their names decrypted, sorted by name. */
export function useFolders() {
  const keys = useVaultKeys()

  return useQuery({
    queryKey: [FOLDER_QUERY_KEY, 'list', 'decrypted'],
    queryFn: async (): Promise<VaultFolder[]> => {
      const res = await services.folders.list()

      const folders = await Promise.all(
        res.data.data.map(async (folder) => ({
          ...folder,
          name: await decryptFolderName(keys, folder.encrypted_name).catch(() => '(unreadable)'),
        }))
      )
      return folders.sort((a, b) => a.name.localeCompare(b.name))
    },
  })
}

/**
 * One page of the vault, decrypted. The server cannot search or sort what it
 * cannot read, so it only filters by folder, type and trash.
 */
export function useItems(params: ItemListParams) {
  const keys = useVaultKeys()

  return useQuery({
    queryKey: [...LIST_ITEM_QUERY_KEY(params), 'decrypted'],
    queryFn: async (): Promise<ApiListResponse<VaultItem>> => {
      const res = await services.items.list(params)

      const data = await Promise.all(
        res.data.data.map(async (item) => ({
          ...item,
          secret: await decryptItem(keys, item).catch(() => null),
        }))
      )
      return { ...res.data, data }
    },
  })
}

/** The API's largest page. */
const PAGE_SIZE = 100

/**
 * Every live item of the vault, decrypted, for a check that has to see them
 * all at once, or a search the server cannot run. Items that cannot be
 * decrypted are left out. `enabled: false` holds it until it is wanted.
 */
export function useAllItems({ enabled = true }: { enabled?: boolean } = {}) {
  const keys = useVaultKeys()

  return useQuery({
    enabled,
    // Under the items key, so saving an item refreshes it.
    queryKey: [ITEM_QUERY_KEY, 'all', 'decrypted'],
    queryFn: async (): Promise<VaultItem[]> => {
      // The first page says how many there are; the rest are asked for at
      // once, so a large vault costs two round trips rather than one a page,
      // and the items are decrypted alongside each other.
      const { data: first } = await services.items.list({ limit: PAGE_SIZE, offset: 0 })
      const total = first.metadata.total ?? first.data.length
      const offsets: number[] = []
      for (let offset = PAGE_SIZE; offset < total; offset += PAGE_SIZE) offsets.push(offset)
      const rest = await Promise.all(
        offsets.map(async (offset) => {
          const { data: page } = await services.items.list({ limit: PAGE_SIZE, offset })
          return page.data
        })
      )

      const rows = await Promise.all(
        [first.data, ...rest].flat().map(async (item) => ({
          ...item,
          secret: await decryptItem(keys, item).catch(() => null),
        }))
      )
      return rows.filter((row) => row.secret !== null)
    },
  })
}
