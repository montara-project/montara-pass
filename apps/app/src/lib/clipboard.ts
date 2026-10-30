/** How long a copied username or password stays on the clipboard. */
const CLIPBOARD_CLEAR_MS = 60_000

let timer: ReturnType<typeof setTimeout> | undefined

/** Copy a secret, and empty the clipboard again a minute later. */
export async function copySecret(value: string): Promise<void> {
  await navigator.clipboard.writeText(value)
  // A newer copy restarts the countdown.
  clearTimeout(timer)
  window.removeEventListener('focus', clearClipboard)
  timer = setTimeout(clearClipboard, CLIPBOARD_CLEAR_MS)
}

// Only a focused page may write to the clipboard: from a tab in the
// background, it waits until the tab is back.
// ponytail: cleared unconditionally, reading it first would ask for permission.
function clearClipboard() {
  navigator.clipboard
    .writeText('')
    .catch(() => window.addEventListener('focus', clearClipboard, { once: true }))
}
