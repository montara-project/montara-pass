'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useSyncExternalStore } from 'react'

import { hasStoredSession } from '@/lib/auth/token-storage'
import { HOME_PATH, SIGN_IN_PATH } from '@/lib/constants/auth'

interface GuardProps {
  children: React.ReactNode
}

// Cookies emit no change events, so there is nothing to subscribe to: the
// value is read once at mount.
function subscribe() {
  return () => {}
}

/**
 * Whether a session is stored, or null until the browser has been asked: the
 * tokens live in cookies this app only reads on the client. Rendered as null
 * on the server and during hydration so the client can't disagree with the
 * server, then swapped for the real value once mounted.
 */
function useStoredSession(): boolean | null {
  return useSyncExternalStore<boolean | null>(
    subscribe,
    () => hasStoredSession(),
    () => null
  )
}

/**
 * Renders its children only for a signed-in user; everyone else is sent to
 * sign-in. A stored token that turns out to be dead is caught by the axios
 * interceptor on the first API call.
 */
export function AuthGuard({ children }: GuardProps) {
  const router = useRouter()
  const signedIn = useStoredSession()

  useEffect(() => {
    if (signedIn === false) router.replace(SIGN_IN_PATH)
  }, [signedIn, router])

  return signedIn ? children : null
}

/** The opposite: sign-in and sign-up send a signed-in user home. */
export function GuestGuard({ children }: GuardProps) {
  const router = useRouter()
  const signedIn = useStoredSession()

  useEffect(() => {
    if (signedIn) router.replace(HOME_PATH)
  }, [signedIn, router])

  return signedIn === false ? children : null
}
