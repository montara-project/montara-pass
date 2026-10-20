import type { Models } from '@montara-pass/shared/api/models'

import { formatDate } from '@montara-pass/shared/date'
import { formatPrice } from '@montara-pass/shared/money'
import {
  isSandbox,
  planName,
  planOffer,
  planPeriod,
  planSaving,
  planTerms,
} from '@montara-pass/shared/plan'
import { useMutation, useQuery } from '@tanstack/react-query'
import { CreditCard } from 'lucide-react'
import { useQueryState } from 'nuqs'

import Page from '@/components/layout/page'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { toastAxiosError } from '@/lib/api/axios-error'
import { queries } from '@/lib/api/queries'
import { cn } from '@/lib/utils'

const label = 'text-muted-foreground pl-1 font-mono text-[11px] tracking-[0.12em] uppercase'

const STATUS: Record<Models.Subscription['status'] | Models.Purchase['status'], string> = {
  pending: 'Waiting for payment',
  active: 'Active',
  paid: 'Paid',
  canceled: 'Canceled',
  expired: 'Expired',
  failed: 'Payment failed',
  refunded: 'Refunded',
}

/**
 * Billing, Cloud Edition only: the subscription and purchases of the
 * signed-in user, and the plans on offer. Paying happens on Lemon Squeezy's
 * checkout, which sends the browser back here; the payment shows once Lemon
 * Squeezy has told the server, so a pending one is polled for. A subscription
 * renews by itself and is cancelled in Lemon Squeezy's customer portal.
 */
export default function BillingBlock() {
  // ?plan= names the plan the website sent the user here for.
  const [chosen] = useQueryState('plan')
  // The checkout sends the browser back with ?checkout=done.
  const [returned] = useQueryState('checkout')

  const plans = useQuery(queries.billing.plans())
  const overview = useQuery({
    ...queries.billing.overview(),
    refetchInterval: (query) => {
      const data = query.state.data
      const pending =
        data?.subscription?.status === 'pending' ||
        data?.purchases.some((purchase) => purchase.status === 'pending')
      return pending ? 5000 : false
    },
  })
  const subscribe = useMutation({ ...queries.billing.subscribe(), onError: toastAxiosError })
  const buy = useMutation({ ...queries.billing.buy(), onError: toastAxiosError })
  const portal = useMutation({ ...queries.billing.portal(), onError: toastAxiosError })
  const busy = subscribe.isPending || buy.isPending

  const subscription = overview.data?.subscription ?? null
  const purchases = overview.data?.purchases ?? []
  const owned = (plan: Models.Plan) =>
    purchases.find(
      (purchase) =>
        purchase.plan_id === plan.id &&
        (purchase.status === 'paid' || purchase.status === 'pending')
    )
  const lifetime = purchases.some((purchase) => purchase.status === 'paid')
  // The plan marked out: the one the website sent the user here for, or else
  // the yearly one.
  const featured =
    plans.data?.find((plan) => plan.code === chosen) ??
    plans.data?.find((plan) => plan.billing_interval === 'year')
  const currency = plans.data?.[0]?.currency

  return (
    <Page
      title="Billing"
      icon={CreditCard}
      description={`Your plan, and what you have bought.${currency ? ` Prices in ${currency}.` : ''}`}
      width="wide"
    >
      {returned && subscription?.status !== 'active' && (
        <p className="rounded-card bg-hover px-4 py-3 text-[13px]">
          Thanks. Your payment is being confirmed; this page updates once it has gone through.
        </p>
      )}

      <section aria-labelledby="current" className="flex flex-col gap-2">
        <h2 id="current" className={label}>
          Subscription
        </h2>
        <div className="rounded-card bg-card flex min-h-[64px] flex-wrap items-center justify-between gap-4 border px-4 py-3">
          {overview.isLoading ? (
            <Skeleton className="h-4 w-48" />
          ) : subscription ? (
            <>
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="font-medium">{planName(subscription.plan)}</span>
                <span className="text-muted-foreground text-[13px]">
                  {STATUS[subscription.status]}
                  {subscription.status === 'active' &&
                    (subscription.canceled_at
                      ? `, ends ${formatDate(subscription.current_period_end)}`
                      : `, renews ${formatDate(subscription.current_period_end)}`)}
                </span>
              </div>
              {subscription.checkout_url ? (
                <Button asChild size="sm">
                  <a href={subscription.checkout_url}>Continue payment</a>
                </Button>
              ) : (
                subscription.status === 'active' && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={portal.isPending}
                    onClick={() => portal.mutate()}
                  >
                    Manage subscription
                  </Button>
                )
              )}
            </>
          ) : (
            <>
              <span className="text-muted-foreground text-[13px]">No subscription.</span>
              {!lifetime && (
                <span className="bg-focus/15 text-focus rounded-full px-2.5 py-0.5 text-xs font-medium">
                  free tier
                </span>
              )}
            </>
          )}
        </div>
      </section>

      <section aria-labelledby="plans" className="flex flex-col gap-2">
        <h2 id="plans" className={label}>
          Plans
        </h2>
        {plans.isLoading ? (
          <Skeleton className="rounded-card h-40 w-full" />
        ) : !plans.data?.length ? (
          <p className="text-muted-foreground pl-1 text-[13px]">No plans are on offer yet.</p>
        ) : (
          <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2 lg:grid-cols-3">
            {plans.data.map((plan) => {
              const purchase = plan.billing === 'one_time' ? owned(plan) : undefined
              // One subscription at a time; another once this one has ended.
              const subscribed = plan.billing === 'recurring' && subscription !== null
              const marked = plan.id === featured?.id
              const saving = planSaving(plan, plans.data)
              const offer = planOffer(plan, formatPrice(plan.amount, 'USD'))
              return (
                <li
                  key={plan.id}
                  className={cn(
                    'rounded-card bg-card flex flex-col gap-4 border p-5',
                    // The featured plan: marked on the edge, in the one token
                    // that holds 3:1 on a card in both themes (--focus:
                    // Electric Blue on light, Arctic Cyan on dark).
                    marked && 'border-focus bg-hover'
                  )}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">{planName(plan)}</span>
                    <span className="flex items-center gap-1.5 whitespace-nowrap">
                      {saving && (
                        <span className="bg-focus/15 text-focus rounded-full px-2.5 py-0.5 text-xs font-medium tabular-nums">
                          Save {saving.percent}%
                        </span>
                      )}
                      {isSandbox(plan) && (
                        <span className="text-muted-foreground rounded-full border px-2.5 py-0.5 font-mono text-[11px]">
                          sandbox
                        </span>
                      )}
                    </span>
                  </div>
                  <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1 font-mono tabular-nums">
                    <span className="text-[28px] leading-none font-medium">
                      {formatPrice(saving?.amount ?? plan.amount, 'USD')}
                    </span>
                    <span className="text-muted-foreground text-xs">{planPeriod(plan)}</span>
                    {saving && (
                      <s className="text-muted-foreground decoration-muted-foreground/70 text-xs">
                        <span className="sr-only">was </span>
                        {formatPrice(saving.was, 'USD')}
                      </s>
                    )}
                  </p>
                  <div className="mb-4 flex flex-col gap-1 font-mono text-xs">
                    {offer && <p>{offer}</p>}
                    <p className="text-muted-foreground">{planTerms(plan)}</p>
                  </div>
                  {purchase?.status === 'paid' ? (
                    <span className="text-muted-foreground mt-auto pt-4 text-[13px]">
                      You own this.
                    </span>
                  ) : purchase?.checkout_url ? (
                    <Button asChild size="md" className="mt-auto w-full">
                      <a href={purchase.checkout_url}>Continue payment</a>
                    </Button>
                  ) : (
                    <Button
                      size="md"
                      className="mt-auto w-full"
                      variant={marked ? 'mono' : 'outline'}
                      disabled={busy || subscribed || overview.isLoading}
                      onClick={() =>
                        plan.billing === 'recurring'
                          ? subscribe.mutate(plan.id)
                          : buy.mutate(plan.id)
                      }
                    >
                      {plan.billing === 'recurring' ? 'Subscribe' : 'Buy once'}
                    </Button>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {purchases.length > 0 && (
        <section aria-labelledby="purchases" className="flex flex-col gap-2">
          <h2 id="purchases" className={label}>
            Purchases
          </h2>
          <ul className="rounded-card bg-card m-0 list-none divide-y overflow-hidden border p-0">
            {purchases.map((purchase) => (
              <li
                key={purchase.id}
                className="flex min-h-[52px] items-center justify-between gap-4 px-4 py-3"
              >
                <span className="font-medium">{planName(purchase.plan)}</span>
                <span className="text-muted-foreground text-[13px] tabular-nums">
                  {formatPrice(purchase.amount, 'USD')} · {STATUS[purchase.status]}
                  {purchase.paid_at && ` · ${formatDate(purchase.paid_at)}`}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </Page>
  )
}
