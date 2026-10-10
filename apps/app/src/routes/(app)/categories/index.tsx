import { createFileRoute } from '@tanstack/react-router'

import CategoryTable from '@/components/block/category/table'

export const Route = createFileRoute('/(app)/categories/')({
  component: CategoryTable,
})
