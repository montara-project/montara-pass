import { createFileRoute } from '@tanstack/react-router'

import Settings from '@/components/block/settings/settings'
import PageSkeleton from '@/components/layout/page-skeleton'

export const Route = createFileRoute('/(app)/settings/')({
  component: Settings,
  pendingComponent: PageSkeleton,
})
