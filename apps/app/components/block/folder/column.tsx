'use client'

import { useMutation } from '@tanstack/react-query'
import React, { useMemo, useState } from 'react'
import { toast } from 'sonner'

import type { AppColumnDef, BaseColumnProps } from '@/types/column'
import type { VaultFolder } from '@/types/vault'

import { toastAxiosError } from '@/lib/api/axios-error'
import { queries } from '@/lib/api/queries'
import { formatDateTime } from '@/lib/date'

import CellItem from '../common/cell-item'
import RowColumnAction from '../common/row-column-action'
import SimpleAlertDialog from '../common/simple-alert-dialog'
import { EditFolderForm } from './form'

type ColumnType = AppColumnDef<VaultFolder>

// Declared once, and never swapped for a skeleton: the cell owns the row's open
// dialogs, so remounting it on a background refetch would discard them.
const actionCell: ColumnType['cell'] = ({ row }) => <ActionCell record={row.original} />

export function FolderColumn({ loading }: BaseColumnProps) {
  const columns = useMemo<ColumnType[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Name',
        cell: (info) => {
          const value = info.getValue() as string
          return (
            <CellItem loading={loading}>
              <span>{value}</span>
            </CellItem>
          )
        },
      },
      {
        accessorKey: 'updated_at',
        header: 'Updated',
        cell: (info) => {
          const value = info.getValue() as string
          return (
            <CellItem loading={loading}>
              <span>{formatDateTime(value)}</span>
            </CellItem>
          )
        },
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
  record: VaultFolder
}

function ActionCell({ record }: ActionCellProps) {
  const [openEdit, setOpenEdit] = useState(false)
  const [openDelete, setOpenDelete] = useState(false)

  const deleteMutation = useMutation(queries.folders.delete())

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(record.id)
      toast.success('Folder deleted successfully')
      setOpenDelete(false)
    } catch (error) {
      toastAxiosError(error as Error)
    }
  }

  return (
    <React.Fragment>
      <RowColumnAction onEdit={() => setOpenEdit(true)} onDelete={() => setOpenDelete(true)} />

      <SimpleAlertDialog
        title="Do you want to delete this folder?"
        description="The items in it are kept and move out of the folder."
        open={openDelete}
        onOpenChange={setOpenDelete}
        onConfirm={handleDelete}
        confirmText="Delete"
        variant="destructive"
      />

      <EditFolderForm open={openEdit} onOpenChange={setOpenEdit} record={record} />
    </React.Fragment>
  )
}
