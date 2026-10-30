import type {
  ItemCreateRequest,
  ItemListParams,
  ItemPlacementRequest,
  ItemRotateKeyRequest,
  ItemShareRequest,
  ItemUpdateRequest,
} from '@montara-pass/shared/api/dtos/vault/schema'
import type { Models } from '@montara-pass/shared/api/models'

import type { ApiDeleteResponse, ApiItemResponse, ApiListResponse } from '@/types/api'

import { request } from '../client-fetch'

const path = '/api/v1/items'

/** The CRUD routes, plus the ones that hang off one item. `delete` moves to the trash. */
export const itemServices = {
  list: (params?: ItemListParams) => request<ApiListResponse<Models.Item>>('GET', path, { params }),
  store: (body: ItemCreateRequest) => request<ApiItemResponse<Models.Item>>('POST', path, { body }),
  update: (id: string, body: ItemUpdateRequest) =>
    request<ApiItemResponse<Models.Item>>('PUT', `${path}/${id}`, { body }),
  delete: (id: string) => request<ApiDeleteResponse>('DELETE', `${path}/${id}`),
  restore: (id: string) => request<ApiDeleteResponse>('PUT', `${path}/${id}/restore`),
  forceDelete: (id: string) => request<ApiDeleteResponse>('DELETE', `${path}/${id}/force`),
  setPlacement: (id: string, body: ItemPlacementRequest) =>
    request<ApiItemResponse<Models.Item>>('PUT', `${path}/${id}/placement`, { body }),
  rotateKey: (id: string, body: ItemRotateKeyRequest) =>
    request<ApiItemResponse<Models.Item>>('PUT', `${path}/${id}/key`, { body }),
  members: (id: string) =>
    request<ApiListResponse<Models.ItemMember>>('GET', `${path}/${id}/members`),
  share: (id: string, body: ItemShareRequest) =>
    request<ApiDeleteResponse>('POST', `${path}/${id}/members`, { body }),
  setMemberRole: (id: string, userId: string, role: string) =>
    request<ApiDeleteResponse>('PUT', `${path}/${id}/members/${userId}`, { body: { role } }),
  removeMember: (id: string, userId: string) =>
    request<ApiDeleteResponse>('DELETE', `${path}/${id}/members/${userId}`),
}
