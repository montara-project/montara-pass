import { createFileRoute } from '@tanstack/react-router'

import AccountSecurity from '@/components/block/security/account-security'
import PageSkeleton from '@/components/layout/page-skeleton'
import { validatePaginationSearch } from '@/hooks/use-pagination-query'

export const Route = createFileRoute('/(app)/security/')({
  // The audit log's paging is shared with every table page.
  validateSearch: (search: Record<string, unknown>) => validatePaginationSearch(search),
  component: AccountSecurity,
  pendingComponent: PageSkeleton,
})
