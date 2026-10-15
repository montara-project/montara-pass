import { createFileRoute } from '@tanstack/react-router'

import EmailVerified from '@/components/block/auth/email-verified'

export const Route = createFileRoute('/(auth)/verify-email/')({
  component: EmailVerified,
})
