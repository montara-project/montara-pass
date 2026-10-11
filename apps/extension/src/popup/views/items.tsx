import { useEffect, useMemo, useRef, useState } from 'react'

import type { VaultKeys } from '@/lib/crypto/vault'
import type { VaultItem } from '@/types/vault'

import { markItemUsed } from '../../lib/api'
import { fillLogin } from '../../lib/autofill'
import { hostOf, matchesSite } from '../../lib/site'
import { lastUsedLabel } from '../../lib/usage'
import {
  CopyIcon,
  ExpandIcon,
  KeyIcon,
  LockIcon,
  LogOutIcon,
  PlusIcon,
  RefreshIcon,
  SearchIcon,
  SettingsIcon,
  SortIcon,
  UserIcon,
} from '../icons'
import { ItemTile } from '../item-tile'
import { initials, openFullScreen } from '../layout'
import { useVaultItems } from '../use-vault-items'
import AddItem from './add-item'

type Sort = 'name' | 'updated'

const SORT_LABEL: Record<Sort, string> = {
  name: 'Sort by name',
  updated: 'Sort by last updated',
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
  const [adding, setAdding] = useState(false)
  const [sort, setSort] = useState<Sort>('name')
  const [refreshing, setRefreshing] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

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
    () =>
      (items ?? []).filter(
        (item) => item.type === 'login' && matchesSite(item.secret?.url, tab?.url)
      ),
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
    await navigator.clipboard.writeText(value)
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

      <main className="panel">
        {notice && (
          <p className="notice" role="status">
            {notice}
          </p>
        )}
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
                      {[item.secret!.username || 'No username', lastUsedLabel(item.last_used_at)]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}

        <button
          className="sort"
          onClick={() => setSort((current) => (current === 'name' ? 'updated' : 'name'))}
        >
          {SORT_LABEL[sort]}
          <SortIcon width={16} height={16} />
        </button>

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

            return (
              <li key={item.id}>
                <ItemTile item={item} />

                <div className="item-text">
                  <span className="item-name">{name}</span>
                  <span className="muted">
                    {isLogin ? item.secret!.username || 'No username' : 'Secure note'}
                  </span>
                </div>

                {isLogin ? (
                  <>
                    <button
                      className="icon-button"
                      aria-label={`Copy username of ${name}`}
                      title="Copy username"
                      onClick={() => void copy(item.secret!.username, 'username')}
                    >
                      <UserIcon />
                    </button>
                    <button
                      className="icon-button"
                      aria-label={`Copy password of ${name}`}
                      title="Copy password"
                      onClick={() => void copy(item.secret!.password, 'password')}
                    >
                      <KeyIcon />
                    </button>
                  </>
                ) : (
                  <button
                    className="icon-button"
                    aria-label={`Copy note ${name}`}
                    title="Copy note"
                    onClick={() => void copy(item.secret!.notes, 'note')}
                  >
                    <CopyIcon />
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      </main>

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

        <button className="full-screen" onClick={() => void handleFullScreen()}>
          <ExpandIcon width={18} height={18} />
          Full screen
        </button>
      </footer>
    </div>
  )
}
