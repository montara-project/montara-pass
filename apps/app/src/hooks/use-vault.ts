import { useQuery } from '@tanstack/react-query'

import type { ItemListParams } from '@/lib/api/dtos/vault/schema'
import type { ApiListResponse } from '@/types/api'
import type { VaultFolder, VaultItem } from '@/types/vault'

import { FOLDER_QUERY_KEY } from '@/lib/api/queries/folder'
import { ITEM_QUERY_KEY, LIST_ITEM_QUERY_KEY } from '@/lib/api/queries/item'
import { services } from '@/lib/api/services'
import { decryptFolderName, decryptItem, type VaultKeys } from '@/lib/crypto/vault'
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
      const rows: VaultItem[] = []

      for (let seen = 0; ;) {
        const { data: page } = await services.items.list({ limit: PAGE_SIZE, offset: seen })
        seen += page.data.length

        for (const item of page.data) {
          const secret = await decryptItem(keys, item).catch(() => null)
          if (secret) rows.push({ ...item, secret })
        }
        if (page.data.length < PAGE_SIZE || seen >= (page.metadata.total ?? 0)) return rows
      }
    },
  })
}
