import { useEffect, useState } from 'react'

import { SignInSchema } from '@/lib/api/dtos/auth/schema'

import { signIn } from '../../lib/api'
import { DEFAULT_SETTINGS, getSettings } from '../../lib/storage'
import { BrandMark } from '../brand-mark'
import { checked, submit, useAppForm } from '../form'

interface SignInProps {
  onSignedIn: () => void
  onSettings: () => void
}

export default function SignIn({ onSignedIn, onSettings }: SignInProps) {
  // What the server said, as opposed to what the fields say about themselves.
  const [error, setError] = useState('')
  // Accounts are made in the web app, which a self-hosted server serves itself.
  const [appUrl, setAppUrl] = useState(DEFAULT_SETTINGS.appUrl)

  useEffect(() => {
    void getSettings().then((settings) => setAppUrl(settings.appUrl))
  }, [])

  const form = useAppForm({
    defaultValues: { email: '', password: '' },
    validationLogic: checked,
    validators: { onDynamic: SignInSchema },
    onSubmit: async ({ value }) => {
      setError('')

      try {
        // The password goes as typed: a space is part of it.
        await signIn(value.email.trim(), value.password)
        onSignedIn()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Sign-in failed')
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
      <h1 className="auth-title">Sign in</h1>
      <p className="muted auth-note">Sign in with your account password.</p>

      <form.AppField
        name="email"
        children={(field) => (
          <field.AuthField label="Email" type="email" autoComplete="username" autoFocus />
        )}
      />
      <form.AppField
        name="password"
        children={(field) => (
          <field.AuthField
            label="Password"
            type="password"
            autoComplete="current-password"
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
        <form.SubmitButton label="Sign in" busyLabel="Signing in…" className="auth-submit" />
      </form.AppForm>
      <p className="muted auth-note">
        No account yet?{' '}
        <a className="auth-link" href={`${appUrl}/sign-up`} target="_blank" rel="noreferrer">
          Create one
        </a>
      </p>

      <div className="auth-foot">
        <button type="button" className="auth-link" onClick={onSettings}>
          Server settings
        </button>
      </div>
    </form>
  )
}
