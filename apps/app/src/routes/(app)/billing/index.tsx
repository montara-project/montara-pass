import { COMMUNITY } from '@montara-pass/shared/constants/edition'
import { createFileRoute, redirect } from '@tanstack/react-router'

import BillingBlock from '@/components/block/billing/billing'
import PageSkeleton from '@/components/layout/page-skeleton'
import { searchText } from '@/hooks/use-pagination-query'
import { HOME_PATH } from '@/lib/constants/auth'

export const Route = createFileRoute('/(app)/billing/')({
  // Billing is the Cloud Edition's; its server has the routes.
  beforeLoad: () => {
    if (COMMUNITY) throw redirect({ to: HOME_PATH, replace: true })
  },
  // ?plan= names the plan the website sent the user here for; the checkout
  // sends the browser back with ?checkout=done.
  validateSearch: (search: Record<string, unknown>): { plan?: string; checkout?: string } => ({
    plan: searchText(search.plan),
    checkout: searchText(search.checkout),
  }),
  component: BillingBlock,
  pendingComponent: PageSkeleton,
})
