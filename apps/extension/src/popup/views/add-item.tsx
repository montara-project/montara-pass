import { encryptNewItem, type VaultKeys } from '@montara-pass/shared/crypto/vault'
import { errorMessage } from '@montara-pass/shared/string'
import { useState } from 'react'

import { createItem, SignedOutError } from '../../lib/api'
import { fetchIcon } from '../../lib/icon'
import { AddLoginFormSchema, type AddLoginFormDto } from '../../lib/schemas'
import { hostOf } from '../../lib/site'
import { checked, submit, useAppForm } from '../form'
import { ArrowLeftIcon } from '../icons'

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

  // What saving said, as opposed to what the fields say about themselves.
  const [error, setError] = useState('')

  const defaultValues: AddLoginFormDto = {
    name: host ?? '',
    url: host && tab?.url ? new URL(tab.url).origin : '',
    username: '',
    password: '',
  }

  const form = useAppForm({
    defaultValues,
    validationLogic: checked,
    validators: { onDynamic: AddLoginFormSchema },
    onSubmit: async ({ value }) => {
      setError('')

      try {
        const { name, url, username, password } = AddLoginFormSchema.parse(value)
        // The tab's own icon, when the login is for the site it shows.
        const hint = hostOf(url) === host ? tab?.favIconUrl : undefined
        const encrypted = await encryptNewItem(keys, {
          name,
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
        setError(errorMessage(err, 'Could not save the login'))
      }
    },
  })

  return (
    <div className="vault-sub">
      <button type="button" className="link back" onClick={onCancel}>
        <ArrowLeftIcon width={18} height={18} />
        All items
      </button>

      <form
        className="stack detail-body"
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          void submit(e.currentTarget, form)
        }}
      >
        <header>
          <h1 className="detail-title">Add login</h1>
          <p className="muted">Encrypted in your browser before it is saved.</p>
        </header>

        <form.AppField
          name="name"
          children={(field) => (
            <field.TextField
              label="Name"
              required
              placeholder="e.g. Work email"
              // Named after the site already: the account is what is left to type.
              autoFocus={!host}
            />
          )}
        />

        <form.AppField
          name="url"
          children={(field) => (
            <field.TextField
              label="URL"
              placeholder="https://example.com"
              inputMode="url"
              autoComplete="off"
            />
          )}
        />

        <form.AppField
          name="username"
          children={(field) => (
            <field.TextField
              label="Username"
              placeholder="username or email"
              autoComplete="off"
              autoFocus={!!host}
            />
          )}
        />

        <form.AppField
          name="password"
          children={(field) => (
            <field.PasswordField
              label="Password"
              placeholder="password"
              autoComplete="off"
              generate
            />
          )}
        />

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}

        <div className="row form-actions">
          <button type="button" className="secondary" onClick={onCancel}>
            Cancel
          </button>
          <form.AppForm>
            <form.SubmitButton label="Save" busyLabel="Saving…" />
          </form.AppForm>
        </div>
      </form>
    </div>
  )
}
