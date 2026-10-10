import { IconLock, IconPlus } from '@tabler/icons-react'
import { useQueryState } from 'nuqs'
import { useEffect, useMemo, useState } from 'react'

import EmptyState from '@/components/block/common/empty-state'
import ReactTable from '@/components/block/common/react-table'
import SectionCard from '@/components/block/common/section-card'
import SelectInput from '@/components/block/common/select-input'
import { Button } from '@/components/ui/button'
import { usePaginationQuery } from '@/hooks/use-pagination-query'
import { useFolders, useItems } from '@/hooks/use-vault'
import { toastAxiosError } from '@/lib/api/axios-error'
import { ItemTypeOptions } from '@/lib/constants/vault'

import { ItemColumn } from './column'
import { AddItemForm } from './form'

/** Select value standing for "no filter": a select item cannot be empty. */
const ALL = 'all'

export default function ItemTable() {
  const [openAdd, setOpenAdd] = useState(false)
  const { offset, limit, pageIndex } = usePaginationQuery()

  const [folderId, setFolderId] = useQueryState('folder')
  const [type, setType] = useQueryState('type')

  const params = useMemo(
    () => ({
      offset,
      limit,
      ...(folderId ? { folder_id: folderId } : {}),
      ...(type ? { type } : {}),
    }),
    [offset, limit, folderId, type]
  )

  const { data: folders } = useFolders()
  const { data, isFetching, isLoading, isError, error } = useItems(params)
  const loading = isLoading || isFetching
  const total = data?.metadata?.total ?? 0
  const items = data?.data ?? []
  const filtered = Boolean(folderId || type)

  useEffect(() => {
    if (isError) toastAxiosError(error)
  }, [isError, error])

  const folderList = useMemo(() => folders ?? [], [folders])
  const columns = ItemColumn({ loading, folders: folderList })

  const folderOptions = [
    { label: 'All folders', value: ALL },
    ...folderList.map((folder) => ({ label: folder.name, value: folder.id })),
  ]
  const typeOptions = [{ label: 'All types', value: ALL }, ...ItemTypeOptions]

  return (
    <SectionCard
      title="Vault"
      description="Your items and the ones shared with you, decrypted in this browser only."
      toolbar={
        <div className="flex flex-row items-center gap-2">
          <SelectInput
            // Remount once the folders arrive so the stored filter shows its name.
            key={`folder-${folderList.length}`}
            className="w-44"
            placeholder="All folders"
            options={folderOptions}
            defaultValue={folderId ?? ALL}
            onSelect={(value) => void setFolderId(value === ALL ? null : value)}
          />

          <SelectInput
            className="w-36"
            placeholder="All types"
            options={typeOptions}
            defaultValue={type ?? ALL}
            onSelect={(value) => void setType(value === ALL ? null : value)}
          />

          <Button className="h-8.5 rounded-lg" onClick={() => setOpenAdd(true)}>
            <IconPlus />
            <span>Add Item</span>
          </Button>
        </div>
      }
    >
      {!loading && items.length === 0 ? (
        <EmptyState
          title={filtered ? 'No items match these filters' : 'Your vault is empty'}
          description={
            filtered ? 'Change the folder or type filter.' : 'Add your first login or secure note.'
          }
          icon={IconLock}
          action={
            <Button onClick={() => setOpenAdd(true)}>
              <IconPlus />
              <span>Add Item</span>
            </Button>
          }
        />
      ) : (
        <ReactTable
          columns={columns}
          data={items}
          total={total}
          pageIndex={pageIndex}
          pageSize={limit}
        />
      )}

      {openAdd && <AddItemForm open={openAdd} onOpenChange={setOpenAdd} folderId={folderId} />}
    </SectionCard>
  )
}
