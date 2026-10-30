import type { SignInDto, SignUpDto } from '@montara-pass/shared/api/dtos/auth/schema'
import type { Profile, SignInData, TotpSetup } from '@montara-pass/shared/api/models/user'

import { TOTP_TOKEN_HEADER } from '@montara-pass/shared/auth/totp'

import { AUTH_PATH, request } from '../client-fetch'

// Authula's routes answer with their own bodies, not the {data} envelope.
export const authServices = {
  signIn: (body: SignInDto) =>
    request<SignInData>('POST', `${AUTH_PATH}/email-password/sign-in`, { body }),
  // callback_url: where the verification link sends the browser once accepted.
  signUp: (body: SignUpDto & { callback_url?: string }) =>
    request<SignInData>('POST', `${AUTH_PATH}/email-password/sign-up`, { body }),
  // callback_url: where the reset link sends the browser, with the token added.
  requestPasswordReset: (body: { email: string; callback_url: string }) =>
    request<unknown>('POST', `${AUTH_PATH}/email-password/request-password-reset`, { body }),
  resetPassword: (body: { token: string; password: string }) =>
    request<unknown>('POST', `${AUTH_PATH}/email-password/change-password`, { body }),
  me: () => request<Profile>('GET', `${AUTH_PATH}/me`),
  // session_id ends that session of the caller's instead of the current one.
  signOut: (body: { session_id?: string } = {}) =>
    request<unknown>('POST', `${AUTH_PATH}/sign-out`, { body }),
  // Both take the account password.
  totpEnable: (password: string) =>
    request<TotpSetup>('POST', `${AUTH_PATH}/totp/enable`, { body: { password } }),
  totpDisable: (password: string, code: string) =>
    request<unknown>('POST', `${AUTH_PATH}/totp/disable`, { body: { password, code } }),
  /** Answers the TOTP step with a code from the authenticator app. */
  totpVerify: (totpToken: string, code: string) =>
    request<SignInData>('POST', `${AUTH_PATH}/totp/verify`, {
      body: { code },
      headers: { [TOTP_TOKEN_HEADER]: totpToken },
    }),
  /** Answers the TOTP step with a backup code. */
  totpVerifyBackupCode: (totpToken: string, code: string) =>
    request<SignInData>('POST', `${AUTH_PATH}/totp/verify-backup-code`, {
      body: { code },
      headers: { [TOTP_TOKEN_HEADER]: totpToken },
    }),
}
