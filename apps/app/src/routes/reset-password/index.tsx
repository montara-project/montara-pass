import { createFileRoute } from '@tanstack/react-router'

import ResetPasswordForm from '@/components/block/auth/reset-password-form'

// Outside (auth): the link works for a browser that is still signed in, too.
export const Route = createFileRoute('/reset-password/')({
  // Added by the API to the callback_url the reset request sends, once the
  // link is accepted.
  validateSearch: (search: Record<string, unknown>): { token?: string } =>
    typeof search.token === 'string' && search.token ? { token: search.token } : {},
  component: ResetPasswordForm,
})
