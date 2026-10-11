// The background script locks the vault when the auto-lock alarm fires, and
// tells the inline menu which tab it sits in. It imports nothing, so it stays
// a single file the manifest can name.
// Keep the names in sync with src/lib/session.ts.

const AUTO_LOCK_ALARM = 'auto-lock'
const VAULT_SESSION_KEY = 'vault'

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === AUTO_LOCK_ALARM) {
    void chrome.storage.session.remove(VAULT_SESSION_KEY)
  }
})

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
