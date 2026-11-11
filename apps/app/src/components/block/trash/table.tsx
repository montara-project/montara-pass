import type { VaultItem } from '@montara-pass/shared/types/vault'

import { ITEM_TYPE_LABEL } from '@montara-pass/shared/constants/vault'
import { formatDateTime } from '@montara-pass/shared/date'
import { IconRestore, IconTrash } from '@tabler/icons-react'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

import type { AppColumnDef } from '@/types/column'

import EmptyState from '@/components/block/common/empty-state'
import ReactTable, { WIDE_ONLY } from '@/components/block/common/react-table'
import SectionCard from '@/components/block/common/section-card'
import SimpleAlertDialog from '@/components/block/common/simple-alert-dialog'
import ItemTile, { itemSubtitle } from '@/components/block/vault/item-tile'
import { Button } from '@/components/ui/button'
import { usePaginationQuery } from '@/hooks/use-pagination-query'
import { useItems } from '@/hooks/use-vault'
import { toastApiError } from '@/lib/api/api-error'
import { queries } from '@/lib/api/queries'
import { cn } from '@/lib/utils'

type Column = AppColumnDef<VaultItem>

function NameCell({ item }: { item: VaultItem }) {
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <ItemTile item={item} />
      <span className="flex min-w-0 flex-col">
        {item.secret ? (
          <span className="truncate font-medium">{item.secret.name}</span>
        ) : (
          <span className="text-danger">Unable to decrypt</span>
        )}
        <span className="text-muted-foreground truncate font-mono text-[11px]">
          {itemSubtitle(item)}
        </span>
      </span>
    </span>
  )
}

function ActionCell({ item, onDelete }: { item: VaultItem; onDelete: (item: VaultItem) => void }) {
  const restore = useMutation(queries.items.restore())

  const handleRestore = async () => {
    try {
      await restore.mutateAsync(item.id)
      toast.success('Item restored')
    } catch (err) {
      toastApiError(err)
    }
  }

  return (
    <span className="flex justify-end gap-1">
      <Button
        variant="outline"
        size="xs"
        className="bg-card h-[26px] px-2.5 text-xs"
        disabled={restore.isPending}
        onClick={() => void handleRestore()}
      >
        <IconRestore />
        Restore
      </Button>
      <Button
        variant="outline"
        size="xs"
        className="bg-card text-danger h-[26px] px-2.5 text-xs"
        onClick={() => onDelete(item)}
      >
        Delete
      </Button>
    </span>
  )
}

/** Items you own and trashed: restore one or delete it for good. */
export default function TrashTable() {
  const navigate = useNavigate()
  const { offset, limit, pageIndex } = usePaginationQuery()
  const params = useMemo(() => ({ offset, limit, trashed: true }), [offset, limit])

  const { data, isLoading, isError, error } = useItems(params)
  const total = data?.metadata?.total ?? 0
  const items = data?.data ?? []

  const [deleting, setDeleting] = useState<VaultItem | null>(null)
  const forceDelete = useMutation(queries.items.forceDelete())

  useEffect(() => {
    if (isError) toastApiError(error)
  }, [isError, error])

  // Declared once: a background refetch must not remount the cells.
  const columns = useMemo<Column[]>(
    () => [
      {
        id: 'name',
        accessorFn: (item) => item.secret?.name ?? '',
        header: 'Name',
        cell: ({ row }) => <NameCell item={row.original} />,
      },
      {
        accessorKey: 'type',
        header: 'Type',
        size: 140,
        meta: { headerClassName: WIDE_ONLY, cellClassName: cn('truncate', WIDE_ONLY) },
        cell: ({ row }) => ITEM_TYPE_LABEL[row.original.type] ?? row.original.type,
      },
      {
        accessorKey: 'deleted_at',
        header: 'Deleted',
        size: 190,
        meta: {
          headerClassName: WIDE_ONLY,
          cellClassName: cn('font-mono text-xs tabular-nums', WIDE_ONLY),
        },
        cell: ({ row }) =>
          row.original.deleted_at ? formatDateTime(row.original.deleted_at) : '—',
      },
      {
        id: 'actions',
        header: () => <span className="block text-right">Action</span>,
        size: 170,
        cell: ({ row }) => <ActionCell item={row.original} onDelete={setDeleting} />,
      },
    ],
    []
  )

  const search = (next: Record<string, unknown>) =>
    void navigate({
      to: '.',
      search: (prev: Record<string, unknown>) => ({ ...prev, ...next }),
      replace: true,
    })

  const handleDelete = async () => {
    const target = deleting
    setDeleting(null)
    if (!target) return
    try {
      await forceDelete.mutateAsync(target.id)
      toast.success('Item permanently deleted')
    } catch (err) {
      toastApiError(err)
    }
  }

  return (
    <SectionCard
      title="Trash"
      description="Items you own and moved to the trash. They stay here until you restore or delete them."
    >
      <ReactTable
        label="Trash"
        columns={columns}
        data={items}
        total={total}
        pageIndex={pageIndex}
        pageSize={limit}
        isLoading={isLoading}
        onPageChange={(page) => search({ page: page || undefined })}
        // Another size starts again from the first page.
        onPageSizeChange={(pageSize) => search({ pageSize, page: undefined })}
        emptyMessage={
          isError ? (
            <p role="alert" className="text-danger px-4 py-6 text-[13px]">
              The trash could not be read. Reload the page to try again.
            </p>
          ) : (
            <EmptyState
              framed={false}
              icon={IconTrash}
              title="The trash is empty"
              description="An item you move to the trash from the vault waits here, where you can restore it or delete it for good."
            />
          )
        }
      />

      <SimpleAlertDialog
        title="Delete this item permanently?"
        description="It is removed for you and everyone it was shared with, and cannot be recovered."
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        onConfirm={() => void handleDelete()}
        confirmText="Delete permanently"
        variant="destructive"
      />
    </SectionCard>
  )
}
