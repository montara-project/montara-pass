import type { Models } from '@montara-pass/shared/api/models'

import type { ApiItemResponse, ApiListResponse, Metadata } from '@/types/api'

import { request } from '../client-fetch'

/**
 * The plan list's metadata: the only currency the caller may buy in, where
 * the server knows their country (IDR in Indonesia, USD elsewhere).
 */
export type PlanListMeta = Metadata & { currency?: 'USD' | 'IDR' }

export const billingServices = {
  /** The plans on offer; public. */
  plans: () => request<ApiListResponse<Models.Plan, PlanListMeta>>('GET', '/api/v1/plans'),
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
