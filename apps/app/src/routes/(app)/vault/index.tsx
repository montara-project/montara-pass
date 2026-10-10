import { createFileRoute } from '@tanstack/react-router'

import ItemTable from '@/components/block/vault/table'

export const Route = createFileRoute('/(app)/vault/')({
  component: ItemTable,
})
