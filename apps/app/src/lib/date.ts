type DateLike = Date | string | number | null | undefined

// en-GB writes a date as dd/MM/yyyy.
const date = new Intl.DateTimeFormat('en-GB', { dateStyle: 'short' })
const dateTime = new Intl.DateTimeFormat('en-GB', { dateStyle: 'short', timeStyle: 'medium' })

/** dd/MM/yyyy, or '-' for no date. */
export function formatDate(value: DateLike): string {
  return value ? date.format(new Date(value)) : '-'
}

/** dd/MM/yyyy, HH:mm:ss, or '-' for no date. */
export function formatDateTime(value: DateLike): string {
  return value ? dateTime.format(new Date(value)) : '-'
}
