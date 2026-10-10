import { useEffect, useState, type FormEvent } from 'react'

import type { Models } from '@/lib/api/models'

import {
  importVaultMaterial,
  unlockVaultMaterial,
  WrongMasterPasswordError,
  type VaultKeys,
} from '@/lib/crypto/vault'

import { getProfile } from '../../lib/api'
import { AUTO_LOCK_MINUTES, storeVault } from '../../lib/session'
import { AuthField, BrandMark } from '../auth-field'
import { initials } from '../layout'

interface UnlockProps {
  userKeys: Models.UserKeys
  onUnlocked: (keys: VaultKeys) => void
  onSignOut: () => void
}

export default function Unlock({ userKeys, onUnlocked, onSignOut }: UnlockProps) {
  const [masterPassword, setMasterPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [email, setEmail] = useState('')

  useEffect(() => {
    // Only says whose vault this is, so a failure here is not worth reporting.
    void getProfile()
      .then((profile) => setEmail(profile.user.email))
      .catch(() => undefined)
  }, [])

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
    <form className="auth" onSubmit={(e) => void handleSubmit(e)}>
      <BrandMark />
      <h1 className="auth-title">Unlock your vault</h1>

      <AuthField
        label="Master password"
        type="password"
        value={masterPassword}
        onChange={setMasterPassword}
        autoComplete="off"
        autoFocus
        required
      />

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <button type="submit" className="auth-submit" disabled={busy}>
        {busy ? 'Unlocking…' : 'Unlock Montara Pass'}
      </button>
      <p className="muted auth-note">
        Locks again after {AUTO_LOCK_MINUTES} minutes without use, and when the browser closes.
      </p>

      <div className="auth-foot">
        {email && (
          <>
            <span className="avatar" aria-hidden="true">
              {initials(email)}
            </span>
            <span className="auth-email">{email}</span>
          </>
        )}
        <button type="button" className="auth-link" onClick={onSignOut}>
          Switch account
        </button>
      </div>
    </form>
  )
}
