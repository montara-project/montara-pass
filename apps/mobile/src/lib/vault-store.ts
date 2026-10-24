import {
  importVaultMaterial,
  type VaultKeys,
  type VaultMaterial,
} from '@montara-pass/shared/crypto/vault'

// The unlocked vault keys. Like the extension's popup (apps/extension/src/lib/session.ts),
// they are held in memory only: never written to disk, gone when the app dies.
// Using the vault pushes a 15-minute auto-lock back.

const AUTO_LOCK_MINUTES = 15

let keys: VaultKeys | null = null
let timer: ReturnType<typeof setTimeout> | null = null
const listeners = new Set<() => void>()

function emit() {
  for (const listener of listeners) {
    listener()
  }
}

/** Push the auto-lock back. */
function touch() {
  if (timer) {
    clearTimeout(timer)
  }
  timer = setTimeout(() => {
    keys = null
    timer = null
    emit()
  }, AUTO_LOCK_MINUTES * 60_000)
}

export const vaultStore = {
  get: () => keys,
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
  async unlock(material: VaultMaterial) {
    keys = await importVaultMaterial(material)
    touch()
    emit()
  },
  lock() {
    keys = null
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    emit()
  },
}
