import { COMMUNITY } from '@montara-pass/shared/constants/edition'
import { createFileRoute, redirect } from '@tanstack/react-router'

import BillingBlock from '@/components/block/billing/billing'
import PageSkeleton from '@/components/layout/page-skeleton'
import { HOME_PATH } from '@/lib/constants/auth'

export const Route = createFileRoute('/(app)/billing/')({
  // Billing is the Cloud Edition's; its server has the routes.
  beforeLoad: () => {
    if (COMMUNITY) throw redirect({ to: HOME_PATH, replace: true })
  },
  component: BillingBlock,
  pendingComponent: PageSkeleton,
})
