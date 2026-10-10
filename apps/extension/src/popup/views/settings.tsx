import { useEffect, useState, type FormEvent } from 'react'

import { DEFAULT_SETTINGS, getSettings, saveSettings } from '../../lib/storage'

interface SettingsProps {
  onClose: () => void
}

function originOf(value: string): string | null {
  try {
    const url = new URL(value.trim())
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.origin : null
  } catch {
    return null
  }
}

export default function Settings({ onClose }: SettingsProps) {
  const [apiUrl, setApiUrl] = useState(DEFAULT_SETTINGS.apiUrl)
  const [appUrl, setAppUrl] = useState(DEFAULT_SETTINGS.appUrl)
  const [error, setError] = useState('')

  useEffect(() => {
    void getSettings().then((settings) => {
      setApiUrl(settings.apiUrl)
      setAppUrl(settings.appUrl)
    })
  }, [])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    const apiOrigin = originOf(apiUrl)
    const appOrigin = originOf(appUrl)
    if (!apiOrigin || !appOrigin) {
      setError('Both must be http(s) URLs, like https://api.example.com')
      return
    }

    // Asked first, straight from the click: the browser only shows a
    // permission prompt in direct response to a user action. It answers true
    // without a prompt for an origin the extension may already call.
    const granted = await chrome.permissions.request({ origins: [`${apiOrigin}/*`] })
    if (!granted) {
      setError(`Without access to ${apiOrigin} the extension cannot reach that server.`)
      return
    }

    await saveSettings({ apiUrl: apiOrigin, appUrl: appOrigin })
    onClose()
  }

  return (
    <form className="stack pad" onSubmit={(e) => void handleSubmit(e)}>
      <h1>Settings</h1>

      <label>
        API server
        <input value={apiUrl} onChange={(e) => setApiUrl(e.target.value)} required />
      </label>

      <label>
        Web app
        <input value={appUrl} onChange={(e) => setAppUrl(e.target.value)} required />
      </label>

      {error && <p className="error">{error}</p>}

      <button type="submit">Save</button>
      <button type="button" className="link" onClick={onClose}>
        Cancel
      </button>
    </form>
  )
}
