import { mutationOptions, queryOptions } from '@tanstack/react-query'

import { getQueryClient } from '@/lib/providers/react-query'

import type { IPBlockCreateRequest, IPBlockListParams } from '../services/security'

import { services } from '../services'

const ROLE_QUERY_KEY = 'me-role'
const IP_BLOCK_QUERY_KEY = 'ip-blocks'

/**
 * The signed-in user's role. It rarely changes, and both the nav and the
 * super-user routes read it, so it is kept a little while.
 */
const role = () =>
  queryOptions({
    queryKey: [ROLE_QUERY_KEY],
    queryFn: async () => (await services.security.role()).data,
    staleTime: 5 * 60 * 1000,
  })

export const LIST_IP_BLOCK_QUERY_KEY = (params?: IPBlockListParams) => [
  IP_BLOCK_QUERY_KEY,
  'list',
  params,
]

const list = (params?: IPBlockListParams) =>
  queryOptions({
    queryKey: LIST_IP_BLOCK_QUERY_KEY(params),
    queryFn: async () => services.security.list(params),
  })

/** A change to the blocks, which refreshes every block list. */
function ipBlockMutation<TVariables, TData>(mutationFn: (variables: TVariables) => Promise<TData>) {
  const qc = getQueryClient()

  return mutationOptions({
    mutationFn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [IP_BLOCK_QUERY_KEY] })
    },
  })
}

const block = () =>
  ipBlockMutation(async (body: IPBlockCreateRequest) => (await services.security.create(body)).data)

const unblock = () =>
  ipBlockMutation(async (id: string) => (await services.security.remove(id)).data)

export const securityQueries = { role, list, block, unblock } as const
