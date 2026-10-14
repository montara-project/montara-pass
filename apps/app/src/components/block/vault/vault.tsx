import { IconChevronLeft, IconChevronRight, IconPlus, IconStarFilled } from '@tabler/icons-react'
import { parseAsInteger, useQueryState } from 'nuqs'
import { useMemo, useState } from 'react'

import type { VaultFolder, VaultItem } from '@/types/vault'

import SelectInput from '@/components/block/common/select-input'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useFolders, useItems } from '@/hooks/use-vault'
import { axiosErrorMessage } from '@/lib/api/axios-error'
import { ItemTypeOptions } from '@/lib/constants/vault'
import { formatDate } from '@/lib/date'
import { cn } from '@/lib/utils'

import { AddItemForm } from './form'
import ItemDetail from './item-detail'
import ItemTile from './item-tile'

/** Select value standing for "no filter": a select item cannot be empty. */
const ALL = 'all'

/** Items to a page. The server cannot sort or search, so the list is paged as it comes. */
const PAGE_SIZE = 25

/**
 * The vault: the list on one side and the item it has selected on the other.
 * In a narrow window the two take turns.
 */
export default function Vault() {
  const [openAdd, setOpenAdd] = useState(false)

  const [folderId, setFolderId] = useQueryState('folder')
  const [type, setType] = useQueryState('type')
  const [page, setPage] = useQueryState('page', parseAsInteger.withDefault(0))
  const [selectedId, setSelectedId] = useQueryState('item')

  const params = useMemo(
    () => ({
      offset: Math.max(page, 0) * PAGE_SIZE,
      limit: PAGE_SIZE,
      ...(folderId ? { folder_id: folderId } : {}),
      ...(type ? { type } : {}),
    }),
    [page, folderId, type]
  )

  const { data: folders } = useFolders()
  const { data, isLoading, isError, error, refetch } = useItems(params)
  const total = data?.metadata?.total ?? 0
  const items = data?.data ?? []
  const filtered = Boolean(folderId || type)
  const folderList = useMemo(() => folders ?? [], [folders])

  const selected = items.find((item) => item.id === selectedId) ?? null
  const pages = Math.ceil(total / PAGE_SIZE)
  const from = total === 0 ? 0 : params.offset + 1
  const to = Math.min(params.offset + items.length, total)

  // A filter starts the list over, and what was open may not be in it.
  const filter = (set: () => void) => {
    set()
    void setPage(null)
    void setSelectedId(null)
  }

  const turn = (next: number) => {
    void setPage(next === 0 ? null : next)
    void setSelectedId(null)
  }

  const folderOptions = [
    { label: 'All folders', value: ALL },
    ...folderList.map((folder) => ({ label: folder.name, value: folder.id })),
  ]
  const typeOptions = [{ label: 'All types', value: ALL }, ...ItemTypeOptions]

  return (
    <div className="@container/vault h-full">
      <div className="grid h-full grid-cols-[minmax(300px,1fr)_minmax(360px,600px)] @max-[760px]/vault:grid-cols-1">
        <section
          aria-label="Items"
          className={cn(
            '@container/list flex min-h-0 flex-col border-r @max-[760px]/vault:border-r-0',
            selected && '@max-[760px]/vault:hidden'
          )}
        >
          <header className="flex flex-wrap items-center gap-x-3 gap-y-2 px-5 pt-6 pb-3">
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <h1 className="text-xl font-semibold tracking-[-0.01em]">Vault</h1>
              <p className="text-muted-foreground text-[13px]">
                Your items and the ones shared with you, decrypted in this browser only.
              </p>
            </div>
            <Button onClick={() => setOpenAdd(true)}>
              <IconPlus />
              New item
            </Button>
          </header>

          <div className="flex flex-wrap items-center gap-2 px-5 pb-3">
            <SelectInput
              // Remount once the folders arrive so the stored filter shows its name.
              key={`folder-${folderList.length}`}
              className="h-9 w-44"
              placeholder="All folders"
              options={folderOptions}
              defaultValue={folderId ?? ALL}
              onSelect={(value) => filter(() => void setFolderId(value === ALL ? null : value))}
            />
            <SelectInput
              className="h-9 w-36"
              placeholder="All types"
              options={typeOptions}
              defaultValue={type ?? ALL}
              onSelect={(value) => filter(() => void setType(value === ALL ? null : value))}
            />
            <span className="text-muted-foreground ml-auto text-xs tabular-nums">
              {isLoading ? '' : total === 1 ? '1 item' : `${total} items`}
            </span>
          </div>

          {/* The list as a table: name, folder, updated. The two extra columns
              go when the list is too narrow to hold them. */}
          <div className="text-muted-foreground grid grid-cols-[minmax(0,1fr)_140px_120px] px-7 pb-1.5 text-xs font-medium @max-[560px]/list:hidden">
            <span>Name</span>
            <span className="pl-3">Folder</span>
            <span className="pl-3">Updated</span>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
            {isLoading ? (
              <ul className="m-0 list-none p-0" aria-hidden="true">
                {Array.from({ length: 8 }, (_, index) => (
                  <li key={index} className="flex items-center gap-3 px-3 py-2">
                    <Skeleton className="rounded-control size-9" />
                    <span className="flex flex-1 flex-col gap-1.5">
                      <Skeleton className="h-3.5 w-40 max-w-full" />
                      <Skeleton className="h-3 w-28 max-w-full" />
                    </span>
                  </li>
                ))}
              </ul>
            ) : isError ? (
              <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
                <p role="alert" className="text-danger text-[13px] whitespace-pre-line">
                  {axiosErrorMessage(error)}
                </p>
                <Button variant="outline" size="sm" onClick={() => void refetch()}>
                  Try again
                </Button>
              </div>
            ) : items.length === 0 ? (
              // Nothing to list: said in the middle of where the list would be.
              <p className="text-muted-foreground px-6 py-14 text-center text-balance">
                {filtered
                  ? 'No items match these filters.'
                  : 'Your vault is empty. Add your first login or secure note.'}
              </p>
            ) : (
              <ul className="m-0 list-none p-0">
                {items.map((item) => (
                  <li key={item.id}>
                    <ItemRow
                      item={item}
                      folders={folderList}
                      selected={item.id === selectedId}
                      onSelect={() => void setSelectedId(item.id)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>

          {pages > 1 && (
            <footer className="flex items-center gap-1 border-t px-5 py-2">
              <span className="text-muted-foreground flex-1 text-xs tabular-nums">
                {from}–{to} of {total}
              </span>
              <Button
                variant="ghost"
                mode="icon"
                size="icon"
                aria-label="Previous page"
                disabled={page <= 0}
                onClick={() => turn(page - 1)}
              >
                <IconChevronLeft />
              </Button>
              <Button
                variant="ghost"
                mode="icon"
                size="icon"
                aria-label="Next page"
                disabled={page >= pages - 1}
                onClick={() => turn(page + 1)}
              >
                <IconChevronRight />
              </Button>
            </footer>
          )}
        </section>

        <section
          aria-label="Item"
          className={cn('min-h-0 overflow-y-auto', !selected && '@max-[760px]/vault:hidden')}
        >
          {selected ? (
            // Remounted per item: what was revealed in one is hidden in the next.
            <ItemDetail
              key={selected.id}
              item={selected}
              folders={folderList}
              onClose={() => void setSelectedId(null)}
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
              <span className="opacity-60">
                <ItemTile item={{ type: 'login', secret: null } as VaultItem} />
              </span>
              <p className="text-muted-foreground text-balance">
                Select an item to see it, or create a new one.
              </p>
            </div>
          )}
        </section>
      </div>

      {openAdd && <AddItemForm open={openAdd} onOpenChange={setOpenAdd} folderId={folderId} />}
    </div>
  )
}

interface ItemRowProps {
  item: VaultItem
  folders: VaultFolder[]
  selected: boolean
  onSelect: () => void
}

/** Here the whole row is the control. */
function ItemRow({ item, folders, selected, onSelect }: ItemRowProps) {
  const folder = folders.find((f) => f.id === item.folder_id)

  return (
    <button
      type="button"
      aria-current={selected ? 'true' : undefined}
      onClick={onSelect}
      className="hover:bg-hover aria-[current=true]:bg-card rounded-row grid w-full grid-cols-[auto_minmax(0,1fr)_140px_120px] items-center px-3 py-2 text-left transition-colors duration-[120ms] motion-reduce:transition-none @max-[560px]/list:grid-cols-[auto_minmax(0,1fr)]"
    >
      <span className="mr-3">
        <ItemTile item={item} />
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="flex min-w-0 items-center gap-1.5">
          {item.secret ? (
            <span className="truncate text-[15px] font-medium tracking-[-0.005em]">
              {item.secret.name}
            </span>
          ) : (
            <span className="text-danger truncate text-[15px]">Unable to decrypt</span>
          )}
          {item.favorite && (
            <IconStarFilled
              className="text-muted-foreground size-3.5 shrink-0"
              aria-label="Favorite"
            />
          )}
        </span>
        <span className="text-muted-foreground truncate text-[13px]">
          {item.type === 'login'
            ? item.secret?.username || 'No username'
            : item.secret
              ? 'Secure note'
              : ''}
        </span>
      </span>
      <span className="text-muted-foreground truncate pl-3 text-[13px] @max-[560px]/list:hidden">
        {folder?.name ?? ''}
      </span>
      <span className="text-muted-foreground truncate pl-3 text-[13px] tabular-nums @max-[560px]/list:hidden">
        {formatDate(item.updated_at)}
      </span>
    </button>
  )
}
