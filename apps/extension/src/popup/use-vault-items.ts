import type { VaultItem } from '@montara-pass/shared/types/vault'

import {
  decryptFolderName,
  decryptItem,
  encryptItemUpdate,
  matchesSearch,
  type VaultKeys,
} from '@montara-pass/shared/crypto/vault'
import { errorMessage } from '@montara-pass/shared/string'
import { useCallback, useEffect, useState } from 'react'

import type { FolderOption } from './views/item-form'

import { getProfile, listFolders, listItems, SignedOutError, updateItem } from '../lib/api'
import { copySecret } from '../lib/clipboard'
import { fetchIcon } from '../lib/icon'
import { hostOf } from '../lib/origin'

export interface VaultUser {
  name: string
  email: string
}

/** The user's folders by name. They are made in the web app; here items are only filed in them. */
export function useFolders(keys: VaultKeys): FolderOption[] {
  const [folders, setFolders] = useState<FolderOption[]>([])

  useEffect(() => {
    void listFolders()
      .then((rows) =>
        Promise.all(
          rows.map(async (folder) => ({
            id: folder.id,
            name: await decryptFolderName(keys, folder.encrypted_name).catch(() => '(unreadable)'),
          }))
        )
      )
      .then((rows) => setFolders(rows.sort((a, b) => a.name.localeCompare(b.name))))
      // Everything still works without them: there is just no folder to pick.
      .catch(() => undefined)
  }, [keys])

  return folders
}

/**
 * The decrypted vault and who it belongs to, shared by the popup and the
 * full-screen view.
 *
 * @param onSignedOut called when the session turns out to have ended
 */
export function useVaultItems(keys: VaultKeys, onSignedOut: () => void) {
  const [items, setItems] = useState<VaultItem[] | null>(null)
  const [user, setUser] = useState<VaultUser | null>(null)
  const [error, setError] = useState('')

  // Logins saved before icons were kept, or in the web app, which cannot read
  // another site. Only the user's own: a shared login names a site somebody
  // else chose, and fetching it would be calling where they point.
  const addMissingIcons = useCallback(
    async (list: VaultItem[]) => {
      for (const item of list) {
        const { secret } = item
        if (item.type !== 'login' || item.role !== 'owner') continue
        if (!secret || secret.icon !== undefined || !hostOf(secret.url)) continue

        const withIcon = { ...secret, icon: await fetchIcon(secret.url) }
        try {
          const saved = await updateItem(item.id, {
            encrypted_data: await encryptItemUpdate(keys, item, withIcon),
            revision: item.revision,
          })
          setItems(
            (current) =>
              current?.map((i) => (i.id === item.id ? { ...saved, secret: withIcon } : i)) ?? null
          )
        } catch {
          // Changed somewhere else, or offline: the next load tries again.
        }
      }
    },
    [keys]
  )

  const load = useCallback(async () => {
    setError('')

    try {
      const encrypted = await listItems()
      const decrypted = await Promise.all(
        encrypted.map(async (item) => ({
          ...item,
          secret: await decryptItem(keys, item).catch(() => null),
        }))
      )
      setItems(decrypted)
      void addMissingIcons(decrypted)
    } catch (err) {
      if (err instanceof SignedOutError) {
        onSignedOut()
        return
      }
      setError(errorMessage(err, 'Could not load your vault'))
    }
  }, [keys, onSignedOut, addMissingIcons])

  useEffect(() => {
    void load()
    // Only decorates the header, so a failure here is not worth reporting.
    void getProfile()
      .then((profile) => setUser({ name: profile.user.name, email: profile.user.email }))
      .catch(() => undefined)
  }, [load])

  return { items, user, error, load }
}

export type Sort = 'name' | 'updated'

export const SORT_LABEL: Record<Sort, string> = {
  name: 'Sort by name',
  updated: 'Sort by last updated',
}

/** The readable items a list shows for a search, in the chosen order. */
export function searchAndSort(items: VaultItem[], search: string, sort: Sort) {
  const term = search.trim().toLowerCase()
  return items
    .filter((item) => matchesSearch(item.secret, term))
    .sort((a, b) =>
      sort === 'updated'
        ? b.updated_at.localeCompare(a.updated_at)
        : a.secret!.name.localeCompare(b.secret!.name)
    )
}

/**
 * What the popup and the full-screen view do to their items, and the notice
 * that says how it went: a refresh, a change to the vault, and a copy.
 */
export function useVaultActions(load: () => Promise<void>, onSignedOut: () => void) {
  const [notice, setNotice] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  // A notice says what just happened, then gets out of the way.
  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(''), 2500)
    return () => clearTimeout(timer)
  }, [notice])

  const refresh = async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  /** Runs a choice that changes the vault, then says how it went. */
  const act = async (change: () => Promise<void>, done: string) => {
    try {
      await change()
      setNotice(done)
      await load()
    } catch (err) {
      if (err instanceof SignedOutError) onSignedOut()
      else setNotice(errorMessage(err, 'That did not work'))
    }
  }

  const copy = async (value: string | undefined, label: string) => {
    if (!value) {
      setNotice(`This item has no ${label}`)
      return
    }
    await copySecret(value)
    setNotice(`${label[0].toUpperCase()}${label.slice(1)} copied`)
  }

  return { notice, setNotice, refreshing, refresh, act, copy }
}
