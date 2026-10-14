import { createFileRoute } from '@tanstack/react-router'

import Vault from '@/components/block/vault/vault'

export const Route = createFileRoute('/(app)/vault/')({
  component: Vault,
})
