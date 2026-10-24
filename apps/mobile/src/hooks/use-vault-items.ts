import type { VaultKeys } from '@montara-pass/shared/crypto/vault'
import type { VaultItem } from '@montara-pass/shared/types/vault'

import { decryptItem } from '@montara-pass/shared/crypto/vault'
import { errorMessage } from '@montara-pass/shared/string'
import { useCallback, useEffect, useState } from 'react'

import { listItems } from '@/lib/api'

/**
 * The decrypted vault, shared by the screens: every item with its secret, or
 * a null secret where it could not be decrypted.
 */
export function useVaultItems(keys: VaultKeys | null) {
  const [items, setItems] = useState<VaultItem[] | null>(null)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!keys) return

    try {
      const encrypted = await listItems()
      const decrypted = await Promise.all(
        encrypted.map(async (item) => ({
          ...item,
          secret: await decryptItem(keys, item).catch(() => null),
        }))
      )
      setItems(decrypted)
      setError('')
    } catch (err) {
      setError(errorMessage(err, 'Could not load your vault'))
    }
  }, [keys])

  useEffect(() => {
    void load()
  }, [load])

  return { items, error, load }
}
