import type { Models } from '@montara-pass/shared/api/models'

import type { ApiItemResponse, ApiListResponse } from '@/types/api'

import { request } from '../client-fetch'

/** The blocked IPs list's parameters; offset is 0-based, limit capped at 100 server-side. */
export type IPBlockListParams = {
  offset?: number
  limit?: number
  search?: string
  sorted?: string
  status?: '' | 'active' | 'lifted' | 'expired'
}

/** An IP to block by hand, why, and until when — never, when left out. */
export type IPBlockCreateRequest = {
  ip: string
  reason?: string
  duration?: '1h' | '24h' | '7d' | 'never'
}

const path = '/api/v1/ip-blocks'

export const securityServices = {
  /** The signed-in user's role, which the super-user pages gate on. */
  role: () => request<ApiItemResponse<Models.MeRole>>('GET', '/api/v1/me/role'),
  list: (params?: IPBlockListParams) =>
    request<ApiListResponse<Models.IPBlock>>('GET', path, { params }),
  create: (body: IPBlockCreateRequest) =>
    request<ApiItemResponse<Models.IPBlock>>('POST', path, { body }),
  remove: (id: string) => request<ApiItemResponse<Models.IPBlock>>('DELETE', `${path}/${id}`),
}
