import { ResetPasswordSchema } from '@montara-pass/shared/api/dtos/auth/schema'
import { errorMessage } from '@montara-pass/shared/string'
import { Link, useSearch } from '@tanstack/react-router'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { checked, useAppForm } from '@/hooks/form'
import { submitForm } from '@/hooks/submit-form'
import { resetPassword } from '@/lib/auth/email-auth'
import { FORGOT_PASSWORD_PATH, SIGN_IN_PATH } from '@/lib/constants/auth'

import AuthShell, { authLink } from './auth-shell'

/** Where the link in the reset email lands once the API has accepted it. */
export default function ResetPasswordForm() {
  const { token } = useSearch({ from: '/reset-password/' })
  // What the server said, as opposed to what the fields say about themselves.
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const form = useAppForm({
    defaultValues: { password: '' },
    validationLogic: checked,
    validators: { onDynamic: ResetPasswordSchema },
    onSubmit: async ({ value }) => {
      setError('')

      try {
        await resetPassword(token ?? '', value.password)
        setDone(true)
      } catch (err) {
        setError(errorMessage(err, 'The password could not be changed'))
      }
    },
  })

  const signIn = (
    <Button asChild size="lg" className="mt-1.5 w-full">
      <Link to={SIGN_IN_PATH} replace>
        Sign in
      </Link>
    </Button>
  )

  if (done) {
    return (
      <AuthShell
        title="Password changed"
        note="Every device was signed out. Sign in with the new password; your master password is the same."
      >
        {signIn}
      </AuthShell>
    )
  }

  // Reached without the API's redirect: there is nothing to reset with.
  if (!token) {
    return (
      <AuthShell
        title="Reset link needed"
        note="Open the link in the reset email, or ask for a new one."
        foot={
          <Link to={SIGN_IN_PATH} className={authLink}>
            Back to sign in
          </Link>
        }
      >
        <Button asChild size="lg" className="mt-1.5 w-full">
          <Link to={FORGOT_PASSWORD_PATH}>Send a reset link</Link>
        </Button>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title="Choose a new password"
      note="This is the password you sign in with. Your master password stays the same."
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
          name="password"
          children={(field) => (
            <field.AuthField
              label="New password, at least 8 characters"
              type="password"
              autoComplete="new-password"
              autoFocus
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
            label="Change password"
            busyLabel="Changing password…"
            size="lg"
            className="mt-1.5 w-full"
          />
        </form.AppForm>
      </form>
    </AuthShell>
  )
}
