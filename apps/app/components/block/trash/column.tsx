'use client'

import { IconRestore } from '@tabler/icons-react'
import { useMutation } from '@tanstack/react-query'
import React, { useMemo, useState } from 'react'
import { toast } from 'sonner'

import type { AppColumnDef, BaseColumnProps } from '@/types/column'
import type { VaultItem } from '@/types/vault'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { toastAxiosError } from '@/lib/api/axios-error'
import { queries } from '@/lib/api/queries'
import { formatDateTime } from '@/lib/date'
import { capitalizeFirstLetter } from '@/lib/string'

import CellItem from '../common/cell-item'
import RowColumnAction from '../common/row-column-action'
import SimpleAlertDialog from '../common/simple-alert-dialog'

type ColumnType = AppColumnDef<VaultItem>

// Declared once, and never swapped for a skeleton: the cell owns the row's open
// dialogs, so remounting it on a background refetch would discard them.
const actionCell: ColumnType['cell'] = ({ row }) => <ActionCell record={row.original} />

export function TrashColumn({ loading }: BaseColumnProps) {
  const columns = useMemo<ColumnType[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Name',
        cell: ({ row }) => (
          <CellItem loading={loading}>
            <span>{row.original.secret?.name ?? 'Unable to decrypt'}</span>
          </CellItem>
        ),
      },
      {
        accessorKey: 'type',
        header: 'Type',
        cell: (info) => (
          <CellItem loading={loading}>
            <Badge variant="secondary">{capitalizeFirstLetter(info.getValue() as string)}</Badge>
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
      toastAxiosError(error)
    }
  }

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(record.id)
      toast.success('Item permanently deleted')
      setOpenDelete(false)
    } catch (error) {
      toastAxiosError(error)
    }
  }

  return (
    <React.Fragment>
      <RowColumnAction
        actions={
          <Button
            mode="link"
            underline="solid"
            className="dark:text-neutral-300"
            disabled={restoreMutation.isPending}
            onClick={() => void handleRestore()}
          >
            <IconRestore className="text-primary size-4 dark:text-neutral-300" />
            <span>Restore</span>
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
