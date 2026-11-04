import { mutationOptions, queryOptions } from '@tanstack/react-query'

import { getQueryClient } from '@/lib/providers/react-query'

import { services } from '../services'

const SESSION_QUERY_KEY = 'sessions'

const list = () =>
  queryOptions({
    queryKey: [SESSION_QUERY_KEY],
    queryFn: async () => (await services.sessions.list()).data,
  })

/** Signing devices out, which refreshes the list. */
function sessionMutation<TVariables, TData>(mutationFn: (variables: TVariables) => Promise<TData>) {
  const qc = getQueryClient()

  return mutationOptions({
    mutationFn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [SESSION_QUERY_KEY] })
    },
  })
}

const revoke = () =>
  sessionMutation(async (id: string) => (await services.sessions.revoke(id)).data)

const revokeOthers = () =>
  sessionMutation(async () => (await services.sessions.revokeOthers()).data)

export const sessionQueries = { list, revoke, revokeOthers } as const
