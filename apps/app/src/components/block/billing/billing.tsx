import type { Models } from '@montara-pass/shared/api/models'

import { formatDate } from '@montara-pass/shared/date'
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
import { IconCheck, IconCreditCard, IconQrcode } from '@tabler/icons-react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useNavigate, useSearch } from '@tanstack/react-router'

import { PAGE_CONTAINER } from '@/components/layout/page'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { toastApiError } from '@/lib/api/api-error'
import { queries } from '@/lib/api/queries'
import { cn } from '@/lib/utils'

const label = 'text-muted-foreground font-mono text-[10px] tracking-[0.08em] uppercase'

/** Who takes the payment, by the currency the plans are priced in. */
const GATEWAY = { USD: 'Lemon Squeezy', IDR: 'BorderPay' } as const

/** What each checkout leaves behind, under how billing works. */
const BILLING_NOTE = {
  USD: 'VAT and receipts are issued by Lemon Squeezy',
  IDR: 'Paid by QRIS · no card stored',
} as const

/** A fact in the page head: a label and its value. */
function Fact({ name, value, accent }: { name: string; value: string; accent?: boolean }) {
  return (
    <div className="bg-background flex h-[26px] items-center gap-2 rounded-md border px-2.5">
      <dt className={label}>{name}</dt>
      <dd className={cn('m-0 font-mono text-xs font-semibold', accent && 'text-focus')}>{value}</dd>
    </div>
  )
}

/** The tabs, and the currencies their plans are priced in. */
const CURRENCIES = ['USD', 'IDR'] as const

/**
 * Billing, Cloud Edition only: the subscription and purchases of the
 * signed-in user, and the plans on offer, in two tabs — the USD plans sold
 * through Lemon Squeezy's checkout, the IDR ones through BorderPay's QRIS.
 * Where the server knows the user's country it names the one currency they
 * may buy in (IDR in Indonesia, USD elsewhere): then only that tab shows.
 * Either checkout brings the browser back here; the payment shows once the
 * provider has told the server, so a pending one is polled for. A USD
 * subscription renews by itself; an IDR one is paid a period at a time and
 * renewed by subscribing again.
 */
/** When an active subscription's period ends, and whether it renews then. */
function periodNote(subscription: Models.Subscription): string {
  const end = formatDate(subscription.current_period_end)
  // BorderPay charges once: its subscriptions end, never renew.
  const ends = Boolean(subscription.canceled_at) || subscription.plan.provider === 'borderpay'
  return ends ? `, ends ${end}` : `, renews ${end}`
}

export default function BillingBlock() {
  const {
    plan: chosen,
    checkout: returned,
    currency: asked,
  } = useSearch({ from: '/(app)/billing/' })
  const navigate = useNavigate()

  const plans = useQuery(queries.billing.plans())
  const overview = useQuery({
    ...queries.billing.overview(),
    refetchInterval: (query) => (paymentPending(query.state.data) ? 5000 : false),
  })
  const subscribe = useMutation({ ...queries.billing.subscribe(), onError: toastApiError })
  const buy = useMutation({ ...queries.billing.buy(), onError: toastApiError })
  const portal = useMutation({ ...queries.billing.portal(), onError: toastApiError })
  const busy = subscribe.isPending || buy.isPending

  const subscription = overview.data?.subscription ?? null
  const purchases = overview.data?.purchases ?? []
  const lifetime = hasPaidPurchase(purchases)
  // The tab's currency: the user's country's, where the server knows it; else
  // the one asked for, else the one the plan the website sent the user here
  // for is priced in, else USD.
  const region = plans.data?.region
  const chosenPlan = plans.data?.plans.find((plan) => plan.code === chosen)
  const askedCurrency = asked === 'USD' || asked === 'IDR' ? asked : undefined
  const currency = region ?? askedCurrency ?? chosenPlan?.currency ?? 'USD'
  const onOffer = plans.data?.plans.filter((plan) => plan.currency === currency) ?? []
  // The plan marked out: the one the website sent the user here for, when it
  // is of this tab, or else the yearly one.
  const featured =
    chosenPlan?.currency === currency
      ? chosenPlan
      : onOffer.find((plan) => plan.billing_interval === 'year')

  // Anything else the server names is sold as USD is.
  const priced = currency === 'IDR' ? 'IDR' : 'USD'
  const gateway = GATEWAY[priced]
  const QrOrCard = currency === 'IDR' ? IconQrcode : IconCreditCard

  // The plans: loading, none on offer, or the cards.
  const renderPlans = () => {
    if (plans.isLoading) {
      return <Skeleton className="rounded-card h-52 w-full" />
    }
    if (!onOffer.length) {
      return <p className="text-muted-foreground text-[13px]">No plans are on offer yet.</p>
    }
    return (
      <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2 lg:grid-cols-3">
        {onOffer.map((plan) => {
          const purchase = plan.billing === 'one_time' ? ownedPurchase(purchases, plan) : undefined
          // One subscription at a time; another once this one has ended.
          const subscribed = plan.billing === 'recurring' && subscription !== null
          const marked = plan.id === featured?.id
          const saving = planSaving(plan, onOffer)
          const offer = planOffer(plan, formatPrice(plan.amount, plan.currency))
          // What the plan offers: owned already, a payment to finish, or the way to buy.
          const renderAction = () => {
            if (purchase?.status === 'paid') {
              return (
                <span className="text-muted-foreground mt-auto text-[13px]">You own this.</span>
              )
            }
            if (purchase?.checkout_url) {
              return (
                <Button asChild size="sm" className="mt-auto w-full">
                  <a href={purchase.checkout_url}>Continue payment</a>
                </Button>
              )
            }
            const recurring = plan.billing === 'recurring'
            return (
              <Button
                size="sm"
                className={cn('mt-auto w-full', !marked && 'border')}
                variant={marked ? 'primary' : 'secondary'}
                disabled={busy || subscribed || overview.isLoading}
                onClick={() => (recurring ? subscribe : buy).mutate(plan.id)}
              >
                {recurring ? 'Subscribe' : 'Buy once'}
              </Button>
            )
          }

          return (
            <li
              key={plan.id}
              className={cn(
                'rounded-card bg-panel flex flex-col overflow-hidden border',
                // The featured plan: marked on the edge, in the one token
                // that holds 3:1 on a card in both themes (--focus:
                // Electric Blue on light, Arctic Cyan on dark).
                marked && 'border-focus'
              )}
            >
              <div className="border-border/60 flex items-center justify-between gap-2 border-b px-4 py-3">
                <span className="text-[13px] font-semibold">{planName(plan)}</span>
                <span className="flex items-center gap-1.5 whitespace-nowrap">
                  {saving && saving.percent >= 1 && (
                    <span
                      className={cn(
                        'rounded-sm border px-1.5 py-0.5 font-mono text-[10px] font-medium tabular-nums',
                        marked ? 'bg-good/15 text-good border-transparent' : 'text-muted-foreground'
                      )}
                    >
                      <span className="sr-only">Save </span>−{saving.percent}%
                    </span>
                  )}
                  {isSandbox(plan) && (
                    <span className="text-muted-foreground rounded-sm border px-1.5 py-0.5 font-mono text-[10px]">
                      sandbox
                    </span>
                  )}
                </span>
              </div>
              <div className="flex flex-1 flex-col gap-2 p-4">
                {saving && (
                  <p className={cn(label, 'tabular-nums')}>
                    Was{' '}
                    <s className="decoration-muted-foreground/70 normal-case">
                      {formatPrice(saving.was, plan.currency)}
                    </s>
                  </p>
                )}
                <p className="flex flex-wrap items-baseline gap-x-2 font-mono tabular-nums">
                  <span className="text-[26px] leading-none font-semibold tracking-[-0.01em]">
                    {formatPrice(saving?.amount ?? plan.amount, plan.currency)}
                  </span>
                  <span className="text-muted-foreground text-xs">{planPeriod(plan)}</span>
                </p>
                {offer && <p className="font-mono text-xs">{offer}</p>}
                <p className="text-muted-foreground mb-4 text-xs first-letter:uppercase">
                  {planTerms(plan)}
                </p>
                {renderAction()}
              </div>
            </li>
          )
        })}
      </ul>
    )
  }

  // Beside the subscription: finish a payment, manage it, or the free tier mark.
  const renderSubscriptionAction = () => {
    if (subscription?.checkout_url) {
      return (
        <Button asChild size="sm">
          <a href={subscription.checkout_url}>Continue payment</a>
        </Button>
      )
    }
    if (subscription) {
      // BorderPay renews nothing by itself and has no portal: an IDR
      // subscription is renewed by subscribing again.
      const manageable =
        subscription.status === 'active' && subscription.plan.provider !== 'borderpay'
      if (!manageable) return null
      return (
        <Button
          size="sm"
          variant="outline"
          disabled={portal.isPending}
          onClick={() => portal.mutate()}
        >
          Manage subscription
        </Button>
      )
    }
    if (lifetime) return null
    return (
      <span className="bg-good/15 text-good rounded-sm px-2 py-1 font-mono text-[10px] font-medium tracking-[0.08em] uppercase">
        Free tier
      </span>
    )
  }

  return (
    <div className={cn(PAGE_CONTAINER, 'flex flex-col')}>
      <header className="border-border/60 flex flex-col items-start gap-x-4 gap-y-3 border-b pb-[18px] sm:flex-row sm:flex-wrap sm:items-center">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className={label}>Account · Billing</p>
          <h1 className="text-[22px] font-semibold tracking-[-0.01em]">Billing</h1>
          <p className="text-muted-foreground text-[13px]">
            Your plan, and what you have bought. Prices in {currency},{' '}
            {currency === 'IDR' ? 'paid through' : 'charged by'} {gateway}.
          </p>
        </div>
        <dl className="m-0 flex flex-wrap gap-2">
          <Fact name="Gateway" value={gateway} accent />
          <Fact name="Currency" value={currency} />
        </dl>
      </header>

      <div className="flex flex-col gap-6 pt-6">
        {returned && subscription?.status !== 'active' && (
          <p className="rounded-card bg-hover px-4 py-3 text-[13px]">
            Thanks. Your payment is being confirmed; this page updates once it has gone through.
          </p>
        )}

        <section aria-labelledby="current" className="flex flex-col gap-2.5">
          <h2 id="current" className={label}>
            Subscription
          </h2>
          <div className="rounded-card bg-panel flex min-h-[56px] flex-wrap items-center gap-x-4 gap-y-3 border px-4 py-3">
            {overview.isLoading ? (
              <Skeleton className="h-4 w-48" />
            ) : (
              <>
                <span className="bg-background inline-flex size-8 shrink-0 items-center justify-center rounded-md border">
                  <QrOrCard className="size-4" aria-hidden />
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  {subscription ? (
                    <>
                      <span className="text-[13px] font-medium">{planName(subscription.plan)}</span>
                      <span className="text-muted-foreground text-xs">
                        {BILLING_STATUS[subscription.status]}
                        {subscription.status === 'active' && periodNote(subscription)}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-[13px] font-medium">No active subscription</span>
                      <span className="text-muted-foreground text-xs">
                        {currency === 'IDR'
                          ? 'Pick a plan below; BorderPay sends a QRIS code to finish.'
                          : 'Pick a plan below to unlock Pro features.'}
                      </span>
                    </>
                  )}
                </div>
                {renderSubscriptionAction()}
              </>
            )}
          </div>
        </section>

        <section aria-labelledby="plans" className="flex flex-col gap-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="plans" className={label}>
              Plans
            </h2>
            {/* Only one currency is on sale where the country is known. */}
            {!region && (
              <div
                role="tablist"
                aria-label="Currency"
                className="bg-background flex rounded-md border p-0.5"
              >
                {CURRENCIES.map((code) => (
                  <button
                    key={code}
                    role="tab"
                    aria-selected={currency === code}
                    disabled={busy}
                    onClick={() =>
                      void navigate({ to: '.', search: (prev) => ({ ...prev, currency: code }) })
                    }
                    className={cn(
                      'rounded-sm px-3 py-1 font-mono text-[11px] font-medium tracking-[0.06em] transition-colors duration-[120ms] motion-reduce:transition-none',
                      currency === code
                        ? 'bg-focus/15 text-focus'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {code}
                  </button>
                ))}
              </div>
            )}
          </div>
          {renderPlans()}
        </section>

        <div className="grid items-start gap-x-12 gap-y-6 sm:grid-cols-2">
          {[
            { id: 'includes', title: 'Every plan includes', items: PLAN_INCLUDES, note: null },
            {
              id: 'how',
              title: 'How billing works',
              items: billingTerms(currency),
              note: BILLING_NOTE[priced],
            },
          ].map(({ id, title, items, note }) => (
            <section key={id} aria-labelledby={id} className="flex flex-col gap-2.5">
              <h2 id={id} className={label}>
                {title}
              </h2>
              <div className="rounded-card bg-panel overflow-hidden border">
                <ul className="divide-border/60 m-0 list-none divide-y p-0">
                  {items.map((item) => (
                    <li key={item} className="flex items-start gap-3 px-4 py-2.5 text-[13px]">
                      <IconCheck aria-hidden className="text-good mt-0.5 size-4 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                {note && (
                  <p className={cn(label, 'border-border/60 border-t px-4 py-2.5')}>{note}</p>
                )}
              </div>
            </section>
          ))}
        </div>

        {purchases.length > 0 && (
          <section aria-labelledby="purchases" className="flex flex-col gap-2.5">
            <h2 id="purchases" className={label}>
              Purchases
            </h2>
            <ul className="rounded-card bg-panel divide-border/60 m-0 list-none divide-y overflow-hidden border p-0">
              {purchases.map((purchase) => (
                <li
                  key={purchase.id}
                  className="flex min-h-[48px] flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3"
                >
                  <span className="text-[13px] font-medium">{planName(purchase.plan)}</span>
                  <span className="text-muted-foreground font-mono text-xs tabular-nums">
                    {formatPrice(purchase.amount, purchase.currency)} ·{' '}
                    {BILLING_STATUS[purchase.status]}
                    {purchase.paid_at && ` · ${formatDate(purchase.paid_at)}`}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  )
}
