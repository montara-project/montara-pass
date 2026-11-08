import type { VaultFolder, VaultItem } from '@montara-pass/shared/types/vault'

import { ITEM_TYPE_LABEL, ItemTypeOptions } from '@montara-pass/shared/constants/vault'
import { cardEnding, matchesSearch } from '@montara-pass/shared/crypto/vault'
import { formatDate } from '@montara-pass/shared/date'
import {
  IconBook,
  IconChevronLeft,
  IconChevronRight,
  IconFilterOff,
  IconKey,
  IconLock,
  IconPlus,
  IconSearch,
  IconStarFilled,
} from '@tabler/icons-react'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
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
    favorite,
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
      ...(favorite ? { favorite } : {}),
    }),
    [page, folderId, type, favorite]
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
          (!favorite || item.favorite) &&
          matchesSearch(item.secret, term)
      ),
    [everything.data, folderId, type, favorite, term]
  )
  const total = term ? found.length : (paged.data?.metadata?.total ?? 0)
  const items = term
    ? found.slice(params.offset, params.offset + PAGE_SIZE)
    : (paged.data?.data ?? [])
  const filtered = Boolean(folderId || type || favorite || term)
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
          {/* Three parts, a line under each: what the page is, what narrows the
              list, and the list. One gutter for all of them. */}
          <header className="border-border/60 flex flex-wrap items-center gap-x-4 gap-y-2 border-b px-6 pt-[22px] pb-[18px]">
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <p className="text-muted-foreground font-mono text-[10px] tracking-[0.09em] uppercase">
                Vault
              </p>
              <h1 className="text-xl font-semibold tracking-[-0.01em]">Vault</h1>
              <p className="text-muted-foreground text-[13px]">
                Your items and the ones shared with you, decrypted in this browser only.
              </p>
            </div>
            <Button size="sm" onClick={() => setOpenAdd(true)}>
              <IconPlus />
              New item
            </Button>
          </header>

          <div className="border-border/60 flex flex-wrap items-center gap-2 border-b px-6 py-3.5">
            <div className="relative min-w-48 flex-1">
              <IconSearch
                className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
                aria-hidden
              />
              <Input
                type="search"
                placeholder="Search name, username or URL"
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
              // The sidebar sets the type too: remount so this shows it.
              key={`type-${type ?? ALL}`}
              className="h-9 w-36"
              placeholder="All types"
              options={typeOptions}
              defaultValue={type ?? ALL}
              onSelect={(value) => filter({ type: value === ALL ? undefined : value })}
            />
          </div>

          {/* The list as a table in its own card: headings, rows, and a footer
              with the count and the way to the folders. The two extra columns
              go when the list is too narrow to hold them. */}
          <div className="flex min-h-0 flex-1 flex-col px-6 pt-4 pb-5">
            <div className="rounded-card bg-panel flex min-h-0 flex-1 flex-col overflow-hidden border">
              {/* The line under the headings stays when they go: it is where the list begins. */}
              <div className="text-muted-foreground grid shrink-0 grid-cols-[minmax(0,1fr)_140px_120px] gap-3 border-b px-4 py-2.5 font-mono text-[10px] tracking-[0.09em] uppercase @max-[560px]/list:[&>span]:hidden">
                <span>Name</span>
                <span>Folder</span>
                <span>Updated</span>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                {isLoading ? (
                  <ul className="m-0 list-none p-0" aria-hidden="true">
                    {Array.from({ length: 8 }, (_, index) => (
                      <li key={index} className="flex items-center gap-3 px-4 py-[11px]">
                        <Skeleton className="size-8 rounded-md" />
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
                  <ul className="fade-in divide-border/60 m-0 list-none divide-y border-b border-border/60 p-0">
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

              <footer className="flex shrink-0 items-center gap-1 border-t px-4 py-2">
                <span className="text-muted-foreground flex-1 font-mono text-[10px] tracking-[0.05em] uppercase tabular-nums">
                  {!isLoading &&
                    (pages > 1 ? `${from}–${to} of ${total} items` : `${total} of ${total} items`)}
                </span>
                {pages > 1 && (
                  <>
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
                  </>
                )}
                <Button
                  asChild
                  variant="outline"
                  size="xs"
                  className="h-[26px] gap-1 px-2.5 text-xs"
                >
                  <Link to="/folders">
                    Manage folders
                    <IconChevronRight className="text-muted-foreground size-3" />
                  </Link>
                </Button>
              </footer>
            </div>
          </div>
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
            <div className="flex h-full flex-col items-center justify-center gap-3.5 p-8 text-center">
              <span className="bg-panel inline-flex size-11 items-center justify-center rounded-xl border">
                <IconKey className="size-5" aria-hidden />
              </span>
              <p className="text-muted-foreground text-[13px] text-balance">
                Select an item to see it, or create a new one.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                <Button size="sm" onClick={() => setOpenAdd(true)}>
                  <IconPlus />
                  New item
                </Button>
                <Button asChild variant="secondary" size="sm">
                  <Link to="/folders">
                    <IconBook />
                    Browse folders
                  </Link>
                </Button>
              </div>
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
      className="hover:bg-hover aria-[current=true]:bg-card grid w-full grid-cols-[auto_minmax(0,1fr)_140px_120px] items-center gap-3 px-4 py-[11px] text-left transition-colors duration-[120ms] motion-reduce:transition-none @max-[560px]/list:grid-cols-[auto_minmax(0,1fr)]"
    >
      <ItemTile item={item} />
      <span className="flex min-w-0 flex-col">
        <span className="flex min-w-0 items-center gap-1.5">
          {item.secret ? (
            <span className="truncate text-[13.5px] font-medium tracking-[-0.005em]">
              {item.secret.name}
            </span>
          ) : (
            <span className="text-danger truncate text-[13.5px]">Unable to decrypt</span>
          )}
          {item.favorite && (
            <IconStarFilled
              className="text-muted-foreground size-3.5 shrink-0"
              aria-label="Favorite"
            />
          )}
        </span>
        <span className="text-muted-foreground truncate text-xs">{itemSubtitle(item)}</span>
      </span>
      <span className="text-muted-foreground truncate text-xs @max-[560px]/list:hidden">
        {folder?.name ?? '—'}
      </span>
      <span className="text-muted-foreground truncate font-mono text-[11px] tracking-[0.04em] tabular-nums @max-[560px]/list:hidden">
        {formatDate(item.updated_at)}
      </span>
    </button>
  )
}
