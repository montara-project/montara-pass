import type { VaultItem } from '@montara-pass/shared/types/vault'

import { ITEM_TYPE_LABEL } from '@montara-pass/shared/constants/vault'
import { formatDateTime } from '@montara-pass/shared/date'
import { IconRestore } from '@tabler/icons-react'
import { useMutation } from '@tanstack/react-query'
import React, { useMemo, useState } from 'react'
import { toast } from 'sonner'

import type { AppColumnDef, BaseColumnProps } from '@/types/column'

import { Button } from '@/components/ui/button'
import { toastApiError } from '@/lib/api/api-error'
import { queries } from '@/lib/api/queries'

import CellItem from '../common/cell-item'
import RowColumnAction from '../common/row-column-action'
import SimpleAlertDialog from '../common/simple-alert-dialog'
import ItemTile, { itemSubtitle } from '../vault/item-tile'

type ColumnType = AppColumnDef<VaultItem>

// Declared once, and never swapped for a skeleton: the cell owns the row's open
// dialogs, so remounting it on a background refetch would discard them.
const actionCell: ColumnType['cell'] = ({ row }) => <ActionCell record={row.original} />

export function TrashColumn({ loading }: BaseColumnProps) {
  const columns = useMemo<ColumnType[]>(
    () => [
      {
        // The decrypted name: accessorKey 'name' would read a field the item
        // does not have, so sorting it could never work.
        id: 'name',
        accessorFn: (item) => item.secret?.name ?? '',
        header: 'Name',
        cell: ({ row }) => (
          <CellItem loading={loading}>
            <div className="flex items-center gap-3">
              <ItemTile item={row.original} />
              <span className="flex min-w-0 flex-col">
                {row.original.secret ? (
                  <span className="truncate font-medium">{row.original.secret.name}</span>
                ) : (
                  <span className="text-danger">Unable to decrypt</span>
                )}
                <span className="text-muted-foreground truncate text-xs">
                  {itemSubtitle(row.original)}
                </span>
              </span>
            </div>
          </CellItem>
        ),
      },
      {
        accessorKey: 'type',
        header: 'Type',
        cell: (info) => (
          <CellItem loading={loading}>
            <span>{ITEM_TYPE_LABEL[info.getValue() as string] ?? (info.getValue() as string)}</span>
          </CellItem>
        ),
      },
      {
        accessorKey: 'deleted_at',
        header: 'Deleted',
        cell: (info) => (
          <CellItem loading={loading}>
            <span>{formatDateTime(info.getValue() as string)}</span>
          </CellItem>
        ),
      },
      {
        accessorKey: 'actions',
        header: 'Actions',
        cell: actionCell,
        size: 50,
      },
    ],
    [loading]
  )

  return columns
}

interface ActionCellProps {
  record: VaultItem
}

function ActionCell({ record }: ActionCellProps) {
  const [openDelete, setOpenDelete] = useState(false)

  const restoreMutation = useMutation(queries.items.restore())
  const deleteMutation = useMutation(queries.items.forceDelete())

  const handleRestore = async () => {
    try {
      await restoreMutation.mutateAsync(record.id)
      toast.success('Item restored')
    } catch (error) {
      toastApiError(error)
    }
  }

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(record.id)
      toast.success('Item permanently deleted')
      setOpenDelete(false)
    } catch (error) {
      toastApiError(error)
    }
  }

  return (
    <React.Fragment>
      <RowColumnAction
        actions={
          <Button
            variant="outline"
            size="xs"
            disabled={restoreMutation.isPending}
            onClick={() => void handleRestore()}
          >
            <IconRestore />
            Restore
          </Button>
        }
        onDelete={() => setOpenDelete(true)}
      />

      <SimpleAlertDialog
        title="Delete this item permanently?"
        description="It is removed for you and everyone it was shared with, and cannot be recovered."
        open={openDelete}
        onOpenChange={setOpenDelete}
        onConfirm={handleDelete}
        confirmText="Delete permanently"
        variant="destructive"
      />
    </React.Fragment>
  )
}
