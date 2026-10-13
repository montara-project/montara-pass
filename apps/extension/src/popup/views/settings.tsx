import { useEffect, useState, type FormEvent } from 'react'

import { getProfile } from '../../lib/api'
import { AUTO_LOCK_MINUTES } from '../../lib/session'
import { originOf } from '../../lib/site'
import { DEFAULT_SETTINGS, getSettings, saveSettings } from '../../lib/storage'
import { ArrowLeftIcon, ExternalLinkIcon } from '../icons'

interface SettingsProps {
  onClose: () => void
  /** Given while the vault is unlocked. */
  onLock?: () => void
  /** Given while someone is signed in. */
  onSignOut?: () => void
}

/** `pnpm watch`: the API and the web app run apart, each with its own URL. */
const DEV = import.meta.env.MODE === 'development'

const SITE_URL = 'https://montarapass.com'
const DOCS_URL = 'https://docs.montarapass.com/docs'

export default function Settings({ onClose, onLock, onSignOut }: SettingsProps) {
  const [saved, setSaved] = useState(DEFAULT_SETTINGS)
  const [apiUrl, setApiUrl] = useState(DEFAULT_SETTINGS.apiUrl)
  const [appUrl, setAppUrl] = useState(DEFAULT_SETTINGS.appUrl)
  const [selfHosted, setSelfHosted] = useState(false)
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')

  const signedIn = !!onSignOut

  useEffect(() => {
    void getSettings().then((settings) => {
      setSaved(settings)
      setApiUrl(settings.apiUrl)
      setAppUrl(settings.appUrl)
      setSelfHosted(settings.apiUrl !== DEFAULT_SETTINGS.apiUrl)
    })
  }, [])

  // The row shows without the address when the server cannot be reached.
  useEffect(() => {
    if (!signedIn) return
    void getProfile()
      .then((profile) => setEmail(profile.user.email))
      .catch(() => {})
  }, [signedIn])

  const wasSelfHosted = saved.apiUrl !== DEFAULT_SETTINGS.apiUrl
  const changed = DEV
    ? apiUrl !== saved.apiUrl || appUrl !== saved.appUrl
    : selfHosted !== wasSelfHosted || (selfHosted && apiUrl !== saved.apiUrl)

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
    <div className="settings">
      <header className="set-head">
        <button type="button" className="icon-button" aria-label="Back" onClick={onClose}>
          <ArrowLeftIcon />
        </button>
        <h1>Settings</h1>
        <span className="muted set-version">Version {chrome.runtime.getManifest().version}</span>
      </header>

      {signedIn && (
        <section className="set-section" aria-labelledby="set-account">
          <h2 id="set-account">Account</h2>
          <div className="set-card">
            <div className="set-row">
              <span className="set-text">
                Email
                <span className="muted">{email || '…'}</span>
              </span>
              <span className="set-actions">
                {onLock && (
                  <button type="button" className="secondary" onClick={onLock}>
                    Lock
                  </button>
                )}
                <button type="button" className="secondary" onClick={onSignOut}>
                  Sign out
                </button>
              </span>
            </div>

            <a
              className="set-row"
              href={`${saved.appUrl}/profile`}
              target="_blank"
              rel="noreferrer"
            >
              <span className="set-text">
                Manage account
                <span className="muted">Your profile, in the web app</span>
              </span>
              <ExternalLinkIcon />
            </a>
          </div>
        </section>
      )}

      <section className="set-section" aria-labelledby="set-security">
        <h2 id="set-security">Security</h2>
        <div className="set-card">
          <div className="set-row">
            <span className="set-text">
              Auto-lock
              <span className="muted">The vault locks when it has not been used for this long</span>
            </span>
            <span className="set-value">{AUTO_LOCK_MINUTES} minutes</span>
          </div>
        </div>
      </section>

      <section className="set-section" aria-labelledby="set-server">
        <h2 id="set-server">Server</h2>
        <form className="set-card" onSubmit={(e) => void handleSubmit(e)}>
          {DEV ? (
            <>
              <label className="set-row set-field">
                <span className="set-text">API server</span>
                <input value={apiUrl} onChange={(e) => setApiUrl(e.target.value)} required />
              </label>

              <label className="set-row set-field">
                <span className="set-text">Web app</span>
                <input value={appUrl} onChange={(e) => setAppUrl(e.target.value)} required />
              </label>
            </>
          ) : (
            <>
              <label className="set-row toggle">
                <span className="set-text">
                  Self-hosted
                  <span className="muted">Use your own Montara Pass server</span>
                </span>
                <input
                  type="checkbox"
                  role="switch"
                  aria-checked={selfHosted}
                  checked={selfHosted}
                  onChange={(e) => setSelfHosted(e.target.checked)}
                />
              </label>

              <label className="set-row set-field">
                <span className="set-text">
                  Server URL
                  <span className="muted">
                    {selfHosted ? 'The address of your server' : 'The Montara Pass server'}
                  </span>
                </span>
                {/* The API lives under /api of the server; only the origin is kept. */}
                <input
                  value={selfHosted ? apiUrl : `${DEFAULT_SETTINGS.apiUrl}/api`}
                  onChange={(e) => setApiUrl(e.target.value)}
                  placeholder="https://vault.example.com/api"
                  disabled={!selfHosted}
                  required
                />
              </label>
            </>
          )}

          <div className="set-row">
            <span className="set-text">
              {error ? (
                <span className="error" role="alert">
                  {error}
                </span>
              ) : (
                <span className="muted">
                  {signedIn ? 'Changing the server signs you in again.' : 'Saved in this browser.'}
                </span>
              )}
            </span>
            <button type="submit" disabled={!changed}>
              Save
            </button>
          </div>
        </form>
      </section>

      <section className="set-section" aria-labelledby="set-other">
        <h2 id="set-other">Other</h2>
        <div className="set-card">
          <a className="set-row" href={saved.appUrl} target="_blank" rel="noreferrer">
            <span className="set-text">
              Open the web app
              <span className="muted">Folders, sharing and the trash</span>
            </span>
            <ExternalLinkIcon />
          </a>

          <a className="set-row" href={DOCS_URL} target="_blank" rel="noreferrer">
            <span className="set-text">Documentation</span>
            <ExternalLinkIcon />
          </a>
        </div>
      </section>

      <footer className="set-foot">
        <a href={`${SITE_URL}/terms`} target="_blank" rel="noreferrer">
          Terms of Service
        </a>
        <a href={`${SITE_URL}/privacy`} target="_blank" rel="noreferrer">
          Privacy Policy
        </a>
      </footer>
    </div>
  )
}
