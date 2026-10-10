import { redirect } from '@tanstack/react-router'

import { HOME_PATH, SIGN_IN_PATH } from '../constants/auth'
import { hasStoredSession } from './token-storage'

// Both guards only look for stored tokens (see token-storage.ts). A token
// that turns out to be dead is caught by the axios interceptor on the first
// API call, which sends the browser to sign-in.

/** For routes that need a signed-in user: everyone else goes to sign-in. */
export function requireSession() {
  if (!hasStoredSession()) {
    throw redirect({ to: SIGN_IN_PATH, replace: true })
  }
}

/** For sign-in and sign-up: a signed-in user goes home instead. */
export function redirectIfAuthenticated() {
  if (hasStoredSession()) {
    throw redirect({ to: HOME_PATH, replace: true })
  }
}
