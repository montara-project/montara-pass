import type { Models } from '@montara-pass/shared/api/models'

import { UnlockFormSchema } from '@montara-pass/shared/api/dtos/vault/schema'
import {
  importVaultMaterial,
  unlockVaultMaterial,
  WrongMasterPasswordError,
  type VaultKeys,
} from '@montara-pass/shared/crypto/vault'
import { initials } from '@montara-pass/shared/string'
import { useEffect, useState } from 'react'

import { getProfile } from '../../lib/api'
import { AUTO_LOCK_MINUTES, storeVault } from '../../lib/session'
import { BrandMark } from '../brand-mark'
import { checked, submit, useAppForm } from '../form'

interface UnlockProps {
  userKeys: Models.UserKeys
  onUnlocked: (keys: VaultKeys) => void
  onSignOut: () => void
}

export default function Unlock({ userKeys, onUnlocked, onSignOut }: UnlockProps) {
  // What unlocking said, as opposed to what the field says about itself.
  const [error, setError] = useState('')
  const [email, setEmail] = useState('')

  useEffect(() => {
    // Only says whose vault this is, so a failure here is not worth reporting.
    void getProfile()
      .then((profile) => setEmail(profile.user.email))
      .catch(() => undefined)
  }, [])

  const form = useAppForm({
    defaultValues: { master_password: '' },
    validationLogic: checked,
    validators: { onDynamic: UnlockFormSchema },
    onSubmit: async ({ value }) => {
      setError('')

      try {
        // The master password is used here and nowhere else: it is not stored
        // and not sent anywhere. Taken as typed: a space is part of it.
        const material = await unlockVaultMaterial(value.master_password, userKeys)
        await storeVault(material)
        onUnlocked(await importVaultMaterial(material))
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
