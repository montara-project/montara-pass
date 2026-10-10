import { useEffect, useMemo, useState } from 'react'

import type { VaultKeys } from '@/lib/crypto/vault'
import type { VaultItem } from '@/types/vault'

import { hostOf } from '../../lib/site'
import { getSettings } from '../../lib/storage'
import {
  ArrowLeftIcon,
  CopyIcon,
  ExternalLinkIcon,
  EyeIcon,
  EyeOffIcon,
  GridIcon,
  KeyholeIcon,
  KeyIcon,
  LockIcon,
  LogOutIcon,
  NoteIcon,
  PencilIcon,
  PlusIcon,
  RefreshIcon,
  SearchIcon,
  SettingsIcon,
  SortIcon,
  StarIcon,
} from '../icons'
import { initials } from '../layout'
import { useVaultItems } from '../use-vault-items'
import ItemForm from './item-form'

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
type Pane = { mode: 'view'; id: string | null } | { mode: 'new' } | { mode: 'edit'; id: string }

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
  const [notice, setNotice] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [appUrl, setAppUrl] = useState('')

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
  const selected = readable.find((item) => item.id === selectedId) ?? null
  // On a narrow window the pane covers the list, so it needs to know when it is in use.
  const paneOpen = pane.mode !== 'view' || selected !== null

  const refresh = async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
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
    <div className={paneOpen ? 'full pane-open' : 'full'}>
      <nav className="side" aria-label="Vault">
        <div className="brand">
          <span className="tile">
            <KeyholeIcon />
          </span>
          <strong>Montara Pass</strong>
        </div>

        <ul className="side-list">
          {FILTERS.map(({ value, label, icon: Icon }) => (
            <li key={value}>
              <button
                className="side-item"
                aria-current={filter === value ? 'true' : undefined}
                onClick={() => setFilter(value)}
              >
                <Icon />
                <span>{label}</span>
                <span className="count">{counts[value]}</span>
              </button>
            </li>
          ))}
        </ul>

        <span className="spacer" />

        <ul className="side-list">
          {appUrl && (
            <li>
              {/* Sharing and folders live in the web app. */}
              <a className="side-item" href={appUrl} target="_blank" rel="noreferrer">
                <ExternalLinkIcon />
                <span>Open web app</span>
              </a>
            </li>
          )}
          <li>
            <button className="side-item" onClick={onSettings}>
              <SettingsIcon />
              <span>Settings</span>
            </button>
          </li>
          <li>
            <button className="side-item" onClick={onLock}>
              <LockIcon />
              <span>Lock vault</span>
            </button>
          </li>
          <li>
            <button className="side-item" onClick={onSignOut}>
              <LogOutIcon />
              <span>Sign out</span>
            </button>
          </li>
        </ul>

        {user && (
          <div className="side-user">
            <span className="avatar" aria-hidden="true">
              {initials(user.name || user.email)}
            </span>
            <div className="item-text">
              <span className="menu-name">{user.name}</span>
              <span className="muted">{user.email}</span>
            </div>
          </div>
        )}
      </nav>

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

        <ul className="items">
          {visible.map((item) => (
            <li key={item.id}>
              <button
                className="item-row"
                aria-current={item.id === selectedId ? 'true' : undefined}
                onClick={() => setPane({ mode: 'view', id: item.id })}
              >
                <span className="tile">
                  {item.type === 'login' ? <KeyholeIcon /> : <NoteIcon />}
                </span>
                <span className="item-text">
                  <span className="item-name">{item.secret!.name}</span>
                  <span className="muted">
                    {item.type === 'login'
                      ? item.secret!.username || 'No username'
                      : 'Secure note'}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="detail-col" aria-label="Item details">
        {paneOpen && (
          <button className="link back" onClick={() => setPane({ mode: 'view', id: null })}>
            <ArrowLeftIcon width={18} height={18} />
            All items
          </button>
        )}

        {pane.mode !== 'view' ? (
          <ItemForm
            // A different item is a different form, with its own fields.
            key={pane.mode === 'edit' ? pane.id : 'new'}
            keys={keys}
            item={pane.mode === 'edit' ? (selected ?? undefined) : undefined}
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

      {notice && (
        <p className="toast" role="status">
          {notice}
        </p>
      )}
    </div>
  )
}

interface ItemDetailProps {
  item: VaultItem
  onCopy: (value: string | undefined, label: string) => void
  onEdit: () => void
}

function ItemDetail({ item, onCopy, onEdit }: ItemDetailProps) {
  // Hidden again for every item: this component is remounted per item.
  const [revealed, setRevealed] = useState(false)

  const secret = item.secret!
  const isLogin = item.type === 'login'
  const canEdit = item.role !== 'viewer'
  // Only http(s) addresses become links.
  const website = hostOf(secret.url)
    ? secret.url!.includes('://')
      ? secret.url!
      : `https://${secret.url}`
    : null

  return (
    <div className="stack detail-body">
      <header className="detail-head">
        <span className="tile tile-large">{isLogin ? <KeyholeIcon /> : <NoteIcon />}</span>
        <div className="item-text">
          <h2 className="detail-title">{secret.name}</h2>
          <span className="muted">
            {isLogin ? 'Login' : 'Secure note'}
            {item.role !== 'owner' && ` · shared with you (${item.role})`}
          </span>
        </div>
        {canEdit && (
          <button className="secondary" onClick={onEdit}>
            <PencilIcon width={18} height={18} />
            Edit
          </button>
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
            </div>
          </>
        )}

        {(secret.notes || !isLogin) && (
          <div className="field field-notes">
            <dt>Notes</dt>
            <dd>{secret.notes || <span className="muted">None</span>}</dd>
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

      <p className="muted meta">Last updated {new Date(item.updated_at).toLocaleString()}</p>
    </div>
  )
}
