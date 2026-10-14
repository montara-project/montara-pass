import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'

import { signOut } from '@/lib/auth/email-auth'
import { SIGN_IN_PATH } from '@/lib/constants/auth'

/** Ends the session, forgets what was fetched with it, and goes to sign-in. */
export function useSignOut() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  return async () => {
    await signOut()
    queryClient.clear()
    await navigate({ to: SIGN_IN_PATH, replace: true })
  }
}
