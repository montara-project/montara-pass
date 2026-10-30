import { createFileRoute } from '@tanstack/react-router'

import TrashTable from '@/components/block/trash/table'
import PageSkeleton from '@/components/layout/page-skeleton'
import { validatePaginationSearch } from '@/hooks/use-pagination-query'

export const Route = createFileRoute('/(app)/trash/')({
  validateSearch: validatePaginationSearch,
  component: TrashTable,
  pendingComponent: PageSkeleton,
})
