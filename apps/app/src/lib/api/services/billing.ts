import type { BillingResources } from './types/billing'

import { api } from '../client-fetch'

const resources = (): BillingResources => ({
  plans: () => api.get('/api/v1/plans'),
  overview: () => api.get('/api/v1/billing'),
  subscribe: (planId) => api.post('/api/v1/billing/subscriptions', { plan_id: planId }),
  buy: (planId) => api.post('/api/v1/billing/purchases', { plan_id: planId }),
})

export const billingServices = resources()
