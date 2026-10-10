import { HTTP_METHOD } from '@/types/api'

import type { Models } from '../models'
import type { ItemMethods, ItemResources } from './types/item'

import { api } from '../client-fetch'
import { clientResource } from '../resource'

const path = '/v1/items'

const methods: ItemMethods = [
  HTTP_METHOD.GET,
  HTTP_METHOD.POST,
  HTTP_METHOD.PUT,
  HTTP_METHOD.DELETE,
]

const resources = (): ItemResources => {
  return {
    ...clientResource<string, ItemMethods, Models.Item>(path, methods),
    restore: (id) => api.put(`${path}/${id}/restore`),
    forceDelete: (id) => api.delete(`${path}/${id}/force`),
    setPlacement: (id, body) => api.put(`${path}/${id}/placement`, body),
    rotateKey: (id, body) => api.put(`${path}/${id}/key`, body),
    members: (id) => api.get(`${path}/${id}/members`),
    share: (id, body) => api.post(`${path}/${id}/members`, body),
    setMemberRole: (id, userId, role) => api.put(`${path}/${id}/members/${userId}`, { role }),
    removeMember: (id, userId) => api.delete(`${path}/${id}/members/${userId}`),
  }
}

export const itemServices = resources()
