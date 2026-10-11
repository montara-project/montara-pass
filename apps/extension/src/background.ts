// The background script locks the vault when the auto-lock alarm fires, and
// keeps the inline menu's content script registered for as long as the user
// lets the extension run on every site. It imports nothing, so it stays a
// single file the manifest can name.
// Keep the names in sync with src/lib/session.ts and src/lib/inline.ts.

const AUTO_LOCK_ALARM = 'auto-lock'
const VAULT_SESSION_KEY = 'vault'
const ALL_SITES = ['http://*/*', 'https://*/*']
const INLINE_SCRIPT = 'inline'

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === AUTO_LOCK_ALARM) {
    void chrome.storage.session.remove(VAULT_SESSION_KEY)
  }
})

// The settings only ask for the access or give it back. Registering here
// means a popup that closes behind the permission prompt loses nothing, and
// access taken away in the browser's own settings is noticed too.
async function syncInlineScript(): Promise<void> {
  const allowed = await chrome.permissions.contains({ origins: ALL_SITES })
  const [registered] = await chrome.scripting.getRegisteredContentScripts({ ids: [INLINE_SCRIPT] })

  if (allowed && !registered) {
    await chrome.scripting.registerContentScripts([
      { id: INLINE_SCRIPT, js: ['content.js'], matches: ALL_SITES, runAt: 'document_idle' },
    ])
  } else if (!allowed && registered) {
    await chrome.scripting.unregisterContentScripts({ ids: [INLINE_SCRIPT] })
  }
}

chrome.permissions.onAdded.addListener(() => void syncInlineScript())
chrome.permissions.onRemoved.addListener(() => void syncInlineScript())
// An update of the extension drops the scripts it had registered.
chrome.runtime.onInstalled.addListener(() => void syncInlineScript())

// The inline menu asks which tab it sits in. The answer comes from the
// browser's own record of the sender, not from anything the page says.
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const fromMenu =
    sender.id === chrome.runtime.id &&
    sender.url?.startsWith(chrome.runtime.getURL('inline.html')) === true

  if (fromMenu && message?.type === 'inline:context' && sender.tab?.id !== undefined) {
    sendResponse({ tabId: sender.tab.id, url: sender.tab.url ?? '' })
  }
})
