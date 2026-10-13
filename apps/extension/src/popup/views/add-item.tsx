import { useState, type FormEvent } from 'react'

import { encryptNewItem, type VaultKeys } from '@/lib/crypto/vault'
import { generatePassword } from '@/lib/password'

import { createItem, SignedOutError } from '../../lib/api'
import { fetchIcon } from '../../lib/icon'
import { hostOf } from '../../lib/site'
import { ArrowLeftIcon, EyeIcon, EyeOffIcon } from '../icons'
import { Field } from './item-form'

interface AddItemProps {
  keys: VaultKeys
  /** The tab the popup was opened on; its site prefills the form. */
  tab: chrome.tabs.Tab | null
  onSaved: () => void
  onCancel: () => void
  onSignedOut: () => void
}

/** Save a login for the current site. It is encrypted here, like in the web app. */
export default function AddItem({ keys, tab, onSaved, onCancel, onSignedOut }: AddItemProps) {
  const host = hostOf(tab?.url)

  const [name, setName] = useState(host ?? '')
  const [url, setUrl] = useState(host && tab?.url ? new URL(tab.url).origin : '')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')

    try {
      // The tab's own icon, when the login is for the site it shows.
      const hint = hostOf(url) === host ? tab?.favIconUrl : undefined
      const encrypted = await encryptNewItem(keys, {
        name: name.trim(),
        username,
        password,
        url,
        icon: await fetchIcon(url, hint),
      })
      await createItem({ type: 'login', ...encrypted })
      onSaved()
    } catch (err) {
      if (err instanceof SignedOutError) {
        onSignedOut()
        return
      }
      setError(err instanceof Error ? err.message : 'Could not save the login')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="vault-sub">
      <button type="button" className="link back" onClick={onCancel}>
        <ArrowLeftIcon width={18} height={18} />
        All items
      </button>

      <form className="stack detail-body" onSubmit={(e) => void handleSubmit(e)}>
        <header>
          <h1 className="detail-title">Add login</h1>
          <p className="muted">Encrypted in your browser before it is saved.</p>
        </header>

        <Field label="Name" required>
          {(props) => (
            <input
              {...props}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Work email"
              // Named after the site already: the account is what is left to type.
              autoFocus={!host}
              required
            />
          )}
        </Field>

        <Field label="URL">
          {(props) => (
            <input
              {...props}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              inputMode="url"
              autoComplete="off"
            />
          )}
        </Field>

        <Field label="Username">
          {(props) => (
            <input
              {...props}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="username or email"
              autoComplete="off"
              autoFocus={!!host}
            />
          )}
        </Field>

        <Field label="Password">
          {(props) => (
            <div className="row">
              <div className="password-box">
                <input
                  {...props}
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="password"
                  autoComplete="off"
                />
                <button
                  type="button"
                  className="icon-button"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((shown) => !shown)}
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  setPassword(generatePassword())
                  setShowPassword(true)
                }}
              >
                Generate
              </button>
            </div>
          )}
        </Field>

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}

        <div className="row form-actions">
          <button type="button" className="secondary" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" disabled={busy}>
            {busy ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  )
}
