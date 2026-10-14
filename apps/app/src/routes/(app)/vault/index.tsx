import { createFileRoute } from '@tanstack/react-router'

import Vault from '@/components/block/vault/vault'
import PageSkeleton from '@/components/layout/page-skeleton'

export const Route = createFileRoute('/(app)/vault/')({
  component: Vault,
  pendingComponent: PageSkeleton,
})
