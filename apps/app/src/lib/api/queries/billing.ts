import { mutationOptions, queryOptions } from '@tanstack/react-query'

import { services } from '../services'

export const BILLING_QUERY_KEY = 'billing'

const plans = () =>
  queryOptions({
    queryKey: [BILLING_QUERY_KEY, 'plans'],
    queryFn: async () => (await services.billing.plans()).data.data,
  })

const overview = () =>
  queryOptions({
    queryKey: [BILLING_QUERY_KEY, 'overview'],
    queryFn: async () => (await services.billing.overview()).data.data,
  })

/**
 * Subscribing and buying both end on Midtrans' page, which brings the browser
 * back to /billing; the page reads the outcome from the overview then.
 */
const checkout = (start: (planId: string) => Promise<{ checkout_url: string | null }>) =>
  mutationOptions({
    mutationFn: start,
    onSuccess: ({ checkout_url }) => {
      if (checkout_url) window.location.assign(checkout_url)
    },
  })

const subscribe = () =>
  checkout(async (planId) => (await services.billing.subscribe(planId)).data.data)

const buy = () => checkout(async (planId) => (await services.billing.buy(planId)).data.data)

export const billingQueries = { plans, overview, subscribe, buy } as const
