import { useEffect, useState } from 'react'

import { UPDATE_KEY } from '../lib/storage'
import { RefreshIcon } from './icons'

/**
 * Installs the version the browser has downloaded, and shows only while one
 * waits. Opening the page also asks the store for one (Chrome only; it
 * throttles repeat asks).
 */
export function UpdateButton({ className }: { className?: string }) {
  const [update, setUpdate] = useState<string | null>(null)

  useEffect(() => {
    void chrome.storage.local
      .get(UPDATE_KEY)
      .then((stored) => setUpdate((stored[UPDATE_KEY] as string | undefined) ?? null))
    const onChanged = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area !== 'local' || !(UPDATE_KEY in changes)) return
      setUpdate((changes[UPDATE_KEY].newValue as string | undefined) ?? null)
    }
    chrome.storage.onChanged.addListener(onChanged)
    void chrome.runtime.requestUpdateCheck?.()?.catch(() => undefined)
    return () => chrome.storage.onChanged.removeListener(onChanged)
  }, [])

  if (!update) return null

  return (
    <button
      className={['update-button', className].filter(Boolean).join(' ')}
      title={`Install version ${update}. You will unlock again after.`}
      onClick={() => chrome.runtime.reload()}
    >
      <RefreshIcon />
      Update
    </button>
  )
}
