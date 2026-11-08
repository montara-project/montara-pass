import { createFileRoute } from '@tanstack/react-router'

import Sharing from '@/components/block/sharing/sharing'
import PageSkeleton from '@/components/layout/page-skeleton'

export const Route = createFileRoute('/(app)/sharing/')({
  component: Sharing,
  pendingComponent: PageSkeleton,
})
