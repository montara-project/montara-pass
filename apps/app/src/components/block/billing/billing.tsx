import { useMutation, useQuery } from '@tanstack/react-query'
import { useQueryState } from 'nuqs'

import type { Models } from '@/lib/api/models'

import Page from '@/components/layout/page'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { toastAxiosError } from '@/lib/api/axios-error'
import { queries } from '@/lib/api/queries'
import { formatDate } from '@/lib/date'
import { formatPrice } from '@/lib/money'
import { cn } from '@/lib/utils'

const INTERVAL = { month: 'month', year: 'year' } as const

/** The price with its period, if it has one: "Rp50,000 / month". */
function price(plan: Models.Plan) {
  const amount = formatPrice(plan.amount, plan.currency)
  return plan.billing_interval ? `${amount} / ${INTERVAL[plan.billing_interval]}` : amount
}

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
 * Billing, Enterprise Edition only: the subscription and purchases of the
 * signed-in user, and the plans on offer. Paying happens on Midtrans' page,
 * which sends the browser back here; the payment shows once Midtrans has
 * told the server, so a pending one is polled for.
 */
export default function BillingBlock() {
  // ?plan= names the plan the website sent the user here for.
  const [chosen] = useQueryState('plan')
  // Midtrans adds ?transaction_status= when it brings the browser back.
  const [returned] = useQueryState('transaction_status')

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
  const busy = subscribe.isPending || buy.isPending

  const subscription = overview.data?.subscription ?? null
  const purchases = overview.data?.purchases ?? []
  const owned = (plan: Models.Plan) =>
    purchases.find(
      (purchase) =>
        purchase.plan_id === plan.id &&
        (purchase.status === 'paid' || purchase.status === 'pending')
    )

  return (
    <Page title="Billing" description="Your plan, and what you have bought." width="wide">
      {returned && subscription?.status !== 'active' && (
        <p className="rounded-card bg-hover px-4 py-3 text-[13px]">
          Thanks. Your payment is being confirmed; this page updates once it has gone through.
        </p>
      )}

      <section aria-labelledby="current" className="flex flex-col gap-2">
        <h2 id="current" className="text-muted-foreground pl-1 text-[13px] font-semibold">
          Subscription
        </h2>
        <div className="rounded-card flex min-h-[64px] flex-wrap items-center justify-between gap-4 border px-4 py-3">
          {overview.isLoading ? (
            <Skeleton className="h-4 w-48" />
          ) : subscription ? (
            <>
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="font-medium">{subscription.plan.name}</span>
                <span className="text-muted-foreground text-[13px]">
                  {STATUS[subscription.status]}
                  {subscription.status === 'active' &&
                    ` until ${formatDate(subscription.current_period_end)}`}
                </span>
              </div>
              {subscription.checkout_url && (
                <Button asChild size="sm">
                  <a href={subscription.checkout_url}>Continue payment</a>
                </Button>
              )}
            </>
          ) : (
            <span className="text-muted-foreground text-[13px]">No subscription.</span>
          )}
        </div>
      </section>

      <section aria-labelledby="plans" className="flex flex-col gap-2">
        <h2 id="plans" className="text-muted-foreground pl-1 text-[13px] font-semibold">
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
              // One subscription at a time; a new period once this one ends.
              const subscribed = plan.billing === 'recurring' && subscription !== null
              return (
                <li
                  key={plan.id}
                  className={cn(
                    'rounded-card flex flex-col gap-3 border p-4',
                    chosen === plan.code && 'border-primary'
                  )}
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium">{plan.name}</span>
                    <span className="text-[15px] font-semibold tabular-nums">{price(plan)}</span>
                  </div>
                  {plan.description && (
                    <p className="text-muted-foreground flex-1 text-[13px]">{plan.description}</p>
                  )}
                  {purchase?.status === 'paid' ? (
                    <span className="text-muted-foreground mt-auto text-[13px]">You own this.</span>
                  ) : purchase?.checkout_url ? (
                    <Button asChild size="sm" className="mt-auto">
                      <a href={purchase.checkout_url}>Continue payment</a>
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      className="mt-auto"
                      variant={chosen === plan.code ? 'primary' : 'outline'}
                      disabled={busy || subscribed || overview.isLoading}
                      onClick={() =>
                        plan.billing === 'recurring'
                          ? subscribe.mutate(plan.id)
                          : buy.mutate(plan.id)
                      }
                    >
                      {plan.billing === 'recurring' ? 'Subscribe' : 'Buy'}
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
          <h2 id="purchases" className="text-muted-foreground pl-1 text-[13px] font-semibold">
            Purchases
          </h2>
          <ul className="rounded-card m-0 list-none divide-y overflow-hidden border p-0">
            {purchases.map((purchase) => (
              <li
                key={purchase.id}
                className="flex min-h-[52px] items-center justify-between gap-4 px-4 py-3"
              >
                <span className="font-medium">{purchase.plan.name}</span>
                <span className="text-muted-foreground text-[13px] tabular-nums">
                  {formatPrice(purchase.amount, purchase.currency)} · {STATUS[purchase.status]}
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
