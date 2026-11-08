import { IconFolder, IconFolderPlus } from '@tabler/icons-react'
import { useEffect, useMemo, useState } from 'react'

import EmptyState from '@/components/block/common/empty-state'
import ReactTable from '@/components/block/common/react-table'
import SectionCard from '@/components/block/common/section-card'
import { RowsSkeleton } from '@/components/layout/page-skeleton'
import { Button } from '@/components/ui/button'
import { usePaginationQuery } from '@/hooks/use-pagination-query'
import { useFolders, useItemTotals } from '@/hooks/use-vault'
import { toastApiError } from '@/lib/api/api-error'

import { FolderColumn } from './column'
import { AddFolderForm } from './form'

/**
 * The user's folders: their own way of grouping items. Names are encrypted,
 * and nobody an item is shared with sees where it was filed.
 */
export default function FolderTable() {
  const [openAdd, setOpenAdd] = useState(false)
  const { offset, limit, pageIndex } = usePaginationQuery()

  const { data, isFetching, isLoading, isError, error } = useFolders()
  const loading = isLoading || isFetching
  const folders = useMemo(() => data ?? [], [data])
  const total = folders.length

  // The API returns every folder at once, so the table's page is a slice;
  // the ?page / ?pageSize params come from the route's validateSearch.
  const page = useMemo(() => folders.slice(offset, offset + limit), [folders, offset, limit])

  // How many items each folder on the page holds, from the server's totals:
  // nothing is decrypted.
  const totals = useItemTotals(useMemo(() => page.map((f) => ({ folder_id: f.id })), [page]))
  const rows = useMemo(
    () => page.map((folder, index) => ({ ...folder, itemCount: totals[index] })),
    [page, totals]
  )

  useEffect(() => {
    if (isError) toastApiError(error)
  }, [isError, error])

  const columns = FolderColumn({ loading })

  return (
    <SectionCard
      title="Folders"
      description="Your own way of grouping items. Folder names are encrypted, and nobody you share an item with sees where you filed it."
      toolbar={
        <Button size="sm" onClick={() => setOpenAdd(true)}>
          <IconFolderPlus />
          New folder
        </Button>
      }
    >
      {isLoading ? (
        <RowsSkeleton />
      ) : folders.length === 0 ? (
        <EmptyState
          icon={IconFolder}
          title="No folders yet"
          description="Create a folder to group the items in your vault."
        />
      ) : (
        <ReactTable
          columns={columns}
          data={rows}
          total={total}
          pageIndex={pageIndex}
          pageSize={limit}
        />
      )}

      <AddFolderForm open={openAdd} onOpenChange={setOpenAdd} />
    </SectionCard>
  )
}
