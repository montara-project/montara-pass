import { createFileRoute } from '@tanstack/react-router'

import ActivityLog from '@/components/block/activity/activity-log'
import PageSkeleton from '@/components/layout/page-skeleton'
import { validatePaginationSearch } from '@/hooks/use-pagination-query'

export const Route = createFileRoute('/(app)/activity/')({
  // Paging is shared with every table page.
  validateSearch: (search: Record<string, unknown>) => validatePaginationSearch(search),
  component: ActivityLog,
  pendingComponent: PageSkeleton,
})
