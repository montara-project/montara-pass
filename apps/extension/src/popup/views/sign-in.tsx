import { useState } from 'react'

import { SignInSchema } from '@/lib/api/dtos/auth/schema'

import { signIn } from '../../lib/api'
import { BrandMark } from '../brand-mark'
import { checked, useAppForm } from '../form'

interface SignInProps {
  onSignedIn: () => void
  onSettings: () => void
}

export default function SignIn({ onSignedIn, onSettings }: SignInProps) {
  // What the server said, as opposed to what the fields say about themselves.
  const [error, setError] = useState('')

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
        void form.handleSubmit()
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

      <div className="auth-foot">
        <button type="button" className="auth-link" onClick={onSettings}>
          Server settings
        </button>
      </div>
    </form>
  )
}
