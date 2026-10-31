import type { Models } from '@montara-pass/shared/api/models'

import { formatDateTime } from '@montara-pass/shared/date'
import { IconForbid } from '@tabler/icons-react'
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

type ColumnType = AppColumnDef<Models.IPBlock>

const badge = 'rounded-full border px-2.5 py-0.5 font-mono text-[11px] whitespace-nowrap'

// Declared once, and never swapped for a skeleton: the cell owns the row's
// dialogs, so remounting it on a background refetch would discard them.
const actionCell: ColumnType['cell'] = ({ row }) => <ActionCell record={row.original} />

export function IPBlockColumn({ loading }: BaseColumnProps) {
  const columns = useMemo<ColumnType[]>(
    () => [
      {
        accessorKey: 'ip',
        header: 'IP',
        cell: (info) => (
          <CellItem loading={loading}>
            <span className="font-mono">{info.getValue() as string}</span>
          </CellItem>
        ),
      },
      {
        accessorKey: 'source',
        header: 'Source',
        cell: (info) => (
          <CellItem loading={loading}>
            <span className={badge}>{info.getValue() as string}</span>
          </CellItem>
        ),
      },
      {
        accessorKey: 'reason',
        header: 'Reason',
        cell: (info) => (
          <CellItem loading={loading}>
            <span>{(info.getValue() as string | null) ?? '—'}</span>
          </CellItem>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: (info) => (
          <CellItem loading={loading}>
            <span
              className={
                info.getValue() === 'active'
                  ? 'bg-focus/15 text-focus rounded-full px-2.5 py-0.5 text-xs font-medium'
                  : badge
              }
            >
              {info.getValue() as string}
            </span>
          </CellItem>
        ),
      },
      {
        accessorKey: 'created_at',
        header: 'Blocked',
        cell: (info) => (
          <CellItem loading={loading}>
            <span>{formatDateTime(info.getValue() as string)}</span>
          </CellItem>
        ),
      },
      {
        accessorKey: 'blocked_until',
        header: 'Until',
        cell: (info) => (
          <CellItem loading={loading}>
            <span>
              {(info.getValue() as string | null)
                ? formatDateTime(info.getValue() as string)
                : 'forever'}
            </span>
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
  record: Models.IPBlock
}

function ActionCell({ record }: ActionCellProps) {
  const [open, setOpen] = useState(false)

  const unblock = useMutation(queries.security.unblock())

  const handleUnblock = async () => {
    try {
      await unblock.mutateAsync(record.id)
      toast.success('IP unblocked')
      setOpen(false)
    } catch (error) {
      toastApiError(error)
    }
  }

  // A block that is no longer live has nothing to lift; only an active one
  // may be let through early.
  if (record.status !== 'active') {
    return null
  }

  return (
    <React.Fragment>
      <RowColumnAction
        onDelete={() => setOpen(true)}
        actions={
          <Button
            variant="outline"
            size="xs"
            disabled={unblock.isPending}
            onClick={() => setOpen(true)}
          >
            <IconForbid />
            Unblock
          </Button>
        }
      />

      <SimpleAlertDialog
        title={`Let ${record.ip} through?`}
        description="The block is lifted now, for every request it was keeping out. The record stays in the list."
        open={open}
        onOpenChange={setOpen}
        onConfirm={handleUnblock}
        confirmText="Unblock"
        variant="destructive"
      />
    </React.Fragment>
  )
}
