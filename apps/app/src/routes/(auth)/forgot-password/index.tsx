import { createFileRoute } from '@tanstack/react-router'

import ForgotPasswordForm from '@/components/block/auth/forgot-password-form'

export const Route = createFileRoute('/(auth)/forgot-password/')({
  component: ForgotPasswordForm,
})
