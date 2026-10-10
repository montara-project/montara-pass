import { createFileRoute } from '@tanstack/react-router'

import TrashTable from '@/components/block/trash/table'

export const Route = createFileRoute('/(app)/trash/')({
  component: TrashTable,
})
