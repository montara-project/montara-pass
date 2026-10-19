import type { FolderRequest } from '@montara-pass/shared/api/dtos/vault/schema'

import { mutationOptions, queryOptions } from '@tanstack/react-query'

import { getQueryClient } from '@/lib/providers/react-query'

import { services } from '../services'
import { ITEM_QUERY_KEY } from './item'

export const FOLDER_QUERY_KEY = 'folders'

/** Folders as the API stores them: names still encrypted (see hooks/use-vault.ts). */
const list = () =>
  queryOptions({
    queryKey: [FOLDER_QUERY_KEY, 'list'],
    queryFn: async () => {
      const res = await services.folders.list()
      return res.data
    },
  })

const create = () => {
  const qc = getQueryClient()

  return mutationOptions({
    mutationFn: async (reqBody: FolderRequest) => {
      const res = await services.folders.store(reqBody)
      return res.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [FOLDER_QUERY_KEY] })
    },
  })
}

const update = (id: string) => {
  const qc = getQueryClient()

  return mutationOptions({
    mutationFn: async (reqBody: FolderRequest) => {
      const res = await services.folders.update(id, reqBody)
      return res.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [FOLDER_QUERY_KEY] })
    },
  })
}

const del = () => {
  const qc = getQueryClient()

  return mutationOptions({
    mutationFn: async (id: string) => {
      const res = await services.folders.delete(id)
      return res.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [FOLDER_QUERY_KEY] })
      // Deleting a folder unfiles the items that were in it.
      qc.invalidateQueries({ queryKey: [ITEM_QUERY_KEY] })
    },
  })
}

export const folderQueries = { list, create, update, delete: del } as const
