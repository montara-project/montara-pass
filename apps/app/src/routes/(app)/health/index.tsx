import { createFileRoute } from '@tanstack/react-router'

import PasswordHealth from '@/components/block/tools/password-health'
import PageSkeleton from '@/components/layout/page-skeleton'

export const Route = createFileRoute('/(app)/health/')({
  component: PasswordHealth,
  pendingComponent: PageSkeleton,
})
