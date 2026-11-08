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
import { CheckIcon, CreditCardIcon, QrIcon } from '../icons'

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

/** Who takes the payment, by the currency the plans are priced in. */
const GATEWAY = { USD: 'Lemon Squeezy', IDR: 'BorderPay' } as const

/** What each checkout leaves behind, under how billing works. */
const BILLING_NOTE = {
  USD: 'VAT and receipts are issued by Lemon Squeezy',
  IDR: 'Paid by QRIS · no card stored',
} as const

/**
 * Billing, Cloud Edition only: the signed-in user's subscription and
 * purchases, and the plans on offer, in two tabs — the USD plans sold
 * through Lemon Squeezy's checkout, the IDR ones through BorderPay's QRIS.
 * Where the server knows the user's country it names the one currency they
 * may buy in (IDR in Indonesia, USD elsewhere): then only that tab shows.
 * Paying opens the plan's provider in a new tab; this page reads the outcome
 * again when it is back in front, and every few seconds while a payment is
 * pending.
 */
export default function Billing({ onSignedOut }: BillingProps) {
  const [plans, setPlans] = useState<Models.Plan[]>([])
  // The only currency on sale to this user, where the server knows their country.
  const [region, setRegion] = useState<'USD' | 'IDR'>()
  // undefined while it loads; null where the server has no billing.
  const [overview, setOverview] = useState<Models.BillingOverview | null>()
  const [error, setError] = useState('')
  // What is being started: a plan's id, or the portal.
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const [onOffer, mine] = await Promise.all([listPlans(), getBilling()])
      setPlans(onOffer.plans)
      setRegion(onOffer.region)
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
  const [tab, setCurrency] = useState<'USD' | 'IDR'>('USD')
  const currency = region ?? tab
  const onOffer = plans.filter((plan) => plan.currency === currency)
  // The plan marked out, as on the web app's billing page: the yearly one.
  const featured = onOffer.find((plan) => plan.billing_interval === 'year')

  const gateway = GATEWAY[currency]

  // Beside the subscription: finish a payment, manage it, or the free tier mark.
  const renderSubscriptionAction = () => {
    if (subscription?.checkout_url) {
      return (
        <button className="small" onClick={() => open(subscription.checkout_url!)}>
          Continue payment
        </button>
      )
    }
    if (subscription) {
      return (
        subscription.status === 'active' &&
        subscription.plan.provider !== 'borderpay' && (
          // BorderPay renews nothing by itself and has no portal:
          // an IDR subscription is renewed by subscribing again.
          <button
            className="secondary small"
            disabled={busy !== null}
            onClick={() => void start('portal', async () => (await getBillingPortal()).url)}
          >
            Manage subscription
          </button>
        )
      )
    }
    return !lifetime && <span className="billing-pill">Free tier</span>
  }

  // Loading, the error, or the page.
  const renderBody = () => {
    if (overview === undefined) {
      return !error && <p className="muted">Loading…</p>
    }
    if (overview === null) {
      return <p className="muted">This server takes no payments.</p>
    }
    return (
      <>
        <section className="billing-section" aria-labelledby="billing-subscription">
          <h2 id="billing-subscription" className="eyebrow">
            Subscription
          </h2>
          <div className="field-group billing-row">
            <span className="tile">{currency === 'IDR' ? <QrIcon /> : <CreditCardIcon />}</span>
            <span className="item-text">
              {subscription ? (
                <>
                  <span className="item-name">{planName(subscription.plan)}</span>
                  <span className="muted">
                    {BILLING_STATUS[subscription.status]}
                    {subscription.status === 'active' &&
                      // BorderPay charges once: its subscriptions end, never renew.
                      `, ${subscription.canceled_at || subscription.plan.provider === 'borderpay' ? 'ends' : 'renews'} ${DATE.format(new Date(subscription.current_period_end))}`}
                  </span>
                </>
              ) : (
                <>
                  <span className="item-name">No active subscription</span>
                  <span className="muted">
                    {currency === 'IDR'
                      ? 'Pick a plan below; BorderPay sends a QRIS code to finish.'
                      : 'Pick a plan below to unlock Pro features.'}
                  </span>
                </>
              )}
            </span>
            {renderSubscriptionAction()}
          </div>
        </section>

        <section className="billing-section" aria-labelledby="billing-plans">
          <div className="billing-plans-head">
            <h2 id="billing-plans" className="eyebrow">
              Plans
            </h2>
            {/* Only one currency is on sale where the country is known. */}
            {!region && (
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
            )}
          </div>
          {onOffer.length === 0 ? (
            <p className="muted">No plans are on offer yet.</p>
          ) : (
            <ul className="plan-grid">
              {onOffer.map((plan) => {
                const purchase =
                  plan.billing === 'one_time' ? ownedPurchase(purchases, plan) : undefined
                // One subscription at a time; another once this one has ended.
                const subscribed = plan.billing === 'recurring' && subscription !== null
                const marked = plan.id === featured?.id
                const saving = planSaving(plan, onOffer)
                const offer = planOffer(plan, formatPrice(plan.amount, plan.currency))
                const action = plan.billing === 'recurring' ? 'Subscribe' : 'Buy once'
                // What the plan offers: owned already, a payment to finish, or the way to buy.
                const renderAction = () => {
                  if (purchase?.status === 'paid') {
                    return <span className="muted plan-action">You own this.</span>
                  }
                  if (purchase?.checkout_url) {
                    return (
                      <button className="plan-action" onClick={() => open(purchase.checkout_url!)}>
                        Continue payment
                      </button>
                    )
                  }
                  return (
                    <button
                      className={marked ? 'plan-action' : 'secondary plan-action'}
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
                  )
                }

                return (
                  <li key={plan.id} className="plan-card" data-featured={marked || undefined}>
                    <span className="plan-head">
                      <span className="item-name">{planName(plan)}</span>
                      <span className="plan-chips">
                        {saving && saving.percent >= 1 && (
                          <span className="plan-chip plan-save">
                            <span className="visually-hidden">Save </span>−{saving.percent}%
                          </span>
                        )}
                        {isSandbox(plan) && <span className="plan-chip">sandbox</span>}
                      </span>
                    </span>
                    <span className="plan-body">
                      {saving && (
                        <span className="eyebrow">
                          Was <s className="plan-was">{formatPrice(saving.was, plan.currency)}</s>
                        </span>
                      )}
                      <span className="plan-price">
                        {formatPrice(saving?.amount ?? plan.amount, plan.currency)}{' '}
                        <small>{planPeriod(plan)}</small>
                      </span>
                      {offer && <span className="plan-offer">{offer}</span>}
                      <span className="plan-terms">{planTerms(plan)}</span>
                      {renderAction()}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
          <p className="muted billing-hint">
            {currency === 'IDR'
              ? 'Paying opens BorderPay, which shows a QRIS code, in a new tab. This page updates once the payment has gone through.'
              : 'Paying opens Lemon Squeezy in a new tab. This page updates once the payment has gone through.'}
          </p>
        </section>

        <div className="billing-facts">
          {[
            {
              id: 'billing-includes',
              title: 'Every plan includes',
              items: PLAN_INCLUDES,
              note: null,
            },
            {
              id: 'billing-how',
              title: 'How billing works',
              items: billingTerms(currency),
              note: BILLING_NOTE[currency],
            },
          ].map(({ id, title, items, note }) => (
            <section key={id} className="billing-section" aria-labelledby={id}>
              <h2 id={id} className="eyebrow">
                {title}
              </h2>
              <div className="field-group">
                <ul className="billing-checks">
                  {items.map((item) => (
                    <li key={item}>
                      <CheckIcon />
                      {item}
                    </li>
                  ))}
                </ul>
                {note && <p className="field-group-foot">{note}</p>}
              </div>
            </section>
          ))}
        </div>

        {purchases.length > 0 && (
          <section className="billing-section" aria-labelledby="billing-purchases">
            <h2 id="billing-purchases" className="eyebrow">
              Purchases
            </h2>
            <ul className="field-group billing-list">
              {purchases.map((purchase) => (
                <li key={purchase.id}>
                  <span className="item-name">{planName(purchase.plan)}</span>
                  <span className="muted mono">
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
    )
  }

  return (
    <div className="stack detail-body tool-body gen-page">
      <header className="tool-page-head">
        <div className="list-title">
          <p className="eyebrow">Account · Billing</p>
          <h1>Billing</h1>
          <p className="muted">
            Your plan, and what you have bought. Prices in {currency},{' '}
            {currency === 'IDR' ? 'paid through' : 'charged by'} {gateway}.
          </p>
        </div>
        <dl className="health-stats">
          <div>
            <dt>Gateway</dt>
            <dd className="billing-gateway">{gateway}</dd>
          </div>
          <div>
            <dt>Currency</dt>
            <dd>{currency}</dd>
          </div>
        </dl>
      </header>

      <div className="billing-body">
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}

        {renderBody()}
      </div>
    </div>
  )
}
