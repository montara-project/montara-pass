import { createFileRoute } from '@tanstack/react-router'

import FolderTable from '@/components/block/folder/table'
import PageSkeleton from '@/components/layout/page-skeleton'
import { validatePaginationSearch } from '@/hooks/use-pagination-query'

export const Route = createFileRoute('/(app)/folders/')({
  validateSearch: validatePaginationSearch,
  component: FolderTable,
  pendingComponent: PageSkeleton,
})
