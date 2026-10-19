import type { ISO8601DateString } from '../../types/time'

// Billing, Cloud Edition only (apps/server internal/models/billing.go).
// Amounts are in the currency's minor unit; see formatPrice.

export interface Plan {
  id: string
  code: string
  name: string
  description: string | null
  billing: 'recurring' | 'one_time'
  billing_interval: 'month' | 'year' | null
  amount: number
  currency: string
  active: boolean
  /** The Lemon Squeezy variant it is synced from; null for a plan from before the sync. */
  variant_id: string | null
  created_at: ISO8601DateString
  updated_at: ISO8601DateString
}

/**
 * A recurring plan, renewed by Lemon Squeezy. Active to current_period_end:
 * the next renewal, or the end once canceled_at says it will not renew.
 */
export interface Subscription {
  id: string
  plan_id: string
  status: 'pending' | 'active' | 'canceled' | 'expired'
  current_period_start: ISO8601DateString
  current_period_end: ISO8601DateString
  canceled_at: ISO8601DateString | null
  amount: number
  currency: string
  /** Only while pending: where the payment is finished. */
  checkout_url: string | null
  plan: Plan
  created_at: ISO8601DateString
}

export interface Purchase {
  id: string
  plan_id: string
  status: 'pending' | 'paid' | 'failed' | 'refunded'
  amount: number
  currency: string
  paid_at: ISO8601DateString | null
  checkout_url: string | null
  plan: Plan
  created_at: ISO8601DateString
}

/** Body of GET /api/v1/billing/portal: a signed link that expires soon. */
export interface BillingPortal {
  url: string
}

/** Body of GET /api/v1/billing. */
export interface BillingOverview {
  subscription: Subscription | null
  purchases: Purchase[]
}
