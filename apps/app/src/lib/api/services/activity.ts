import type { Models } from '@montara-pass/shared/api/models'

import type { ApiListResponse } from '@/types/api'

import { request } from '../client-fetch'

/** The activity log's parameters; offset is 0-based, limit capped at 100 server-side. */
export type ActivityListParams = {
  offset?: number
  limit?: number
}

export const activityServices = {
  list: (params?: ActivityListParams) =>
    request<ApiListResponse<Models.Activity>>('GET', '/api/v1/activity', { params }),
}
