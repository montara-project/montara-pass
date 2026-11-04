import { SignInSchema } from '@montara-pass/shared/api/dtos/auth/schema'
import { passkeyCancelled, passkeysSupported } from '@montara-pass/shared/auth/passkey'
import { COMMUNITY } from '@montara-pass/shared/constants/edition'
import { errorMessage } from '@montara-pass/shared/string'
import { IconFingerprint } from '@tabler/icons-react'
import { Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { checked, useAppForm } from '@/hooks/form'
import { submitForm } from '@/hooks/submit-form'
import { signInWithEmail } from '@/lib/auth/email-auth'
import { signInWithPasskey } from '@/lib/auth/passkey-auth'
import { FORGOT_PASSWORD_PATH, HOME_PATH } from '@/lib/constants/auth'

import AuthShell, { authLink, authLinkStrong } from './auth-shell'
import TotpForm from './totp-form'

export default function LoginForm() {
  const navigate = useNavigate()
  // What the server said, as opposed to what the fields say about themselves.
  const [error, setError] = useState('')
  // Set when the account asks for a code from an authenticator app.
  const [totpToken, setTotpToken] = useState('')
  const [passkeyBusy, setPasskeyBusy] = useState(false)

  // A passkey names the account and verifies the user: no password, no code.
  // One that unlocks the vault too skips the master password as well.
  const signInPasskey = async () => {
    setError('')
    setPasskeyBusy(true)
    try {
      await signInWithPasskey()
      await navigate({ to: HOME_PATH, replace: true })
    } catch (err) {
      if (!passkeyCancelled(err)) setError(errorMessage(err, 'Sign-in with a passkey failed'))
    } finally {
      setPasskeyBusy(false)
    }
  }

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
        setError(errorMessage(err, 'Sign-in failed'))
      }
    },
  })

  if (totpToken) {
    return <TotpForm totpToken={totpToken} onBack={() => setTotpToken('')} />
  }

  return (
    <AuthShell
      title="Sign in"
      note="Sign in with your account password."
      foot={
        <Link to={FORGOT_PASSWORD_PATH} className={authLink}>
          Forgot your password?
        </Link>
      }
    >
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

      {passkeysSupported() && (
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="w-full"
          disabled={passkeyBusy}
          onClick={() => void signInPasskey()}
        >
          <IconFingerprint />
          {passkeyBusy ? 'Waiting for your passkey…' : 'Sign in with a passkey'}
        </Button>
      )}

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
