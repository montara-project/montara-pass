/**
 * The same page serves two shapes: the toolbar popup, and a full browser tab
 * when it is opened with ?view=full. Firefox for Android has no popup: the
 * toolbar button opens the page itself, on a screen narrower than a popup.
 */
export const isFullScreen =
  new URLSearchParams(window.location.search).get('view') === 'full' ||
  /Android/.test(navigator.userAgent)

/** Open the full-screen vault in a tab. */
export async function openFullScreen(): Promise<void> {
  await chrome.tabs.create({ url: chrome.runtime.getURL('popup.html?view=full') })
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return (
    parts
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join('') || '?'
  )
}
