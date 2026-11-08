import {
  ChangeMasterPasswordFormSchema,
  type ChangeMasterPasswordFormDto,
} from '@montara-pass/shared/api/dtos/vault/schema'
import { changeMasterPassword } from '@montara-pass/shared/crypto/vault'
import { IconAlertTriangle } from '@tabler/icons-react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { useAppForm } from '@/hooks/form'
import { toastApiError } from '@/lib/api/api-error'
import { parseDto } from '@/lib/api/dtos/parse'
import { queries } from '@/lib/api/queries'

import { MONO_NOTE } from '../security/section'

/**
 * Change the master password. Only the vault key is re-wrapped: every item,
 * folder and share keeps working, and the open vault stays unlocked.
 */
export default function ChangeMasterPasswordForm() {
  const { data: userKeys } = useQuery(queries.keys.get())
  const mutation = useMutation(queries.keys.updateKDF())
  const [isLoading, setIsLoading] = useState(false)

  const defaultValues: ChangeMasterPasswordFormDto = {
    account_password: '',
    current_password: '',
    master_password: '',
    confirm_password: '',
  }

  const form = useAppForm({
    defaultValues,
    validators: {
      onSubmit: ChangeMasterPasswordFormSchema,
    },
    onSubmit: async ({ value }) => {
      if (!userKeys) return
      setIsLoading(true)

      try {
        const dto = parseDto(ChangeMasterPasswordFormSchema, value)
        await mutation.mutateAsync({
          ...(await changeMasterPassword(dto.current_password, dto.master_password, userKeys)),
          password: dto.account_password,
        })
        toast.success('Master password changed')
        form.reset()
      } catch (error) {
        toastApiError(error)
      } finally {
        setIsLoading(false)
      }
    },
  })

  return (
    <section aria-labelledby="master-password" className="flex flex-col gap-2.5">
      <h2 id="master-password" className={MONO_NOTE}>
        Master password
      </h2>
      <form
        className="rounded-card bg-panel flex flex-col gap-4 border p-4"
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          form.handleSubmit()
        }}
      >
        <p className="text-muted-foreground text-[13px]">
          Separate from your account password, never sent to the server. If you forget it, your
          vault cannot be recovered.
        </p>

        <form.AppField
          name="account_password"
          children={(field) => (
            <field.PasswordField
              label="Account password"
              autoComplete="current-password"
              asterisk
            />
          )}
        />

        <form.AppField
          name="current_password"
          children={(field) => (
            <field.PasswordField label="Current master password" autoComplete="off" asterisk />
          )}
        />

        <form.AppField
          name="master_password"
          children={(field) => (
            <field.PasswordField label="New master password" autoComplete="off" asterisk />
          )}
        />

        <form.AppField
          name="confirm_password"
          children={(field) => (
            <field.PasswordField label="Confirm new master password" autoComplete="off" asterisk />
          )}
        />

        {/* Only the vault key is wrapped again, so the items stay as they are. */}
        <p className="bg-warn/10 text-warn flex items-start gap-2 rounded-md px-3 py-2.5 text-xs">
          <IconAlertTriangle className="mt-px size-3.5 shrink-0" aria-hidden />
          Other devices ask for the new master password the next time they unlock.
        </p>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="border"
            disabled={isLoading}
            onClick={() => form.reset()}
          >
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={isLoading || !userKeys}>
            {isLoading ? 'Changing…' : 'Change master password'}
          </Button>
        </div>
      </form>
    </section>
  )
}
