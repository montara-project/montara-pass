import { createFileRoute } from '@tanstack/react-router'

import RegisterForm from '@/components/block/auth/register-form'

export const Route = createFileRoute('/(auth)/sign-up/')({
  component: RegisterForm,
})
