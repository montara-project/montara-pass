import '../popup/styles.css'

import type { VaultItem } from '@montara-pass/shared/types/vault'

import { encryptNewItem, type VaultKeys } from '@montara-pass/shared/crypto/vault'
import { generatePassword } from '@montara-pass/shared/password'
import { errorMessage } from '@montara-pass/shared/string'
import { StrictMode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'

import { createItem, markItemUsed, SignedOutError } from '../lib/api'
import { fillLogin, fillNewPassword } from '../lib/autofill'
import { fetchIcon } from '../lib/icon'
import { hostOf, originOf } from '../lib/origin'
import {
  assertPasskey,
  createPasskey,
  ES256,
  parseRequest,
  rpIdFor,
  type PasskeyRequest,
} from '../lib/passkey'
import { SaveLoginFormSchema, type SaveLoginFormDto } from '../lib/schemas'
import {
  clearPendingLogin,
  loadVault,
  pendingLogin,
  storePendingLogin,
  type PendingLogin,
} from '../lib/session'
import { fillsSite, matchesSite } from '../lib/site'
import { getSettings, getTokens } from '../lib/storage'
import { lastUsedLabel } from '../lib/usage'
import { maskUsername } from '../lib/username'
import { checked, submit, useAppForm } from '../popup/form'
import { CloseIcon, ExpandIcon, KeyIcon, RefreshIcon } from '../popup/icons'
import { ItemTile } from '../popup/item-tile'
import { openFullScreen } from '../popup/layout'
import { useVaultItems } from '../popup/use-vault-items'

// The inline menu: an extension page that src/entrypoints/content.ts frames under a login
// field. It lists the logins saved for the page around it and fills the one
// that is picked. Opened as inline.html#save it is the save prompt instead: it
// offers to keep the login the page just submitted, unless the vault has it.
// Opened as inline.html#passkey it answers the page's request for a passkey:
// it offers to make one, or to sign in with one the vault holds.
// Opened as inline.html#offer it sits in the corner of a page that asks for a
// login and lists the ones saved for it, without waiting for a field.
// Keep the message names in sync with src/entrypoints/content.ts.

document.documentElement.dataset.view = 'inline'

/** What the content script asks for, as inline.html#flag,flag. */
const FLAGS = new Set(window.location.hash.slice(1).split(','))
const SAVE = FLAGS.has('save')
/** The field is choosing a password: a generated one is offered. */
const NEW = FLAGS.has('new')
/**
 * Opened by the focus alone (inline.html#auto): the frame is out of sight
 * until the menu asks to be shown, and goes away when it has no login to offer.
 */
const AUTO = FLAGS.has('auto')
/** The page asked navigator.credentials for a passkey (src/entrypoints/passkey-page.content.ts). */
const PASSKEY = FLAGS.has('passkey')
/** The page asks for a login: the ones saved for it are offered in its corner. */
const OFFER = FLAGS.has('offer')
function channelOf() {
  if (SAVE) return 'save'
  if (PASSKEY) return 'passkey'
  if (OFFER) return 'offer'
  return 'inline'
}
/** The content script tells its frames apart by the prefix. */
const CHANNEL = channelOf()

/** The account signed in with last comes first. */
const byLastUsed = (a: VaultItem, b: VaultItem) =>
  (b.last_used_at ?? '').localeCompare(a.last_used_at ?? '')

/** The tab this frame sits in, as the browser reports it. */
interface Page {
  tabId: number
  url: string
}

// A click that lands before the menu can have been read was aimed at
// whatever was on screen a moment earlier.
const SETTLE_MS = 300
const openedAt = performance.now()

// The content script hears only the frames it made itself: it sends each a
// token through the frame's own window, and every message carries it back. A
// copy of this page that a site framed is sent none, and so never gets a
// word in. The first one counts: whatever the page posts later is not it.
const token = new Promise<string>((resolve) => {
  window.addEventListener('message', (e) => {
    const sent: unknown = e.data?.montaraPassFrame
    if (e.source === window.parent && typeof sent === 'string') resolve(sent)
  })
})

async function toPage(page: Page, message: object): Promise<unknown> {
  // Frame 0 is the page itself, where the content script runs.
  return chrome.tabs.sendMessage(page.tabId, { ...message, token: await token }, { frameId: 0 })
}

/**
 * Said under a login or a passkey that somebody else shared: it signs in to
 * an account of theirs, which what is typed there then belongs to.
 */
const sharedLabel = (item: VaultItem) => (item.role === 'owner' ? null : 'Shared with you')

/** Drop the submitted login and take the save prompt away. */
async function dismiss(page: Page): Promise<void> {
  await clearPendingLogin(page.tabId)
  await toPage(page, { type: 'save:close' })
}

/** A generated password for the sign-up form the menu sits under. */
function Suggestion({ page }: { page: Page }) {
  const [password, setPassword] = useState(() => generatePassword())

  const use = async (click: Event) => {
    if (!click.isTrusted || click.timeStamp - openedAt < SETTLE_MS) return

    // The page may have navigated, or hidden the menu, since it was drawn.
    const tab = await chrome.tabs.get(page.tabId)
    if (!hostOf(tab.url) || hostOf(tab.url) !== hostOf(page.url)) return
    if ((await toPage(page, { type: 'inline:check' })) !== true) return

    // Kept for the save prompt before it is filled: a password nobody has
    // seen must not be lost if the form goes out some way that is not noticed.
    // Sending the form replaces this with what it held, username included.
    await storePendingLogin(page.tabId, {
      username: '',
      password,
      url: new URL(tab.url!).origin,
    })
    await chrome.scripting.executeScript({
      target: { tabId: page.tabId },
      func: fillNewPassword,
      args: [password],
    })
    void toPage(page, { type: 'inline:close' })
  }

  return (
    <div className="inline-list">
      <div className="row">
        <button
          className="card"
          aria-label="Use the suggested password"
          onClick={(e) => void use(e.nativeEvent)}
        >
          <span className="tile">
            <KeyIcon />
          </span>
          <span className="item-text">
            <span className="item-name">Suggested password</span>
            <span className="muted mono">{password}</span>
          </span>
        </button>
        <button
          className="icon-button"
          aria-label="Suggest another password"
          title="Suggest another"
          onClick={() => setPassword(generatePassword())}
        >
          <RefreshIcon width={18} height={18} />
        </button>
      </div>
    </div>
  )
}

function Logins({
  page,
  keys,
  suggesting,
  onLocked,
}: {
  page: Page
  keys: VaultKeys
  /** A generated password is on offer above, so the menu has something to show. */
  suggesting: boolean
  onLocked: () => void
}) {
  const { items, error } = useVaultItems(keys, onLocked)
  const first = useRef<HTMLButtonElement>(null)

  const matches = useMemo(
    () =>
      (items ?? [])
        .filter((item) => item.type === 'login' && fillsSite(item.secret, page.url))
        .sort(byLastUsed),
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

  useEffect(() => {
    if (!AUTO) return
    if (matches.length > 0) void toPage(page, { type: 'inline:show' })
    else if (!suggesting && (error || items !== null)) void toPage(page, { type: 'inline:quiet' })
  }, [page, matches, items, error, suggesting])

  // In the corner it is shown for a login to pick, and for nothing else.
  const offering = OFFER && matches.length > 0
  const shownAt = useRef(Infinity)
  useEffect(() => {
    if (offering) shownAt.current = performance.now()
    else if (OFFER && (error || items !== null)) void toPage(page, { type: 'offer:close' })
  }, [page, offering, items, error])

  const fill = async (item: VaultItem, click: Event) => {
    // The corner shows up unasked, so it counts from when it had a login to show.
    const since = OFFER ? shownAt.current : openedAt
    if (!click.isTrusted || click.timeStamp - since < SETTLE_MS || !item.secret) return

    // The page may have navigated, or hidden the menu, since it was drawn.
    const tab = await chrome.tabs.get(page.tabId)
    if (!matchesSite(item.secret.url, tab.url)) return
    if ((await toPage(page, { type: `${CHANNEL}:check` })) !== true) return

    await chrome.scripting.executeScript({
      target: { tabId: page.tabId },
      func: fillLogin,
      args: [item.secret.username ?? '', item.secret.password ?? ''],
    })
    // The login is filled either way; an older server has no such route.
    await markItemUsed(item.id).catch(() => undefined)
    void toPage(page, { type: `${CHANNEL}:close` })
  }

  if (OFFER && !offering) return null
  if (suggesting && matches.length === 0) return null
  if (error) return <p className="inline-note error">{error}</p>
  if (items === null) return <p className="inline-note muted">Decrypting…</p>
  if (matches.length === 0) {
    return <p className="inline-note muted">No logins saved for {hostOf(page.url)}.</p>
  }

  return (
    <>
      {OFFER && (
        <header className="inline-head">
          <span>Sign in to {hostOf(page.url)}</span>
          <span className="spacer" />
          <button
            className="icon-button"
            aria-label="Close"
            title="Close"
            onClick={() => void toPage(page, { type: 'offer:close' })}
          >
            <CloseIcon width={18} height={18} />
          </button>
        </header>
      )}
      <div className="inline-list">
        {matches.map((item, index) => (
          <button
            key={item.id}
            className="card"
            ref={index === 0 ? first : undefined}
            // The label replaces what the button shows, so it says the same.
            aria-label={[`Fill ${item.secret!.name}`, sharedLabel(item)].filter(Boolean).join(', ')}
            onClick={(e) => void fill(item, e.nativeEvent)}
          >
            <ItemTile item={item} />
            <span className="item-text">
              <span className="item-name">
                {item.secret!.username ? maskUsername(item.secret!.username) : item.secret!.name}
              </span>
              <span className="muted">
                {sharedLabel(item) ?? lastUsedLabel(item.last_used_at) ?? hostOf(item.secret!.url)}
              </span>
            </span>
          </button>
        ))}
      </div>
    </>
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
  const [showPassword, setShowPassword] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const shownAt = useRef(Infinity)
  const saving = useRef(false)

  // The username the page sent, once it has been read: it can be put right.
  const defaultValues: SaveLoginFormDto = { username: login?.username ?? '' }

  const form = useAppForm({
    defaultValues,
    validationLogic: checked,
    validators: { onDynamic: SaveLoginFormSchema },
    onSubmit: async ({ value }) => {
      // A second submit while the first is still asking the page: one save.
      if (!login || saving.current) return
      saving.current = true

      try {
        if ((await toPage(page, { type: 'save:check' })) !== true) return

        setError('')
        try {
          // The tab's own icon, when it still shows the site the login is for.
          const tab = await chrome.tabs.get(page.tabId)
          const hint = hostOf(tab.url) === hostOf(login.url) ? tab.favIconUrl : undefined
          const encrypted = await encryptNewItem(keys, {
            name: hostOf(login.url) ?? login.url,
            username: value.username ?? '',
            password: login.password,
            url: login.url,
            icon: await fetchIcon(login.url, hint),
          })
          await createItem({ type: 'login', ...encrypted })
          setSaved(true)
          await clearPendingLogin(page.tabId)
          setTimeout(() => void toPage(page, { type: 'save:close' }), 1200)
        } catch (err) {
          if (err instanceof SignedOutError) {
            onLocked()
            return
          }
          setError(errorMessage(err, 'Could not save the login'))
        }
      } finally {
        saving.current = false
      }
    },
  })

  useEffect(() => {
    void pendingLogin(page.tabId).then(setLogin)

    // It runs out after a while, also under an open prompt, which then closes.
    const reread = () => void pendingLogin(page.tabId).then((found) => found || setLogin(null))
    chrome.storage.session.onChanged.addListener(reread)
    return () => chrome.storage.session.onChanged.removeListener(reread)
  }, [page.tabId])

  // Already in the vault: the same account on this site, or the same password
  // when the page asked for no username. A login that holds only a passkey
  // does not know the account's password.
  const known = useMemo(
    () =>
      !!login &&
      (items ?? []).some(
        (item) =>
          item.type === 'login' &&
          matchesSite(item.secret?.url, login.url) &&
          (item.secret?.password === login.password ||
            (login.username !== '' &&
              item.secret?.username === login.username &&
              !!item.secret.password))
      ),
    [items, login]
  )

  const ready = !!login && items !== null && !known && !saved
  useEffect(() => {
    if (ready) shownAt.current = performance.now()
  }, [ready])

  useEffect(() => {
    // Saved: the prompt says so, then closes by itself.
    if (saved) return
    // Nothing to ask about. A vault that could not be read is asked again on
    // the next page, so the login is kept for it.
    if (login === null || loadError) void toPage(page, { type: 'save:close' })
    else if (known) void dismiss(page)
  }, [login, loadError, known, saved, page])

  /** A send the user made, once the prompt had been on screen long enough to be read. */
  const meant = ({ isTrusted, timeStamp }: Event) =>
    isTrusted && timeStamp - shownAt.current >= SETTLE_MS

  if (saved) return <p className="inline-note">Saved to Montara Pass.</p>
  if (!ready) return null

  return (
    <form
      className="inline-note stack"
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        if (meant(e.nativeEvent)) void submit(e.currentTarget, form)
      }}
    >
      <p>
        <strong>Save this login?</strong>
        <br />
        <span className="muted">{hostOf(login.url)}</span>
      </p>

      <form.AppField
        name="username"
        children={(field) => <field.TextField label="Username" autoComplete="off" />}
      />

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
        <form.AppForm>
          <form.SubmitButton label="Save" busyLabel="Saving…" />
        </form.AppForm>
        <button type="button" className="link" onClick={() => void dismiss(page)}>
          Not now
        </button>
      </div>
    </form>
  )
}

/** Sign in with a passkey from the vault, or make one, once the vault is open. */
function PasskeyChoice({
  page,
  keys,
  request,
  rpId,
  origin,
  finish,
  onWorking,
  onLocked,
}: {
  page: Page
  keys: VaultKeys
  request: PasskeyRequest
  rpId: string
  origin: string
  finish: (answer?: object) => void
  /** Told while a passkey is being saved or signed with, and when that is over. */
  onWorking: (working: boolean) => void
  onLocked: () => void
}) {
  const { items, error } = useVaultItems(keys, onLocked)
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState('')
  const shownAt = useRef(Infinity)
  const working = useRef(false)
  const creating = request.kind === 'create'

  // The passkeys that may sign in. For a new passkey, the ones the site says
  // the account already has.
  const matches = useMemo(
    () =>
      (items ?? [])
        .filter((item) => {
          const passkey = item.secret?.passkey
          if (passkey?.rpId !== rpId) return false
          // A site that names none takes any passkey made for it.
          return (
            (!creating && request.ids.length === 0) || request.ids.includes(passkey.credentialId)
          )
        })
        .sort(byLastUsed),
    [items, rpId, creating, request.ids]
  )

  // Nothing to offer: the vault could not be read, it holds no passkey for
  // the site, or the account's passkey is here already and the new one is
  // meant for some other place.
  const nothing = !!error || (items !== null && matches.length > 0 === creating)
  useEffect(() => {
    if (nothing) finish()
  }, [nothing, finish])

  const ready = items !== null && !nothing
  useEffect(() => {
    if (ready) shownAt.current = performance.now()
  }, [ready])

  /** @param item the passkey to sign in with; none makes a new one */
  const confirm = async (click: Event, item?: VaultItem) => {
    if (!click.isTrusted || click.timeStamp - shownAt.current < SETTLE_MS) return
    if (working.current) return
    working.current = true
    onWorking(true)

    try {
      // The page may have navigated, or hidden the prompt, since it was drawn.
      const tab = await chrome.tabs.get(page.tabId)
      if (originOf(tab.url) !== origin) return
      if ((await toPage(page, { type: 'passkey:check' })) !== true) return

      setBusy(true)
      setFailure('')
      const passkey = item?.secret?.passkey
      if (passkey) {
        const credential = await assertPasskey(passkey, request, origin)
        // Signed in either way: the note of it gets a moment, since the answer
        // takes this frame away, but a slow server does not hold up the page.
        await Promise.race([
          markItemUsed(item.id).catch(() => undefined),
          new Promise((resolve) => setTimeout(resolve, 1500)),
        ])
        finish({ credential })
      } else {
        const made = await createPasskey(request, rpId, origin)
        const encrypted = await encryptNewItem(keys, {
          name: rpId,
          username: request.user?.name,
          url: origin,
          icon: await fetchIcon(origin, tab.favIconUrl),
          passkey: made.passkey,
        })
        // Kept before the site hears of it: a passkey registered and then
        // lost would lock its owner out.
        await createItem({ type: 'login', ...encrypted })
        finish({ credential: made.credential })
      }
    } catch (err) {
      if (err instanceof SignedOutError) {
        onLocked()
        return
      }
      setFailure(errorMessage(err, 'Could not use the passkey'))
    } finally {
      working.current = false
      onWorking(false)
      setBusy(false)
    }
  }

  if (!ready) return null

  // Asked for the autofill menu, the page is not waiting: it gets the
  // browser's own back. Asked outright, it is told the user said no.
  const decline = () => finish(request.conditional ? {} : { error: 'NotAllowedError' })

  return (
    <div className="inline">
      <header className="inline-head">
        <span>{creating ? 'Save a passkey?' : 'Sign in with a passkey'}</span>
      </header>

      {creating ? (
        <p className="inline-note">
          {request.user?.name}
          <br />
          <span className="muted">{rpId}</span>
        </p>
      ) : (
        <div className="inline-list">
          {matches.map((item) => (
            <button
              key={item.id}
              className="card"
              disabled={busy}
              aria-label={[
                `Sign in as ${item.secret!.username || item.secret!.name}`,
                sharedLabel(item),
              ]
                .filter(Boolean)
                .join(', ')}
              onClick={(e) => void confirm(e.nativeEvent, item)}
            >
              <ItemTile item={item} />
              <span className="item-text">
                <span className="item-name">
                  {item.secret!.username ? maskUsername(item.secret!.username) : item.secret!.name}
                </span>
                <span className="muted">
                  {sharedLabel(item) ?? lastUsedLabel(item.last_used_at) ?? rpId}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}

      {failure && <p className="inline-note error">{failure}</p>}

      <div className="inline-note row">
        {creating && (
          <button disabled={busy} onClick={(e) => void confirm(e.nativeEvent)}>
            {busy ? 'Saving…' : 'Save passkey'}
          </button>
        )}
        {!request.conditional && (
          <button className="link" disabled={busy} onClick={() => finish()}>
            Use another device
          </button>
        )}
        {/* Not while a passkey is being saved: the site would never hear of it. */}
        <button className="link" disabled={busy} onClick={decline}>
          {request.conditional ? 'Not now' : 'Cancel'}
        </button>
      </div>
    </div>
  )
}

/**
 * Answer the page's request for a passkey. Whatever cannot be answered here
 * is left to the browser, which asks the computer or a security key as if
 * Montara Pass were not installed.
 */
function PasskeyPrompt({
  page,
  keys,
  onLocked,
  onUnlock,
}: {
  page: Page
  keys: VaultKeys | null
  onLocked: () => void
  onUnlock: () => void
}) {
  const [request, setRequest] = useState<PasskeyRequest | null>(null)
  const answered = useRef(false)
  const working = useRef(false)
  const onWorking = useCallback((value: boolean) => {
    working.current = value
  }, [])

  useEffect(() => {
    void toPage(page, { type: 'passkey:request' }).then((raw) => {
      const parsed = parseRequest(raw)
      // Not a request this can answer.
      if (!parsed) void toPage(page, { type: 'passkey:done', id: (raw as PasskeyRequest)?.id })
      setRequest(parsed)
    })
  }, [page])

  /** @param answer a credential or an error; nothing leaves it to the browser */
  const finish = useCallback(
    (answer: object = {}) => {
      if (!request || answered.current) return
      answered.current = true
      void toPage(page, { type: 'passkey:done', id: request.id, answer })
    },
    [page, request]
  )

  // The site is the page's own, as the browser names it, never as the page does.
  const origin = originOf(page.url)
  const rpId = request && rpIdFor(request.rpId, page.url)
  const answerable =
    !!request && !!origin && !!rpId && (request.kind === 'get' || request.algs.includes(ES256))
  // Locked, the vault cannot say whether it holds a passkey for the site. A
  // page that only asked for the autofill menu is not worth an Unlock for that.
  const quiet = !answerable || (!keys && request.conditional)

  useEffect(() => {
    if (request && quiet) finish()
  }, [request, quiet, finish])

  useEffect(() => {
    if (!request) return

    const onKey = (e: KeyboardEvent) => {
      // Not while a passkey is being saved, as with the buttons: the site
      // would never hear of it.
      if (e.key !== 'Escape' || working.current) return
      finish(request.conditional ? {} : { error: 'NotAllowedError' })
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [request, finish])

  if (!request || quiet || !origin || !rpId) return null

  if (!keys) {
    return (
      <div className="inline-note stack">
        <p className="muted">
          Unlock Montara Pass to {request.kind === 'create' ? 'save' : 'sign in with'} a passkey.
        </p>
        <div className="row">
          <button onClick={onUnlock}>Unlock</button>
          <button className="link" onClick={() => finish()}>
            Use another device
          </button>
        </div>
      </div>
    )
  }

  return (
    <PasskeyChoice
      page={page}
      keys={keys}
      request={request}
      rpId={rpId}
      origin={origin}
      finish={finish}
      onWorking={onWorking}
      onLocked={onLocked}
    />
  )
}

function Inline() {
  const [page, setPage] = useState<Page | null>(null)
  // undefined while the session is being read.
  const [keys, setKeys] = useState<VaultKeys | null | undefined>(undefined)
  // Without keys there is either a vault to unlock or nobody signed in.
  const [signedIn, setSignedIn] = useState(true)

  // undefined while the settings are being read.
  const [suggesting, setSuggesting] = useState<boolean | undefined>(NEW ? undefined : false)

  // Not on Montara Pass itself: the password chosen there is the master
  // password, which the vault it unlocks cannot keep.
  useEffect(() => {
    if (!NEW || !page) return
    void getSettings().then(({ apiUrl, appUrl }) => {
      const origin = originOf(page.url)
      setSuggesting(origin !== null && origin !== originOf(apiUrl) && origin !== originOf(appUrl))
    })
  }, [page])

  useEffect(() => {
    if (AUTO && page && keys && suggesting) void toPage(page, { type: 'inline:show' })
  }, [page, keys, suggesting])

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
      // The passkey prompt answers the page itself.
      if (e.key !== 'Escape' || PASSKEY) return
      if (SAVE) void dismiss(page)
      else if (OFFER) void toPage(page, { type: 'offer:close' })
      else void toPage(page, { type: 'inline:close', refocus: true })
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [page])

  // Locked or signed out, the corner has nothing to say and makes room.
  useEffect(() => {
    if (OFFER && page && keys === null) void toPage(page, { type: 'offer:close' })
  }, [page, keys])

  // Locked: Unlock is worth offering to someone who is signed in.
  useEffect(() => {
    if (!AUTO || !page || keys !== null) return
    void getTokens().then((tokens) =>
      toPage(page, { type: tokens ? 'inline:show' : 'inline:quiet' })
    )
  }, [page, keys])

  useEffect(() => {
    if (keys === null) void getTokens().then((tokens) => setSignedIn(!!tokens))
  }, [keys])

  const unlock = async () => {
    try {
      await chrome.action.openPopup()
    } catch {
      // Not every browser lets a page open the popup.
      await openFullScreen()
    }
  }

  if (!page || keys === undefined || suggesting === undefined) return null

  if (PASSKEY) {
    return (
      <PasskeyPrompt
        page={page}
        keys={keys}
        onLocked={() => setKeys(null)}
        onUnlock={() => void unlock()}
      />
    )
  }

  // Locked, the corner has nothing to say: the menu under a field offers Unlock.
  if (OFFER) {
    return keys ? (
      <div className="inline">
        <Logins page={page} keys={keys} suggesting={false} onLocked={() => setKeys(null)} />
      </div>
    ) : null
  }

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

      {keys && suggesting && <Suggestion page={page} />}
      {keys ? (
        <Logins page={page} keys={keys} suggesting={suggesting} onLocked={() => setKeys(null)} />
      ) : (
        <div className="inline-note stack">
          <p className="muted">
            {signedIn ? 'Montara Pass is locked.' : 'Sign in to Montara Pass to fill logins here.'}
          </p>
          <button onClick={() => void unlock()}>{signedIn ? 'Unlock' : 'Sign in'}</button>
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
