import type { VaultFolder } from '@montara-pass/shared/types/vault'

import { formatDate } from '@montara-pass/shared/date'
import { IconDots, IconFolder, IconFolderPlus, IconTrash } from '@tabler/icons-react'
import { useMutation } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

import SimpleAlertDialog from '@/components/block/common/simple-alert-dialog'
import { MONO_NOTE } from '@/components/block/security/section'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { useFolders, useItemTotals } from '@/hooks/use-vault'
import { toastApiError } from '@/lib/api/api-error'
import { queries } from '@/lib/api/queries'
import { cn } from '@/lib/utils'

import { AddFolderForm, EditFolderForm } from './form'

/** A count in the line above the list. */
function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="bg-background flex h-[26px] items-center gap-2 rounded-md border px-2.5">
      <dt className={MONO_NOTE}>{label}</dt>
      <dd className="m-0 font-mono text-xs font-semibold tabular-nums">{value}</dd>
    </div>
  )
}

const count = (n: number | undefined, one: string, many: string) =>
  n === undefined ? '…' : `${n} ${n === 1 ? one : many}`

/**
 * The user's folders: their own way of grouping items. Names are encrypted,
 * and nobody an item is shared with sees where it was filed.
 */
export default function FolderTable() {
  const [openAdd, setOpenAdd] = useState(false)
  const [editing, setEditing] = useState<VaultFolder | null>(null)
  const [deleting, setDeleting] = useState<VaultFolder | null>(null)
  const remove = useMutation(queries.folders.delete())

  const { data, isLoading, isError, error } = useFolders()
  const folders = useMemo(() => data ?? [], [data])
  // How many items each folder holds, from the server's totals: nothing is decrypted.
  const totals = useItemTotals(useMemo(() => folders.map((f) => ({ folder_id: f.id })), [folders]))
  const filed = totals.every((n) => n !== undefined)
    ? totals.reduce<number>((sum, n) => sum + (n ?? 0), 0)
    : undefined

  useEffect(() => {
    if (isError) toastApiError(error)
  }, [isError, error])

  const confirmDelete = async () => {
    const target = deleting
    setDeleting(null)
    if (!target) return
    try {
      await remove.mutateAsync(target.id)
      toast.success(`Deleted ${target.name}`)
    } catch (err) {
      toastApiError(err)
    }
  }

  return (
    <div className="mx-auto flex max-w-[1040px] flex-col">
      <header className="border-border/60 flex flex-wrap items-center gap-x-4 gap-y-3 border-b px-5 pt-[22px] pb-[18px] sm:px-8">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className={MONO_NOTE}>Vault · Folders</p>
          <h1 className="text-[22px] font-semibold tracking-[-0.01em]">Manage folders</h1>
          <p className="text-muted-foreground text-[13px]">
            Your own way of grouping items. Folder names are encrypted, and nobody you share an item
            with sees where you filed it.
          </p>
        </div>
        <Button size="sm" onClick={() => setOpenAdd(true)}>
          <IconFolderPlus />
          New folder
        </Button>
      </header>

      <div className="flex flex-col gap-4 px-5 pt-5 pb-8 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <dl className="m-0 flex flex-wrap gap-2">
            <Stat label="Folders" value={isLoading ? '…' : folders.length} />
            <Stat label="Items filed" value={filed ?? '…'} />
          </dl>
          <span className={MONO_NOTE}>Sorted by name A–Z</span>
        </div>

        <section aria-labelledby="folders" className="flex flex-col gap-2.5">
          <h2 id="folders" className={MONO_NOTE}>
            Folders
          </h2>
          {isLoading ? (
            <Skeleton className="rounded-card h-32" aria-hidden="true" />
          ) : folders.length === 0 ? (
            <div className="rounded-card bg-panel fade-in flex flex-col items-center gap-3 border px-6 py-11 text-center">
              <span className="bg-background inline-flex size-11 items-center justify-center rounded-xl border">
                <IconFolder className="size-5" aria-hidden />
              </span>
              <p className="text-[15px] font-semibold">No folders yet</p>
              <p className="text-muted-foreground max-w-[44ch] text-[13px] text-balance">
                Create a folder to group the items in your vault.
              </p>
              <Button size="sm" className="mt-1" onClick={() => setOpenAdd(true)}>
                <IconFolderPlus />
                New folder
              </Button>
            </div>
          ) : (
            <div className="rounded-card bg-panel fade-in overflow-hidden border">
              <ul className="divide-border/60 m-0 list-none divide-y p-0">
                {folders.map((folder, index) => (
                  <li key={folder.id} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="bg-background inline-flex size-8 shrink-0 items-center justify-center rounded-md border">
                      <IconFolder className="size-4" aria-hidden />
                    </span>
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="truncate text-[13px] font-medium">{folder.name}</span>
                      <span className={cn(MONO_NOTE, 'normal-case tabular-nums')}>
                        {count(totals[index], 'item', 'items')} · updated{' '}
                        {formatDate(folder.updated_at)}
                      </span>
                    </div>
                    <Button variant="outline" size="xs" onClick={() => setEditing(folder)}>
                      Edit
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          mode="icon"
                          size="icon"
                          className="size-7"
                          aria-label={`More for ${folder.name}`}
                        >
                          <IconDots />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem variant="destructive" onClick={() => setDeleting(folder)}>
                          <IconTrash />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </li>
                ))}
              </ul>
              <p className={cn(MONO_NOTE, 'border-border/60 border-t px-4 py-2.5 tabular-nums')}>
                {count(folders.length, 'folder', 'folders')} ·{' '}
                {count(filed, 'item filed', 'items filed')}
              </p>
            </div>
          )}
          <p className={MONO_NOTE}>Deleting a folder keeps its items: they leave the folder</p>
        </section>
      </div>

      <SimpleAlertDialog
        title={`Delete ${deleting?.name ?? 'this folder'}?`}
        description="The items in it are kept and move out of the folder."
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        onConfirm={() => void confirmDelete()}
        confirmText="Delete"
        variant="destructive"
      />

      <AddFolderForm open={openAdd} onOpenChange={setOpenAdd} />
      {editing && (
        <EditFolderForm
          key={editing.id}
          open
          onOpenChange={(open) => !open && setEditing(null)}
          record={editing}
        />
      )}
    </div>
  )
}
