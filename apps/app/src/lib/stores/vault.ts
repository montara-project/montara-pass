import type { VaultKeys } from '@montara-pass/shared/crypto/vault'

import { useSyncExternalStore } from 'react'

interface VaultStore {
  /** The unlocked keys, or null while the vault is locked. */
  keys: VaultKeys | null
  unlock: (keys: VaultKeys) => void
  lock: () => void
}

/** Minutes without a click or a key after which the vault locks itself. */
export const AUTO_LOCK_MINUTES = 15

const listeners = new Set<() => void>()

const state: VaultStore = {
  keys: null,
  unlock: (keys) => setKeys(keys),
  lock: () => setKeys(null),
}

// How many times the vault has locked: an unlock begun before the last lock
// is stale.
let locks = 0

function setKeys(keys: VaultKeys | null) {
  if (!keys) locks++
  state.keys = keys
  for (const listener of listeners) listener()
}

/**
 * Begins an unlock that takes a while (a key derivation, a passkey prompt) and
 * answers how to finish it: with the keys, unless the vault locked meanwhile,
 * by signing out or the auto-lock. Then the keys are dropped, not restored.
 */
export function startUnlock(): (keys: VaultKeys) => void {
  const begun = locks
  return (keys) => {
    if (locks === begun) setKeys(keys)
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/**
 * The unlocked vault keys. Deliberately not persisted: a reload or a new tab
 * starts locked and asks for the master password again. Left unlocked and
 * unused, it locks itself.
 */
export function useVaultStore<T>(selector: (state: VaultStore) => T): T {
  return useSyncExternalStore(subscribe, () => selector(state))
}
useVaultStore.getState = () => state

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
  subscribe(restartAutoLock)
  for (const event of ['pointerdown', 'keydown']) {
    window.addEventListener(event, restartAutoLock, { capture: true, passive: true })
  }
  // A timer does not run while the computer sleeps, so the clock is asked
  // again when the tab is looked at.
  document.addEventListener('visibilitychange', () => {
    if (useVaultStore.getState().keys && Date.now() >= lockAt) useVaultStore.getState().lock()
  })
}
