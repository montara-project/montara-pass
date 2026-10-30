import type { FolderRequest } from '@montara-pass/shared/api/dtos/vault/schema'
import type { Models } from '@montara-pass/shared/api/models'

import type { ApiDeleteResponse, ApiItemResponse, ApiListResponse } from '@/types/api'

import { request } from '../client-fetch'

const path = '/api/v1/folders'

export const folderServices = {
  list: () => request<ApiListResponse<Models.Folder>>('GET', path),
  store: (body: FolderRequest) => request<ApiItemResponse<Models.Folder>>('POST', path, { body }),
  update: (id: string, body: FolderRequest) =>
    request<ApiItemResponse<Models.Folder>>('PUT', `${path}/${id}`, { body }),
  delete: (id: string) => request<ApiDeleteResponse>('DELETE', `${path}/${id}`),
}
