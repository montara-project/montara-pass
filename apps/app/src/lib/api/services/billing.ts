import type { Models } from '@montara-pass/shared/api/models'

import type { ApiItemResponse } from '@/types/api'

import { request } from '../client-fetch'

export const billingServices = {
  /** The plans on offer; public. */
  plans: () => request<ApiItemResponse<Models.Plan[]>>('GET', '/api/v1/plans'),
  overview: () => request<ApiItemResponse<Models.BillingOverview>>('GET', '/api/v1/billing'),
  /** Answers the subscription with the checkout_url to pay at. */
  subscribe: (planId: string) =>
    request<ApiItemResponse<Models.Subscription>>('POST', '/api/v1/billing/subscriptions', {
      body: { plan_id: planId },
    }),
  buy: (planId: string) =>
    request<ApiItemResponse<Models.Purchase>>('POST', '/api/v1/billing/purchases', {
      body: { plan_id: planId },
    }),
  /** The customer portal, where a subscription is cancelled or its card changed. */
  portal: () => request<ApiItemResponse<Models.BillingPortal>>('GET', '/api/v1/billing/portal'),
}
