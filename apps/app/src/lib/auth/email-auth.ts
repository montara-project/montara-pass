import type { SignInDto, SignUpDto } from '@montara-pass/shared/api/dtos/auth/schema'
import type { SignInData } from '@montara-pass/shared/api/models/user'

import { isTotpCode, TOTP_CODE_REQUIRED } from '@montara-pass/shared/auth/totp'

import { env } from '@/config/env'

import { throwAxiosError } from '../api/axios-error'
import { services } from '../api/services'
import { VERIFY_EMAIL_PATH } from '../constants/auth'
import { useVaultStore } from '../stores/vault'
import { clearAuthTokens, setAuthTokens } from './token-storage'

function storeSignIn(data: SignInData) {
  if (!data.access_token) {
    throw new Error('Sign-in response did not include an access token')
  }
  setAuthTokens({ accessToken: data.access_token, refreshToken: data.refresh_token })
}

/**
 * Authenticate against the Go API with email + password. On success the
 * returned tokens are stored and attached to subsequent API requests by the
 * axios interceptor in `client-fetch.ts`. A user who turned TOTP on gets no
 * tokens yet but a `totpToken`, for {@link verifyTotp}.
 */
export async function signInWithEmail(body: SignInDto): Promise<{ totpToken?: string }> {
  try {
    const res = await services.auth.signIn(body)
    if (res.data.totp_token) {
      return { totpToken: res.data.totp_token }
    }

    storeSignIn(res.data)
    return {}
  } catch (error) {
    throwAxiosError(error)
  }
}

/**
 * Finish a sign-in that stopped at the TOTP step, with a code from the app or
 * a backup code. Backup codes are lowercase; a phone keyboard may have
 * capitalised one.
 */
export async function verifyTotp(totpToken: string, code: string) {
  try {
    const res = isTotpCode(code)
      ? await services.auth.totpVerify(totpToken, code)
      : await services.auth.totpVerifyBackupCode(totpToken, code.toLowerCase())
    storeSignIn(res.data)
  } catch (error) {
    throwAxiosError(error)
  }
}

/**
 * Turn TOTP on with a code from the new secret; only such a code does. It
 * begins a session of its own, whose tokens replace the current ones before
 * the old session is ended by its id: a request that meets the ended session
 * then refreshes with the new tokens.
 */
export async function confirmTotp(totpToken: string, code: string) {
  if (!isTotpCode(code)) {
    throw new Error(TOTP_CODE_REQUIRED)
  }
  try {
    const old = (await services.auth.me()).data.session.id
    const res = await services.auth.totpVerify(totpToken, code)
    storeSignIn(res.data)
    await services.auth.signOut({ session_id: old }).catch(() => {})
  } catch (error) {
    throwAxiosError(error)
  }
}

/**
 * Create an account. The API signs the new user in only once their email is
 * verified, so `signedIn` tells the caller whether to continue or to send the
 * user to their inbox.
 */
export async function signUpWithEmail(body: SignUpDto): Promise<{ signedIn: boolean }> {
  try {
    // The link opens on the API's origin. A relative path needs no trusted
    // origin there; only a split-origin setup (which lists this app in the
    // API's CORS_ALLOWED_ORIGINS anyway) needs the absolute address. In dev the
    // API's origin is the Go server behind Vite's proxy, not this page, so the
    // address is always absolute. The API redirects only once the link is
    // accepted, so `verified=1` tells the page the address is confirmed.
    const callbackPath = `${VERIFY_EMAIL_PATH}?verified=1`
    const callback_url =
      !import.meta.env.DEV && env.VITE_API_URL === window.location.origin
        ? callbackPath
        : window.location.origin + callbackPath
    const res = await services.auth.signUp({ ...body, callback_url })

    if (!res.data.access_token) {
      return { signedIn: false }
    }

    setAuthTokens({ accessToken: res.data.access_token, refreshToken: res.data.refresh_token })
    return { signedIn: true }
  } catch (error) {
    throwAxiosError(error)
  }
}

/**
 * Sign out: the API ends the session, then the stored tokens and the unlocked
 * vault keys are dropped. Best-effort — a session that is already gone still
 * leaves the client signed out.
 */
export async function signOut() {
  try {
    await services.auth.signOut()
  } catch {
    // Ignore: there is no session left to end.
  } finally {
    clearAuthTokens()
    useVaultStore.getState().lock()
  }
}
