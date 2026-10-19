import { useEffect, useState } from 'react'

import { SignInSchema, TotpCodeSchema } from '@/lib/api/dtos/auth/schema'
import { COMMUNITY } from '@/lib/constants/edition'

import { signIn, verifyTotp } from '../../lib/api'
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
  // Set when the account asks for a code from an authenticator app.
  const [totpToken, setTotpToken] = useState('')

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
        const { totpToken } = await signIn(value.email.trim(), value.password)
        if (totpToken) {
          setTotpToken(totpToken)
          return
        }
        onSignedIn()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Sign-in failed')
      }
    },
  })

  if (totpToken) {
    return (
      <TotpStep totpToken={totpToken} onSignedIn={onSignedIn} onBack={() => setTotpToken('')} />
    )
  }

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
      {!COMMUNITY && (
        <p className="muted auth-note">
          No account yet?{' '}
          <a className="auth-link" href={`${appUrl}/sign-up`} target="_blank" rel="noreferrer">
            Create one
          </a>
        </p>
      )}

      <div className="auth-foot">
        <button type="button" className="auth-link" onClick={onSettings}>
          Server settings
        </button>
      </div>
    </form>
  )
}

interface TotpStepProps {
  /** From the sign-in that stopped at this step. */
  totpToken: string
  onSignedIn: () => void
  onBack: () => void
}

/** The second step of signing in, for an account that turned TOTP on. */
function TotpStep({ totpToken, onSignedIn, onBack }: TotpStepProps) {
  const [error, setError] = useState('')
  // A backup code is longer than six digits and has letters: it gets a plain field.
  const [backup, setBackup] = useState(false)

  const form = useAppForm({
    defaultValues: { code: '' },
    validationLogic: checked,
    validators: { onDynamic: TotpCodeSchema },
    onSubmit: async ({ value }) => {
      setError('')

      try {
        await verifyTotp(totpToken, value.code.replace(/\s/g, ''))
        onSignedIn()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Verification failed')
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
      <h1 className="auth-title">Two-step verification</h1>
      <p className="muted auth-note">
        {backup
          ? 'Enter one of your backup codes. Each one works once.'
          : 'Enter the 6-digit code from your authenticator app.'}
      </p>

      <form.AppField
        name="code"
        children={(field) =>
          backup ? (
            <field.AuthField label="Backup code" autoComplete="off" autoFocus invalid={!!error} />
          ) : (
            <field.OtpField label="Code" autoFocus invalid={!!error} />
          )
        }
      />

      <button
        type="button"
        className="auth-link otp-switch"
        onClick={() => {
          setBackup((value) => !value)
          setError('')
          form.reset()
        }}
      >
        {backup ? 'Use a code from the app' : 'Use a backup code'}
      </button>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <form.AppForm>
        <form.SubmitButton label="Verify" busyLabel="Verifying…" className="auth-submit" />
      </form.AppForm>

      <div className="auth-foot">
        <button type="button" className="auth-link" onClick={onBack}>
          Back to sign in
        </button>
      </div>
    </form>
  )
}
