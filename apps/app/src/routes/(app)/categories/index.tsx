import { createFileRoute } from '@tanstack/react-router'

import CategoryTable from '@/components/block/category/table'
import PageSkeleton from '@/components/layout/page-skeleton'

export const Route = createFileRoute('/(app)/categories/')({
  component: CategoryTable,
  pendingComponent: PageSkeleton,
})
