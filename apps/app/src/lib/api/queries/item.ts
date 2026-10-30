import type {
  ItemCreateRequest,
  ItemListParams,
  ItemPlacementRequest,
  ItemRotateKeyRequest,
  ItemShareRequest,
  ItemUpdateRequest,
} from '@montara-pass/shared/api/dtos/vault/schema'

import { mutationOptions, queryOptions } from '@tanstack/react-query'

import { getQueryClient } from '@/lib/providers/react-query'

import { services } from '../services'

export const ITEM_QUERY_KEY = 'items'

export const LIST_ITEM_QUERY_KEY = (params?: ItemListParams) => {
  return [ITEM_QUERY_KEY, 'list', params]
}

const ITEM_MEMBERS_QUERY_KEY = (id: string) => {
  return [ITEM_QUERY_KEY, 'members', id]
}

/** Items as the API stores them: still encrypted (see hooks/use-vault.ts). */
const list = (params?: ItemListParams) =>
  queryOptions({
    queryKey: LIST_ITEM_QUERY_KEY(params),
    queryFn: async () => {
      return services.items.list(params)
    },
  })

const members = (id: string) =>
  queryOptions({
    queryKey: ITEM_MEMBERS_QUERY_KEY(id),
    queryFn: async () => {
      return services.items.members(id)
    },
  })

/** A mutation on one item, or on its members, that refreshes every item query. */
function itemMutation<TVariables, TData>(mutationFn: (variables: TVariables) => Promise<TData>) {
  const qc = getQueryClient()

  return mutationOptions({
    mutationFn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [ITEM_QUERY_KEY] })
    },
  })
}

const create = () =>
  itemMutation(async (reqBody: ItemCreateRequest) => {
    return services.items.store(reqBody)
  })

const update = (id: string) =>
  itemMutation(async (reqBody: ItemUpdateRequest) => {
    return services.items.update(id, reqBody)
  })

const setPlacement = (id: string) =>
  itemMutation(async (reqBody: ItemPlacementRequest) => {
    return services.items.setPlacement(id, reqBody)
  })

const rotateKey = (id: string) =>
  itemMutation(async (reqBody: ItemRotateKeyRequest) => {
    return services.items.rotateKey(id, reqBody)
  })

/** Move to the trash. */
const del = () =>
  itemMutation(async (id: string) => {
    return services.items.delete(id)
  })

const restore = () =>
  itemMutation(async (id: string) => {
    return services.items.restore(id)
  })

const forceDelete = () =>
  itemMutation(async (id: string) => {
    return services.items.forceDelete(id)
  })

const share = (id: string) =>
  itemMutation(async (reqBody: ItemShareRequest) => {
    return services.items.share(id, reqBody)
  })

const setMemberRole = (id: string) =>
  itemMutation(async ({ userId, role }: { userId: string; role: string }) => {
    return services.items.setMemberRole(id, userId, role)
  })

const removeMember = (id: string) =>
  itemMutation(async (userId: string) => {
    return services.items.removeMember(id, userId)
  })

export const itemQueries = {
  list,
  members,
  create,
  update,
  setPlacement,
  rotateKey,
  delete: del,
  restore,
  forceDelete,
  share,
  setMemberRole,
  removeMember,
} as const
