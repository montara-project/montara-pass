import { TotpCodeSchema } from '@montara-pass/shared/api/dtos/auth/schema'
import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'

import { checked, useAppForm } from '@/hooks/form'
import { submitForm } from '@/hooks/submit-form'
import { verifyTotp } from '@/lib/auth/email-auth'
import { HOME_PATH } from '@/lib/constants/auth'
import { cn } from '@/lib/utils'

import AuthShell, { authLink } from './auth-shell'

interface TotpFormProps {
  /** From the sign-in that stopped at this step. */
  totpToken: string
  onBack: () => void
}

/** The second step of signing in, for an account that turned TOTP on. */
export default function TotpForm({ totpToken, onBack }: TotpFormProps) {
  const navigate = useNavigate()
  // What the server said, as opposed to what the field says about itself.
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
        await navigate({ to: HOME_PATH, replace: true })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Verification failed')
      }
    },
  })

  return (
    <AuthShell
      title="Two-step verification"
      note={
        backup
          ? 'Enter one of your backup codes. Each one works once.'
          : 'Enter the 6-digit code from your authenticator app.'
      }
      foot={
        <button type="button" className={authLink} onClick={onBack}>
          Back to sign in
        </button>
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
          className={cn(authLink, 'self-start')}
          onClick={() => {
            setBackup((value) => !value)
            setError('')
            form.reset()
          }}
        >
          {backup ? 'Use a code from the app' : 'Use a backup code'}
        </button>

        {error && (
          <p role="alert" className="text-danger px-0.5 text-[13px] whitespace-pre-line">
            {error}
          </p>
        )}

        <form.AppForm>
          <form.SubmitButton
            label="Verify"
            busyLabel="Verifying…"
            size="lg"
            className="mt-1.5 w-full"
          />
        </form.AppForm>
      </form>
    </AuthShell>
  )
}
