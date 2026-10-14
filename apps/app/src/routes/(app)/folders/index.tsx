import { createFileRoute } from '@tanstack/react-router'

import FolderTable from '@/components/block/folder/table'
import PageSkeleton from '@/components/layout/page-skeleton'

export const Route = createFileRoute('/(app)/folders/')({
  component: FolderTable,
  pendingComponent: PageSkeleton,
})
