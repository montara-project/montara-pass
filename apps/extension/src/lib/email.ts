// What a list shows of a username: an email address is masked, so a glance
// over the shoulder does not take the address with it. The rest stays as it is.

/** A run of four, whatever the length: the mask does not tell how long it was. */
const MASK = '••••'

/**
 * The username as a list shows it. An email address keeps the start of its
 * local part (two characters, one when it is short) and its domain, which is
 * enough to tell one account from another: "user@mail.com" becomes
 * "us••••@mail.com". Anything that is not an email address comes back whole.
 */
export function maskEmail(value: string): string {
  const at = value.lastIndexOf('@')
  const local = value.slice(0, at)
  const domain = value.slice(at + 1)
  if (at <= 0 || !domain.includes('.') || /\s/.test(value)) return value

  const keep = local.length > 3 ? 2 : 1
  return `${local.slice(0, keep)}${MASK}@${domain}`
}
