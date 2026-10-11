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
 * Whether a saved login belongs on the page being shown. Fill is only offered
 * for a match, so a look-alike domain cannot be handed the real site's
 * password with one click. The saved host must equal the page's host or be a
 * parent of it: a login saved for example.com also fits login.example.com,
 * but not the other way round and not example.com.evil.net.
 */
export function matchesSite(savedUrl: string | undefined, pageUrl: string | undefined): boolean {
  const saved = hostOf(savedUrl)
  const page = hostOf(pageUrl)
  if (!saved || !page) return false

  const strip = (host: string) => host.replace(/^www\./, '')
  const savedHost = strip(saved)
  const pageHost = strip(page)

  return pageHost === savedHost || pageHost.endsWith(`.${savedHost}`)
}
