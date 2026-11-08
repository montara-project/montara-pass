import type { ISO8601DateString } from '../../types/time'

// Security (apps/server internal/models/ip_block.go): the API's blocked IPs,
// recorded automatically after repeated failures and by a super user's hand.

/** The role of the signed-in user, as GET /api/v1/me/role answers it. */
export interface MeRole {
  role: 'user' | 'super_user'
}

export interface IPBlock {
  id: string
  ip: string
  /** auto: the middleware blocked it after repeated failures; manual: a super user did. */
  source: 'auto' | 'manual'
  reason: string | null
  status: 'active' | 'lifted' | 'expired'
  /** When the block ends; null for a manual block that never ends. */
  blocked_until: ISO8601DateString | null
  lifted_at: ISO8601DateString | null
  created_at: ISO8601DateString
}
