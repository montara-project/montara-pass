import '../popup/styles.css'

import { StrictMode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'

import type { VaultKeys } from '@/lib/crypto/vault'
import type { VaultItem } from '@/types/vault'

import { markItemUsed } from '../lib/api'
import { fillLogin } from '../lib/autofill'
import { loadVault } from '../lib/session'
import { hostOf, matchesSite } from '../lib/site'
import { lastUsedLabel } from '../lib/usage'
import { ExpandIcon } from '../popup/icons'
import { ItemTile } from '../popup/item-tile'
import { openFullScreen } from '../popup/layout'
import { useVaultItems } from '../popup/use-vault-items'

// The inline menu: an extension page that src/content.ts frames under a login
// field. It lists the logins saved for the page around it and fills the one
// that is picked. Keep the message names in sync with src/content.ts.

document.documentElement.dataset.view = 'inline'

/** The tab this frame sits in, as the browser reports it. */
interface Page {
  tabId: number
  url: string
}

// A click that lands before the menu can have been read was aimed at
// whatever was on screen a moment earlier.
const SETTLE_MS = 300
const openedAt = performance.now()

function toPage(page: Page, message: object): Promise<unknown> {
  // Frame 0 is the page itself, where the content script runs.
  return chrome.tabs.sendMessage(page.tabId, message, { frameId: 0 })
}

function Logins({ page, keys, onLocked }: { page: Page; keys: VaultKeys; onLocked: () => void }) {
  const { items, error } = useVaultItems(keys, onLocked)
  const first = useRef<HTMLButtonElement>(null)

  const matches = useMemo(
    () =>
      (items ?? [])
        .filter((item) => item.type === 'login' && matchesSite(item.secret?.url, page.url))
        // The account signed in with last comes first.
        .sort((a, b) => (b.last_used_at ?? '').localeCompare(a.last_used_at ?? '')),
    [items, page.url]
  )

  // The menu takes the focus only when it was opened from the keyboard, which
  // is when the page hands it over; opened by mouse, typing stays in the field.
  useEffect(() => {
    const focusFirst = () => first.current?.focus()
    if (document.hasFocus()) focusFirst()

    window.addEventListener('focus', focusFirst)
    return () => window.removeEventListener('focus', focusFirst)
  }, [matches])

  const fill = async (item: VaultItem, click: Event) => {
    if (!click.isTrusted || click.timeStamp - openedAt < SETTLE_MS || !item.secret) return

    // The page may have navigated, or hidden the menu, since it was drawn.
    const tab = await chrome.tabs.get(page.tabId)
    if (!matchesSite(item.secret.url, tab.url)) return
    if ((await toPage(page, { type: 'inline:check' })) !== true) return

    await chrome.scripting.executeScript({
      target: { tabId: page.tabId },
      func: fillLogin,
      args: [item.secret.username ?? '', item.secret.password ?? ''],
    })
    // The login is filled either way; an older server has no such route.
    await markItemUsed(item.id).catch(() => undefined)
    void toPage(page, { type: 'inline:close' })
  }

  if (error) return <p className="inline-note error">{error}</p>
  if (items === null) return <p className="inline-note muted">Decrypting…</p>
  if (matches.length === 0) {
    return <p className="inline-note muted">No logins saved for {hostOf(page.url)}.</p>
  }

  return (
    <div className="inline-list">
      {matches.map((item, index) => (
        <button
          key={item.id}
          className="card"
          ref={index === 0 ? first : undefined}
          aria-label={`Fill ${item.secret!.name}`}
          onClick={(e) => void fill(item, e.nativeEvent)}
        >
          <ItemTile item={item} />
          <span className="item-text">
            <span className="item-name">{item.secret!.username || item.secret!.name}</span>
            <span className="muted">
              {lastUsedLabel(item.last_used_at) ?? hostOf(item.secret!.url)}
            </span>
          </span>
        </button>
      ))}
    </div>
  )
}

function Inline() {
  const [page, setPage] = useState<Page | null>(null)
  // undefined while the session is being read.
  const [keys, setKeys] = useState<VaultKeys | null | undefined>(undefined)

  const readVault = useCallback(() => {
    void loadVault()
      .then(setKeys)
      .catch(() => setKeys(null))
  }, [])

  useEffect(() => {
    void chrome.runtime.sendMessage({ type: 'inline:context' }).then(setPage)
    readVault()

    // Unlocking happens in the popup; the menu follows when it does.
    chrome.storage.session.onChanged.addListener(readVault)
    return () => chrome.storage.session.onChanged.removeListener(readVault)
  }, [readVault])

  // The frame is sized by the page, which cannot see inside it.
  useEffect(() => {
    if (!page) return

    const observer = new ResizeObserver(() => {
      const height = Math.ceil(document.body.getBoundingClientRect().height)
      void toPage(page, { type: 'inline:resize', height })
    })
    observer.observe(document.body)
    return () => observer.disconnect()
  }, [page])

  useEffect(() => {
    if (!page) return

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') void toPage(page, { type: 'inline:close', refocus: true })
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [page])

  const unlock = async () => {
    try {
      await chrome.action.openPopup()
    } catch {
      // Not every browser lets a page open the popup.
      await openFullScreen()
    }
  }

  if (!page || keys === undefined) return null

  return (
    <div className="inline">
      <header className="inline-head">
        <span>Passwords</span>
        <span className="spacer" />
        <button
          className="icon-button"
          aria-label="Open the vault"
          title="Open the vault"
          onClick={() => void openFullScreen()}
        >
          <ExpandIcon width={18} height={18} />
        </button>
      </header>

      {keys ? (
        <Logins page={page} keys={keys} onLocked={() => setKeys(null)} />
      ) : (
        <div className="inline-note stack">
          <p className="muted">Montara Pass is locked.</p>
          <button onClick={() => void unlock()}>Unlock</button>
        </div>
      )}
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Inline />
  </StrictMode>
)
