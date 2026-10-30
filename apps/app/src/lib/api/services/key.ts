import type { KDFUpdateRequest, UserKeysRequest } from '@montara-pass/shared/api/dtos/vault/schema'
import type { Models } from '@montara-pass/shared/api/models'

import type { ApiItemResponse } from '@/types/api'

import { request } from '../client-fetch'

const path = '/api/v1/keys'

export const keyServices = {
  /** 404 until the signed-in user has set up a vault. */
  get: () => request<ApiItemResponse<Models.UserKeys>>('GET', path),
  create: (body: UserKeysRequest) =>
    request<ApiItemResponse<Models.UserKeys>>('POST', path, { body }),
  updateKDF: (body: KDFUpdateRequest) =>
    request<ApiItemResponse<Models.UserKeys>>('PUT', path, { body }),
  /** 404 when nobody with that email has a vault. */
  publicKey: (email: string) =>
    request<ApiItemResponse<Models.PublicKey>>('GET', `${path}/public`, { params: { email } }),
}
