import type { Models } from '@montara-pass/shared/api/models'

import {
  SignInSchema,
  TotpCodeSchema,
  TotpDisableSchema,
} from '@montara-pass/shared/api/dtos/auth/schema'
import { totpQrCode, totpSecret } from '@montara-pass/shared/auth/totp'
import { useState } from 'react'
import z from 'zod'

import { confirmTotp, disableTotp, enableTotp } from '../../lib/api'
import { checked, submit, useAppForm } from '../form'

interface TwoFactorProps {
  /** undefined while the profile loads. */
  enabled?: boolean
  onChange: (enabled: boolean) => void
}

// Turning it on takes the password alone; the code field is not shown.
const PasswordSchema = SignInSchema.pick({ password: true }).extend({ code: z.string() })

const messageOf = (err: unknown) => (err instanceof Error ? err.message : 'Request failed')

/**
 * The rows of the Security card that turn optional TOTP on and off, as the
 * web app's account page does. Both take the account password, and turning
 * it off a code from the app or a backup code too. Turning it on
 * shows the secret and the backup codes once, and takes effect when a code
 * from the app has been verified.
 */
export default function TwoFactor({ enabled, onChange }: TwoFactorProps) {
  // Asking for the password (and to turn it off, a code), before turning it on or off.
  const [asking, setAsking] = useState(false)
  // The secret being set up, until a code from it is verified.
  const [setup, setSetup] = useState<Models.TotpSetup | null>(null)
  const [error, setError] = useState('')

  const passwordForm = useAppForm({
    defaultValues: { password: '', code: '' },
    validationLogic: checked,
    validators: { onDynamic: enabled ? TotpDisableSchema : PasswordSchema },
    onSubmit: async ({ value }) => {
      setError('')
      try {
        if (enabled) {
          await disableTotp(value.password, value.code.replace(/\s/g, ''))
          onChange(false)
        } else {
          setSetup(await enableTotp(value.password))
        }
        setAsking(false)
        passwordForm.reset()
      } catch (err) {
        setError(messageOf(err))
      }
    },
  })

  const codeForm = useAppForm({
    defaultValues: { code: '' },
    validationLogic: checked,
    validators: { onDynamic: TotpCodeSchema },
    onSubmit: async ({ value }) => {
      if (!setup) return
      setError('')
      try {
        await confirmTotp(setup.totp_token, value.code.replace(/\s/g, ''))
        setSetup(null)
        onChange(true)
      } catch (err) {
        setError(messageOf(err))
      }
    },
  })

  const cancel = () => {
    setAsking(false)
    setSetup(null)
    setError('')
    passwordForm.reset()
  }

  return (
    <>
      <div className="set-row">
        <span className="set-text">
          Two-step verification
          {error ? (
            <span className="error" role="alert">
              {error}
            </span>
          ) : (
            <span className="muted">
              {enabled
                ? 'On: signing in asks for a code from your authenticator app'
                : 'Optional: also ask for a code from an authenticator app at sign-in'}
            </span>
          )}
        </span>
        {!asking && !setup && (
          <span className="set-actions">
            <button
              type="button"
              className="secondary"
              disabled={enabled === undefined}
              onClick={() => setAsking(true)}
            >
              {enabled ? 'Turn off' : 'Turn on'}
            </button>
          </span>
        )}
      </div>

      {asking && (
        <form
          className="set-row totp-setup"
          noValidate
          onSubmit={(e) => {
            e.preventDefault()
            void submit(e.currentTarget, passwordForm)
          }}
        >
          <passwordForm.AppField
            name="password"
            children={(field) => (
              <field.PasswordField
                label="Account password"
                autoComplete="current-password"
                required
              />
            )}
          />
          {enabled && (
            <passwordForm.AppField
              name="code"
              children={(field) => (
                <field.TextField
                  label="Code from your authenticator app, or a backup code"
                  autoComplete="one-time-code"
                  spellCheck={false}
                  required
                />
              )}
            />
          )}
          <span className="set-actions">
            <button type="button" className="secondary" onClick={cancel}>
              Cancel
            </button>
            <passwordForm.AppForm>
              <passwordForm.SubmitButton
                label={enabled ? 'Turn off' : 'Continue'}
                busyLabel={enabled ? 'Turning off…' : 'Checking…'}
              />
            </passwordForm.AppForm>
          </span>
        </form>
      )}

      {setup && (
        <form
          className="set-row totp-setup"
          noValidate
          onSubmit={(e) => {
            e.preventDefault()
            void submit(e.currentTarget, codeForm)
          }}
        >
          <p>Scan the code with your authenticator app, or enter this key:</p>
          {/* Dark on white whatever the theme: what scanners read best. */}
          <img
            className="totp-qr"
            src={totpQrCode(setup.totp_uri)}
            alt="QR code for your authenticator app"
            width={160}
            height={160}
          />
          <code className="totp-key">{totpSecret(setup.totp_uri)}</code>

          <p>
            Backup codes: each signs you in once if you lose your device. Keep them somewhere safe;
            they are not shown again.
          </p>
          <ul className="totp-codes">
            {setup.backup_codes.map((code) => (
              <li key={code}>{code}</li>
            ))}
          </ul>

          <codeForm.AppField
            name="code"
            children={(field) => <field.OtpField label="6-digit code from the app" />}
          />

          <span className="set-actions">
            <button type="button" className="secondary" onClick={cancel}>
              Cancel
            </button>
            <codeForm.AppForm>
              <codeForm.SubmitButton label="Verify and turn on" busyLabel="Verifying…" />
            </codeForm.AppForm>
          </span>
        </form>
      )}
    </>
  )
}
