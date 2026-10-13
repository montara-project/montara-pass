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
 * share is nobody's parent: a login saved on github.io stays there. A page served
 * over plain http gets only logins saved for http: anyone on the network can
 * put such a page in front of the user. localhost is the exception.
 */
export function matchesSite(savedUrl: string | undefined, pageUrl: string | undefined): boolean {
  const saved = hostOf(savedUrl)
  const page = hostOf(pageUrl)
  if (!saved || !page) return false
  if (isPlainHttp(pageUrl) && !isPlainHttp(savedUrl) && page !== 'localhost') return false

  const strip = (host: string) => host.replace(/^www\./, '')
  const savedHost = strip(saved)
  const pageHost = strip(page)

  if (pageHost === savedHost) return true
  return pageHost.endsWith(`.${savedHost}`) && !!getDomain(savedHost, { allowPrivateDomains: true })
}
