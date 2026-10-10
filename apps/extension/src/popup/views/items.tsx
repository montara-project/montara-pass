import { useCallback, useEffect, useMemo, useState } from 'react'

import type { VaultItem } from '@/types/vault'

import { decryptItem, type VaultKeys } from '@/lib/crypto/vault'

import { listItems, SignedOutError } from '../../lib/api'
import { fillLogin } from '../../lib/autofill'
import { hostOf, matchesSite } from '../../lib/site'
import AddItem from './add-item'

interface ItemsProps {
  keys: VaultKeys
  onLock: () => void
  onSignOut: () => void
  /** The session ended underneath the popup. */
  onSignedOut: () => void
  onSettings: () => void
}

export default function Items({ keys, onLock, onSignOut, onSignedOut, onSettings }: ItemsProps) {
  const [items, setItems] = useState<VaultItem[] | null>(null)
  const [tab, setTab] = useState<chrome.tabs.Tab | null>(null)
  const [search, setSearch] = useState('')
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [adding, setAdding] = useState(false)

  const load = useCallback(async () => {
    setError('')

    try {
      const encrypted = await listItems()
      setItems(
        await Promise.all(
          encrypted.map(async (item) => ({
            ...item,
            secret: await decryptItem(keys, item).catch(() => null),
          }))
        )
      )
    } catch (err) {
      if (err instanceof SignedOutError) {
        onSignedOut()
        return
      }
      setError(err instanceof Error ? err.message : 'Could not load your vault')
    }
  }, [keys, onSignedOut])

  useEffect(() => {
    void load()
    // activeTab lets the popup see the URL and title of the tab it was opened on.
    void chrome.tabs.query({ active: true, currentWindow: true }).then(([active]) => {
      setTab(active ?? null)
    })
  }, [load])

  const pageHost = hostOf(tab?.url)

  // Logins for this site first, then favorites, then by name.
  const visible = useMemo(() => {
    const term = search.trim().toLowerCase()
    const rank = (item: VaultItem) =>
      matchesSite(item.secret?.url, tab?.url) ? 0 : item.favorite ? 1 : 2

    return (items ?? [])
      .filter((item) => item.secret !== null)
      .filter((item) =>
        [item.secret?.name, item.secret?.username, item.secret?.url]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(term))
      )
      .sort(
        (a, b) => rank(a) - rank(b) || a.secret!.name.localeCompare(b.secret!.name)
      )
  }, [items, search, tab])

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
    <div className="stack">
      <header>
        <strong>Montara Pass</strong>
        <span className="spacer" />
        <button className="link" onClick={onSettings}>
          Settings
        </button>
        <button className="link" onClick={onLock}>
          Lock
        </button>
        <button className="link" onClick={onSignOut}>
          Sign out
        </button>
      </header>

      <div className="row pad-x">
        <input
          type="search"
          placeholder="Search vault"
          aria-label="Search vault"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
        />
        <button onClick={() => setAdding(true)}>Add</button>
      </div>

      {notice && (
        <p className="notice pad-x" role="status">
          {notice}
        </p>
      )}
      {error && <p className="error pad-x">{error}</p>}

      {items === null && !error && <p className="muted pad-x">Decrypting…</p>}

      {items !== null && visible.length === 0 && (
        <p className="muted pad-x">
          {items.length === 0 ? 'Your vault is empty.' : 'Nothing matches your search.'}
        </p>
      )}

      <ul className="items">
        {visible.map((item) => {
          const matches = matchesSite(item.secret?.url, tab?.url)
          const isLogin = item.type === 'login'

          return (
            <li key={item.id}>
              <div className="item-text">
                <span className="item-name">
                  {item.secret!.name}
                  {matches && <span className="badge">{pageHost}</span>}
                </span>
                <span className="muted">
                  {isLogin ? item.secret!.username || 'No username' : 'Secure note'}
                </span>
              </div>

              {/* Offered only when the saved URL belongs to this page. */}
              {matches && isLogin && <button onClick={() => void fill(item)}>Fill</button>}
              {isLogin ? (
                <>
                  <button
                    className="link"
                    title="Copy username"
                    onClick={() => void copy(item.secret!.username, 'username')}
                  >
                    User
                  </button>
                  <button
                    className="link"
                    title="Copy password"
                    onClick={() => void copy(item.secret!.password, 'password')}
                  >
                    Pass
                  </button>
                </>
              ) : (
                <button
                  className="link"
                  title="Copy note"
                  onClick={() => void copy(item.secret!.notes, 'note')}
                >
                  Copy
                </button>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
