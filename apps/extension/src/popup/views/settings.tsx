import { useEffect, useState, type FormEvent } from 'react'

import { DEFAULT_SETTINGS, getSettings, saveSettings } from '../../lib/storage'

interface SettingsProps {
  onClose: () => void
}

/** `pnpm watch`: the API and the web app run apart, each with its own URL. */
const DEV = import.meta.env.MODE === 'development'

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
  const [selfHosted, setSelfHosted] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    void getSettings().then((settings) => {
      setApiUrl(settings.apiUrl)
      setAppUrl(settings.appUrl)
      setSelfHosted(settings.apiUrl !== DEFAULT_SETTINGS.apiUrl)
    })
  }, [])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    // A released build knows one server, which also serves the web app.
    const apiOrigin = DEV || selfHosted ? originOf(apiUrl) : DEFAULT_SETTINGS.apiUrl
    const appOrigin = DEV ? originOf(appUrl) : selfHosted ? apiOrigin : DEFAULT_SETTINGS.appUrl
    if (!apiOrigin || !appOrigin) {
      setError('Enter an http(s) URL, like https://vault.example.com')
      return
    }

    // Asked first, straight from the click: the browser only shows a
    // permission prompt in direct response to a user action. It answers true
    // without a prompt unless site access was taken away in the browser.
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

      {DEV ? (
        <>
          <label>
            API server
            <input value={apiUrl} onChange={(e) => setApiUrl(e.target.value)} required />
          </label>

          <label>
            Web app
            <input value={appUrl} onChange={(e) => setAppUrl(e.target.value)} required />
          </label>
        </>
      ) : (
        <>
          <label>
            Server URL
            {/* The API lives under /api of the server; only the origin is kept. */}
            <input
              value={selfHosted ? apiUrl : `${DEFAULT_SETTINGS.apiUrl}/api`}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder="https://vault.example.com/api"
              disabled={!selfHosted}
              required
            />
          </label>

          <label className="toggle">
            <input
              type="checkbox"
              role="switch"
              aria-checked={selfHosted}
              checked={selfHosted}
              onChange={(e) => setSelfHosted(e.target.checked)}
            />
            <span>
              Self-hosted
              <span className="muted">Use your own Montara Pass server.</span>
            </span>
          </label>
        </>
      )}

      {error && <p className="error">{error}</p>}

      <button type="submit">Save</button>
      <button type="button" className="link" onClick={onClose}>
        Cancel
      </button>
    </form>
  )
}
