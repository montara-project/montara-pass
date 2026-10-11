const relative = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

/** "2 hours ago", or null for a login never filled into a page, or a date that cannot be read. */
export function lastUsedAgo(at: string | null | undefined, now = Date.now()): string | null {
  if (!at) return null

  const then = Date.parse(at)
  // Not a date: formatting it would throw.
  if (!Number.isFinite(then)) return null

  const minutes = Math.floor((now - then) / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return relative.format(-minutes, 'minute')
  if (minutes < 60 * 24) return relative.format(-Math.floor(minutes / 60), 'hour')
  return relative.format(-Math.floor(minutes / (60 * 24)), 'day')
}

/** "Last used 2 hours ago", or null for a login never filled into a page. */
export function lastUsedLabel(at: string | null | undefined, now = Date.now()): string | null {
  const ago = lastUsedAgo(at, now)
  return ago && `Last used ${ago}`
}
