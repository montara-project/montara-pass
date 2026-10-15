import { env } from '@/config/env'

import type { SignInDto, SignUpDto } from '../api/dtos/auth/schema'

import { throwAxiosError } from '../api/axios-error'
import { services } from '../api/services'
import { VERIFY_EMAIL_PATH } from '../constants/auth'
import { useVaultStore } from '../stores/vault'
import { clearAuthTokens, setAuthTokens } from './token-storage'

/**
 * Authenticate against the Go API with email + password. On success the
 * returned tokens are stored and attached to subsequent API requests by the
 * axios interceptor in `client-fetch.ts`.
 */
export async function signInWithEmail(body: SignInDto) {
  try {
    const res = await services.auth.signIn(body)

    if (!res.data.access_token) {
      throw new Error('Sign-in response did not include an access token')
    }

    setAuthTokens({ accessToken: res.data.access_token, refreshToken: res.data.refresh_token })
    return res.data
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
    // API's CORS_ALLOWED_ORIGINS anyway) needs the absolute address.
    const callback_url =
      env.VITE_API_URL === window.location.origin
        ? VERIFY_EMAIL_PATH
        : window.location.origin + VERIFY_EMAIL_PATH
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
