import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'

import type { VaultKeys } from '@/lib/crypto/vault'
import type { VaultItem } from '@/types/vault'

import { COMMUNITY } from '@/lib/constants/edition'

import { setItemPlacement, SignedOutError, trashItem } from '../../lib/api'
import { linkOf } from '../../lib/site'
import { getSettings } from '../../lib/storage'
import { lastUsedAgo } from '../../lib/usage'
import {
  ArrowLeftIcon,
  CopyIcon,
  ExternalLinkIcon,
  EyeIcon,
  EyeOffIcon,
  GridIcon,
  KeyholeIcon,
  KeyIcon,
  MoreIcon,
  NoteIcon,
  PencilIcon,
  PlusIcon,
  RefreshIcon,
  SearchIcon,
  ShareIcon,
  SortIcon,
  StarIcon,
  TrashIcon,
} from '../icons'
import { ItemTile } from '../item-tile'
import { useFolders, useVaultItems } from '../use-vault-items'
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

type Filter = 'all' | 'login' | 'secure_note' | 'favorite'
type Sort = 'name' | 'updated'
/** What the detail pane shows. */
type Pane =
  | { mode: 'view'; id: string | null }
  | { mode: 'new' }
  | { mode: 'edit'; id: string }
  | { mode: 'share'; id: string }

const FILTERS: { value: Filter; label: string; icon: typeof GridIcon }[] = [
  { value: 'all', label: 'All items', icon: GridIcon },
  { value: 'login', label: 'Logins', icon: KeyIcon },
  { value: 'secure_note', label: 'Secure notes', icon: NoteIcon },
  { value: 'favorite', label: 'Favorites', icon: StarIcon },
]

const SORT_LABEL: Record<Sort, string> = {
  name: 'Sort by name',
  updated: 'Sort by last updated',
}

// Fetched when an item with notes is opened, so it stays out of the first load.
const NotesView = lazy(() =>
  import('../notes-editor').then((module) => ({ default: module.NotesView }))
)

const MASK = '••••••••••••'

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

  const [filter, setFilter] = useState<Filter>('all')
  const [sort, setSort] = useState<Sort>('name')
  const [search, setSearch] = useState('')
  const [pane, setPane] = useState<Pane>({ mode: 'view', id: null })
  // A tool takes the place of the list and the item beside it.
  const [tool, setTool] = useState<Tool | null>(null)
  const [notice, setNotice] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [appUrl, setAppUrl] = useState('')
  const folders = useFolders(keys)
  useEffect(() => {
    void getSettings().then((settings) => setAppUrl(settings.appUrl))
  }, [])

  // A notice says what just happened, then gets out of the way.
  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(''), 2500)
    return () => clearTimeout(timer)
  }, [notice])

  const readable = useMemo(() => (items ?? []).filter((item) => item.secret !== null), [items])

  const counts = useMemo<Record<Filter, number>>(
    () => ({
      all: readable.length,
      login: readable.filter((item) => item.type === 'login').length,
      secure_note: readable.filter((item) => item.type === 'secure_note').length,
      favorite: readable.filter((item) => item.favorite).length,
    }),
    [readable]
  )

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase()

    return readable
      .filter((item) =>
        filter === 'all' ? true : filter === 'favorite' ? item.favorite : item.type === filter
      )
      .filter((item) =>
        [item.secret?.name, item.secret?.username, item.secret?.url]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(term))
      )
      .sort((a, b) =>
        sort === 'updated'
          ? b.updated_at.localeCompare(a.updated_at)
          : a.secret!.name.localeCompare(b.secret!.name)
      )
  }, [readable, filter, search, sort])

  const selectedId = pane.mode === 'new' ? null : pane.id
  const folderNames = useMemo(() => new Map(folders.map((f) => [f.id, f.name])), [folders])
  const selected = readable.find((item) => item.id === selectedId) ?? null
  // On a narrow window the pane covers the list, so it needs to know when it is in use.
  const paneOpen = pane.mode !== 'view' || selected !== null

  const refresh = async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  /** Runs a choice that changes the vault, then says how it went. */
  const act = async (change: () => Promise<void>, done: string) => {
    try {
      await change()
      setNotice(done)
      await load()
    } catch (err) {
      if (err instanceof SignedOutError) onSignedOut()
      else setNotice(err instanceof Error ? err.message : 'That did not work')
    }
  }

  const copy = async (value: string | undefined, label: string) => {
    if (!value) {
      setNotice(`This item has no ${label}`)
      return
    }
    await navigator.clipboard.writeText(value)
    setNotice(`${label[0].toUpperCase()}${label.slice(1)} copied`)
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
            {tool === 'generator' ? (
              <PasswordGenerator onNotice={setNotice} />
            ) : tool === 'billing' ? (
              <Billing onSignedOut={onSignedOut} />
            ) : (
              <PasswordHealth
                items={items}
                onOpen={(id) => {
                  setTool(null)
                  setFilter('all')
                  setSearch('')
                  setPane({ mode: 'view', id })
                }}
              />
            )}
          </section>
        ) : (
          <>
            <section className="list-col" aria-label="Items">
              <label className="search">
                <SearchIcon />
                <input
                  type="search"
                  placeholder="Search all items"
                  aria-label="Search all items"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  autoFocus
                />
              </label>

              <div className="list-tools">
                <button
                  className="sort"
                  onClick={() => setSort((current) => (current === 'name' ? 'updated' : 'name'))}
                >
                  {SORT_LABEL[sort]}
                  <SortIcon width={16} height={16} />
                </button>
                <span className="spacer" />
                <button
                  className="icon-button"
                  aria-label="Refresh vault"
                  title="Refresh vault"
                  disabled={refreshing}
                  onClick={() => void refresh()}
                >
                  <RefreshIcon className={refreshing ? 'spin' : undefined} />
                </button>
                <button className="new-item" onClick={() => setPane({ mode: 'new' })}>
                  <PlusIcon width={18} height={18} />
                  New item
                </button>
              </div>

              {error && (
                <p className="error list-message" role="alert">
                  {error}
                </p>
              )}
              {items === null && !error && <p className="muted list-message">Decrypting…</p>}
              {items !== null && visible.length === 0 && (
                <p className="muted list-message">
                  {readable.length === 0 ? 'Your vault is empty.' : 'Nothing matches.'}
                </p>
              )}

              {/* The headings scroll with the rows, so their columns line up
                  with the rows' whatever the scrollbar takes, and stay on top. */}
              <div className="list-scroll">
                {visible.length > 0 && (
                  <div className="list-head" aria-hidden="true">
                    <span>Name</span>
                    <span className="col">Folder</span>
                    <span className="col">Last used</span>
                  </div>
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
                          <span className="muted">
                            {item.type === 'login'
                              ? item.secret!.username || 'No username'
                              : 'Secure note'}
                          </span>
                        </span>
                        <span className="col muted">
                          {folderNames.get(item.folder_id ?? '') ?? '—'}
                        </span>
                        <span className="col muted">{lastUsedAgo(item.last_used_at) ?? '—'}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            <section className="detail-col" aria-label="Item details">
              {paneOpen && (
                <button className="link back" onClick={() => setPane({ mode: 'view', id: null })}>
                  <ArrowLeftIcon width={18} height={18} />
                  All items
                </button>
              )}

              {pane.mode === 'share' && selected ? (
                <ShareItem
                  key={selected.id}
                  keys={keys}
                  item={selected}
                  onDone={() => setPane({ mode: 'view', id: selected.id })}
                  onSignedOut={onSignedOut}
                  onNotice={setNotice}
                />
              ) : pane.mode !== 'view' ? (
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
                    void load()
                  }}
                />
              ) : selected ? (
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
              ) : (
                <div className="detail-empty">
                  <span className="tile">
                    <KeyholeIcon />
                  </span>
                  <p className="muted">Select an item to see it, or create a new one.</p>
                </div>
              )}
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
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // The menu closes on Escape and on a click anywhere else; opening it puts
  // focus on its first choice.
  useEffect(() => {
    if (!menuOpen) return
    menuRef.current?.querySelector<HTMLButtonElement>('[role=menuitem]')?.focus()

    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false)
    const onClick = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onClick)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onClick)
    }
  }, [menuOpen])

  const secret = item.secret!
  const isLogin = item.type === 'login'
  const canEdit = item.role !== 'viewer'
  // A secure note marked not visible stays blurred until it is revealed.
  const hidesNote = !isLogin && secret.visible === false
  const noteHidden = hidesNote && !revealed
  // Only http(s) addresses become links.
  const website = linkOf(secret.url)

  return (
    <div className="stack detail-body">
      <header className="detail-head">
        <ItemTile item={item} large />
        <div className="item-text">
          <h2 className="detail-title">{secret.name}</h2>
          <span className="muted">
            {isLogin ? 'Login' : 'Secure note'}
            {item.role !== 'owner' && ` · shared with you (${item.role})`}
          </span>
        </div>
        {/* As the web app has them: the star, the one common action as a
            button, and the rest behind More. */}
        <button
          className="icon-button"
          aria-label={item.favorite ? 'Remove from favorites' : 'Add to favorites'}
          aria-pressed={item.favorite}
          title={item.favorite ? 'Remove from favorites' : 'Add to favorites'}
          onClick={onFavorite}
        >
          <StarIcon fill={item.favorite ? 'currentColor' : 'none'} />
        </button>
        {canEdit && (
          <button className="secondary" onClick={onEdit}>
            <PencilIcon width={18} height={18} />
            Edit
          </button>
        )}
        {/* Only the owner hands an item on, or throws it away. */}
        {item.role === 'owner' && (
          <div className="menu-anchor" ref={menuRef}>
            <button
              className="icon-button"
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
      </header>

      <dl className="fields">
        {isLogin && (
          <>
            <div className="field">
              <dt>Username</dt>
              <dd>{secret.username || <span className="muted">None</span>}</dd>
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
              <dd className="mono">
                {secret.password ? (
                  revealed ? (
                    secret.password
                  ) : (
                    MASK
                  )
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

            <div className="field">
              <dt>Website</dt>
              <dd>
                {website ? (
                  <a href={website} target="_blank" rel="noreferrer">
                    {secret.url}
                  </a>
                ) : (
                  secret.url || <span className="muted">None</span>
                )}
              </dd>
              {website && (
                <a
                  className="icon-button"
                  href={website}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Open website"
                  title="Open website"
                >
                  <ExternalLinkIcon />
                </a>
              )}
            </div>

            {secret.passkey && (
              <div className="field">
                <dt>Passkey</dt>
                <dd>Signs in to {secret.passkey.rpId}</dd>
              </div>
            )}
          </>
        )}

        {(secret.notes || !isLogin) && (
          <div className="field field-notes">
            <dt>Notes</dt>
            {/* Out of reach while blurred: not selectable, not read aloud. */}
            <dd
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
            </dd>
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
            <button
              className="icon-button"
              aria-label="Copy notes"
              title="Copy notes"
              onClick={() => onCopy(secret.notes, 'notes')}
            >
              <CopyIcon />
            </button>
          </div>
        )}
      </dl>

      <p className="muted meta">
        {item.last_used_at && (
          <>
            Last used <When at={item.last_used_at} /> ·{' '}
          </>
        )}
        Last updated <When at={item.updated_at} />
      </p>
    </div>
  )
}
