import { create } from 'zustand'

import type { VaultKeys } from '@/lib/crypto/vault'

interface VaultStore {
  /** The unlocked keys, or null while the vault is locked. */
  keys: VaultKeys | null
  unlock: (keys: VaultKeys) => void
  lock: () => void
}

/** Minutes without a click or a key after which the vault locks itself. */
export const AUTO_LOCK_MINUTES = 15

/**
 * The unlocked vault keys. Deliberately not persisted: a reload or a new tab
 * starts locked and asks for the master password again. Left unlocked and
 * unused, it locks itself.
 */
export const useVaultStore = create<VaultStore>()((set) => ({
  keys: null,
  unlock: (keys) => set({ keys }),
  lock: () => set({ keys: null }),
}))

let autoLock: ReturnType<typeof setTimeout> | undefined
let lockAt = 0

function restartAutoLock() {
  clearTimeout(autoLock)
  if (!useVaultStore.getState().keys) {
    lockAt = 0
    return
  }
  // The deadline passed while the timer could not run (the computer slept):
  // the click that would push it back locks the vault instead.
  if (lockAt !== 0 && Date.now() >= lockAt) {
    useVaultStore.getState().lock()
    return
  }

  lockAt = Date.now() + AUTO_LOCK_MINUTES * 60_000
  autoLock = setTimeout(() => useVaultStore.getState().lock(), AUTO_LOCK_MINUTES * 60_000)
}

if (typeof window !== 'undefined') {
  useVaultStore.subscribe(restartAutoLock)
  for (const event of ['pointerdown', 'keydown']) {
    window.addEventListener(event, restartAutoLock, { capture: true, passive: true })
  }
  // A timer does not run while the computer sleeps, so the clock is asked
  // again when the tab is looked at.
  document.addEventListener('visibilitychange', () => {
    if (useVaultStore.getState().keys && Date.now() >= lockAt) useVaultStore.getState().lock()
  })
}
