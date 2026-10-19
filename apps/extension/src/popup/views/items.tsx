import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react'

import type { VaultKeys } from '@/lib/crypto/vault'
import type { VaultItem } from '@/types/vault'

import { COMMUNITY } from '@/lib/constants/edition'

import { markItemUsed, setItemPlacement, SignedOutError, trashItem } from '../../lib/api'
import { fillLogin } from '../../lib/autofill'
import { copySecret } from '../../lib/clipboard'
import { fillsSite, hostOf, linkOf } from '../../lib/site'
import { lastUsedLabel } from '../../lib/usage'
import { maskUsername } from '../../lib/username'
import {
  ArrowLeftIcon,
  CheckIcon,
  ChevronRightIcon,
  CopyIcon,
  ExpandIcon,
  ExternalLinkIcon,
  FolderIcon,
  FolderMinusIcon,
  KeyIcon,
  LockIcon,
  LogOutIcon,
  MoreIcon,
  PencilIcon,
  PlusIcon,
  RefreshIcon,
  SearchIcon,
  SettingsIcon,
  ShareIcon,
  SortIcon,
  TrashIcon,
  UserIcon,
} from '../icons'
import { ItemTile } from '../item-tile'
import { initials, openFullScreen } from '../layout'
import { UpdateButton } from '../update-button'
import { useFolders, useVaultItems } from '../use-vault-items'
import AddItem from './add-item'
import ItemForm from './item-form'
import ShareItem from './share-item'

type Sort = 'name' | 'updated'

const SORT_LABEL: Record<Sort, string> = {
  name: 'Sort by name',
  updated: 'Sort by last updated',
}

/** The open menu of a row: whose it is, where it hangs, and which of its two pages shows. */
interface RowMenu {
  id: string
  style: CSSProperties
  page: 'actions' | 'folders'
}

interface ItemsProps {
  keys: VaultKeys
  onLock: () => void
  onSignOut: () => void
  /** The session ended underneath the popup. */
  onSignedOut: () => void
  onSettings: () => void
}

export default function Items({ keys, onLock, onSignOut, onSignedOut, onSettings }: ItemsProps) {
  const { items, user, error, load } = useVaultItems(keys, onSignedOut)
  const [tab, setTab] = useState<chrome.tabs.Tab | null>(null)
  const [search, setSearch] = useState('')
  const [notice, setNotice] = useState('')

  // A notice says what just happened, then gets out of the way.
  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(''), 2500)
    return () => clearTimeout(timer)
  }, [notice])
  const [adding, setAdding] = useState(false)
  const [sort, setSort] = useState<Sort>('name')
  const [refreshing, setRefreshing] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const folders = useFolders(keys)
  // Editing or sharing an item takes the place of the list.
  const [sub, setSub] = useState<{ mode: 'edit' | 'share'; id: string } | null>(null)
  const [rowMenu, setRowMenu] = useState<RowMenu | null>(null)
  const rowMenuRef = useRef<HTMLDivElement>(null)
  /** The More button the menu was opened from: focus goes back to it. */
  const openerRef = useRef<HTMLButtonElement | null>(null)

  // A row's menu closes on Escape and on a click anywhere else.
  useEffect(() => {
    if (!rowMenu) return

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setRowMenu(null)
      openerRef.current?.focus()
    }
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node
      // Its own button closes it by itself, on the click that follows.
      if (rowMenuRef.current?.contains(target) || openerRef.current?.contains(target)) return
      setRowMenu(null)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onClick)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onClick)
    }
  }, [rowMenu])

  // Opening the menu, or turning its page, puts focus on the first choice.
  const menuId = rowMenu?.id
  const menuPage = rowMenu?.page
  useEffect(() => {
    rowMenuRef.current?.querySelector('button')?.focus()
  }, [menuId, menuPage])

  useEffect(() => {
    // activeTab lets the popup see the URL and title of the tab it was opened on.
    void chrome.tabs.query({ active: true, currentWindow: true }).then(([active]) => {
      setTab(active ?? null)
    })
  }, [])

  // The account menu closes on Escape and on a click anywhere else.
  useEffect(() => {
    if (!menuOpen) return

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

  const pageHost = hostOf(tab?.url)

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase()

    return (items ?? [])
      .filter((item) => item.secret !== null)
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
  }, [items, search, sort])

  // Logins saved for the page in the active tab: the only ones Fill is offered
  // for, so a look-alike domain is never one click away from a real password.
  const forThisSite = useMemo(
    () => (items ?? []).filter((item) => item.type === 'login' && fillsSite(item.secret, tab?.url)),
    [items, tab]
  )

  const refresh = async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  const handleFullScreen = async () => {
    await openFullScreen()
    window.close()
  }

  const copy = async (value: string | undefined, label: string) => {
    if (!value) {
      setNotice(`This item has no ${label}`)
      return
    }
    await copySecret(value)
    setNotice(`${label[0].toUpperCase()}${label.slice(1)} copied`)
  }

  const fill = async (item: VaultItem) => {
    if (!tab?.id || !item.secret) return

    try {
      const [injection] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: fillLogin,
        args: [item.secret.username ?? '', item.secret.password ?? ''],
      })

      const filled = injection?.result
      if (filled?.username || filled?.password) {
        // The login is filled either way; an older server has no such route.
        await markItemUsed(item.id).catch(() => undefined)
        window.close()
      } else {
        setNotice('No login form found on this page')
      }
    } catch {
      setNotice('This page cannot be filled')
    }
  }

  const openRowMenu = (item: VaultItem, button: HTMLButtonElement) => {
    if (rowMenu?.id === item.id) {
      setRowMenu(null)
      return
    }

    // Hung under the button, or over it when there is more room above.
    const rect = button.getBoundingClientRect()
    const below = window.innerHeight - rect.bottom
    const right = window.innerWidth - rect.right
    openerRef.current = button
    setRowMenu({
      id: item.id,
      page: 'actions',
      style:
        below >= rect.top
          ? { top: rect.bottom + 4, right, maxHeight: below - 12, transformOrigin: 'top right' }
          : {
              bottom: window.innerHeight - rect.top + 4,
              right,
              maxHeight: rect.top - 12,
              transformOrigin: 'bottom right',
            },
    })
  }

  /** Up and down walk the choices of the menu. */
  const walkMenu = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    e.preventDefault()

    const choices = [...e.currentTarget.querySelectorAll('button')]
    const next =
      choices.indexOf(document.activeElement as HTMLButtonElement) +
      (e.key === 'ArrowDown' ? 1 : -1)
    choices[(next + choices.length) % choices.length]?.focus()
  }

  /** Runs a menu choice that changes the vault, then says how it went. */
  const act = async (change: () => Promise<void>, done: string) => {
    setRowMenu(null)

    try {
      await change()
      setNotice(done)
      await load()
    } catch (err) {
      if (err instanceof SignedOutError) onSignedOut()
      else setNotice(err instanceof Error ? err.message : 'That did not work')
    }
  }

  const place = (item: VaultItem, folderId: string | null, done: string) =>
    act(() => setItemPlacement(item.id, { folder_id: folderId, favorite: item.favorite }), done)

  // Over the list rather than in it, so the rows do not jump when it comes and goes.
  const toast = notice && (
    <p className="toast" role="status">
      {notice}
    </p>
  )

  const subItem = sub && items?.find((item) => item.id === sub.id)
  if (sub && subItem) {
    const back = (said?: string) => {
      setSub(null)
      if (said) setNotice(said)
    }

    return (
      <div className="vault-sub">
        {toast}
        <button className="link back" onClick={() => back()}>
          <ArrowLeftIcon width={18} height={18} />
          All items
        </button>

        {sub.mode === 'share' ? (
          <ShareItem
            keys={keys}
            item={subItem}
            onDone={() => back()}
            onSignedOut={onSignedOut}
            onNotice={setNotice}
          />
        ) : (
          <ItemForm
            keys={keys}
            item={subItem}
            folders={folders}
            onCancel={() => back()}
            onSignedOut={onSignedOut}
            onSaved={() => {
              back('Item saved')
              void load()
            }}
          />
        )}
      </div>
    )
  }

  const menuItem = rowMenu && items?.find((item) => item.id === rowMenu.id)

  if (adding) {
    return (
      <AddItem
        keys={keys}
        tab={tab}
        onCancel={() => setAdding(false)}
        onSignedOut={onSignedOut}
        onSaved={() => {
          setAdding(false)
          setNotice('Login saved')
          void load()
        }}
      />
    )
  }

  return (
    <div className="vault">
      <header className="topbar">
        <h1>Vault</h1>
        <span className="spacer" />

        <UpdateButton />

        <button className="icon-button" aria-label="Lock vault" title="Lock vault" onClick={onLock}>
          <LockIcon />
        </button>

        <div className="menu-anchor" ref={menuRef}>
          <button
            className="avatar"
            aria-label="Account"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {user ? initials(user.name || user.email) : ''}
          </button>

          {menuOpen && (
            <div className="menu" role="menu">
              {user && (
                <div className="menu-user">
                  <span className="menu-name">{user.name}</span>
                  <span className="muted">{user.email}</span>
                </div>
              )}
              <button role="menuitem" className="menu-item" onClick={onSignOut}>
                <LogOutIcon />
                Sign out
              </button>
            </div>
          )}
        </div>
      </header>

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

      {/* The menu hangs from a place on the screen, so the list must not move under it. */}
      <main className="panel" onScroll={() => rowMenu && setRowMenu(null)}>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}

        {forThisSite.length > 0 && (
          <section aria-labelledby="for-this-site">
            <h2 id="for-this-site" className="section-title">
              For {pageHost} ({forThisSite.length})
            </h2>
            <div className="cards">
              {forThisSite.map((item) => (
                <button
                  key={item.id}
                  className="card"
                  aria-label={`Fill ${item.secret!.name}`}
                  onClick={() => void fill(item)}
                >
                  <span className="tile tile-accent">
                    <KeyIcon />
                  </span>
                  <span className="item-text">
                    <span className="item-name">Fill {item.secret!.name}</span>
                    <span className="muted">
                      {[
                        item.secret!.username ? maskUsername(item.secret!.username) : 'No username',
                        lastUsedLabel(item.last_used_at),
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}

        <div className="list-bar">
          <button
            className="sort"
            onClick={() => setSort((current) => (current === 'name' ? 'updated' : 'name'))}
          >
            {SORT_LABEL[sort]}
            <SortIcon width={16} height={16} />
          </button>
          {visible.length > 0 && (
            <span className="muted list-count">
              {visible.length} {visible.length === 1 ? 'item' : 'items'}
            </span>
          )}
        </div>

        {items === null && !error && <p className="muted empty">Decrypting…</p>}

        {items !== null && visible.length === 0 && (
          <p className="muted empty">
            {items.length === 0 ? 'Your vault is empty.' : 'Nothing matches your search.'}
          </p>
        )}

        <ul className="items">
          {visible.map((item) => {
            const isLogin = item.type === 'login'
            const name = item.secret!.name
            const website = isLogin ? linkOf(item.secret!.url) : null

            return (
              <li key={item.id}>
                <ItemTile item={item} />

                <div className="item-text">
                  <span className="item-name">{name}</span>
                  <span className="muted">
                    {isLogin
                      ? item.secret!.username
                        ? maskUsername(item.secret!.username)
                        : 'No username'
                      : 'Secure note'}
                  </span>
                </div>

                {/* Shown on hover and on keyboard focus; always there to a screen reader. */}
                <span className="row-actions">
                  {website && (
                    <a
                      className="icon-button"
                      href={website}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`Launch website of ${name}`}
                      title="Launch website"
                    >
                      <ExternalLinkIcon />
                    </a>
                  )}
                  <button
                    className="icon-button"
                    aria-label={`More actions for ${name}`}
                    title="More"
                    aria-haspopup="menu"
                    aria-expanded={rowMenu?.id === item.id}
                    onClick={(e) => openRowMenu(item, e.currentTarget)}
                  >
                    <MoreIcon />
                  </button>
                </span>
              </li>
            )
          })}
        </ul>
      </main>

      {rowMenu && menuItem && (
        <div
          className="menu row-menu"
          role="menu"
          tabIndex={-1}
          aria-label={`Actions for ${menuItem.secret!.name}`}
          style={rowMenu.style}
          ref={rowMenuRef}
          onKeyDown={walkMenu}
        >
          {rowMenu.page === 'folders' ? (
            <>
              <button
                role="menuitem"
                className="menu-item"
                onClick={() => setRowMenu({ ...rowMenu, page: 'actions' })}
              >
                <ArrowLeftIcon />
                Back
              </button>
              <hr className="menu-rule" />
              {folders.length === 0 && (
                <p className="muted menu-note">No folders yet. Make one in the web app.</p>
              )}
              {folders.map((folder) => (
                <button
                  key={folder.id}
                  role="menuitemradio"
                  aria-checked={folder.id === menuItem.folder_id}
                  className="menu-item"
                  onClick={() => void place(menuItem, folder.id, `Moved to ${folder.name}`)}
                >
                  {folder.id === menuItem.folder_id ? <CheckIcon /> : <FolderIcon />}
                  <span className="menu-label">{folder.name}</span>
                </button>
              ))}
            </>
          ) : (
            <>
              {menuItem.type === 'login' ? (
                <>
                  <button
                    role="menuitem"
                    className="menu-item"
                    onClick={() => {
                      setRowMenu(null)
                      void copy(menuItem.secret!.username, 'username')
                    }}
                  >
                    <UserIcon />
                    Copy username
                  </button>
                  <button
                    role="menuitem"
                    className="menu-item"
                    onClick={() => {
                      setRowMenu(null)
                      void copy(menuItem.secret!.password, 'password')
                    }}
                  >
                    <KeyIcon />
                    Copy password
                  </button>
                </>
              ) : (
                <button
                  role="menuitem"
                  className="menu-item"
                  onClick={() => {
                    setRowMenu(null)
                    void copy(menuItem.secret!.notes, 'note')
                  }}
                >
                  <CopyIcon />
                  Copy note
                </button>
              )}

              <hr className="menu-rule" />
              <button
                role="menuitem"
                className="menu-item"
                onClick={() => setRowMenu({ ...rowMenu, page: 'folders' })}
              >
                <FolderIcon />
                Move to folder
                {/* It opens the list of folders rather than doing something. */}
                <ChevronRightIcon className="menu-more" />
              </button>
              {menuItem.folder_id && (
                <button
                  role="menuitem"
                  className="menu-item"
                  onClick={() => void place(menuItem, null, 'Removed from its folder')}
                >
                  <FolderMinusIcon />
                  Remove from folder
                </button>
              )}

              {menuItem.role !== 'viewer' && (
                <button
                  role="menuitem"
                  className="menu-item"
                  onClick={() => {
                    setRowMenu(null)
                    setSub({ mode: 'edit', id: menuItem.id })
                  }}
                >
                  <PencilIcon />
                  Edit
                </button>
              )}

              {/* Only the owner hands an item on, or throws it away. */}
              {menuItem.role === 'owner' && (
                <>
                  {!COMMUNITY && (
                    <button
                      role="menuitem"
                      className="menu-item"
                      onClick={() => {
                        setRowMenu(null)
                        setSub({ mode: 'share', id: menuItem.id })
                      }}
                    >
                      <ShareIcon />
                      Share
                    </button>
                  )}
                  <hr className="menu-rule" />
                  <button
                    role="menuitem"
                    className="menu-item menu-danger"
                    onClick={() =>
                      void act(
                        () => trashItem(menuItem.id),
                        'Moved to the trash. The web app can restore it.'
                      )
                    }
                  >
                    <TrashIcon />
                    Move to trash
                  </button>
                </>
              )}
            </>
          )}
        </div>
      )}

      {toast}

      <footer className="bottombar">
        <button className="icon-button" aria-label="Settings" title="Settings" onClick={onSettings}>
          <SettingsIcon />
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
        <button
          className="icon-button"
          aria-label="Add login"
          title="Add login"
          onClick={() => setAdding(true)}
        >
          <PlusIcon />
        </button>

        <span className="spacer" />

        <button className="secondary full-screen" onClick={() => void handleFullScreen()}>
          <ExpandIcon width={18} height={18} />
          Full screen
        </button>
      </footer>
    </div>
  )
}
