import type { VaultFolder, VaultItem } from '@montara-pass/shared/types/vault'

import { ITEM_TYPE_LABEL, ItemTypeOptions } from '@montara-pass/shared/constants/vault'
import { cardEnding, matchesSearch } from '@montara-pass/shared/crypto/vault'
import { formatDate } from '@montara-pass/shared/date'
import {
  IconChevronLeft,
  IconChevronRight,
  IconFilterOff,
  IconLock,
  IconPlus,
  IconSearch,
  IconStarFilled,
} from '@tabler/icons-react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { useMemo, useState } from 'react'

import type { VaultSearch } from '@/routes/(app)/vault'

import EmptyState from '@/components/block/common/empty-state'
import SelectInput from '@/components/block/common/select-input'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useAllItems, useFolders, useItems } from '@/hooks/use-vault'
import { apiErrorMessage } from '@/lib/api/api-error'
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

  const {
    folder: folderId,
    type,
    page = 0,
    item: selectedId,
  } = useSearch({ from: '/(app)/vault/' })
  const navigate = useNavigate({ from: '/vault/' })
  const setUrl = (next: VaultSearch) =>
    void navigate({ search: (prev) => ({ ...prev, ...next }), replace: true })
  // Kept out of the URL: what someone searches their vault for would
  // otherwise land in the browser's history.
  const [search, setSearch] = useState('')
  const term = search.trim().toLowerCase()
  // Reading the whole vault starts as the search field takes focus, not at the
  // first letter: it is one RSA unwrap per item, and the moment it takes to
  // start typing is spent on it.
  const [searchFocused, setSearchFocused] = useState(false)

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
  // The server cannot search ciphertext, so a search reads the whole vault,
  // decrypted, and filters and pages it here. Without one, the server pages.
  const paged = useItems(params)
  const everything = useAllItems({ enabled: Boolean(term) || searchFocused })
  const { isLoading, isError, error, refetch } = term ? everything : paged
  const found = useMemo(
    () =>
      (everything.data ?? []).filter(
        (item) =>
          (!folderId || item.folder_id === folderId) &&
          (!type || item.type === type) &&
          matchesSearch(item.secret, term)
      ),
    [everything.data, folderId, type, term]
  )
  const total = term ? found.length : (paged.data?.metadata?.total ?? 0)
  const items = term
    ? found.slice(params.offset, params.offset + PAGE_SIZE)
    : (paged.data?.data ?? [])
  const filtered = Boolean(folderId || type || term)
  const folderList = useMemo(() => folders ?? [], [folders])

  const selected = items.find((item) => item.id === selectedId) ?? null
  const pages = Math.ceil(total / PAGE_SIZE)
  const from = total === 0 ? 0 : params.offset + 1
  const to = Math.min(params.offset + items.length, total)

  // A filter starts the list over, and what was open may not be in it.
  const filter = (next: VaultSearch) => setUrl({ ...next, page: undefined, item: undefined })

  const turn = (next: number) => setUrl({ page: next === 0 ? undefined : next, item: undefined })

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
          {/* Three parts, each with room under it: what the page is, what narrows
              the list, and the list. One gutter for all of them. */}
          <header className="flex flex-wrap items-center gap-x-3 gap-y-2 px-6 pt-5 pb-5">
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

          <div className="flex flex-wrap items-center gap-2 px-6 pb-4">
            <div className="relative min-w-48 flex-1 sm:max-w-72">
              <IconSearch
                className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
                aria-hidden
              />
              <Input
                type="search"
                placeholder="Search items"
                aria-label="Search items by name, username or URL"
                value={search}
                onFocus={() => setSearchFocused(true)}
                onChange={(event) => {
                  setSearch(event.target.value)
                  filter({})
                }}
                // The selects beside it set the field look; the input takes it too.
                className="bg-field border-field-border rounded-control hover:border-muted-foreground focus-visible:border-focus focus-visible:ring-focus h-9 pl-9 shadow-none focus-visible:ring-1 dark:bg-field"
              />
            </div>
            <SelectInput
              // Remount once the folders arrive so the stored filter shows its name.
              key={`folder-${folderList.length}`}
              className="h-9 w-44"
              placeholder="All folders"
              options={folderOptions}
              defaultValue={folderId ?? ALL}
              onSelect={(value) => filter({ folder: value === ALL ? undefined : value })}
            />
            <SelectInput
              className="h-9 w-36"
              placeholder="All types"
              options={typeOptions}
              defaultValue={type ?? ALL}
              onSelect={(value) => filter({ type: value === ALL ? undefined : value })}
            />
            <span className="text-muted-foreground ml-auto text-xs tabular-nums">
              {!isLoading && `${total} ${total === 1 ? 'item' : 'items'}`}
            </span>
          </div>

          {/* The list as a table: name, folder, updated. The two extra columns
              go when the list is too narrow to hold them. */}
          {/* The line under them stays when they go: it is where the list begins. */}
          <div className="mx-6 border-b">
            <div className="text-muted-foreground grid grid-cols-[minmax(0,1fr)_140px_120px] pb-2 text-xs font-medium @max-[560px]/list:hidden">
              <span>Name</span>
              <span className="pl-3">Folder</span>
              <span className="pl-3">Updated</span>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-3 pt-2 pb-3">
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
                  {apiErrorMessage(error)}
                </p>
                <Button variant="outline" size="sm" onClick={() => void refetch()}>
                  Try again
                </Button>
              </div>
            ) : items.length === 0 ? (
              // The list has its own edge, so what stands in for it has none.
              <EmptyState
                framed={false}
                icon={filtered ? IconFilterOff : IconLock}
                title={filtered ? 'No items match these filters' : 'Your vault is empty'}
                description={
                  filtered
                    ? 'Change the search, the folder or the type above to see more.'
                    : 'Add your first login or secure note with New item.'
                }
              />
            ) : (
              <ul className="fade-in m-0 list-none p-0 space-y-1">
                {items.map((item) => (
                  <li key={item.id}>
                    <ItemRow
                      item={item}
                      folders={folderList}
                      selected={item.id === selectedId}
                      onSelect={() => setUrl({ item: item.id })}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>

          {pages > 1 && (
            <footer className="flex items-center gap-1 border-t px-6 py-2">
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
              onClose={() => setUrl({ item: undefined })}
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

/** A row's second line: the username, email or card ending, else the item's type. */
function itemSubtitle(item: VaultItem) {
  if (item.type === 'login') return item.secret?.username || 'No username'
  if (!item.secret) return ''
  if (item.type === 'contact' && item.secret.contact?.email) return item.secret.contact.email
  if (item.type === 'card') return cardEnding(item.secret.card?.number) ?? ITEM_TYPE_LABEL.card
  return ITEM_TYPE_LABEL[item.type]
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
        <span className="text-muted-foreground truncate text-[13px]">{itemSubtitle(item)}</span>
      </span>
      <span className="text-muted-foreground truncate pl-3 text-[13px] @max-[560px]/list:hidden">
        {folder?.name ?? '—'}
      </span>
      <span className="text-muted-foreground truncate pl-3 text-[13px] tabular-nums @max-[560px]/list:hidden">
        {formatDate(item.updated_at)}
      </span>
    </button>
  )
}
