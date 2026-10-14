import { createFileRoute } from '@tanstack/react-router'

import TrashTable from '@/components/block/trash/table'
import PageSkeleton from '@/components/layout/page-skeleton'

export const Route = createFileRoute('/(app)/trash/')({
  component: TrashTable,
  pendingComponent: PageSkeleton,
})
