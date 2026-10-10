import { useState, type FormEvent } from 'react'

import type { VaultItem } from '@/types/vault'

import {
  encryptItemUpdate,
  encryptNewItem,
  type ItemSecret,
  type VaultKeys,
} from '@/lib/crypto/vault'

import { ApiError, createItem, SignedOutError, updateItem } from '../../lib/api'
import { generatePassword } from '../../lib/generate'

type ItemType = 'login' | 'secure_note'

interface ItemFormProps {
  keys: VaultKeys
  /** The item being edited; absent to create one. */
  item?: VaultItem
  /** Called with the id of the saved item. */
  onSaved: (id: string) => void
  onCancel: () => void
  onSignedOut: () => void
}

/**
 * Create or edit an item in the full-screen view. Like everywhere else, the
 * content is encrypted here and the server only receives ciphertext.
 */
export default function ItemForm({ keys, item, onSaved, onCancel, onSignedOut }: ItemFormProps) {
  const [type, setType] = useState<ItemType>((item?.type as ItemType | undefined) ?? 'login')
  const [name, setName] = useState(item?.secret?.name ?? '')
  const [url, setUrl] = useState(item?.secret?.url ?? '')
  const [username, setUsername] = useState(item?.secret?.username ?? '')
  const [password, setPassword] = useState(item?.secret?.password ?? '')
  const [notes, setNotes] = useState(item?.secret?.notes ?? '')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const isLogin = type === 'login'

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')

    const secret: ItemSecret = isLogin
      ? { name: name.trim(), username, password, url, notes }
      : { name: name.trim(), notes }

    try {
      if (item) {
        await updateItem(item.id, {
          encrypted_data: await encryptItemUpdate(keys, item, secret),
          revision: item.revision,
        })
        onSaved(item.id)
      } else {
        const created = await createItem({ type, ...(await encryptNewItem(keys, secret)) })
        onSaved(created.id)
      }
    } catch (err) {
      if (err instanceof SignedOutError) {
        onSignedOut()
        return
      }
      setError(
        err instanceof ApiError && err.status === 409
          ? 'This item was changed somewhere else. Refresh the vault and try again.'
          : err instanceof Error
            ? err.message
            : 'Could not save the item'
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="stack detail-body" onSubmit={(e) => void handleSubmit(e)}>
      <h2 className="detail-title">{item ? `Edit ${item.secret?.name ?? 'item'}` : 'New item'}</h2>

      {/* The type of an existing item is fixed. */}
      {!item && (
        <fieldset className="segmented">
          <legend>Type</legend>
          {(
            [
              ['login', 'Login'],
              ['secure_note', 'Secure note'],
            ] as const
          ).map(([value, label]) => (
            <label key={value} className="segment">
              <input
                type="radio"
                name="type"
                value={value}
                checked={type === value}
                onChange={() => setType(value)}
              />
              <span>{label}</span>
            </label>
          ))}
        </fieldset>
      )}

      <label>
        Name
        <input value={name} onChange={(e) => setName(e.target.value)} autoFocus required />
      </label>

      {isLogin && (
        <>
          <label>
            Website
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
            />
          </label>

          <label>
            Username
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="off"
            />
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
        </>
      )}

      <label>
        Notes
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={5} />
      </label>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <div className="row">
        <button type="submit" disabled={busy}>
          {busy ? 'Saving…' : 'Save'}
        </button>
        <button type="button" className="secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  )
}
