import { AUTH_STORAGE_KEYS } from '../constants/auth'

const isBrowser = typeof window !== 'undefined'

// The API issues 15-minute access tokens and 24-hour refresh tokens.
const DEFAULT_ACCESS_TOKEN_MAX_AGE = 15 * 60
const REFRESH_TOKEN_MAX_AGE = 60 * 60 * 24

export interface AuthTokens {
  accessToken: string
  refreshToken?: string
}

function writeCookie(name: string, value: string, maxAgeSeconds: number) {
  if (!isBrowser) return

  const secure = window.location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax${secure}`
}

function readCookie(name: string): string | null {
  if (!isBrowser) return null

  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

function removeCookie(name: string) {
  if (!isBrowser) return

  document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`
}

/**
 * Seconds until a JWT expires, read from its `exp` claim. The refresh endpoint
 * returns no `expires_in`, so the token itself is the one source every caller
 * can rely on.
 */
function secondsUntilExpiry(jwt: string): number {
  try {
    const payload = jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const { exp } = JSON.parse(atob(payload)) as { exp?: number }
    const seconds = Math.floor((exp ?? 0) - Date.now() / 1000)
    return seconds > 0 ? seconds : DEFAULT_ACCESS_TOKEN_MAX_AGE
  } catch {
    return DEFAULT_ACCESS_TOKEN_MAX_AGE
  }
}

/**
 * Persist backend-issued auth tokens in cookies. The axios interceptor in
 * `client-fetch.ts` reads the access token from here and sends it as a Bearer
 * header, which is what lets the UI talk to an API on another origin.
 */
export function setAuthTokens({ accessToken, refreshToken }: AuthTokens) {
  writeCookie(AUTH_STORAGE_KEYS.ACCESS_TOKEN, accessToken, secondsUntilExpiry(accessToken))

  if (refreshToken) {
    writeCookie(AUTH_STORAGE_KEYS.REFRESH_TOKEN, refreshToken, REFRESH_TOKEN_MAX_AGE)
  }
}

/**
 * Read the backend-issued access token from cookies (client-side).
 */
export function getStoredAccessToken(): string | null {
  return readCookie(AUTH_STORAGE_KEYS.ACCESS_TOKEN)
}

/**
 * Read the backend-issued refresh token from cookies (client-side).
 */
export function getStoredRefreshToken(): string | null {
  return readCookie(AUTH_STORAGE_KEYS.REFRESH_TOKEN)
}

/** True when a token that can still produce a session is stored. */
export function hasStoredSession(): boolean {
  return Boolean(getStoredAccessToken() || getStoredRefreshToken())
}

/**
 * Remove all backend-issued auth tokens from cookies.
 */
export function clearAuthTokens() {
  removeCookie(AUTH_STORAGE_KEYS.ACCESS_TOKEN)
  removeCookie(AUTH_STORAGE_KEYS.REFRESH_TOKEN)
}
