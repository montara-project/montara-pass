import type { Models } from '@/lib/api/models'

// How a plan reads, shared with the browser extension (its `@/` is this
// app's src), so the two billing pages name and price plans alike.

/**
 * A plan's name without the product and the store's environment, which the
 * synced names carry ("Montara Pass Pro Monthly - Sandbox" reads "Pro Monthly").
 */
export function planName(plan: Models.Plan) {
  return plan.name.replace(/^Montara Pass\s+/i, '').replace(/\s+-\s+sandbox$/i, '')
}

/** A plan synced from Lemon Squeezy's test mode, which takes no real money. */
export const isSandbox = (plan: Models.Plan) => /\s+-\s+sandbox$/i.test(plan.name)

/** The line after the amount: "/ month", "/ year", or "once". */
export function planPeriod(plan: Models.Plan) {
  return plan.billing_interval ? `/ ${plan.billing_interval}` : 'once'
}

const TERMS = {
  month: 'renews monthly · cancel any time',
  year: 'renews yearly · cancel any time',
} as const

/** What paying commits to, in a line. */
export function planTerms(plan: Models.Plan) {
  return plan.billing_interval ? TERMS[plan.billing_interval] : 'one payment · does not renew'
}
