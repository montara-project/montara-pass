// The background script locks the vault when the auto-lock alarm fires, tells
// the inline menu which tab it sits in, and holds a login that was just
// submitted until the save prompt takes it. It imports nothing, so it stays a
// single file the manifest can name.
// Keep the names in sync with src/lib/session.ts and src/lib/storage.ts.

const AUTO_LOCK_ALARM = 'auto-lock'
const VAULT_SESSION_KEY = 'vault'
const TOKENS_KEY = 'tokens'
const SETTINGS_KEY = 'settings'
/** A sign-up may take a redirect or two before it lands somewhere. */
const PENDING_TTL_MS = 5 * 60_000
const pendingKey = (tabId: number) => `pending:${tabId}`

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === AUTO_LOCK_ALARM) {
    void chrome.storage.session.remove(VAULT_SESSION_KEY)
  }
})

chrome.tabs.onRemoved.addListener((tabId) => {
  void chrome.storage.session.remove(pendingKey(tabId))
})

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (sender.id !== chrome.runtime.id || sender.tab?.id === undefined) return
  const tabId = sender.tab.id

  // The inline menu asks which tab it sits in. The answer comes from the
  // browser's own record of the sender, not from anything the page says.
  const fromMenu = sender.url?.startsWith(chrome.runtime.getURL('inline.html')) === true
  if (fromMenu) {
    if (message?.type === 'inline:context') sendResponse({ tabId, url: sender.tab.url ?? '' })
    return
  }

  // The rest comes from the content script, which runs in the top frame.
  if (sender.frameId !== 0 || !sender.url) return
  const key = pendingKey(tabId)

  switch (message?.type) {
    // A login the page just submitted. It waits in session storage (in
    // memory, closed to pages and content scripts) because the page that
    // took it is usually gone before anyone could be asked about it.
    case 'save:capture': {
      const password = String(message.password ?? '')
      if (!password || password.length > 1024) return

      const pending = {
        username: String(message.username ?? '').slice(0, 320),
        password,
        url: new URL(sender.url).origin,
        at: Date.now(),
      }
      void chrome.storage.local.get([TOKENS_KEY, SETTINGS_KEY]).then((stored) => {
        // Nobody is signed in: there is no vault to save it to.
        if (!stored[TOKENS_KEY]) return

        // Montara Pass itself: what is typed there is the master password,
        // which is kept nowhere.
        const settings = stored[SETTINGS_KEY] as { apiUrl?: string; appUrl?: string } | undefined
        const own = [
          settings?.apiUrl ?? import.meta.env.VITE_DEFAULT_API_URL,
          settings?.appUrl ?? import.meta.env.VITE_DEFAULT_APP_URL,
        ]
        if (own.includes(pending.url)) return

        return chrome.storage.session.set({ [key]: pending })
      })
      return
    }
    // Whether there is one to ask about; the login itself is not sent back.
    case 'save:pending':
      void chrome.storage.session.get(key).then((stored) => {
        const pending = stored[key] as { at: number } | undefined
        const fresh = Date.now() - (pending?.at ?? 0) < PENDING_TTL_MS
        if (pending && !fresh) void chrome.storage.session.remove(key)
        sendResponse(fresh)
      })
      // The answer comes later.
      return true
  }
})
