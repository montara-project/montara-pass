'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

import { HOME_PATH, SIGN_IN_PATH } from '@/lib/constants/auth'
import { hasStoredSession } from '@/lib/auth/token-storage'

interface GuardProps {
  children: React.ReactNode
}

/**
 * Whether a session is stored, or null until the browser has been asked: the
 * tokens live in cookies this app only reads on the client.
 */
function useStoredSession(): boolean | null {
  const [signedIn, setSignedIn] = useState<boolean | null>(null)

  useEffect(() => {
    setSignedIn(hasStoredSession())
  }, [])

  return signedIn
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
