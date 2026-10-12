import { importVaultMaterial, type VaultKeys, type VaultMaterial } from '@/lib/crypto/vault'

// The unlocked vault keys. A popup lives only while it is open, so the keys
// are kept in chrome.storage.session between openings: it is held in memory,
// never written to disk, cleared when the browser closes, and not readable by
// web pages or content scripts.

/** Keep in sync with src/background.ts. */
const VAULT_SESSION_KEY = 'vault'
const AUTO_LOCK_ALARM = 'auto-lock'

/** Minutes without opening the popup after which the vault locks itself. */
export const AUTO_LOCK_MINUTES = 15

/** Store the unlocked keys and (re)start the auto-lock countdown. */
export async function storeVault(material: VaultMaterial): Promise<void> {
  await chrome.storage.session.set({ [VAULT_SESSION_KEY]: material })
  await touchVault()
}

/** The unlocked keys, or null while the vault is locked. */
export async function loadVault(): Promise<VaultKeys | null> {
  const stored = await chrome.storage.session.get(VAULT_SESSION_KEY)
  const material = stored[VAULT_SESSION_KEY] as VaultMaterial | undefined
  if (!material) return null

  await touchVault()
  return importVaultMaterial(material)
}

/** Using the vault pushes the auto-lock back. */
async function touchVault(): Promise<void> {
  await chrome.alarms.create(AUTO_LOCK_ALARM, { delayInMinutes: AUTO_LOCK_MINUTES })
}

export async function lockVault(): Promise<void> {
  await chrome.storage.session.remove(VAULT_SESSION_KEY)
  await chrome.alarms.clear(AUTO_LOCK_ALARM)
}

/** A login a page just submitted, held by src/background.ts for the save prompt. */
export interface PendingLogin {
  username: string
  password: string
  /** Origin of the page it was typed into. */
  url: string
}

/**
 * The key a tab's pending login is stored under, and the name of the alarm
 * that drops it. Keep both in sync with src/background.ts.
 */
const pendingKey = (tabId: number) => `pending:${tabId}`
const PENDING_TTL_MINUTES = 5

export async function pendingLogin(tabId: number): Promise<PendingLogin | null> {
  const stored = await chrome.storage.session.get(pendingKey(tabId))
  return (stored[pendingKey(tabId)] as PendingLogin | undefined) ?? null
}

/** Hold a login for the save prompt, as the background script does. */
export async function storePendingLogin(tabId: number, login: PendingLogin): Promise<void> {
  await chrome.storage.session.set({ [pendingKey(tabId)]: { ...login, at: Date.now() } })
  await chrome.alarms.create(pendingKey(tabId), { delayInMinutes: PENDING_TTL_MINUTES })
}

export async function clearPendingLogin(tabId: number): Promise<void> {
  await chrome.storage.session.remove(pendingKey(tabId))
  await chrome.alarms.clear(pendingKey(tabId))
}
