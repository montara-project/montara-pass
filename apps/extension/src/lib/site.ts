import { getDomain } from 'tldts'

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

/** The origin of an http(s) URL, or null for anything else. */
export function originOf(value: string | undefined): string | null {
  try {
    const url = new URL((value ?? '').trim())
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.origin : null
  } catch {
    return null
  }
}

/** Whether a URL is plain http. An address saved without a scheme is https. */
const isPlainHttp = (url: string | undefined) => /^http:\/\//i.test(url ?? '')

/**
 * Whether a saved login belongs on the page being shown. Fill is only offered
 * for a match, so a look-alike domain cannot be handed the real site's
 * password with one click. The saved host must equal the page's host or be a
 * parent of it: a login saved for example.com also fits login.example.com,
 * but not the other way round and not example.com.evil.net. A suffix many
 * share is nobody's parent: a login saved on github.io stays there, and is not
 * www.github.io's either, which is somebody else's site. A page served
 * over plain http gets only logins saved for http: anyone on the network can
 * put such a page in front of the user. localhost is the exception.
 */
export function matchesSite(savedUrl: string | undefined, pageUrl: string | undefined): boolean {
  const saved = hostOf(savedUrl)
  const page = hostOf(pageUrl)
  if (!saved || !page) return false
  if (isPlainHttp(pageUrl) && !isPlainHttp(savedUrl) && page !== 'localhost') return false

  const owned = (host: string) => !!getDomain(host, { allowPrivateDomains: true })
  // www is another name for a site only where the name without it is one.
  const strip = (host: string) => {
    const bare = host.replace(/^www\./, '')
    return owned(bare) ? bare : host
  }
  const savedHost = strip(saved)
  const pageHost = strip(page)

  if (pageHost === savedHost) return true
  return pageHost.endsWith(`.${savedHost}`) && owned(savedHost)
}

/**
 * Whether a saved login is one to fill into the page: it belongs there, and
 * has something to type. A login that holds only a passkey has no password to
 * fill; it signs in through the passkey prompt instead.
 */
export function fillsSite(
  secret: { url?: string; password?: string; passkey?: unknown } | null | undefined,
  pageUrl: string | undefined
): boolean {
  if (!secret || (secret.passkey && !secret.password)) return false
  return matchesSite(secret.url, pageUrl)
}
