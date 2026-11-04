import type { Models } from '@montara-pass/shared/api/models'

import { UnlockFormSchema } from '@montara-pass/shared/api/dtos/vault/schema'
import { passkeyCancelled, passkeysSupported } from '@montara-pass/shared/auth/passkey'
import {
  importVaultMaterial,
  unlockVaultMaterial,
  WrongMasterPasswordError,
  WrongPasskeyError,
  type VaultKeys,
  type VaultMaterial,
} from '@montara-pass/shared/crypto/vault'
import { errorMessage, initials } from '@montara-pass/shared/string'
import { useEffect, useState } from 'react'

import { unlockWithPasskey } from '../../lib/account-passkey'
import { getProfile, listPasskeys } from '../../lib/api'
import { AUTO_LOCK_MINUTES, storeVault } from '../../lib/session'
import { BrandMark } from '../brand-mark'
import { checked, submit, useAppForm } from '../form'
import { FingerprintIcon } from '../icons'

interface UnlockProps {
  userKeys: Models.UserKeys
  onUnlocked: (keys: VaultKeys) => void
  onSignOut: () => void
}

export default function Unlock({ userKeys, onUnlocked, onSignOut }: UnlockProps) {
  // What unlocking said, as opposed to what the field says about itself.
  const [error, setError] = useState('')
  const [email, setEmail] = useState('')
  // The passkeys that seal the vault key; the button shows only with one.
  const [passkeys, setPasskeys] = useState<Models.AccountPasskey[]>([])
  const [passkeyBusy, setPasskeyBusy] = useState(false)

  useEffect(() => {
    // Only says whose vault this is, so a failure here is not worth reporting.
    void getProfile()
      .then((profile) => setEmail(profile.user.email))
      .catch(() => undefined)
    // Without it the master password is the way in, as ever.
    if (passkeysSupported()) {
      void listPasskeys()
        .then((list) => setPasskeys(list.filter((p) => p.encrypted_vault_key)))
        .catch(() => undefined)
    }
  }, [])

  const open = async (material: VaultMaterial) => {
    await storeVault(material)
    onUnlocked(await importVaultMaterial(material))
  }

  const unlockPasskey = async () => {
    setError('')
    setPasskeyBusy(true)
    try {
      await open(await unlockWithPasskey(userKeys, passkeys))
    } catch (err) {
      if (passkeyCancelled(err)) return
      setError(
        err instanceof WrongPasskeyError
          ? err.message
          : errorMessage(err, 'The vault could not be unlocked.')
      )
    } finally {
      setPasskeyBusy(false)
    }
  }

  const form = useAppForm({
    defaultValues: { master_password: '' },
    validationLogic: checked,
    validators: { onDynamic: UnlockFormSchema },
    onSubmit: async ({ value }) => {
      setError('')

      try {
        // The master password is used here and nowhere else: it is not stored
        // and not sent anywhere. Taken as typed: a space is part of it.
        await open(await unlockVaultMaterial(value.master_password, userKeys))
      } catch (err) {
        setError(
          err instanceof WrongMasterPasswordError ? err.message : 'The vault could not be unlocked.'
        )
      }
    },
  })

  return (
    <form
      className="auth"
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        void submit(e.currentTarget, form)
      }}
    >
      <BrandMark />
      <h1 className="auth-title">Unlock your vault</h1>

      <form.AppField
        name="master_password"
        children={(field) => (
          <field.AuthField
            label="Master password"
            type="password"
            autoComplete="off"
            autoFocus
            invalid={!!error}
          />
        )}
      />

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <form.AppForm>
        <form.SubmitButton
          label="Unlock Montara Pass"
          busyLabel="Unlocking…"
          className="auth-submit"
        />
      </form.AppForm>
      {passkeys.length > 0 && (
        <button
          type="button"
          className="secondary auth-submit"
          disabled={passkeyBusy}
          onClick={() => void unlockPasskey()}
        >
          <FingerprintIcon />
          {passkeyBusy ? 'Waiting for your passkey…' : 'Unlock with a passkey'}
        </button>
      )}
      <p className="muted auth-note">
        Locks again after {AUTO_LOCK_MINUTES} minutes without use, and when the browser closes.
      </p>

      <div className="auth-foot">
        {email && (
          <span className="auth-account">
            <span className="avatar" aria-hidden="true">
              {initials(email)}
            </span>
            <span className="auth-email">{email}</span>
          </span>
        )}
        <button type="button" className="auth-link" onClick={onSignOut}>
          Switch account
        </button>
      </div>
    </form>
  )
}
