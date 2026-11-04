import type { Models } from '@montara-pass/shared/api/models'

import type { ApiItemResponse } from '@/types/api'

import { request } from '../client-fetch'

const path = '/api/v1/sessions'

/** The devices signed in to the account, and signing them out. */
export const sessionServices = {
  list: () => request<ApiItemResponse<Models.Device[]>>('GET', path),
  /** Signs one other device out; the current one signs out the usual way. */
  revoke: (id: string) => request<ApiItemResponse<{ revoked: number }>>('DELETE', `${path}/${id}`),
  /** Signs out every device but this one. */
  revokeOthers: () => request<ApiItemResponse<{ revoked: number }>>('DELETE', path),
}
