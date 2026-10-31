import type { Models } from '@montara-pass/shared/api/models'

import { formatPrice } from '@montara-pass/shared/money'
import {
  BILLING_STATUS,
  billingTerms,
  hasPaidPurchase,
  isSandbox,
  ownedPurchase,
  paymentPending,
  PLAN_INCLUDES,
  planName,
  planOffer,
  planPeriod,
  planSaving,
  planTerms,
} from '@montara-pass/shared/plan'
import { errorMessage } from '@montara-pass/shared/string'
import { useCallback, useEffect, useState } from 'react'

import {
  buy,
  getBilling,
  getBillingPortal,
  listPlans,
  SignedOutError,
  subscribe,
} from '../../lib/api'
import { CheckIcon, CreditCardIcon } from '../icons'

interface BillingProps {
  /** The session ended underneath the page. */
  onSignedOut: () => void
}

const DATE = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' })

/** Payments happen at the plan's provider, in a tab of their own. */
function open(url: string) {
  window.open(url, '_blank', 'noopener')
}

/** The tabs, and the currencies their plans are priced in. */
const CURRENCIES = ['USD', 'IDR'] as const

/**
 * Billing, Cloud Edition only: the signed-in user's subscription and
 * purchases, and the plans on offer, in two tabs — the USD plans sold
 * through Lemon Squeezy's checkout, the IDR ones through BorderPay's QRIS.
 * Paying opens the plan's provider in a new tab; this page reads the outcome
 * again when it is back in front, and every few seconds while a payment is
 * pending.
 */
export default function Billing({ onSignedOut }: BillingProps) {
  const [plans, setPlans] = useState<Models.Plan[]>([])
  // undefined while it loads; null where the server has no billing.
  const [overview, setOverview] = useState<Models.BillingOverview | null>()
  const [error, setError] = useState('')
  // What is being started: a plan's id, or the portal.
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const [onOffer, mine] = await Promise.all([listPlans(), getBilling()])
      setPlans(onOffer)
      setOverview(mine)
      setError('')
    } catch (err) {
      if (err instanceof SignedOutError) onSignedOut()
      else setError(errorMessage(err, 'Billing could not be read'))
    }
  }, [onSignedOut])

  useEffect(() => {
    void load()
    const onVisible = () => {
      if (document.visibilityState === 'visible') void load()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [load])

  const subscription = overview?.subscription ?? null
  const purchases = overview?.purchases ?? []
  const pending = paymentPending(overview)

  useEffect(() => {
    if (!pending) return
    const timer = setInterval(() => void load(), 5000)
    return () => clearInterval(timer)
  }, [pending, load])

  /** Starts something that ends at Lemon Squeezy, then reads the page again. */
  const start = async (key: string, begin: () => Promise<string | null>) => {
    setBusy(key)
    try {
      const url = await begin()
      if (url) open(url)
      await load()
    } catch (err) {
      if (err instanceof SignedOutError) onSignedOut()
      else setError(errorMessage(err, 'That did not work'))
    } finally {
      setBusy(null)
    }
  }

  const lifetime = hasPaidPurchase(purchases)
  // The tab's currency, and the plans on offer in it.
  const [currency, setCurrency] = useState<'USD' | 'IDR'>('USD')
  const onOffer = plans.filter((plan) => plan.currency === currency)
  // The plan marked out, as on the web app's billing page: the yearly one.
  const featured = onOffer.find((plan) => plan.billing_interval === 'year')

  return (
    <div className="stack detail-body tool-body">
      <header className="billing-head">
        <h2 className="detail-title">
          <CreditCardIcon />
          Billing
        </h2>
        <span className="muted">
          Your plan, and what you have bought.{currency && ` Prices in ${currency}.`}
        </span>
      </header>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      {overview === undefined ? (
        !error && <p className="muted">Loading…</p>
      ) : overview === null ? (
        <p className="muted">This server takes no payments.</p>
      ) : (
        <>
          <section className="stack billing-section" aria-labelledby="billing-subscription">
            <h3 id="billing-subscription" className="billing-title">
              Subscription
            </h3>
            <div className="billing-row">
              {subscription ? (
                <>
                  <span className="item-text">
                    <span className="item-name">{planName(subscription.plan)}</span>
                    <span className="muted">
                      {BILLING_STATUS[subscription.status]}
                      {subscription.status === 'active' &&
                        `, ${subscription.canceled_at ? 'ends' : 'renews'} ${DATE.format(new Date(subscription.current_period_end))}`}
                    </span>
                  </span>
                  {subscription.checkout_url ? (
                    <button className="secondary" onClick={() => open(subscription.checkout_url!)}>
                      Continue payment
                    </button>
                  ) : (
                    subscription.status === 'active' &&
                    subscription.plan.provider !== 'borderpay' && (
                      // BorderPay renews nothing by itself and has no portal:
                      // an IDR subscription is renewed by subscribing again.
                      <button
                        className="secondary"
                        disabled={busy !== null}
                        onClick={() =>
                          void start('portal', async () => (await getBillingPortal()).url)
                        }
                      >
                        Manage subscription
                      </button>
                    )
                  )}
                </>
              ) : (
                <>
                  <span className="muted billing-none">No subscription.</span>
                  {!lifetime && <span className="billing-pill">free tier</span>}
                </>
              )}
            </div>
          </section>

          <section className="stack billing-section" aria-labelledby="billing-plans">
            <h3 id="billing-plans" className="billing-title">
              Plans
            </h3>
            <div role="tablist" aria-label="Currency" className="plan-tabs">
              {CURRENCIES.map((code) => (
                <button
                  key={code}
                  role="tab"
                  aria-selected={currency === code}
                  disabled={busy !== null}
                  className="plan-tab"
                  data-on={currency === code || undefined}
                  onClick={() => setCurrency(code)}
                >
                  {code}
                </button>
              ))}
            </div>
            {plans.length === 0 ? (
              <p className="muted">No plans are on offer yet.</p>
            ) : (
              <ul className="plan-grid">
                {onOffer.map((plan) => {
                  const purchase =
                    plan.billing === 'one_time' ? ownedPurchase(purchases, plan) : undefined
                  // One subscription at a time; another once this one has ended.
                  const subscribed = plan.billing === 'recurring' && subscription !== null
                  const saving = planSaving(plan, plans)
                  const offer = planOffer(plan, formatPrice(plan.amount, plan.currency))
                  const action = plan.billing === 'recurring' ? 'Subscribe' : 'Buy once'
                  return (
                    <li
                      key={plan.id}
                      className="plan-card"
                      data-featured={plan.id === featured?.id || undefined}
                    >
                      <span className="plan-head">
                        <span className="item-name">{planName(plan)}</span>
                        <span className="plan-chips">
                          {saving && saving.percent >= 1 && (
                            <span className="billing-pill">Save {saving.percent}%</span>
                          )}
                          {isSandbox(plan) && <span className="plan-chip">sandbox</span>}
                        </span>
                      </span>
                      <span className="plan-price">
                        {formatPrice(saving?.amount ?? plan.amount, plan.currency)}{' '}
                        <small>{planPeriod(plan)}</small>
                        {saving && (
                          <s className="plan-was">
                            <span className="visually-hidden">was </span>
                            {formatPrice(saving.was, plan.currency)}
                          </s>
                        )}
                      </span>
                      <span className="plan-notes">
                        {offer && <span className="plan-offer">{offer}</span>}
                        <span className="plan-terms">{planTerms(plan)}</span>
                      </span>
                      {purchase?.status === 'paid' ? (
                        <span className="muted">You own this.</span>
                      ) : purchase?.checkout_url ? (
                        <button className="secondary" onClick={() => open(purchase.checkout_url!)}>
                          Continue payment
                        </button>
                      ) : (
                        <button
                          className="secondary"
                          disabled={busy !== null || subscribed}
                          onClick={() =>
                            void start(plan.id, async () =>
                              plan.billing === 'recurring'
                                ? (await subscribe(plan.id)).checkout_url
                                : (await buy(plan.id)).checkout_url
                            )
                          }
                        >
                          {busy === plan.id ? 'Opening…' : action}
                        </button>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
            <p className="muted">
              {currency === 'IDR'
                ? 'Paying opens BorderPay, which shows a QRIS code, in a new tab. This page updates once the payment has gone through.'
                : 'Paying opens Lemon Squeezy in a new tab. This page updates once the payment has gone through.'}
            </p>
          </section>

          <div className="billing-facts">
            {[
              { id: 'billing-includes', title: 'Every plan includes', items: PLAN_INCLUDES },
              { id: 'billing-how', title: 'How billing works', items: billingTerms(currency) },
            ].map(({ id, title, items }) => (
              <section key={id} className="stack billing-section" aria-labelledby={id}>
                <h3 id={id} className="billing-title">
                  {title}
                </h3>
                <ul className="billing-checks">
                  {items.map((item) => (
                    <li key={item}>
                      <CheckIcon />
                      {item}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>

          {purchases.length > 0 && (
            <section className="stack billing-section" aria-labelledby="billing-purchases">
              <h3 id="billing-purchases" className="billing-title">
                Purchases
              </h3>
              <ul className="billing-list">
                {purchases.map((purchase) => (
                  <li key={purchase.id}>
                    <span className="item-name">{planName(purchase.plan)}</span>
                    <span className="muted">
                      {formatPrice(purchase.amount, purchase.currency)} ·{' '}
                      {BILLING_STATUS[purchase.status]}
                      {purchase.paid_at && ` · ${DATE.format(new Date(purchase.paid_at))}`}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  )
}
