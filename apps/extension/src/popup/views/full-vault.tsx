import type { VaultKeys } from '@montara-pass/shared/crypto/vault'
import type { VaultItem } from '@montara-pass/shared/types/vault'

import { COMMUNITY } from '@montara-pass/shared/constants/edition'
import { CARD_FIELDS, CONTACT_FIELDS, ITEM_TYPE_LABEL } from '@montara-pass/shared/constants/vault'
import { cardEnding, decryptItem } from '@montara-pass/shared/crypto/vault'
import { passwordStrength } from '@montara-pass/shared/password'
import { sharingLabel } from '@montara-pass/shared/sharing'
import { linkOf } from '@montara-pass/shared/url'
import { maskUsername } from '@montara-pass/shared/username'
import { QueryClient, useInfiniteQuery } from '@tanstack/react-query'
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

import {
  listItemMembers,
  listItemsPage,
  setItemPlacement,
  SignedOutError,
  trashItem,
} from '../../lib/api'
import { getSettings } from '../../lib/storage'
import { lastUsedAgo } from '../../lib/usage'
import {
  ArrowLeftIcon,
  ArrowUpRightIcon,
  BookOpenIcon,
  CardIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CopyIcon,
  EyeIcon,
  EyeOffIcon,
  FilterIcon,
  GridIcon,
  KeyIcon,
  KeyRoundIcon,
  MoreIcon,
  NoteIcon,
  PencilIcon,
  PlusIcon,
  RefreshIcon,
  SearchIcon,
  ShareIcon,
  StarIcon,
  TrashIcon,
  UserIcon,
} from '../icons'
import { itemSubtitle, ItemTile } from '../item-tile'
import { useDismiss } from '../use-dismiss'
import {
  searchAndSort,
  SORT_LABEL,
  useFolders,
  useVaultActions,
  useVaultItems,
  type Sort,
} from '../use-vault-items'
import { VaultSidebar, type Tool } from '../vault-sidebar'
import Billing from './billing'
import ItemForm from './item-form'
import PasswordGenerator from './password-generator'
import PasswordHealth from './password-health'
import ShareItem from './share-item'

interface FullVaultProps {
  keys: VaultKeys
  onLock: () => void
  onSignOut: () => void
  /** The session ended underneath the page. */
  onSignedOut: () => void
  onSettings: () => void
}

type Filter = 'all' | 'login' | 'secure_note' | 'card' | 'contact' | 'favorite'
/** What the detail pane shows. */
type Pane =
  | { mode: 'view'; id: string | null }
  | { mode: 'new' }
  | { mode: 'edit'; id: string }
  | { mode: 'share'; id: string }

const FILTERS: { value: Filter; label: string; icon: typeof GridIcon }[] = [
  { value: 'all', label: 'All items', icon: GridIcon },
  { value: 'login', label: 'Logins', icon: KeyRoundIcon },
  { value: 'secure_note', label: 'Secure notes', icon: NoteIcon },
  { value: 'card', label: 'Cards', icon: CardIcon },
  { value: 'contact', label: 'Contacts', icon: UserIcon },
  { value: 'favorite', label: 'Favorites', icon: StarIcon },
]

function inFilter(item: VaultItem, filter: Filter) {
  if (filter === 'all') return true
  if (filter === 'favorite') return item.favorite
  return item.type === filter
}

// Fetched when an item with notes is opened, so it stays out of the first load.
const NotesView = lazy(() =>
  import('../notes-editor').then((module) => ({ default: module.NotesView }))
)

const MASK = '••••••••••••'

/** A card field as shown. Hidden, a card number still shows its last four digits. */
function cardFieldText(key: string, value: string, hidden: boolean): string {
  if (!hidden) return value
  if (key === 'number') return cardEnding(value) || MASK
  return MASK
}

/** Items asked for at a time. The server cannot sort or search, so the list grows as it comes. */
const PAGE_SIZE = 25

/**
 * The vault in a full browser tab: filters on the left, the list in the
 * middle, the selected item on the right. There is no page to fill from here,
 * so this view is for reading, adding and editing.
 */
export default function FullVault({
  keys,
  onLock,
  onSignOut,
  onSignedOut,
  onSettings,
}: FullVaultProps) {
  const { items, user, error, load } = useVaultItems(keys, onSignedOut)
  // One cache per open vault: locking unmounts this view, and the decrypted
  // pages go with it.
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: false } } })
  )
  // A change reloads the whole vault and the pages of the list alike.
  const reload = useCallback(async () => {
    await Promise.all([load(), queryClient.invalidateQueries()])
  }, [load, queryClient])
  const { notice, setNotice, refreshing, refresh, act, copy } = useVaultActions(reload, onSignedOut)

  const [filter, setFilter] = useState<Filter>('all')
  const [sort, setSort] = useState<Sort>('name')
  const [search, setSearch] = useState('')
  // '' is every folder.
  const [folder, setFolder] = useState('')
  const [pane, setPane] = useState<Pane>({ mode: 'view', id: null })
  // A tool takes the place of the list and the item beside it.
  const [tool, setTool] = useState<Tool | null>(null)
  const [appUrl, setAppUrl] = useState('')
  const folders = useFolders(keys)
  useEffect(() => {
    void getSettings().then((settings) => setAppUrl(settings.appUrl))
  }, [])

  const readable = useMemo(() => (items ?? []).filter((item) => item.secret !== null), [items])

  const counts = useMemo<Record<Filter, number>>(
    () => ({
      all: readable.length,
      login: readable.filter((item) => item.type === 'login').length,
      secure_note: readable.filter((item) => item.type === 'secure_note').length,
      card: readable.filter((item) => item.type === 'card').length,
      contact: readable.filter((item) => item.type === 'contact').length,
      favorite: readable.filter((item) => item.favorite).length,
    }),
    [readable]
  )

  // The server cannot search ciphertext, so a search reads the whole vault,
  // decrypted, and filters it here. Without one, the server hands the list
  // over a page at a time as it is scrolled.
  const term = search.trim()
  const pageParams = useMemo(
    () => ({
      limit: PAGE_SIZE,
      ...(filter === 'favorite' ? { favorite: true } : filter !== 'all' ? { type: filter } : {}),
      ...(folder ? { folder_id: folder } : {}),
    }),
    [filter, folder]
  )
  const list = useInfiniteQuery(
    {
      queryKey: ['items', 'list', pageParams],
      enabled: !term,
      initialPageParam: 0,
      queryFn: async ({ pageParam }) => {
        const page = await listItemsPage({ ...pageParams, offset: pageParam })
        const rows = await Promise.all(
          page.rows.map(async (item) => ({
            ...item,
            secret: await decryptItem(keys, item).catch(() => null),
          }))
        )
        return { rows, total: page.total }
      },
      // The next page starts where the rows so far end, until the total is in.
      getNextPageParam: (last, pages) => {
        const loaded = pages.reduce((sum, page) => sum + page.rows.length, 0)
        return last.rows.length > 0 && loaded < last.total ? loaded : undefined
      },
    },
    queryClient
  )
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = list
  useEffect(() => {
    if (list.error instanceof SignedOutError) onSignedOut()
  }, [list.error, onSignedOut])

  const total = list.data?.pages.at(-1)?.total ?? 0
  const loaded = useMemo(() => {
    // The whole vault, once read, has the newer copy of a row (an icon fetched since).
    const latest = new Map(readable.map((item) => [item.id, item]))
    return (list.data?.pages ?? [])
      .flatMap((page) => page.rows)
      .map((row) => latest.get(row.id) ?? row)
      .filter((item) => item.secret !== null)
  }, [list.data, readable])

  // In the chosen order. Without a search that is the order of the pages read
  // so far: a row from a later page may land above the ones already shown.
  const visible = useMemo(
    () =>
      term
        ? searchAndSort(
            readable.filter(
              (item) => inFilter(item, filter) && (!folder || item.folder_id === folder)
            ),
            search,
            sort
          )
        : searchAndSort(loaded, '', sort),
    [term, readable, loaded, filter, folder, search, sort]
  )
  const listLoading = term ? items === null : list.isLoading
  const listError =
    error ||
    (list.error && !(list.error instanceof SignedOutError) ? 'Could not load your vault' : '')
  const vaultEmpty = term ? readable.length === 0 : filter === 'all' && !folder && total === 0

  // The next page is asked for as the end of the list scrolls into view, a
  // little before it gets there.
  const scrollRef = useRef<HTMLDivElement>(null)
  const moreRef = useRef<HTMLParagraphElement>(null)
  const more = !term && hasNextPage
  useEffect(() => {
    const end = moreRef.current
    if (!more || isFetchingNextPage || !end) return
    const observer = new IntersectionObserver(
      ([entry]) => entry?.isIntersecting && void fetchNextPage(),
      { root: scrollRef.current, rootMargin: '200px' }
    )
    observer.observe(end)
    return () => observer.disconnect()
  }, [more, isFetchingNextPage, fetchNextPage])

  const selectedId = pane.mode === 'new' ? null : pane.id
  const folderNames = useMemo(() => new Map(folders.map((f) => [f.id, f.name])), [folders])
  const selected =
    readable.find((item) => item.id === selectedId) ??
    loaded.find((item) => item.id === selectedId) ??
    null
  // On a narrow window the pane covers the list, so it needs to know when it is in use.
  const paneOpen = pane.mode !== 'view' || selected !== null
  // Folders are kept in the web app, on its Settings page (General tab); there
  // is no editor for them here.
  const foldersUrl = appUrl && `${appUrl.replace(/\/$/, '')}/settings`

  // The tool in place of the list and the item.
  const renderTool = () => {
    if (tool === 'generator') {
      return <PasswordGenerator onNotice={setNotice} />
    }
    if (tool === 'billing') {
      return <Billing onSignedOut={onSignedOut} />
    }
    return (
      <PasswordHealth
        items={items}
        onOpen={(id) => {
          setTool(null)
          setFilter('all')
          setSearch('')
          setPane({ mode: 'view', id })
        }}
        onRescan={() => void refresh()}
        rescanning={refreshing}
        onOpenVault={() => setTool(null)}
      />
    )
  }

  // The pane: sharing, the form, the item, or a prompt to pick one.
  const renderPane = () => {
    if (pane.mode === 'share' && selected) {
      return (
        <ShareItem
          key={selected.id}
          keys={keys}
          item={selected}
          onDone={() => setPane({ mode: 'view', id: selected.id })}
          onSignedOut={onSignedOut}
          onNotice={setNotice}
        />
      )
    }
    if (pane.mode !== 'view') {
      return (
        <ItemForm
          // A different item is a different form, with its own fields.
          key={pane.mode === 'edit' ? pane.id : 'new'}
          keys={keys}
          item={pane.mode === 'edit' ? (selected ?? undefined) : undefined}
          folders={folders}
          onCancel={() => setPane({ mode: 'view', id: selectedId })}
          onSignedOut={onSignedOut}
          onSaved={(id) => {
            setNotice('Item saved')
            setPane({ mode: 'view', id })
            void reload()
          }}
        />
      )
    }
    if (selected) {
      return (
        <ItemDetail
          key={selected.id}
          item={selected}
          onCopy={(value, label) => void copy(value, label)}
          onEdit={() => setPane({ mode: 'edit', id: selected.id })}
          onShare={() => setPane({ mode: 'share', id: selected.id })}
          onFavorite={() =>
            void act(
              () =>
                setItemPlacement(selected.id, {
                  folder_id: selected.folder_id,
                  favorite: !selected.favorite,
                }),
              selected.favorite ? 'Removed from favorites' : 'Added to favorites'
            )
          }
          onTrash={() =>
            void act(
              () => trashItem(selected.id),
              'Moved to the trash. The web app can restore it.'
            )
          }
        />
      )
    }
    return (
      <div className="detail-empty">
        <span className="tile">
          <KeyIcon />
        </span>
        <p className="muted">Select an item to see it, or create a new one.</p>
        <div className="detail-empty-actions">
          <button onClick={() => setPane({ mode: 'new' })}>
            <PlusIcon width={14} height={14} />
            New item
          </button>
          {foldersUrl && (
            <a className="button secondary" href={foldersUrl} target="_blank" rel="noreferrer">
              <BookOpenIcon width={14} height={14} />
              Browse folders
            </a>
          )}
        </div>
      </div>
    )
  }

  return (
    <VaultSidebar
      filters={FILTERS.map((f) => ({ ...f, count: counts[f.value] }))}
      filter={filter}
      tool={tool}
      appUrl={appUrl}
      user={user}
      onFilter={(value) => {
        setFilter(value)
        setTool(null)
      }}
      onTool={setTool}
      onSettings={onSettings}
      onLock={onLock}
      onSignOut={onSignOut}
    >
      <div className={['full', paneOpen && 'pane-open'].filter(Boolean).join(' ')}>
        {tool ? (
          <section className="detail-col tool-col" aria-label="Tools">
            {renderTool()}
          </section>
        ) : (
          <>
            <section className="list-col" aria-label="Items">
              {/* Three parts, a line under each: what the page is, what narrows
                  the list, and the list. */}
              <header className="list-head-page">
                <div className="list-title">
                  <p className="eyebrow">Vault</p>
                  <h1>Vault</h1>
                  <p className="muted">
                    Your items and the ones shared with you, decrypted in this browser only.
                  </p>
                </div>
                <button
                  className="new-item"
                  aria-label="New item"
                  title="New item"
                  onClick={() => setPane({ mode: 'new' })}
                >
                  <PlusIcon width={16} height={16} />
                  <span className="new-item-label">New item</span>
                </button>
              </header>

              {/* What to look for, where, and in what order. */}
              <div className="list-tools">
                <label className="search">
                  <SearchIcon />
                  <input
                    type="search"
                    placeholder="Search name, username or URL"
                    aria-label="Search all items"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    autoFocus
                  />
                </label>
                {folders.length > 0 && (
                  <div className="select-box folder-filter">
                    <select
                      aria-label="Folder"
                      value={folder}
                      onChange={(e) => setFolder(e.target.value)}
                    >
                      <option value="">All folders</option>
                      {folders.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDownIcon width={14} height={14} />
                  </div>
                )}
                {/* The order it is in is named on hover and to a screen reader;
                    pressing it takes the other one. */}
                <button
                  className="icon-button"
                  aria-label={`${SORT_LABEL[sort]}. Change the order`}
                  title={SORT_LABEL[sort]}
                  onClick={() => setSort((current) => (current === 'name' ? 'updated' : 'name'))}
                >
                  <FilterIcon />
                </button>
                <button
                  className="icon-button"
                  aria-label="Refresh vault"
                  title="Refresh vault"
                  disabled={refreshing}
                  onClick={() => void refresh()}
                >
                  <RefreshIcon className={refreshing ? 'spin' : undefined} />
                </button>
              </div>

              {/* The list as a table in its own card: headings, rows, and a
                  footer with the count and the way to the folders. */}
              <div className="list-table">
                {/* The headings scroll with the rows, so their columns line up
                  with the rows' whatever the scrollbar takes, and stay on top. */}
                <div className="list-scroll" ref={scrollRef}>
                  <div className="list-head" aria-hidden="true">
                    <span>Name</span>
                    <span className="col">Folder</span>
                    <span className="col">Last used</span>
                  </div>

                  {listError && (
                    <p className="error list-message" role="alert">
                      {listError}
                    </p>
                  )}
                  {listLoading && !listError && <p className="muted list-message">Decrypting…</p>}
                  {!listLoading && !listError && visible.length === 0 && (
                    <p className="muted list-message">
                      {vaultEmpty ? 'Your vault is empty.' : 'Nothing matches.'}
                    </p>
                  )}

                  <ul className="items">
                    {visible.map((item) => (
                      <li key={item.id}>
                        <button
                          className="item-row"
                          aria-current={item.id === selectedId ? 'true' : undefined}
                          onClick={() => setPane({ mode: 'view', id: item.id })}
                        >
                          <ItemTile item={item} />
                          <span className="item-text">
                            <span className="item-name">{item.secret!.name}</span>
                            <span className="muted">{itemSubtitle(item)}</span>
                          </span>
                          <span className="col muted">
                            {folderNames.get(item.folder_id ?? '') ?? '—'}
                          </span>
                          <span className="col muted">{lastUsedAgo(item.last_used_at) ?? '—'}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                  {more && !listLoading && (
                    <p className="muted list-message list-more" ref={moreRef}>
                      {isFetchingNextPage ? 'Loading more…' : `${total - loaded.length} more`}
                    </p>
                  )}
                </div>

                <footer className="list-foot">
                  <span className="list-count">
                    {!listLoading &&
                      (term
                        ? `${visible.length} of ${readable.length} items`
                        : `${visible.length} of ${total} items`)}
                  </span>
                  {foldersUrl && (
                    <a
                      className="button secondary small"
                      href={foldersUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Manage folders
                      <ChevronRightIcon width={12} height={12} />
                    </a>
                  )}
                </footer>
              </div>
            </section>

            <section className="detail-col" aria-label="Item details">
              {paneOpen && (
                <button className="link back" onClick={() => setPane({ mode: 'view', id: null })}>
                  <ArrowLeftIcon width={18} height={18} />
                  All items
                </button>
              )}

              {renderPane()}
            </section>
          </>
        )}

        {notice && (
          <p className="toast" role="status">
            {notice}
          </p>
        )}
      </div>
    </VaultSidebar>
  )
}

/** When something happened to an item, to the minute: the seconds say nothing. */
const WHEN = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })

function When({ at }: { at: string }) {
  return <time dateTime={at}>{WHEN.format(new Date(at))}</time>
}

interface ItemDetailProps {
  item: VaultItem
  onCopy: (value: string | undefined, label: string) => void
  onEdit: () => void
  onShare: () => void
  onFavorite: () => void
  onTrash: () => void
}

function ItemDetail({ item, onCopy, onEdit, onShare, onFavorite, onTrash }: ItemDetailProps) {
  // Hidden again for every item: this component is remounted per item.
  const [revealed, setRevealed] = useState(false)
  // The username is masked as the list shows it, until asked for.
  const [showUsername, setShowUsername] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // The menu closes on Escape and on a click anywhere else; opening it puts
  // focus on its first choice.
  useDismiss(menuOpen, [menuRef], () => setMenuOpen(false))
  useEffect(() => {
    if (menuOpen) menuRef.current?.querySelector<HTMLButtonElement>('[role=menuitem]')?.focus()
  }, [menuOpen])

  const secret = item.secret!
  const isLogin = item.type === 'login'
  const isNote = item.type === 'secure_note'
  const canEdit = item.role !== 'viewer'
  // A secure note marked not visible stays blurred until it is revealed.
  const hidesNote = isNote && secret.visible === false
  const noteHidden = hidesNote && !revealed
  // Only http(s) addresses become links.
  const website = linkOf(secret.url)

  // Who else has it: only the owner may ask, and the Community server never
  // shares. The owner counts itself among the members.
  const [others, setOthers] = useState<number | null>(null)
  useEffect(() => {
    if (item.role !== 'owner' || COMMUNITY) return
    listItemMembers(item.id)
      .then((members) => setOthers(members.length - 1))
      .catch(() => setOthers(null))
  }, [item.id, item.role])
  const sharing = sharingLabel(item.role === 'owner', others)
  // Masked as the list shows it, until asked for.
  const username =
    secret.username && (showUsername ? secret.username : maskUsername(secret.username))

  return (
    <div className="stack detail-body item-view">
      <header className="detail-head">
        <ItemTile item={item} large />
        <div className="item-text">
          <p className="eyebrow">
            {ITEM_TYPE_LABEL[item.type] ?? item.type}
            {item.role !== 'owner' && ` · shared with you (${item.role})`}
          </p>
          <h2 className="detail-title">{secret.name}</h2>
          {/* The type is named above: a note says what it is and when it changed. */}
          <span className="muted">
            {isNote ? (
              <>
                Encrypted note · updated <When at={item.updated_at} />
              </>
            ) : (
              itemSubtitle(item)
            )}
          </span>
        </div>
        {/* As the web app has them: the star, More, and the one common action
            as a button. */}
        <div className="detail-actions">
          <button
            className="icon-button outlined"
            aria-label={item.favorite ? 'Remove from favorites' : 'Add to favorites'}
            aria-pressed={item.favorite}
            title={item.favorite ? 'Remove from favorites' : 'Add to favorites'}
            onClick={onFavorite}
          >
            <StarIcon fill={item.favorite ? 'currentColor' : 'none'} />
          </button>
          {/* Only the owner hands an item on, or throws it away. */}
          {item.role === 'owner' && (
            <div className="menu-anchor" ref={menuRef}>
              <button
                className="icon-button outlined"
                aria-label="More"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((open) => !open)}
              >
                <MoreIcon />
              </button>
              {menuOpen && (
                <div className="menu" role="menu">
                  {!COMMUNITY && (
                    <button
                      role="menuitem"
                      className="menu-item"
                      onClick={() => {
                        setMenuOpen(false)
                        onShare()
                      }}
                    >
                      <ShareIcon />
                      Share
                    </button>
                  )}
                  <button
                    role="menuitem"
                    className="menu-item menu-danger"
                    onClick={() => {
                      setMenuOpen(false)
                      onTrash()
                    }}
                  >
                    <TrashIcon />
                    Move to trash
                  </button>
                </div>
              )}
            </div>
          )}
          {canEdit && (
            <button className="edit" onClick={onEdit}>
              <PencilIcon width={14} height={14} />
              Edit
            </button>
          )}
        </div>
      </header>

      {isLogin && (
        <FieldGroup title="Credentials" count={secret.passkey ? 3 : 2}>
          <div className="field">
            <dt>Username</dt>
            <dd>{username || <span className="muted">None</span>}</dd>
            {secret.username && (
              <button
                className="icon-button"
                aria-label={showUsername ? 'Hide username' : 'Show username'}
                aria-pressed={showUsername}
                title={showUsername ? 'Hide username' : 'Show username'}
                onClick={() => setShowUsername((value) => !value)}
              >
                {showUsername ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            )}
            <button
              className="icon-button"
              aria-label="Copy username"
              title="Copy username"
              onClick={() => onCopy(secret.username, 'username')}
            >
              <CopyIcon />
            </button>
          </div>

          <div className="field">
            <dt>Password</dt>
            <dd className={secret.password ? 'mono' : undefined}>
              {secret.password ? (
                <>
                  {revealed ? secret.password : MASK}
                  <Strength password={secret.password} />
                </>
              ) : (
                <span className="muted">None</span>
              )}
            </dd>
            <button
              className="icon-button"
              aria-label={revealed ? 'Hide password' : 'Show password'}
              aria-pressed={revealed}
              title={revealed ? 'Hide password' : 'Show password'}
              onClick={() => setRevealed((value) => !value)}
            >
              {revealed ? <EyeOffIcon /> : <EyeIcon />}
            </button>
            <button
              className="icon-button"
              aria-label="Copy password"
              title="Copy password"
              onClick={() => onCopy(secret.password, 'password')}
            >
              <CopyIcon />
            </button>
          </div>

          {secret.passkey && (
            <div className="field">
              <dt>Passkey</dt>
              <dd>Signs in to {secret.passkey.rpId}</dd>
            </div>
          )}
        </FieldGroup>
      )}

      {isLogin && secret.url && (
        <FieldGroup title="Website" count={1}>
          <div className="field">
            <dt>Website</dt>
            <dd className="mono">{secret.url}</dd>
            {website && (
              <a className="button secondary small" href={website} target="_blank" rel="noreferrer">
                Open
                <ArrowUpRightIcon width={12} height={12} />
              </a>
            )}
          </div>
        </FieldGroup>
      )}

      {item.type === 'contact' && (
        <FieldGroup title="Contact" count={CONTACT_FIELDS.length}>
          {CONTACT_FIELDS.map(({ key, label }) => {
            const value = secret.contact?.[key]
            return (
              <div key={key} className="field">
                <dt>{label}</dt>
                <dd>{value || <span className="muted">None</span>}</dd>
                {value && (
                  <button
                    className="icon-button"
                    aria-label={`Copy ${label.toLowerCase()}`}
                    title={`Copy ${label.toLowerCase()}`}
                    onClick={() => onCopy(value, label.toLowerCase())}
                  >
                    <CopyIcon />
                  </button>
                )}
              </div>
            )
          })}
        </FieldGroup>
      )}

      {item.type === 'card' && (
        <FieldGroup title="Card" count={CARD_FIELDS.length}>
          {CARD_FIELDS.map((cardField) => {
            const { key, label } = cardField
            const value = secret.card?.[key]
            const isSecret = 'secret' in cardField
            return (
              <div key={key} className="field">
                <dt>{label}</dt>
                <dd className={value && isSecret ? 'mono' : undefined}>
                  {/* Hidden, a card number still shows its last four digits. */}
                  {value ? (
                    cardFieldText(key, value, isSecret && !revealed)
                  ) : (
                    <span className="muted">None</span>
                  )}
                </dd>
                {value && isSecret && (
                  <button
                    className="icon-button"
                    aria-label={
                      revealed ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`
                    }
                    aria-pressed={revealed}
                    title={revealed ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
                    onClick={() => setRevealed((shown) => !shown)}
                  >
                    {revealed ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                )}
                {value && (
                  <button
                    className="icon-button"
                    aria-label={`Copy ${label.toLowerCase()}`}
                    title={`Copy ${label.toLowerCase()}`}
                    onClick={() => onCopy(value, label.toLowerCase())}
                  >
                    <CopyIcon />
                  </button>
                )}
              </div>
            )
          })}
        </FieldGroup>
      )}

      {(secret.notes || isNote) && (
        <section className="field-group">
          <header className="field-group-head">
            <h3>{isNote ? 'Note' : 'Notes'}</h3>
            {/* Hidden, not even its length is told. */}
            {isNote && (
              <span>{noteHidden ? 'Protected' : `${(secret.notes ?? '').length} chars`}</span>
            )}
            {hidesNote && revealed && (
              <button
                className="icon-button"
                aria-label="Hide note"
                title="Hide note"
                onClick={() => setRevealed(false)}
              >
                <EyeOffIcon />
              </button>
            )}
            {secret.notes && (
              <button
                className="icon-button"
                aria-label="Copy notes"
                title="Copy notes"
                onClick={() => onCopy(secret.notes, 'notes')}
              >
                <CopyIcon />
              </button>
            )}
          </header>
          <div
            className={['note-body', isNote && 'note-main', noteHidden && 'hidden-note']
              .filter(Boolean)
              .join(' ')}
          >
            {/* Out of reach while blurred: not selectable, not read aloud. */}
            <div
              className={noteHidden ? 'blurred' : undefined}
              inert={noteHidden}
              aria-hidden={noteHidden}
            >
              {!secret.notes ? (
                <span className="muted">None</span>
              ) : (
                // Notes are written as Markdown; until the renderer has
                // loaded, the text shows as it is.
                <Suspense fallback={secret.notes}>
                  <NotesView key={secret.notes} value={secret.notes} />
                </Suspense>
              )}
            </div>
            {/* Hidden, the note says so itself and offers to be shown. */}
            {noteHidden && (
              <div className="note-veil">
                <EyeOffIcon />
                <p>This note is hidden.</p>
                <button className="secondary" onClick={() => setRevealed(true)}>
                  <EyeIcon width={18} height={18} />
                  Show note
                </button>
              </div>
            )}
          </div>
          {isNote && (
            <footer className="field-group-foot">
              <span>AES-256 · client side</span>
              {sharing && <span>{sharing}</span>}
            </footer>
          )}
        </section>
      )}

      {/* A note says when it changed under its name, and who has it in its card. */}
      {!isNote && (
        <p className="item-meta">
          {item.last_used_at && (
            <>
              Last used <When at={item.last_used_at} /> ·{' '}
            </>
          )}
          Updated <When at={item.updated_at} />
          {sharing && ` · ${sharing}`}
        </p>
      )}
    </div>
  )
}

/** A titled card of fields: what it holds, and how many. */
function FieldGroup({
  title,
  count,
  children,
}: {
  title: string
  count: number
  children: ReactNode
}) {
  return (
    <section className="field-group">
      <header className="field-group-head">
        <h3>{title}</h3>
        <span>
          {count} {count === 1 ? 'field' : 'fields'}
        </span>
      </header>
      <dl className="fields">{children}</dl>
    </section>
  )
}

/** How many of the four bars a password's strength fills. */
const STRENGTH = {
  weak: { label: 'Weak', bars: 1 },
  fair: { label: 'Fair', bars: 3 },
  strong: { label: 'Strong', bars: 4 },
} as const

function Strength({ password }: { password: string }) {
  const level = passwordStrength(password)
  return (
    <span className={`pw-strength strength-label strength-${level}`}>
      <span aria-hidden="true">
        {[1, 2, 3, 4].map((bar) => (
          <i key={bar} className={bar <= STRENGTH[level].bars ? 'on' : undefined} />
        ))}
      </span>
      {STRENGTH[level].label}
    </span>
  )
}
