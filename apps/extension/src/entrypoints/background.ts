// The background script locks the vault when the auto-lock alarm fires, wipes
// a copied secret from the clipboard when its alarm fires, tells
// the inline menu which tab it sits in, holds a login, a card or a contact
// that was just submitted until the save prompt takes it, and says whether anyone is
// signed in to answer a request for a passkey. In Firefox it also does for the
// inline menu what the menu's frame may not (src/inline/firefox.ts). It imports
// nothing but WXT's wrapper and src/lib/autofill.ts, which imports nothing.
// Keep the names in sync with src/lib/session.ts, src/lib/storage.ts,
// src/lib/clipboard.ts and the contact fields with CONTACT_FIELDS in
// packages/shared/src/constants/vault.ts.

import { defineBackground } from 'wxt/utils/define-background'

import { fillLogin, fillNewPassword } from '../lib/autofill'

const AUTO_LOCK_ALARM = 'auto-lock'
const CLEAR_CLIPBOARD_ALARM = 'clear-clipboard'
const VAULT_SESSION_KEY = 'vault'
const TOKENS_KEY = 'tokens'
const SETTINGS_KEY = 'settings'
/** The version the browser has downloaded and waits to install. */
const UPDATE_KEY = 'update'
/** A sign-up may take a redirect or two before it lands somewhere. */
const PENDING_TTL_MS = 5 * 60_000
/** The key a tab's pending login is stored under, and the name of its alarm. */
const PENDING_PREFIX = 'pending:'
const pendingKey = (tabId: number) => `${PENDING_PREFIX}${tabId}`
const CONTACT_KEYS = [
  'firstName',
  'lastName',
  'email',
  'phone',
  'company',
  'address',
  'city',
  'state',
  'postalCode',
  'country',
]

/**
 * Empty the clipboard. Firefox runs this script as an event page, which has a
 * document to copy from; Chrome's service worker has none and borrows an
 * offscreen one (src/offscreen.ts does the same as below).
 */
async function wipeClipboard() {
  if (!chrome.offscreen) {
    const blank = (event: ClipboardEvent) => {
      event.clipboardData?.setData('text/plain', '')
      event.preventDefault()
    }
    document.addEventListener('copy', blank)
    document.execCommand('copy')
    document.removeEventListener('copy', blank)
    return
  }
  // Only one may be open, and one already open has done its wipe on load:
  // close it, so the new one wipes again.
  await chrome.offscreen.closeDocument().catch(() => undefined)
  // It resolves once the page has loaded, which is when it has done its work.
  await chrome.offscreen
    .createDocument({
      url: 'offscreen.html',
      reasons: [chrome.offscreen.Reason.CLIPBOARD],
      justification: 'Wipe a copied password from the clipboard',
    })
    .catch(() => undefined)
  await chrome.offscreen.closeDocument().catch(() => undefined)
}

/** The origin of a URL, or null for what is not one. */
const originOf = (value: unknown) => {
  try {
    return new URL(String(value)).origin
  } catch {
    return null
  }
}

/** What the inline menu may have run in its page, by name. */
const FILLS = { fillLogin, fillNewPassword }

/**
 * Firefox gives the inline menu, an extension page framed in a web page, only
 * what a content script gets (src/inline/firefox.ts). It asks for the rest
 * here. The tabs and the page script are always its own tab's.
 */
async function frameCall(tabId: number, api: string, args: unknown[]): Promise<unknown> {
  switch (api) {
    case 'session.get':
      return chrome.storage.session.get(args[0] as string | string[] | null)
    case 'session.set':
      return chrome.storage.session.set(args[0] as Record<string, unknown>)
    case 'session.remove':
      return chrome.storage.session.remove(args[0] as string | string[])
    case 'alarms.create':
      return chrome.alarms.create(String(args[0]), args[1] as chrome.alarms.AlarmCreateInfo)
    case 'alarms.clear':
      return chrome.alarms.clear(String(args[0]))
    case 'tabs.get':
      return chrome.tabs.get(tabId)
    case 'tabs.sendMessage':
      return chrome.tabs.sendMessage(tabId, args[0], { frameId: 0 })
    // Only the extension's own pages.
    case 'tabs.create':
      if (!String(args[0]).startsWith(chrome.runtime.getURL(''))) break
      return chrome.tabs.create({ url: String(args[0]) })
    case 'scripting.fill': {
      const func = FILLS[args[0] as keyof typeof FILLS]
      if (!func || !Array.isArray(args[1])) break
      return chrome.scripting.executeScript({
        target: { tabId },
        func: func as (...args: unknown[]) => unknown,
        args: args[1],
      })
    }
  }
  throw new Error(`Not available: ${api}`)
}

export default defineBackground({
  // An ES module: a service worker in Chrome, an event page in Firefox.
  type: 'module',
  main() {
    // The session tokens are for the extension's own pages. A content script
    // shares its process with the page it runs in, and has no use for them.
    // Not every browser can close the store: the vault keys are in the session
    // store, which is closed everywhere.
    void chrome.storage.local
      .setAccessLevel?.({ accessLevel: 'TRUSTED_CONTEXTS' })
      ?.catch(() => undefined)

    // A new install: the toolbar button is easy to miss, so the way in opens in a
    // tab, where there is also a way to an account for someone who has none.
    chrome.runtime.onInstalled.addListener(({ reason }) => {
      if (reason === 'install') {
        void chrome.tabs.create({ url: chrome.runtime.getURL('popup.html?view=full') })
      }
      if (reason === 'update') void chrome.storage.local.remove(UPDATE_KEY)
    })

    // A new version is downloaded. Listening holds it back until the popup's
    // Update button reloads the extension, instead of it landing mid-fill.
    chrome.runtime.onUpdateAvailable.addListener(({ version }) => {
      void chrome.storage.local.set({ [UPDATE_KEY]: version })
    })

    chrome.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name === AUTO_LOCK_ALARM) {
        void chrome.storage.session.remove(VAULT_SESSION_KEY)
      }
      if (alarm.name === CLEAR_CLIPBOARD_ALARM) void wipeClipboard()
      // A login nobody answered for: gone even if its prompt is still open.
      if (alarm.name.startsWith(PENDING_PREFIX)) {
        void chrome.storage.session.remove(alarm.name)
      }
    })

    chrome.tabs.onRemoved.addListener((tabId) => {
      void chrome.storage.session.remove(pendingKey(tabId))
      void chrome.alarms.clear(pendingKey(tabId))
    })

    // The inline menu in Firefox hears of session changes through a port
    // (src/inline/firefox.ts). The names of what changed, not the values.
    const menus = new Set<chrome.runtime.Port>()
    chrome.runtime.onConnect.addListener((port) => {
      const fromMenu = port.sender?.url?.startsWith(chrome.runtime.getURL('inline.html')) === true
      if (port.name !== 'frame:session' || port.sender?.id !== chrome.runtime.id || !fromMenu) {
        port.disconnect()
        return
      }
      menus.add(port)
      port.onDisconnect.addListener(() => menus.delete(port))
    })
    chrome.storage.session.onChanged.addListener((changes) => {
      for (const port of menus) port.postMessage(Object.keys(changes))
    })

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (sender.id !== chrome.runtime.id || sender.tab?.id === undefined) return
      const tabId = sender.tab.id

      // The inline menu asks which tab it sits in. The answer comes from the
      // browser's own record of the sender, not from anything the page says.
      const fromMenu = sender.url?.startsWith(chrome.runtime.getURL('inline.html')) === true
      if (fromMenu) {
        if (message?.type === 'inline:context') sendResponse({ tabId, url: sender.tab.url ?? '' })
        if (message?.type === 'frame:call') {
          frameCall(tabId, String(message.api), Array.isArray(message.args) ? message.args : [])
            .then((result) => sendResponse({ result }))
            .catch((err) => sendResponse({ error: String(err?.message ?? err) }))
          // The answer comes later.
          return true
        }
        return
      }

      // The rest comes from the content script, which runs in the top frame.
      if (sender.frameId !== 0 || !sender.url) return
      const key = pendingKey(tabId)
      const url = new URL(sender.url).origin

      // Whether the page is Montara Pass itself, by the stored settings.
      const ownSite = (stored: Record<string, unknown>) => {
        const settings = stored[SETTINGS_KEY] as { apiUrl?: string; appUrl?: string } | undefined
        // Compared as origins: a configured URL may carry a path or a slash.
        return [
          settings?.apiUrl ?? import.meta.env.VITE_DEFAULT_API_URL,
          settings?.appUrl ?? import.meta.env.VITE_DEFAULT_APP_URL,
        ]
          .map(originOf)
          .includes(url)
      }

      // What the page just submitted, a login, a card or a contact, one at a time. It
      // waits in session storage (in memory, closed to pages and content
      // scripts) because the page that took it is usually gone before anyone
      // could be asked about it.
      const hold = (pending: object) =>
        void chrome.storage.local.get([TOKENS_KEY, SETTINGS_KEY]).then((stored) => {
          // Nobody is signed in: there is no vault to save it to.
          if (!stored[TOKENS_KEY]) return

          // Montara Pass itself: what is typed there is the master password,
          // which is kept nowhere, or an item that is in the vault already.
          if (ownSite(stored)) return

          void chrome.alarms.create(key, { delayInMinutes: PENDING_TTL_MS / 60_000 })
          return chrome.storage.session.set({ [key]: { ...pending, url, at: Date.now() } })
        })

      switch (message?.type) {
        case 'save:capture': {
          const password = String(message.password ?? '')
          if (!password || password.length > 1024) return

          hold({ username: String(message.username ?? '').slice(0, 320), password })
          return
        }
        // Only the known fields, as strings: the page chose what is in them.
        case 'save:contact': {
          const contact = Object.fromEntries(
            CONTACT_KEYS.map((name) => [
              name,
              String(message.contact?.[name] ?? '')
                .trim()
                .slice(0, 500),
            ]).filter(([, value]) => value)
          )
          if (Object.keys(contact).length === 0) return

          hold({ contact })
          return
        }
        // A card's number, holder and expiry, checked again here. Never its
        // security code, which is not taken from a page.
        case 'save:card': {
          const number = String(message.card?.number ?? '').replace(/[\s-]/g, '')
          if (!/^\d{12,19}$/.test(number)) return

          const cardholder = String(message.card?.cardholder ?? '')
            .trim()
            .slice(0, 200)
          const expiry = String(message.card?.expiry ?? '')
          hold({
            card: {
              number,
              ...(cardholder && { cardholder }),
              ...(/^(0[1-9]|1[0-2])\/\d{2}$/.test(expiry) && { expiry }),
            },
          })
          return
        }
        // Whether there is one to ask about; the login itself is not sent back.
        case 'save:pending':
          void chrome.storage.session.get(key).then((stored) => {
            const pending = stored[key] as { at: number } | undefined
            const fresh = Date.now() - (pending?.at ?? 0) < PENDING_TTL_MS
            // The alarm is late when the computer slept through it.
            if (pending && !fresh) void chrome.storage.session.remove(key)
            sendResponse(fresh)
          })
          // The answer comes later.
          return true
        // Whether a page's request for a passkey is worth a prompt: only with
        // somebody signed in, whose vault can hold one.
        // Never on Montara Pass itself: a passkey for the account belongs on
        // the device's own authenticator, which can unlock the vault (PRF),
        // not inside the vault it would unlock.
        case 'passkey:available':
          void chrome.storage.local
            .get([TOKENS_KEY, SETTINGS_KEY])
            .then((stored) => sendResponse(!!stored[TOKENS_KEY] && !ownSite(stored)))
          return true
      }
    })
  },
})
