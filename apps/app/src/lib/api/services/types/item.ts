import type {
  ItemPlacementRequest,
  ItemRotateKeyRequest,
  ItemShareRequest,
} from '@montara-pass/shared/api/dtos/vault/schema'
import type { Models } from '@montara-pass/shared/api/models'

import type {
  AxiosDeleteResponse,
  AxiosItemResponse,
  AxiosListResponse,
  HTTP_METHOD,
  Resources,
} from '@/types/api'

export type ItemMethods = [HTTP_METHOD.GET, HTTP_METHOD.POST, HTTP_METHOD.PUT, HTTP_METHOD.DELETE]

/** The CRUD methods, plus the routes that hang off one item. `delete` moves to the trash. */
export type ItemResources = Resources<ItemMethods, Models.Item> & {
  restore: (id: string) => Promise<AxiosDeleteResponse>
  forceDelete: (id: string) => Promise<AxiosDeleteResponse>
  setPlacement: (id: string, body: ItemPlacementRequest) => Promise<AxiosItemResponse<Models.Item>>
  rotateKey: (id: string, body: ItemRotateKeyRequest) => Promise<AxiosItemResponse<Models.Item>>
  members: (id: string) => Promise<AxiosListResponse<Models.ItemMember>>
  share: (id: string, body: ItemShareRequest) => Promise<AxiosDeleteResponse>
  setMemberRole: (id: string, userId: string, role: string) => Promise<AxiosDeleteResponse>
  removeMember: (id: string, userId: string) => Promise<AxiosDeleteResponse>
}
