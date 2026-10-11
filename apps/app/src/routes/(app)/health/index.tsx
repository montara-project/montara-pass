import { createFileRoute } from '@tanstack/react-router'

import PasswordHealth from '@/components/block/tools/password-health'

export const Route = createFileRoute('/(app)/health/')({
  component: PasswordHealth,
})
