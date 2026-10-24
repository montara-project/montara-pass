import { ForgotPasswordSchema } from '@montara-pass/shared/api/dtos/auth/schema'
import { COMMUNITY } from '@montara-pass/shared/constants/edition'
import { errorMessage } from '@montara-pass/shared/string'
import { Link } from '@tanstack/react-router'
import { useState } from 'react'

import { checked, useAppForm } from '@/hooks/form'
import { submitForm } from '@/hooks/submit-form'
import { requestPasswordReset } from '@/lib/auth/email-auth'
import { SIGN_IN_PATH } from '@/lib/constants/auth'

import AuthShell, { authLink } from './auth-shell'

export default function ForgotPasswordForm() {
  // What the server said, as opposed to what the fields say about themselves.
  const [error, setError] = useState('')
  // The address the reset link went to, once it is sent.
  const [sentTo, setSentTo] = useState('')

  const form = useAppForm({
    defaultValues: { email: '' },
    validationLogic: checked,
    validators: { onDynamic: ForgotPasswordSchema },
    onSubmit: async ({ value }) => {
      setError('')

      try {
        const email = value.email.trim()
        await requestPasswordReset(email)
        // Said on the page, not in a toast: it has to still be there when
        // the user comes back from their inbox.
        setSentTo(email)
      } catch (err) {
        setError(errorMessage(err, 'The reset link could not be sent'))
      }
    },
  })

  const back = (
    <Link to={SIGN_IN_PATH} className={authLink}>
      Back to sign in
    </Link>
  )

  if (sentTo) {
    return (
      <AuthShell
        title="Check your email"
        note={
          <>
            If <span className="text-foreground font-medium break-all">{sentTo}</span> has an
            account, a link to reset its password is on the way. It works for an hour.
          </>
        }
        foot={back}
      >
        {null}
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title="Reset your password"
      note={
        COMMUNITY
          ? 'This resets your account password, not your master password. On a server without email, change SUPER_USER instead.'
          : 'This resets your account password, not your master password, which no one can reset.'
      }
      foot={back}
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

        {error && (
          <p role="alert" className="text-danger px-0.5 text-[13px] whitespace-pre-line">
            {error}
          </p>
        )}

        <form.AppForm>
          <form.SubmitButton
            label="Send reset link"
            busyLabel="Sending…"
            size="lg"
            className="mt-1.5 w-full"
          />
        </form.AppForm>
      </form>
    </AuthShell>
  )
}
