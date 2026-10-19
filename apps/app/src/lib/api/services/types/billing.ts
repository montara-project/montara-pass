import type { Models } from '@montara-pass/shared/api/models'

import type { AxiosItemResponse } from '@/types/api'

export type BillingResources = {
  /** The plans on offer; public. */
  plans: () => Promise<AxiosItemResponse<Models.Plan[]>>
  overview: () => Promise<AxiosItemResponse<Models.BillingOverview>>
  /** Answers the subscription with the checkout_url to pay at. */
  subscribe: (planId: string) => Promise<AxiosItemResponse<Models.Subscription>>
  buy: (planId: string) => Promise<AxiosItemResponse<Models.Purchase>>
  /** The customer portal, where a subscription is cancelled or its card changed. */
  portal: () => Promise<AxiosItemResponse<Models.BillingPortal>>
}
