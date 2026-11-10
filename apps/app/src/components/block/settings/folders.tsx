import type { VaultFolder } from '@montara-pass/shared/types/vault'

import { formatDate } from '@montara-pass/shared/date'
import { IconFolder, IconFolderPlus, IconPencil, IconTrash } from '@tabler/icons-react'
import { useMutation } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import EmptyState from '@/components/block/common/empty-state'
import SimpleAlertDialog from '@/components/block/common/simple-alert-dialog'
import { AddFolderForm, EditFolderForm } from '@/components/block/folder/form'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useFolders, useItemTotals } from '@/hooks/use-vault'
import { toastApiError } from '@/lib/api/api-error'
import { queries } from '@/lib/api/queries'

import {
  ListCard,
  ListFooter,
  ListRow,
  ListRows,
  ListSkeleton,
  SettingsSection,
  usePage,
} from './list'

/** The tile a folder row leads with. */
const tile = (
  <span className="bg-background text-muted-foreground inline-flex size-8 shrink-0 items-center justify-center rounded-[9px] border">
    <IconFolder className="size-4" aria-hidden />
  </span>
)

/**
 * The user's folders, as Settings lists them: each with how many items it
 * holds, renamed or deleted from its Manage menu. Names are decrypted here;
 * the counts come from the server, nothing else is decrypted.
 */
export default function Folders() {
  const [adding, setAdding] = useState(false)
  const { data, isLoading, isError } = useFolders()
  const folders = useMemo(() => data ?? [], [data])
  const { rows, footer } = usePage(folders)
  const totals = useItemTotals(useMemo(() => rows.map((f) => ({ folder_id: f.id })), [rows]))

  // Loading, the error, no folders yet, or the rows.
  const renderList = () => {
    if (isLoading) return <ListSkeleton />
    if (isError) {
      return (
        <p role="alert" className="text-danger px-4 py-6 text-[13px]">
          The folders could not be read. Reload the page to try again.
        </p>
      )
    }
    if (folders.length === 0) {
      return (
        <EmptyState
          framed={false}
          icon={IconFolder}
          title="No folders yet"
          description="Create a folder to group the items in your vault."
        />
      )
    }
    return (
      <>
        <ListRows>
          {rows.map((folder, index) => (
            <ListRow
              key={folder.id}
              tile={tile}
              name={folder.name}
              meta={`${countLabel(totals[index])} · Updated ${formatDate(folder.updated_at)}`}
            >
              <Manage folder={folder} />
            </ListRow>
          ))}
        </ListRows>
        <ListFooter label="Folders" {...footer} />
      </>
    )
  }

  return (
    <SettingsSection
      id="settings-folders"
      title="Folders"
      description="How the vault is organised. Renaming or deleting a folder keeps its items."
      aside={
        <Button size="xs" onClick={() => setAdding(true)}>
          <IconFolderPlus />
          New folder
        </Button>
      }
    >
      <ListCard>{renderList()}</ListCard>
      <AddFolderForm open={adding} onOpenChange={setAdding} />
    </SettingsSection>
  )
}

/** "24 items", or an ellipsis while the server counts. */
function countLabel(count: number | undefined) {
  if (count === undefined) return '… items'
  return `${count} ${count === 1 ? 'item' : 'items'}`
}

/** A folder's menu: rename it, or delete it and keep its items. */
function Manage({ folder }: { folder: VaultFolder }) {
  const [renaming, setRenaming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const remove = useMutation(queries.folders.delete())

  const handleDelete = async () => {
    try {
      await remove.mutateAsync(folder.id)
      toast.success(`Deleted ${folder.name}`)
      setDeleting(false)
    } catch (error) {
      toastApiError(error)
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="xs"
            className="bg-background h-7 px-2.5 text-xs"
            aria-label={`Manage ${folder.name}`}
          >
            Manage
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-40">
          <DropdownMenuItem onSelect={() => setRenaming(true)}>
            <IconPencil />
            Rename
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(true)}>
            <IconTrash />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {renaming && (
        <EditFolderForm open onOpenChange={(open) => !open && setRenaming(false)} record={folder} />
      )}

      <SimpleAlertDialog
        title={`Delete ${folder.name}?`}
        description="The items in it are kept and move out of the folder."
        open={deleting}
        onOpenChange={setDeleting}
        onConfirm={handleDelete}
        confirmText="Delete"
        variant="destructive"
      />
    </>
  )
}
