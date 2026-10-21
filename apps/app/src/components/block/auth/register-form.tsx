import { SignUpSchema } from '@montara-pass/shared/api/dtos/auth/schema'
import { errorMessage } from '@montara-pass/shared/string'
import { Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'

import { checked, useAppForm } from '@/hooks/form'
import { submitForm } from '@/hooks/submit-form'
import { signUpWithEmail } from '@/lib/auth/email-auth'
import { HOME_PATH, SIGN_IN_PATH } from '@/lib/constants/auth'

import AuthShell, { authLink, authLinkStrong } from './auth-shell'

export default function RegisterForm() {
  const navigate = useNavigate()
  // What the server said, as opposed to what the fields say about themselves.
  const [error, setError] = useState('')
  // The address the verification link went to, once the account exists.
  const [sentTo, setSentTo] = useState('')

  const form = useAppForm({
    defaultValues: { name: '', email: '', password: '' },
    validationLogic: checked,
    validators: { onDynamic: SignUpSchema },
    onSubmit: async ({ value }) => {
      setError('')

      try {
        const email = value.email.trim()
        const { signedIn } = await signUpWithEmail({ ...value, email })
        if (signedIn) {
          await navigate({ to: HOME_PATH, replace: true })
          return
        }

        // Said on the page, not in a toast: it has to still be there when
        // the user comes back from their inbox.
        setSentTo(email)
      } catch (err) {
        setError(errorMessage(err, 'The account could not be created'))
      }
    },
  })

  if (sentTo) {
    return (
      <AuthShell
        title="Check your email"
        note={
          <>
            Account created. Open the link sent to{' '}
            <span className="text-foreground font-medium break-all">{sentTo}</span> to verify it,
            then sign in.
          </>
        }
        foot={
          <Link to={SIGN_IN_PATH} className={authLink}>
            Go to sign in
          </Link>
        }
      >
        {null}
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title="Create your account"
      note="This password signs you in. You choose a separate master password for the vault next."
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
          name="name"
          children={(field) => <field.AuthField label="Name" autoComplete="name" autoFocus />}
        />
        <form.AppField
          name="email"
          children={(field) => (
            <field.AuthField label="Email" type="email" autoComplete="username" />
          )}
        />
        <form.AppField
          name="password"
          children={(field) => (
            <field.AuthField
              label="Password, at least 8 characters"
              type="password"
              autoComplete="new-password"
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
            label="Create account"
            busyLabel="Creating account…"
            size="lg"
            className="mt-1.5 w-full"
          />
        </form.AppForm>
      </form>

      <p className="text-muted-foreground text-center text-[13px]">
        Already have an account?{' '}
        <Link to={SIGN_IN_PATH} className={authLinkStrong}>
          Sign in
        </Link>
      </p>
    </AuthShell>
  )
}
