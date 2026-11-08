// Addresses, apart from lib/site.ts: signing in and the full-screen vault need
// these, and not the public suffix list that matching a login to a page loads.

/** The hostname of a URL, or null for anything that is not http(s). */
export function hostOf(url: string | undefined): string | null {
  if (!url) return null

  try {
    const parsed = new URL(url.includes('://') ? url : `https://${url}`)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.hostname : null
  } catch {
    return null
  }
}

/**
 * Whether a hostname is this machine itself: localhost, *.localhost, 127.x.x.x
 * or [::1]. What is sent there never reaches the network.
 */
export function isLoopback(hostname: string): boolean {
  return (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname === '[::1]' ||
    /^127(\.\d{1,3}){3}$/.test(hostname)
  )
}

/**
 * Whether the extension may talk to a server at origin. A release build does
 * over https only: the account password, the session tokens and TOTP codes
 * cross the network. The exception is a server on this machine (a local
 * self-hosted one), over http too. A development build talks to any http.
 */
export function serverAllowed(origin: string): boolean {
  if (import.meta.env.MODE === 'development' || origin.startsWith('https:')) return true
  return isLoopback(hostOf(origin) ?? '')
}

/** The origin of an http(s) URL, or null for anything else. */
export function originOf(value: string | undefined): string | null {
  try {
    const url = new URL((value ?? '').trim())
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.origin : null
  } catch {
    return null
  }
}
