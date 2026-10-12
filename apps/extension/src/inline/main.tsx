import '../popup/styles.css'

import {
  StrictMode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from 'react'
import { createRoot } from 'react-dom/client'

import type { VaultItem } from '@/types/vault'

import { encryptNewItem, type VaultKeys } from '@/lib/crypto/vault'

import { createItem, markItemUsed, SignedOutError } from '../lib/api'
import { fillLogin } from '../lib/autofill'
import { fetchIcon } from '../lib/icon'
import { clearPendingLogin, loadVault, pendingLogin, type PendingLogin } from '../lib/session'
import { hostOf, matchesSite } from '../lib/site'
import { lastUsedLabel } from '../lib/usage'
import { ExpandIcon } from '../popup/icons'
import { ItemTile } from '../popup/item-tile'
import { openFullScreen } from '../popup/layout'
import { useVaultItems } from '../popup/use-vault-items'

// The inline menu: an extension page that src/content.ts frames under a login
// field. It lists the logins saved for the page around it and fills the one
// that is picked. Opened as inline.html#save it is the save prompt instead: it
// offers to keep the login the page just submitted, unless the vault has it.
// Keep the message names in sync with src/content.ts.

document.documentElement.dataset.view = 'inline'

const SAVE = window.location.hash === '#save'
/** The content script tells its two frames apart by the prefix. */
const CHANNEL = SAVE ? 'save' : 'inline'

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

/** Drop the submitted login and take the save prompt away. */
async function dismiss(page: Page): Promise<void> {
  await clearPendingLogin(page.tabId)
  await toPage(page, { type: 'save:close' })
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

/** Offer to save the login the page just submitted. */
function SaveLogin({
  page,
  keys,
  onLocked,
}: {
  page: Page
  keys: VaultKeys
  onLocked: () => void
}) {
  const { items, error: loadError } = useVaultItems(keys, onLocked)
  // undefined while it is being read.
  const [login, setLogin] = useState<PendingLogin | null | undefined>(undefined)
  const [username, setUsername] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const shownAt = useRef(Infinity)

  useEffect(() => {
    void pendingLogin(page.tabId).then((found) => {
      setLogin(found)
      setUsername(found?.username ?? '')
    })
  }, [page.tabId])

  // Already in the vault: the same account on this site, or the same password
  // when the page asked for no username.
  const known = useMemo(
    () =>
      !!login &&
      (items ?? []).some(
        (item) =>
          item.type === 'login' &&
          matchesSite(item.secret?.url, login.url) &&
          (item.secret?.password === login.password ||
            (login.username !== '' && item.secret?.username === login.username))
      ),
    [items, login]
  )

  const ready = !!login && items !== null && !known && !saved
  useEffect(() => {
    if (ready) shownAt.current = performance.now()
  }, [ready])

  useEffect(() => {
    // Nothing to ask about. A vault that could not be read is asked again on
    // the next page, so the login is kept for it.
    if (login === null || loadError) void toPage(page, { type: 'save:close' })
    // Once saved it is known too, and the prompt closes by itself.
    else if (known && !saved) void dismiss(page)
  }, [login, loadError, known, saved, page])

  const save = async (e: FormEvent) => {
    e.preventDefault()
    const { isTrusted, timeStamp } = e.nativeEvent
    if (!login || !isTrusted || timeStamp - shownAt.current < SETTLE_MS) return
    if ((await toPage(page, { type: 'save:check' })) !== true) return

    setBusy(true)
    setError('')
    try {
      // The tab's own icon, when it still shows the site the login is for.
      const tab = await chrome.tabs.get(page.tabId)
      const hint = hostOf(tab.url) === hostOf(login.url) ? tab.favIconUrl : undefined
      const encrypted = await encryptNewItem(keys, {
        name: hostOf(login.url) ?? login.url,
        username,
        password: login.password,
        url: login.url,
        icon: await fetchIcon(login.url, hint),
      })
      await createItem({ type: 'login', ...encrypted })
      await clearPendingLogin(page.tabId)
      setSaved(true)
      setTimeout(() => void toPage(page, { type: 'save:close' }), 1200)
    } catch (err) {
      if (err instanceof SignedOutError) {
        onLocked()
        return
      }
      setError(err instanceof Error ? err.message : 'Could not save the login')
    } finally {
      setBusy(false)
    }
  }

  if (saved) return <p className="inline-note">Saved to Montara Pass.</p>
  if (!ready) return null

  return (
    <form className="inline-note stack" onSubmit={(e) => void save(e)}>
      <p>
        <strong>Save this login?</strong>
        <br />
        <span className="muted">{hostOf(login.url)}</span>
      </p>

      <label>
        Username
        <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="off" />
      </label>

      <label>
        Password
        <div className="row">
          <input type={showPassword ? 'text' : 'password'} value={login.password} readOnly />
          <button type="button" className="link" onClick={() => setShowPassword((v) => !v)}>
            {showPassword ? 'Hide' : 'Show'}
          </button>
        </div>
      </label>

      {error && <p className="error">{error}</p>}

      <div className="row">
        <button type="submit" disabled={busy}>
          {busy ? 'Saving…' : 'Save'}
        </button>
        <button type="button" className="link" onClick={() => void dismiss(page)}>
          Not now
        </button>
      </div>
    </form>
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
      void toPage(page, { type: `${CHANNEL}:resize`, height })
    })
    observer.observe(document.body)
    return () => observer.disconnect()
  }, [page])

  useEffect(() => {
    if (!page) return

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (SAVE) void dismiss(page)
      else void toPage(page, { type: 'inline:close', refocus: true })
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

  if (SAVE) {
    return keys ? (
      <SaveLogin page={page} keys={keys} onLocked={() => setKeys(null)} />
    ) : (
      <div className="inline-note stack">
        <p className="muted">Unlock Montara Pass to save this login.</p>
        <div className="row">
          <button onClick={() => void unlock()}>Unlock</button>
          <button className="link" onClick={() => void dismiss(page)}>
            Not now
          </button>
        </div>
      </div>
    )
  }

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
