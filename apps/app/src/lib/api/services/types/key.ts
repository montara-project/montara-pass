import type { KDFUpdateRequest, UserKeysRequest } from '@montara-pass/shared/api/dtos/vault/schema'
import type { Models } from '@montara-pass/shared/api/models'

import type { AxiosItemResponse } from '@/types/api'

export type KeyResources = {
  /** 404 until the signed-in user has set up a vault. */
  get: () => Promise<AxiosItemResponse<Models.UserKeys>>
  create: (body: UserKeysRequest) => Promise<AxiosItemResponse<Models.UserKeys>>
  updateKDF: (body: KDFUpdateRequest) => Promise<AxiosItemResponse<Models.UserKeys>>
  /** 404 when nobody with that email has a vault. */
  publicKey: (email: string) => Promise<AxiosItemResponse<Models.PublicKey>>
}
