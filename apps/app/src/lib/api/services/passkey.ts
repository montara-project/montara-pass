import type { Models } from '@montara-pass/shared/api/models'

import type { ApiItemResponse } from '@/types/api'

import { request } from '../client-fetch'

const path = '/api/v1/passkeys'

/** What registering a passkey sends once the browser has made it. */
export type PasskeyRegisterRequest = {
  ceremony: string
  name: string
  credential: unknown
  /** The vault key sealed under the passkey's PRF output; left out without PRF. */
  encrypted_vault_key?: string
}

/** The passkeys on the account: signing in with one is in the auth services. */
export const passkeyServices = {
  list: () => request<ApiItemResponse<Models.AccountPasskey[]>>('GET', path),
  /** Takes the account password. */
  registerBegin: (password: string) =>
    request<ApiItemResponse<Models.PasskeyCeremony>>('POST', `${path}/register/begin`, {
      body: { password },
    }),
  registerFinish: (body: PasskeyRegisterRequest) =>
    request<ApiItemResponse<Models.AccountPasskey>>('POST', `${path}/register/finish`, { body }),
  remove: (id: string) => request<ApiItemResponse<unknown>>('DELETE', `${path}/${id}`),
}
