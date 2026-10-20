import type { SignInDto, SignUpDto } from '@montara-pass/shared/api/dtos/auth/schema'
import type { Profile, SignInData, TotpSetup } from '@montara-pass/shared/api/models/user'
import type { AxiosResponse } from 'axios'

// Authula's routes answer with their own bodies, not the {data} envelope.
export type AuthResources = {
  signIn: (body: SignInDto) => Promise<AxiosResponse<SignInData>>
  // callback_url: where the verification link sends the browser once accepted.
  signUp: (body: SignUpDto & { callback_url?: string }) => Promise<AxiosResponse<SignInData>>
  me: () => Promise<AxiosResponse<Profile>>
  // session_id ends that session of the caller's instead of the current one.
  signOut: (body?: { session_id?: string }) => Promise<AxiosResponse<unknown>>
  // Both take the account password.
  totpEnable: (password: string) => Promise<AxiosResponse<TotpSetup>>
  totpDisable: (password: string, code: string) => Promise<AxiosResponse<unknown>>
  /** Answers the TOTP step with a code from the authenticator app. */
  totpVerify: (totpToken: string, code: string) => Promise<AxiosResponse<SignInData>>
  /** Answers the TOTP step with a backup code. */
  totpVerifyBackupCode: (totpToken: string, code: string) => Promise<AxiosResponse<SignInData>>
}
