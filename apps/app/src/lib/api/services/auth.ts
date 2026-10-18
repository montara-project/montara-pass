import type { AuthResources } from './types/auth'

import { TOTP_TOKEN_HEADER } from '../../auth/totp'
import { api, AUTH_PATH } from '../client-fetch'

const resources = (): AuthResources => ({
  signIn: (body) => api.post(`${AUTH_PATH}/email-password/sign-in`, body),
  signUp: (body) => api.post(`${AUTH_PATH}/email-password/sign-up`, body),
  me: () => api.get(`${AUTH_PATH}/me`),
  signOut: (body = {}) => api.post(`${AUTH_PATH}/sign-out`, body),
  totpEnable: (password) => api.post(`${AUTH_PATH}/totp/enable`, { password }),
  totpDisable: (password) => api.post(`${AUTH_PATH}/totp/disable`, { password }),
  totpVerify: (totpToken, code) =>
    api.post(`${AUTH_PATH}/totp/verify`, { code }, { headers: { [TOTP_TOKEN_HEADER]: totpToken } }),
  totpVerifyBackupCode: (totpToken, code) =>
    api.post(
      `${AUTH_PATH}/totp/verify-backup-code`,
      { code },
      { headers: { [TOTP_TOKEN_HEADER]: totpToken } }
    ),
})

export const authServices = resources()
