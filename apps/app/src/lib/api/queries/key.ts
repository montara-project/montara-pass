import type { KDFUpdateRequest, UserKeysRequest } from '@montara-pass/shared/api/dtos/vault/schema'

import { mutationOptions, queryOptions } from '@tanstack/react-query'

import { getQueryClient } from '@/lib/providers/react-query'

import { isNotFound } from '../api-error'
import { services } from '../services'

const KEY_QUERY_KEY = 'keys'

/**
 * The signed-in user's key set, or null when they have not set up a vault
 * yet: the API answers 404 for that, which is a state here and not an error.
 */
const get = () =>
  queryOptions({
    queryKey: [KEY_QUERY_KEY],
    queryFn: async () => {
      try {
        return (await services.keys.get()).data
      } catch (error) {
        if (isNotFound(error)) return null
        throw error
      }
    },
  })

const create = () => {
  const qc = getQueryClient()

  return mutationOptions({
    mutationFn: async (reqBody: UserKeysRequest) => {
      return services.keys.create(reqBody)
    },
    onSuccess: (res) => {
      qc.setQueryData([KEY_QUERY_KEY], res.data)
    },
  })
}

const updateKDF = () => {
  const qc = getQueryClient()

  return mutationOptions({
    mutationFn: async (reqBody: KDFUpdateRequest) => {
      return services.keys.updateKDF(reqBody)
    },
    onSuccess: (res) => {
      qc.setQueryData([KEY_QUERY_KEY], res.data)
    },
  })
}

export const keyQueries = { get, create, updateKDF } as const
