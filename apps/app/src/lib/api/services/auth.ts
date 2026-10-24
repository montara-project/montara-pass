import { TOTP_TOKEN_HEADER } from '@montara-pass/shared/auth/totp'

import type { AuthResources } from './types/auth'

import { api, AUTH_PATH } from '../client-fetch'

const resources = (): AuthResources => ({
  signIn: (body) => api.post(`${AUTH_PATH}/email-password/sign-in`, body),
  signUp: (body) => api.post(`${AUTH_PATH}/email-password/sign-up`, body),
  requestPasswordReset: (body) =>
    api.post(`${AUTH_PATH}/email-password/request-password-reset`, body),
  resetPassword: (body) => api.post(`${AUTH_PATH}/email-password/change-password`, body),
  me: () => api.get(`${AUTH_PATH}/me`),
  signOut: (body = {}) => api.post(`${AUTH_PATH}/sign-out`, body),
  totpEnable: (password) => api.post(`${AUTH_PATH}/totp/enable`, { password }),
  totpDisable: (password, code) => api.post(`${AUTH_PATH}/totp/disable`, { password, code }),
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
