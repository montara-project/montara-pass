import { COMMUNITY } from '@montara-pass/shared/constants/edition'
import { createFileRoute, redirect } from '@tanstack/react-router'

import RegisterForm from '@/components/block/auth/register-form'
import { SIGN_IN_PATH } from '@/lib/constants/auth'

export const Route = createFileRoute('/(auth)/sign-up/')({
  // The Community Edition has no sign-up.
  beforeLoad: () => {
    if (COMMUNITY) throw redirect({ to: SIGN_IN_PATH, replace: true })
  },
  component: RegisterForm,
})
