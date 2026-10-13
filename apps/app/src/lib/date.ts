type DateLike = Date | string | number | null | undefined

// en-GB writes a date as dd/MM/yyyy.
const date = new Intl.DateTimeFormat('en-GB', { dateStyle: 'short' })
const dateTime = new Intl.DateTimeFormat('en-GB', { dateStyle: 'short', timeStyle: 'medium' })

/** The date, or null for none and for one that cannot be read: formatting that would throw. */
const parse = (value: DateLike) => {
  const parsed = value ? new Date(value) : null
  return parsed && Number.isFinite(parsed.getTime()) ? parsed : null
}

/** dd/MM/yyyy, or '-' for no date. */
export function formatDate(value: DateLike): string {
  const parsed = parse(value)
  return parsed ? date.format(parsed) : '-'
}

/** dd/MM/yyyy, HH:mm:ss, or '-' for no date. */
export function formatDateTime(value: DateLike): string {
  const parsed = parse(value)
  return parsed ? dateTime.format(parsed) : '-'
}
