// The inline menu is opt-in: it needs the extension on every page, which the
// user grants (and takes back) from the settings. The background script
// registers the content script whenever that access changes hands.

/** Keep in sync with src/background.ts. */
const ALL_SITES = ['http://*/*', 'https://*/*']

export function isInlineEnabled(): Promise<boolean> {
  return chrome.permissions.contains({ origins: ALL_SITES })
}

/**
 * Ask for access to every site. Call it straight from a click: the browser
 * only shows a permission prompt in direct response to a user action.
 *
 * @returns whether the user agreed
 */
export function enableInline(): Promise<boolean> {
  return chrome.permissions.request({ origins: ALL_SITES })
}

export async function disableInline(): Promise<void> {
  await chrome.permissions.remove({ origins: ALL_SITES })
}
