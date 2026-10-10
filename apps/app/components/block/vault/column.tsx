'use client'

import { IconCopy, IconDoorExit, IconShare, IconStar, IconStarFilled } from '@tabler/icons-react'
import { useMutation, useQuery } from '@tanstack/react-query'
import React, { useMemo, useState } from 'react'
import { toast } from 'sonner'

import type { AppColumnDef, BaseColumnProps } from '@/types/column'
import type { VaultFolder, VaultItem } from '@/types/vault'

import { Badge } from '@/components/ui/badge'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { toastAxiosError } from '@/lib/api/axios-error'
import { queries } from '@/lib/api/queries'
import { ITEM_ROLE_OWNER } from '@/lib/constants/vault'
import { formatDateTime } from '@/lib/date'
import { capitalizeFirstLetter } from '@/lib/string'

import CellItem from '../common/cell-item'
import RowColumnAction from '../common/row-column-action'
import SimpleAlertDialog from '../common/simple-alert-dialog'
import { EditItemForm } from './form'
import { ShareItemForm } from './share-form'

type ColumnType = AppColumnDef<VaultItem>

// Declared once, and never swapped for a skeleton: the cells own the row's
// open dialogs and pending requests, so remounting them on a background
// refetch would discard them.
const actionCell: ColumnType['cell'] = ({ row }) => <ActionCell record={row.original} />
const nameCell: ColumnType['cell'] = ({ row }) => <NameCell record={row.original} />

type ItemColumnProps = BaseColumnProps & {
  folders: VaultFolder[]
}

export function ItemColumn({ loading, folders }: ItemColumnProps) {
  const columns = useMemo<ColumnType[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Name',
        cell: nameCell,
      },
      {
        accessorKey: 'username',
        header: 'Username',
        cell: ({ row }) => (
          <CellItem loading={loading}>
            <span>{row.original.secret?.username || '-'}</span>
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
        size: 100,
      },
      {
        accessorKey: 'folder_id',
        header: 'Folder',
        cell: (info) => {
          const folder = folders.find((f) => f.id === info.getValue())
          return (
            <CellItem loading={loading}>
              <span>{folder?.name ?? '-'}</span>
            </CellItem>
          )
        },
        size: 120,
      },
      {
        accessorKey: 'role',
        header: 'Access',
        cell: (info) => {
          const role = info.getValue() as string
          return (
            <CellItem loading={loading}>
              <Badge variant={role === ITEM_ROLE_OWNER ? 'primary' : 'info'} appearance="light">
                {role === ITEM_ROLE_OWNER ? 'Owner' : `Shared · ${capitalizeFirstLetter(role)}`}
              </Badge>
            </CellItem>
          )
        },
        size: 130,
      },
      {
        accessorKey: 'updated_at',
        header: 'Updated',
        cell: (info) => (
          <CellItem loading={loading}>
            <span>{formatDateTime(info.getValue() as string)}</span>
          </CellItem>
        ),
        size: 150,
      },
      {
        accessorKey: 'actions',
        header: 'Actions',
        cell: actionCell,
        // Wide enough for "Edit" and "More" side by side.
        size: 170,
      },
    ],
    [loading, folders]
  )

  return columns
}

interface CellProps {
  record: VaultItem
}

/** The item's name with its favorite star, which is each member's own. */
function NameCell({ record }: CellProps) {
  const mutation = useMutation(queries.items.setPlacement(record.id))

  const toggleFavorite = async () => {
    try {
      await mutation.mutateAsync({ folder_id: record.folder_id, favorite: !record.favorite })
    } catch (error) {
      toastAxiosError(error)
    }
  }

  const Star = record.favorite ? IconStarFilled : IconStar

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        className="text-muted-foreground hover:text-foreground disabled:opacity-50"
        aria-label={record.favorite ? 'Remove from favorites' : 'Add to favorites'}
        aria-pressed={record.favorite}
        disabled={mutation.isPending}
        onClick={() => void toggleFavorite()}
      >
        <Star className={record.favorite ? 'size-4 text-yellow-500' : 'size-4'} />
      </button>
      {record.secret ? (
        <span className="font-medium">{record.secret.name}</span>
      ) : (
        <span className="text-destructive">Unable to decrypt</span>
      )}
    </div>
  )
}

async function copyToClipboard(value: string | undefined, label: string) {
  if (!value) {
    toast.info(`This item has no ${label}`)
    return
  }

  try {
    await navigator.clipboard.writeText(value)
    toast.success(`${capitalizeFirstLetter(label)} copied`)
  } catch {
    toast.error(`Could not copy the ${label}`)
  }
}

function ActionCell({ record }: CellProps) {
  const [openEdit, setOpenEdit] = useState(false)
  const [openShare, setOpenShare] = useState(false)
  const [openDelete, setOpenDelete] = useState(false)
  const [openLeave, setOpenLeave] = useState(false)

  const { data: profile } = useQuery(queries.auth.profile())
  const deleteMutation = useMutation(queries.items.delete())
  const leaveMutation = useMutation(queries.items.removeMember(record.id))

  const isOwner = record.role === ITEM_ROLE_OWNER
  const canEdit = record.role !== 'viewer'
  const readable = record.secret !== null

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(record.id)
      toast.success('Item moved to trash')
      setOpenDelete(false)
    } catch (error) {
      toastAxiosError(error)
    }
  }

  const handleLeave = async () => {
    if (!profile) return

    try {
      await leaveMutation.mutateAsync(profile.user.id)
      toast.success('You no longer have access to this item')
      setOpenLeave(false)
    } catch (error) {
      toastAxiosError(error)
    }
  }

  return (
    <React.Fragment>
      <RowColumnAction
        onEdit={readable && canEdit ? () => setOpenEdit(true) : undefined}
        onShow={readable && !canEdit ? () => setOpenEdit(true) : undefined}
        onDelete={isOwner ? () => setOpenDelete(true) : undefined}
        dropdown={
          <>
            {record.type === 'login' && (
              <>
                <DropdownMenuItem
                  onClick={() => void copyToClipboard(record.secret?.username, 'username')}
                >
                  <IconCopy />
                  Copy username
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => void copyToClipboard(record.secret?.password, 'password')}
                >
                  <IconCopy />
                  Copy password
                </DropdownMenuItem>
              </>
            )}
            {isOwner && readable && (
              <DropdownMenuItem onClick={() => setOpenShare(true)}>
                <IconShare />
                Share
              </DropdownMenuItem>
            )}
            {!isOwner && (
              <DropdownMenuItem variant="destructive" onClick={() => setOpenLeave(true)}>
                <IconDoorExit />
                Leave
              </DropdownMenuItem>
            )}
          </>
        }
      />

      <SimpleAlertDialog
        title="Move this item to the trash?"
        description="Everyone it is shared with loses sight of it. You can restore it from the trash."
        open={openDelete}
        onOpenChange={setOpenDelete}
        onConfirm={handleDelete}
        confirmText="Move to trash"
        variant="destructive"
      />

      <SimpleAlertDialog
        title="Leave this shared item?"
        description="It disappears from your vault. Only its owner can share it with you again."
        open={openLeave}
        onOpenChange={setOpenLeave}
        onConfirm={handleLeave}
        confirmText="Leave"
        variant="destructive"
      />

      {/* Mounted only while open so each opening starts from the current item. */}
      {openEdit && <EditItemForm open={openEdit} onOpenChange={setOpenEdit} record={record} />}
      {openShare && <ShareItemForm open={openShare} onOpenChange={setOpenShare} record={record} />}
    </React.Fragment>
  )
}
