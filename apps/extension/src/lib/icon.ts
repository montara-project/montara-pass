import { hostOf } from './site'

// A login keeps the icon of its site inside its encrypted content, so every
// client can show it without asking anyone. The icon is fetched here, once,
// when the login is saved: only an extension page may read another site.

/** Drawn at this size, then smaller if the PNG comes out too heavy. */
const SIZES = [64, 32]
/** Characters of data URL; an item's whole content is capped at 64 KiB. */
const MAX_LENGTH = 24_000
/** For the whole search, so a dead site does not hold up a save. */
const TIMEOUT_MS = 5000

async function get(url: string, signal: AbortSignal): Promise<Response | null> {
  try {
    // No cookies and no referrer: the site learns nothing but the request.
    const res = await fetch(url, { credentials: 'omit', referrerPolicy: 'no-referrer', signal })
    return res.ok ? res : null
  } catch {
    return null
  }
}

/** The image redrawn as a small PNG, which also drops anything it carried. */
async function toPng(blob: Blob): Promise<string | null> {
  const src = URL.createObjectURL(blob)
  try {
    const img = new Image()
    img.src = src
    await img.decode()
    // Some servers answer a missing icon with a 1×1 image.
    if (img.naturalWidth <= 1) return null

    for (const size of SIZES) {
      const canvas = document.createElement('canvas')
      canvas.width = canvas.height = size
      canvas.getContext('2d')!.drawImage(img, 0, 0, size, size)
      const png = canvas.toDataURL('image/png')
      if (png.length <= MAX_LENGTH) return png
    }
    return null
  } catch {
    return null
  } finally {
    URL.revokeObjectURL(src)
  }
}

/** The icons a page names in its head, largest claim first. */
async function linkedIcons(origin: string, signal: AbortSignal): Promise<string[]> {
  const res = await get(origin, signal)
  if (!res || !res.headers.get('content-type')?.includes('html')) return []

  try {
    const page = new DOMParser().parseFromString(await res.text(), 'text/html')
    return Array.from(page.querySelectorAll<HTMLLinkElement>('link[rel~="icon" i][href]'))
      .sort((a, b) => (parseInt(b.sizes.value) || 0) - (parseInt(a.sizes.value) || 0))
      .map((link) => new URL(link.getAttribute('href')!, res.url).href)
      .filter((href) => href.startsWith('http'))
  } catch {
    return []
  }
}

/**
 * The icon of a site as a PNG data URL, or '' when it has none that could be
 * read. '' is saved too: it says the site was asked, so it is not asked again.
 *
 * @param hint an icon address already known, such as the tab's own
 */
export async function fetchIcon(siteUrl: string | undefined, hint?: string): Promise<string> {
  if (!hostOf(siteUrl)) return ''

  const origin = new URL(siteUrl!.includes('://') ? siteUrl! : `https://${siteUrl}`).origin
  const signal = AbortSignal.timeout(TIMEOUT_MS)

  const tryAll = async (urls: (string | undefined)[]) => {
    for (const url of urls) {
      if (!url?.startsWith('http')) continue
      const res = await get(url, signal)
      const png = res && (await toPng(await res.blob()))
      if (png) return png
    }
    return ''
  }

  return (
    (await tryAll([hint, `${origin}/favicon.ico`])) ||
    (await tryAll(await linkedIcons(origin, signal)))
  )
}
