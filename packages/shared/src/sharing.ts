import { COMMUNITY } from './constants/edition'

/**
 * How an item's detail says it is shared: "Shared with you" for someone
 * else's item, "Not shared", "Shared with N", or null while the members of
 * one's own item are still being read.
 *
 * @param others the members besides the owner; null or undefined while unknown
 */
export function sharingLabel(isOwner: boolean, others: number | null | undefined): string | null {
  if (!isOwner) return 'Shared with you'
  // The Community Edition has one user, so nothing is ever shared.
  if (COMMUNITY || others === 0) return 'Not shared'
  if (others) return `Shared with ${others}`
  return null
}
