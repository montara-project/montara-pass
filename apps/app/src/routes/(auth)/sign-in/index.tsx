import { createFileRoute } from '@tanstack/react-router'

import LoginForm from '@/components/block/auth/login-form'

export const Route = createFileRoute('/(auth)/sign-in/')({
  component: LoginForm,
})
