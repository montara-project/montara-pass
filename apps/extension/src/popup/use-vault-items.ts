import { useCallback, useEffect, useState } from 'react'

import type { VaultItem } from '@/types/vault'

import { decryptItem, type VaultKeys } from '@/lib/crypto/vault'

import { getProfile, listItems, SignedOutError } from '../lib/api'

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

  const load = useCallback(async () => {
    setError('')

    try {
      const encrypted = await listItems()
      setItems(
        await Promise.all(
          encrypted.map(async (item) => ({
            ...item,
            secret: await decryptItem(keys, item).catch(() => null),
          }))
        )
      )
    } catch (err) {
      if (err instanceof SignedOutError) {
        onSignedOut()
        return
      }
      setError(err instanceof Error ? err.message : 'Could not load your vault')
    }
  }, [keys, onSignedOut])

  useEffect(() => {
    void load()
    // Only decorates the header, so a failure here is not worth reporting.
    void getProfile()
      .then((profile) => setUser({ name: profile.user.name, email: profile.user.email }))
      .catch(() => undefined)
  }, [load])

  return { items, user, error, load }
}
