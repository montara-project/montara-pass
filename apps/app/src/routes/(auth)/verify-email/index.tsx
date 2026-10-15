import { createFileRoute } from '@tanstack/react-router'

import EmailVerified from '@/components/block/auth/email-verified'

export const Route = createFileRoute('/(auth)/verify-email/')({
  // Set by the callback_url the sign-up sends; the API redirects here with it
  // only once the verification link is accepted.
  validateSearch: (search: Record<string, unknown>): { verified?: true } =>
    search.verified === 1 || search.verified === '1' ? { verified: true } : {},
  component: EmailVerified,
})
