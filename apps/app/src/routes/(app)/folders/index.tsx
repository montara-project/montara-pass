import { createFileRoute } from '@tanstack/react-router'

import FolderTable from '@/components/block/folder/table'

export const Route = createFileRoute('/(app)/folders/')({
  component: FolderTable,
})
