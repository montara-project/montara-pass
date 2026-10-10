import { useState, type FormEvent } from 'react'

import { encryptNewItem, type VaultKeys } from '@/lib/crypto/vault'

import { createItem, SignedOutError } from '../../lib/api'
import { generatePassword } from '../../lib/generate'
import { hostOf } from '../../lib/site'

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
      const encrypted = await encryptNewItem(keys, { name: name.trim(), username, password, url })
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
    <form className="stack pad" onSubmit={(e) => void handleSubmit(e)}>
      <h1>Add login</h1>

      <label>
        Name
        <input value={name} onChange={(e) => setName(e.target.value)} autoFocus required />
      </label>

      <label>
        URL
        <input value={url} onChange={(e) => setUrl(e.target.value)} />
      </label>

      <label>
        Username
        <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="off" />
      </label>

      <label>
        Password
        <div className="row">
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="off"
          />
          <button type="button" className="link" onClick={() => setShowPassword((v) => !v)}>
            {showPassword ? 'Hide' : 'Show'}
          </button>
          <button
            type="button"
            className="link"
            onClick={() => {
              setPassword(generatePassword())
              setShowPassword(true)
            }}
          >
            Generate
          </button>
        </div>
      </label>

      {error && <p className="error">{error}</p>}

      <button type="submit" disabled={busy}>
        {busy ? 'Saving…' : 'Save'}
      </button>
      <button type="button" className="link" onClick={onCancel}>
        Cancel
      </button>
    </form>
  )
}
