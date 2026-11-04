import { queryOptions } from '@tanstack/react-query'

import type { ActivityListParams } from '../services/activity'

import { services } from '../services'

const ACTIVITY_QUERY_KEY = 'activity'

const list = (params?: ActivityListParams) =>
  queryOptions({
    queryKey: [ACTIVITY_QUERY_KEY, 'list', params],
    queryFn: async () => services.activity.list(params),
  })

export const activityQueries = { list } as const
