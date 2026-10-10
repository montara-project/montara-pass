import { useState, type FormEvent } from 'react'

import type { Models } from '@/lib/api/models'

import {
  importVaultMaterial,
  unlockVaultMaterial,
  WrongMasterPasswordError,
  type VaultKeys,
} from '@/lib/crypto/vault'

import { AUTO_LOCK_MINUTES, storeVault } from '../../lib/session'

interface UnlockProps {
  userKeys: Models.UserKeys
  onUnlocked: (keys: VaultKeys) => void
  onSignOut: () => void
}

export default function Unlock({ userKeys, onUnlocked, onSignOut }: UnlockProps) {
  const [masterPassword, setMasterPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')

    try {
      // The master password is used here and nowhere else: it is not stored
      // and not sent anywhere.
      const material = await unlockVaultMaterial(masterPassword, userKeys)
      await storeVault(material)
      onUnlocked(await importVaultMaterial(material))
    } catch (err) {
      setError(
        err instanceof WrongMasterPasswordError ? err.message : 'The vault could not be unlocked.'
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="stack pad" onSubmit={(e) => void handleSubmit(e)}>
      <h1>Your vault is locked</h1>
      <p className="muted">
        Enter your master password. The vault locks again after {AUTO_LOCK_MINUTES} minutes
        without use, and when the browser closes.
      </p>

      <label>
        Master password
        <input
          type="password"
          value={masterPassword}
          onChange={(e) => setMasterPassword(e.target.value)}
          autoComplete="off"
          autoFocus
          required
        />
      </label>

      {error && <p className="error">{error}</p>}

      <button type="submit" disabled={busy}>
        {busy ? 'Unlocking…' : 'Unlock'}
      </button>
      <button type="button" className="link" onClick={onSignOut}>
        Sign out
      </button>
    </form>
  )
}
