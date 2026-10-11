const relative = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

/** "Last used 2 hours ago", or null for a login never filled into a page. */
export function lastUsedLabel(at: string | null | undefined, now = Date.now()): string | null {
  if (!at) return null

  const minutes = Math.floor((now - Date.parse(at)) / 60_000)
  if (minutes < 1) return 'Last used just now'
  if (minutes < 60) return `Last used ${relative.format(-minutes, 'minute')}`
  if (minutes < 60 * 24) return `Last used ${relative.format(-Math.floor(minutes / 60), 'hour')}`
  return `Last used ${relative.format(-Math.floor(minutes / (60 * 24)), 'day')}`
}
