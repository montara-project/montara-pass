import { Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'

import { checked, useAppForm } from '@/hooks/form'
import { submitForm } from '@/hooks/submit-form'
import { SignInSchema } from '@/lib/api/dtos/auth/schema'
import { signInWithEmail } from '@/lib/auth/email-auth'
import { HOME_PATH } from '@/lib/constants/auth'
import { COMMUNITY } from '@/lib/constants/edition'

import AuthShell, { authLinkStrong } from './auth-shell'
import TotpForm from './totp-form'

export default function LoginForm() {
  const navigate = useNavigate()
  // What the server said, as opposed to what the fields say about themselves.
  const [error, setError] = useState('')
  // Set when the account asks for a code from an authenticator app.
  const [totpToken, setTotpToken] = useState('')

  const form = useAppForm({
    defaultValues: { email: '', password: '' },
    validationLogic: checked,
    validators: { onDynamic: SignInSchema },
    onSubmit: async ({ value }) => {
      setError('')

      try {
        // The password goes as typed: a space is part of it.
        const { totpToken } = await signInWithEmail({ ...value, email: value.email.trim() })
        if (totpToken) {
          setTotpToken(totpToken)
          return
        }
        await navigate({ to: HOME_PATH, replace: true })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Sign-in failed')
      }
    },
  })

  if (totpToken) {
    return <TotpForm totpToken={totpToken} onBack={() => setTotpToken('')} />
  }

  return (
    <AuthShell title="Sign in" note="Sign in with your account password.">
      <form
        className="flex flex-col gap-3.5"
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          void submitForm(e.currentTarget, form)
        }}
      >
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
          <p role="alert" className="text-danger px-0.5 text-[13px] whitespace-pre-line">
            {error}
          </p>
        )}

        <form.AppForm>
          <form.SubmitButton
            label="Sign in"
            busyLabel="Signing in…"
            size="lg"
            className="mt-1.5 w-full"
          />
        </form.AppForm>
      </form>

      {!COMMUNITY && (
        <p className="text-muted-foreground text-center text-[13px]">
          No account yet?{' '}
          <Link to="/sign-up" className={authLinkStrong}>
            Create one
          </Link>
        </p>
      )}
    </AuthShell>
  )
}
