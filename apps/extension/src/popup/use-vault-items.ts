import { useCallback, useEffect, useState } from 'react'

import type { VaultItem } from '@/types/vault'

import { decryptItem, encryptItemUpdate, type VaultKeys } from '@/lib/crypto/vault'

import { getProfile, listItems, SignedOutError, updateItem } from '../lib/api'
import { fetchIcon } from '../lib/icon'
import { hostOf } from '../lib/site'

export interface VaultUser {
  name: string
  email: string
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
      setError(err instanceof Error ? err.message : 'Could not load your vault')
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
