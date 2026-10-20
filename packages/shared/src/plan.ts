import type { Models } from './api/models'

import { formatDate } from './date'

// How a plan reads, shared with the browser extension (its `@/` is this
// app's src), so the two billing pages name and price plans alike.

/**
 * A plan's name without the product and the store's environment, which the
 * synced names carry ("Montara Pass Pro Monthly - Sandbox" reads "Pro Monthly").
 */
export function planName(plan: Models.Plan) {
  return plan.name.replace(/^Montara Pass\s+/i, '').replace(/\s+-\s+sandbox$/i, '')
}

/** A subscription's or a purchase's status, as the billing pages name it. */
export const BILLING_STATUS: Record<
  Models.Subscription['status'] | Models.Purchase['status'],
  string
> = {
  pending: 'Waiting for payment',
  active: 'Active',
  paid: 'Paid',
  canceled: 'Canceled',
  expired: 'Expired',
  failed: 'Payment failed',
  refunded: 'Refunded',
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

/** A plan's name without its interval: "Pro Yearly" and "Pro Monthly" read "Pro". */
const family = (plan: Models.Plan) =>
  planName(plan).replace(/\s+(monthly|yearly|annual(ly)?)$/i, '')

/** What a plan's discount code takes off, while it is taken; 0 for none. */
function discountOff(plan: Models.Plan) {
  const ended = plan.discount_ends_at !== null && Date.parse(plan.discount_ends_at) <= Date.now()
  return ended ? 0 : (plan.discount_amount ?? 0)
}

/**
 * What a plan costs now, after its discount code, against what it is marked
 * down from, and the share saved, rounded down so it never claims more (0
 * under 1%, too little to name). It is marked down from its compare-at price,
 * or else, for a yearly plan, twelve months of the monthly one of the same
 * family and store mode; and a discount code at least from its own price.
 * Null when it costs no less.
 */
export function planSaving(plan: Models.Plan, plans: Models.Plan[]) {
  const off = discountOff(plan)
  const amount = plan.amount - off
  let was = plan.compare_at_amount
  if (was === null && plan.billing_interval === 'year') {
    const match = plans.find(
      (p) =>
        p.billing_interval === 'month' &&
        p.currency === plan.currency &&
        family(p) === family(plan) &&
        isSandbox(p) === isSandbox(plan)
    )
    if (match) was = match.amount * 12
  }
  if (off) was = Math.max(was ?? 0, plan.amount)
  if (was === null || was <= amount) return null
  // In whole cents, so 20% off reads 20, not 19.999….
  const percent = Math.floor(((was - amount) * 100) / was)
  return { amount, was, percent }
}

/**
 * The terms of a plan's discount code, in a line: which payments it takes
 * off, then price (the plan's own, formatted), and when the offer ends. Null
 * when it takes off every payment and never ends, or there is none.
 */
export function planOffer(plan: Models.Plan, price: string) {
  if (!discountOff(plan)) return null
  const parts = []
  const n = plan.discount_payments
  if (plan.billing_interval && n !== null) {
    const unit = n === 1 ? plan.billing_interval : `${n} ${plan.billing_interval}s`
    parts.push(`first ${unit}, then ${price} ${planPeriod(plan)}`)
  }
  if (plan.discount_ends_at) parts.push(`offer ends ${formatDate(plan.discount_ends_at)}`)
  return parts.length ? parts.join(' · ') : null
}
