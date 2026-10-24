import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'

// Where the API is, and the session tokens. Nothing here can decrypt the
// vault: tokens sit in the Keychain/Keystore, and the unlocked keys live in
// memory only (lib/vault-store.ts). expo-secure-store ships no web
// implementation, so the browser keeps them in local storage — the same
// trust level as the extension's chrome.storage.local.

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8080'

/** The web app, for what only it does: sign-up and the password reset. */
export const APP_URL = process.env.EXPO_PUBLIC_APP_URL ?? 'http://localhost:5173'

export interface Tokens {
  accessToken: string
  refreshToken: string
}

const TOKENS_KEY = 'tokens'

const webStorage = {
  async getItem(key: string): Promise<string | null> {
    return localStorage.getItem(key)
  },
  async setItem(key: string, value: string): Promise<void> {
    localStorage.setItem(key, value)
  },
  async removeItem(key: string): Promise<void> {
    localStorage.removeItem(key)
  },
}

const nativeStorage = {
  async getItem(key: string): Promise<string | null> {
    return SecureStore.getItemAsync(key)
  },
  async setItem(key: string, value: string): Promise<void> {
    await SecureStore.setItemAsync(key, value)
  },
  async removeItem(key: string): Promise<void> {
    await SecureStore.deleteItemAsync(key)
  },
}

const storage = Platform.OS === 'web' ? webStorage : nativeStorage

export async function getTokens(): Promise<Tokens | null> {
  const stored = await storage.getItem(TOKENS_KEY)
  return stored ? (JSON.parse(stored) as Tokens) : null
}

export async function saveTokens(tokens: Tokens): Promise<void> {
  await storage.setItem(TOKENS_KEY, JSON.stringify(tokens))
}

export async function clearTokens(): Promise<void> {
  await storage.removeItem(TOKENS_KEY)
}
