import type { ItemListParams } from '@montara-pass/shared/api/dtos/vault/schema'
import type { VaultFolder, VaultItem } from '@montara-pass/shared/types/vault'

import { decryptFolderName, decryptItem, type VaultKeys } from '@montara-pass/shared/crypto/vault'
import { useInfiniteQuery, useQueries, useQuery } from '@tanstack/react-query'

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
        res.data.map(async (folder) => ({
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
        res.data.map(async (item) => ({
          ...item,
          secret: await decryptItem(keys, item).catch(() => null),
        }))
      )
      return { ...res, data }
    },
  })
}

/**
 * The vault as a list that grows: one decrypted page of `limit` items at a
 * time, the next asked for as the list nears its end. Filtered on the server
 * by folder, type and favorite, like `useItems`.
 */
export function useInfiniteItems(params: Omit<ItemListParams, 'offset'>) {
  const keys = useVaultKeys()

  return useInfiniteQuery({
    // Under the items key, so saving or trashing an item refreshes it.
    queryKey: [...LIST_ITEM_QUERY_KEY(params), 'infinite', 'decrypted'],
    initialPageParam: 0,
    queryFn: async ({ pageParam }): Promise<ApiListResponse<VaultItem>> => {
      const res = await services.items.list({ ...params, offset: pageParam })

      const data = await Promise.all(
        res.data.map(async (item) => ({
          ...item,
          secret: await decryptItem(keys, item).catch(() => null),
        }))
      )
      return { ...res, data }
    },
    // The next page starts where the rows so far end, until the total is in.
    getNextPageParam: (last, pages) => {
      const loaded = pages.reduce((sum, page) => sum + page.data.length, 0)
      return last.data.length > 0 && loaded < (last.metadata?.total ?? 0) ? loaded : undefined
    },
  })
}

/**
 * The items that are shared, either way, each with everyone who can open it,
 * decrypted. Under the items key, so a share or a removal refreshes it.
 */
export function useSharedItems() {
  const keys = useVaultKeys()

  return useQuery({
    queryKey: [ITEM_QUERY_KEY, 'sharing', 'decrypted'],
    queryFn: async () => {
      const res = await services.items.shared()
      return Promise.all(
        res.data.map(async (item) => ({
          ...item,
          secret: await decryptItem(keys, item).catch(() => null),
        }))
      )
    },
  })
}

/**
 * How many live items match each filter, from the server's totals alone: one
 * item is asked for and none is decrypted. Under the items key, so saving or
 * trashing an item recounts.
 */
export function useItemTotals(filters: readonly ItemListParams[]) {
  return useQueries({
    queries: filters.map((filter) => ({
      queryKey: [...LIST_ITEM_QUERY_KEY({ ...filter, limit: 1 }), 'total'],
      queryFn: async () => (await services.items.list({ ...filter, limit: 1 })).metadata?.total,
    })),
  }).map((result) => result.data)
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
      const first = await services.items.list({ limit: PAGE_SIZE, offset: 0 })
      const total = first.metadata.total ?? first.data.length
      const offsets: number[] = []
      for (let offset = PAGE_SIZE; offset < total; offset += PAGE_SIZE) offsets.push(offset)
      const rest = await Promise.all(
        offsets.map(async (offset) => {
          const page = await services.items.list({ limit: PAGE_SIZE, offset })
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
