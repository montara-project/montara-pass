// What a list shows of a username: masked, so a glance over the shoulder does
// not take the account name with it. The item's detail shows it in full on
// request, and copying always takes the whole value.

/** A run of four, whatever the length: the mask does not tell how long it was. */
const MASK = '••••'

/** The start a masked name keeps: two characters, one when it is short. */
const start = (name: string) => name.slice(0, name.length > 3 ? 2 : 1)

/**
 * The username as a list shows it, enough to tell one account from another.
 * An email address keeps the start of its local part and its domain:
 * "user@mail.com" becomes "us••••@mail.com". Any other username keeps its
 * start: "9router" becomes "9r••••".
 */
export function maskUsername(value: string): string {
  if (!value) return value

  const at = value.lastIndexOf('@')
  const domain = value.slice(at + 1)
  const isEmail = at > 0 && domain.includes('.') && !/\s/.test(value)
  return isEmail ? `${start(value.slice(0, at))}${MASK}@${domain}` : `${start(value)}${MASK}`
}
