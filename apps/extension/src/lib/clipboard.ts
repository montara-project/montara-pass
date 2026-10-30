// A copied username or password is wiped from the clipboard after a minute.
// The popup is usually closed by then, so the background script does it
// when the alarm fires.

/** Keep in sync with src/entrypoints/background.ts. */
const CLEAR_CLIPBOARD_ALARM = 'clear-clipboard'

/** Minutes a copied secret stays on the clipboard. */
const CLIPBOARD_CLEAR_MINUTES = 1

/** Copy a secret and (re)start the countdown to wipe it. */
export async function copySecret(value: string): Promise<void> {
  await navigator.clipboard.writeText(value)
  await chrome.alarms.create(CLEAR_CLIPBOARD_ALARM, { delayInMinutes: CLIPBOARD_CLEAR_MINUTES })
}
