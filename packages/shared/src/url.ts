// Saved addresses, read the same way by the web app and the extension.

/** A saved address as a link, or null for anything that is not http(s). */
export function linkOf(url: string | undefined): string | null {
  if (!url) return null

  try {
    const href = url.includes('://') ? url : `https://${url}`
    const { protocol } = new URL(href)
    return protocol === 'http:' || protocol === 'https:' ? href : null
  } catch {
    return null
  }
}
