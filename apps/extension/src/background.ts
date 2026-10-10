// The background script has one job: lock the vault when the auto-lock alarm
// fires. It imports nothing, so it stays a single file the manifest can name.
// Keep the two names in sync with src/lib/session.ts.

const AUTO_LOCK_ALARM = 'auto-lock'
const VAULT_SESSION_KEY = 'vault'

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === AUTO_LOCK_ALARM) {
    void chrome.storage.session.remove(VAULT_SESSION_KEY)
  }
})
