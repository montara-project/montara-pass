import { mutationOptions, queryOptions } from '@tanstack/react-query'

import { getQueryClient } from '@/lib/providers/react-query'

import { services } from '../services'

export const PASSKEY_QUERY_KEY = 'passkeys'

const list = () =>
  queryOptions({
    queryKey: [PASSKEY_QUERY_KEY],
    queryFn: async () => (await services.passkeys.list()).data,
  })

const remove = () => {
  const qc = getQueryClient()
  return mutationOptions({
    mutationFn: async (id: string) => (await services.passkeys.remove(id)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [PASSKEY_QUERY_KEY] })
    },
  })
}

export const passkeyQueries = { list, remove } as const
