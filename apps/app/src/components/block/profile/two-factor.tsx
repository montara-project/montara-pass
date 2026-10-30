import type { TotpSetup } from '@montara-pass/shared/api/models/user'

import {
  SignInSchema,
  TotpCodeSchema,
  TotpDisableSchema,
} from '@montara-pass/shared/api/dtos/auth/schema'
import { totpSecret } from '@montara-pass/shared/auth/totp'
import { totpQrCode } from '@montara-pass/shared/auth/totp-qr'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import z from 'zod'

import { Button } from '@/components/ui/button'
import { checked, useAppForm } from '@/hooks/form'
import { toastApiError } from '@/lib/api/api-error'
import { queries } from '@/lib/api/queries'
import { PROFILE_QUERY_KEY } from '@/lib/api/queries/auth'
import { services } from '@/lib/api/services'
import { confirmTotp } from '@/lib/auth/email-auth'

// Turning it on takes the password alone; the code field is not shown.
const PasswordSchema = SignInSchema.pick({ password: true }).extend({ code: z.string() })

/**
 * Optional TOTP: signing in also asks for a code from an authenticator app
 * such as Google Authenticator. Turning it on takes the account password,
 * turning it off a code from the app or a backup code too. Turning it on shows the secret and the backup codes once, and
 * takes effect when a code from the app has been verified.
 */
export default function TwoFactor() {
  const queryClient = useQueryClient()
  const { data } = useQuery(queries.auth.profile())
  const enabled = data?.totp_enabled
  // Asking for the password (and to turn it off, a code), before turning it on or off.
  const [asking, setAsking] = useState(false)
  // The secret being set up, until a code from it is verified.
  const [setup, setSetup] = useState<TotpSetup | null>(null)

  const refresh = () => queryClient.invalidateQueries({ queryKey: [PROFILE_QUERY_KEY] })

  const passwordForm = useAppForm({
    defaultValues: { password: '', code: '' },
    validationLogic: checked,
    validators: { onDynamic: enabled ? TotpDisableSchema : PasswordSchema },
    onSubmit: async ({ value }) => {
      try {
        if (enabled) {
          await services.auth.totpDisable(value.password, value.code.replace(/\s/g, ''))
          toast.success('Two-step verification is off')
          await refresh()
        } else {
          setSetup(await services.auth.totpEnable(value.password))
        }
        setAsking(false)
        passwordForm.reset()
      } catch (error) {
        toastApiError(error)
      }
    },
  })

  const codeForm = useAppForm({
    defaultValues: { code: '' },
    validationLogic: checked,
    validators: { onDynamic: TotpCodeSchema },
    onSubmit: async ({ value }) => {
      if (!setup) return
      try {
        await confirmTotp(setup.totp_token, value.code.replace(/\s/g, ''))
        toast.success('Two-step verification is on')
        setSetup(null)
        codeForm.reset()
        await refresh()
      } catch (error) {
        toastApiError(error)
      }
    },
  })

  return (
    <section aria-labelledby="two-factor" className="flex flex-col gap-2">
      <h2 id="two-factor" className="text-muted-foreground pl-1 text-[13px] font-semibold">
        Two-step verification
      </h2>
      <div className="rounded-card flex flex-col gap-4 border p-5">
        <p className="text-muted-foreground text-[13px]">
          {enabled
            ? 'On. Signing in asks for a code from your authenticator app.'
            : 'Optional. Signing in also asks for a code from an authenticator app, such as Google Authenticator.'}
        </p>

        {setup ? (
          <form
            className="flex flex-col gap-4"
            noValidate
            onSubmit={(e) => {
              e.preventDefault()
              void codeForm.handleSubmit()
            }}
          >
            <div className="flex flex-col items-start gap-3 sm:flex-row">
              {/* Dark on white whatever the theme: what scanners read best. */}
              <img
                src={totpQrCode(setup.totp_uri)}
                alt="QR code for your authenticator app"
                width={160}
                height={160}
                className="rounded-control size-40 shrink-0 bg-white p-2"
              />
              <div className="flex min-w-0 flex-col gap-1.5 text-[13px]">
                <p>Scan the code with your authenticator app, or enter this key:</p>
                <code className="bg-field rounded-control px-2 py-1 font-mono break-all select-all">
                  {totpSecret(setup.totp_uri)}
                </code>
              </div>
            </div>

            <div className="flex flex-col gap-1.5 text-[13px]">
              <p>
                Backup codes: each signs you in once if you lose your device. Keep them somewhere
                safe; they are not shown again.
              </p>
              <ul className="bg-field rounded-control grid grid-cols-2 gap-x-4 gap-y-1 px-3 py-2 font-mono select-all">
                {setup.backup_codes.map((code) => (
                  <li key={code}>{code}</li>
                ))}
              </ul>
            </div>

            <codeForm.AppField
              name="code"
              children={(field) => <field.OtpField label="6-digit code from the app" />}
            />

            <div className="flex gap-2">
              <codeForm.AppForm>
                <codeForm.SubmitButton label="Verify and turn on" busyLabel="Verifying…" />
              </codeForm.AppForm>
              <Button type="button" variant="outline" onClick={() => setSetup(null)}>
                Cancel
              </Button>
            </div>
          </form>
        ) : asking ? (
          <form
            className="flex flex-col gap-4"
            noValidate
            onSubmit={(e) => {
              e.preventDefault()
              void passwordForm.handleSubmit()
            }}
          >
            <passwordForm.AppField
              name="password"
              children={(field) => (
                <field.PasswordField
                  label="Account password"
                  autoComplete="current-password"
                  asterisk
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
                    asterisk
                  />
                )}
              />
            )}
            <div className="flex gap-2">
              <passwordForm.AppForm>
                <passwordForm.SubmitButton
                  label={enabled ? 'Turn off' : 'Continue'}
                  busyLabel={enabled ? 'Turning off…' : 'Checking…'}
                />
              </passwordForm.AppForm>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setAsking(false)
                  passwordForm.reset()
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <div>
            <Button
              variant={enabled ? 'outline' : 'primary'}
              disabled={enabled === undefined}
              onClick={() => setAsking(true)}
            >
              {enabled ? 'Turn off' : 'Turn on'}
            </Button>
          </div>
        )}
      </div>
    </section>
  )
}
