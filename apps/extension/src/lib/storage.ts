// What the extension keeps on disk (chrome.storage.local): where the API is
// and the session tokens. Nothing here can decrypt the vault.

export interface Settings {
  /** Origin of the Go API (apps/server). */
  apiUrl: string
  /** Origin of the web app, for the links the popup cannot handle itself. */
  appUrl: string
}

export interface Tokens {
  accessToken: string
  refreshToken: string
}

export const DEFAULT_SETTINGS: Settings = {
  apiUrl: import.meta.env.VITE_DEFAULT_API_URL,
  appUrl: import.meta.env.VITE_DEFAULT_APP_URL,
}

const SETTINGS_KEY = 'settings'
const TOKENS_KEY = 'tokens'
/** Set by the background script: the version waiting to be installed. */
export const UPDATE_KEY = 'update'

export async function getSettings(): Promise<Settings> {
  const stored = await chrome.storage.local.get(SETTINGS_KEY)
  return { ...DEFAULT_SETTINGS, ...(stored[SETTINGS_KEY] as Partial<Settings> | undefined) }
}

export async function saveSettings(settings: Settings): Promise<void> {
  await chrome.storage.local.set({ [SETTINGS_KEY]: settings })
}

export async function getTokens(): Promise<Tokens | null> {
  const stored = await chrome.storage.local.get(TOKENS_KEY)
  return (stored[TOKENS_KEY] as Tokens | undefined) ?? null
}

export async function saveTokens(tokens: Tokens): Promise<void> {
  await chrome.storage.local.set({ [TOKENS_KEY]: tokens })
}

export async function clearTokens(): Promise<void> {
  await chrome.storage.local.remove(TOKENS_KEY)
}
