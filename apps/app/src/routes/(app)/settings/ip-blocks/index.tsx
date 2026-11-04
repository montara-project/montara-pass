import { createFileRoute, redirect } from '@tanstack/react-router'

import IpBlocks from '@/components/block/security/ip-blocks'
import PageSkeleton from '@/components/layout/page-skeleton'
import { searchText, validatePaginationSearch } from '@/hooks/use-pagination-query'
import { queries } from '@/lib/api/queries'
import { HOME_PATH } from '@/lib/constants/auth'

export const Route = createFileRoute('/(app)/settings/ip-blocks/')({
  // The server refuses a non-super user anyway; this keeps them off a page
  // they cannot use before it renders.
  beforeLoad: async ({ context }) => {
    const me = await context.queryClient.fetchQuery(queries.security.role())
    if (me.role !== 'super_user') {
      throw redirect({ to: HOME_PATH, replace: true })
    }
  },
  // ?status= narrows the list; paging is shared with every table page.
  validateSearch: (search: Record<string, unknown>) => ({
    ...validatePaginationSearch(search),
    status: searchText(search.status),
  }),
  component: IpBlocks,
  pendingComponent: PageSkeleton,
})
