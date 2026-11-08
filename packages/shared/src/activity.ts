import type { Activity, ActivityUser } from './api/models/activity'

// How a row of the activity log reads, the same in the web app and the
// extension. Self-contained (type imports only), so its check runs in Node.

/** An item the vault no longer holds, or never let the reader see, by its type. */
const SOME_ITEM: Record<string, string> = {
  login: 'a login',
  secure_note: 'a secure note',
  card: 'a card',
  contact: 'a contact',
}

/**
 * The row as a sentence, such as "You shared GitHub with Ana as viewer".
 *
 * @param meId the reader's user id: they are "You" and "you"
 * @param itemName the item's name from the reader's decrypted vault, if it is there
 */
export function describeActivity(row: Activity, meId: string, itemName?: string): string {
  const who = (user: ActivityUser, start: boolean) =>
    user.id === meId ? (start ? 'You' : 'you') : user.name || user.email
  const actor = who(row.actor, true)
  const subject = row.subject ? who(row.subject, false) : 'someone'
  const item = itemName || SOME_ITEM[row.item_type ?? ''] || 'an item'

  switch (row.action) {
    case 'sign_in':
      return `${actor} signed in`
    case 'item_created':
      return `${actor} created ${item}`
    case 'item_updated':
      return `${actor} changed ${item}`
    case 'item_trashed':
      return `${actor} moved ${item} to the trash`
    case 'item_restored':
      return `${actor} restored ${item} from the trash`
    case 'item_deleted':
      return `${actor} deleted ${item} for good`
    case 'item_shared':
      return `${actor} shared ${item} with ${subject}${row.role ? ` as ${row.role}` : ''}`
    case 'item_role_changed':
      return `${actor} made ${subject} ${row.role === 'editor' ? 'an editor' : 'a viewer'} of ${item}`
    case 'item_member_removed':
      return row.subject?.id === row.actor.id
        ? `${actor} left ${item}`
        : `${actor} removed ${subject} from ${item}`
    default:
      return `${actor} did something to ${item}`
  }
}

/**
 * A browser and a system named from a User-Agent, such as "Chrome on macOS",
 * or '' when neither is recognised.
 */
// ponytail: a handful of patterns, newest browsers first; Edge and Opera say
// Chrome too, so they come before it. Swap for a parser if the names matter.
export function deviceName(userAgent: string | null): string {
  const ua = userAgent ?? ''
  const browser = [
    [/Edg(iOS|A)?\//, 'Edge'],
    [/OPR\//, 'Opera'],
    [/Firefox\/|FxiOS\//, 'Firefox'],
    [/Chrome\/|CriOS\//, 'Chrome'],
    [/Safari\//, 'Safari'],
  ].find(([pattern]) => (pattern as RegExp).test(ua))?.[1]
  const system = [
    [/Android/, 'Android'],
    [/iPhone|iPad/, 'iOS'],
    [/Windows/, 'Windows'],
    [/Mac OS X|Macintosh/, 'macOS'],
    [/Linux/, 'Linux'],
  ].find(([pattern]) => (pattern as RegExp).test(ua))?.[1]
  return [browser, system].filter(Boolean).join(' on ')
}

/**
 * What kind of address a sign-in came from: "IPv4" or "IPv6", and "local"
 * when it is this machine or a private network rather than the internet.
 */
export function ipKind(ip: string): string {
  const v6 = ip.includes(':')
  const local = v6
    ? /^(::1$|fe80:|f[cd])/i.test(ip)
    : /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(ip)
  return `${v6 ? 'IPv6' : 'IPv4'}${local ? ' · local' : ''}`
}
