import { create } from 'zustand'

import type { VaultKeys } from '@/lib/crypto/vault'

interface VaultStore {
  /** The unlocked keys, or null while the vault is locked. */
  keys: VaultKeys | null
  unlock: (keys: VaultKeys) => void
  lock: () => void
}

/**
 * The unlocked vault keys. Deliberately not persisted: a reload or a new tab
 * starts locked and asks for the master password again.
 */
export const useVaultStore = create<VaultStore>()((set) => ({
  keys: null,
  unlock: (keys) => set({ keys }),
  lock: () => set({ keys: null }),
}))
