import { createFileRoute } from '@tanstack/react-router'

import PasswordGenerator from '@/components/block/tools/password-generator'
import PageSkeleton from '@/components/layout/page-skeleton'

export const Route = createFileRoute('/(app)/generator/')({
  component: PasswordGenerator,
  pendingComponent: PageSkeleton,
})
