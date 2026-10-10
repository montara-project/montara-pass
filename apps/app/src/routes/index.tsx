import { createFileRoute, redirect } from '@tanstack/react-router'

import { HOME_PATH } from '@/lib/constants/auth'

export const Route = createFileRoute('/')({
  beforeLoad: () => {
    throw redirect({ to: HOME_PATH, replace: true })
  },
})
