import { mutationOptions, queryOptions } from '@tanstack/react-query'

import { getQueryClient } from '@/lib/providers/react-query'

import type {
  ItemCreateRequest,
  ItemListParams,
  ItemPlacementRequest,
  ItemRotateKeyRequest,
  ItemShareRequest,
  ItemUpdateRequest,
} from '../dtos/vault/schema'

import { services } from '../services'

export const ITEM_QUERY_KEY = 'items'

export const LIST_ITEM_QUERY_KEY = (params?: ItemListParams) => {
  return [ITEM_QUERY_KEY, 'list', params]
}

export const ITEM_MEMBERS_QUERY_KEY = (id: string) => {
  return [ITEM_QUERY_KEY, 'members', id]
}

/** Items as the API stores them: still encrypted (see hooks/use-vault.ts). */
const list = (params?: ItemListParams) =>
  queryOptions({
    queryKey: LIST_ITEM_QUERY_KEY(params),
    queryFn: async () => {
      const res = await services.items.list(params)
      return res.data
    },
  })

const members = (id: string) =>
  queryOptions({
    queryKey: ITEM_MEMBERS_QUERY_KEY(id),
    queryFn: async () => {
      const res = await services.items.members(id)
      return res.data
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
    const res = await services.items.store(reqBody)
    return res.data
  })

const update = (id: string) =>
  itemMutation(async (reqBody: ItemUpdateRequest) => {
    const res = await services.items.update(id, reqBody)
    return res.data
  })

const setPlacement = (id: string) =>
  itemMutation(async (reqBody: ItemPlacementRequest) => {
    const res = await services.items.setPlacement(id, reqBody)
    return res.data
  })

const rotateKey = (id: string) =>
  itemMutation(async (reqBody: ItemRotateKeyRequest) => {
    const res = await services.items.rotateKey(id, reqBody)
    return res.data
  })

/** Move to the trash. */
const del = () =>
  itemMutation(async (id: string) => {
    const res = await services.items.delete(id)
    return res.data
  })

const restore = () =>
  itemMutation(async (id: string) => {
    const res = await services.items.restore(id)
    return res.data
  })

const forceDelete = () =>
  itemMutation(async (id: string) => {
    const res = await services.items.forceDelete(id)
    return res.data
  })

const share = (id: string) =>
  itemMutation(async (reqBody: ItemShareRequest) => {
    const res = await services.items.share(id, reqBody)
    return res.data
  })

const setMemberRole = (id: string) =>
  itemMutation(async ({ userId, role }: { userId: string; role: string }) => {
    const res = await services.items.setMemberRole(id, userId, role)
    return res.data
  })

const removeMember = (id: string) =>
  itemMutation(async (userId: string) => {
    const res = await services.items.removeMember(id, userId)
    return res.data
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
