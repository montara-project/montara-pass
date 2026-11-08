import type { VaultFolder } from '@montara-pass/shared/types/vault'

import { formatDate } from '@montara-pass/shared/date'
import { useMutation } from '@tanstack/react-query'
import React, { useMemo, useState } from 'react'
import { toast } from 'sonner'

import type { AppColumnDef, BaseColumnProps } from '@/types/column'

import { toastApiError } from '@/lib/api/api-error'
import { queries } from '@/lib/api/queries'

import CellItem from '../common/cell-item'
import RowColumnAction from '../common/row-column-action'
import SimpleAlertDialog from '../common/simple-alert-dialog'
import { EditFolderForm } from './form'

/** A folder row with its item count merged in: the server counts it, nothing is decrypted. */
export type FolderRow = VaultFolder & { itemCount?: number }

type ColumnType = AppColumnDef<FolderRow>

// Declared once, and never swapped for a skeleton: the cell owns the row's open
// dialogs, so remounting it on a background refetch would discard them.
const actionCell: ColumnType['cell'] = ({ row }) => <ActionCell record={row.original} />

export function FolderColumn({ loading }: BaseColumnProps) {
  const columns = useMemo<ColumnType[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Name',
        cell: ({ row }) => (
          <CellItem loading={loading}>
            <span>{row.original.name}</span>
          </CellItem>
        ),
      },
      {
        accessorKey: 'itemCount',
        header: 'Items',
        cell: ({ row }) => (
          <CellItem loading={loading}>
            <span>{row.original.itemCount ?? '…'}</span>
          </CellItem>
        ),
      },
      {
        accessorKey: 'updated_at',
        header: 'Updated',
        cell: (info) => (
          <CellItem loading={loading}>
            <span>{formatDate(info.getValue() as string)}</span>
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
  record: FolderRow
}

function ActionCell({ record }: ActionCellProps) {
  const [openEdit, setOpenEdit] = useState(false)
  const [openDelete, setOpenDelete] = useState(false)

  const remove = useMutation(queries.folders.delete())

  const handleDelete = async () => {
    try {
      await remove.mutateAsync(record.id)
      toast.success(`Deleted ${record.name}`)
      setOpenDelete(false)
    } catch (error) {
      toastApiError(error)
    }
  }

  return (
    <React.Fragment>
      <RowColumnAction onEdit={() => setOpenEdit(true)} onDelete={() => setOpenDelete(true)} />

      {openEdit && (
        <EditFolderForm open onOpenChange={(open) => !open && setOpenEdit(false)} record={record} />
      )}

      <SimpleAlertDialog
        title={`Delete ${record.name}?`}
        description="The items in it are kept and move out of the folder."
        open={openDelete}
        onOpenChange={setOpenDelete}
        onConfirm={handleDelete}
        confirmText="Delete"
        variant="destructive"
      />
    </React.Fragment>
  )
}
