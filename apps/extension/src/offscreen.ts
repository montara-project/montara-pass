// Chrome's background script is a service worker, which has no clipboard.
// It opens this page to wipe it, and closes it again once it has loaded.
// Keep in sync with wipeClipboard in src/entrypoints/background.ts.

const blank = (event: ClipboardEvent) => {
  event.clipboardData?.setData('text/plain', '')
  event.preventDefault()
}
document.addEventListener('copy', blank)
document.execCommand('copy')
document.removeEventListener('copy', blank)
