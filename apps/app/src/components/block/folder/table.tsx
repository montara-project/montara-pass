import { IconFolders, IconPlus } from '@tabler/icons-react'
import { useEffect, useState } from 'react'

import EmptyState from '@/components/block/common/empty-state'
import ReactTable from '@/components/block/common/react-table'
import SectionCard from '@/components/block/common/section-card'
import { RowsSkeleton } from '@/components/layout/page-skeleton'
import { Button } from '@/components/ui/button'
import { useFolders } from '@/hooks/use-vault'
import { toastAxiosError } from '@/lib/api/axios-error'

import { FolderColumn } from './column'
import { AddFolderForm } from './form'

export default function FolderTable() {
  const [openAdd, setOpenAdd] = useState(false)

  const { data, isFetching, isLoading, isError, error } = useFolders()
  const loading = isLoading || isFetching
  const folders = data ?? []

  useEffect(() => {
    if (isError) toastAxiosError(error)
  }, [isError, error])

  const columns = FolderColumn({ loading })

  return (
    <SectionCard
      title="Folders"
      description="Your own way of grouping items. Folder names are encrypted, and nobody you share an item with sees where you filed it."
      toolbar={
        <Button onClick={() => setOpenAdd(true)}>
          <IconPlus />
          New folder
        </Button>
      }
    >
      {isLoading ? (
        <RowsSkeleton />
      ) : !loading && folders.length === 0 ? (
        <EmptyState
          icon={IconFolders}
          title="No folders yet"
          description="Create a folder to group the items in your vault."
        />
      ) : (
        // The API returns every folder at once, so the table shows one page.
        <ReactTable
          columns={columns}
          data={folders}
          total={folders.length}
          pageSize={Math.max(folders.length, 10)}
        />
      )}

      <AddFolderForm open={openAdd} onOpenChange={setOpenAdd} />
    </SectionCard>
  )
}
