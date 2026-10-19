import {
  ChangeMasterPasswordFormSchema,
  type ChangeMasterPasswordFormDto,
} from '@montara-pass/shared/api/dtos/vault/schema'
import { changeMasterPassword } from '@montara-pass/shared/crypto/vault'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { useAppForm } from '@/hooks/form'
import { toastAxiosError } from '@/lib/api/axios-error'
import { parseDto } from '@/lib/api/dtos/parse'
import { queries } from '@/lib/api/queries'

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
        toastAxiosError(error)
      } finally {
        setIsLoading(false)
      }
    },
  })

  return (
    <section aria-labelledby="master-password" className="flex flex-col gap-2">
      {/* A section's name is a label for its card, quieter than what is in it. */}
      <h2 id="master-password" className="text-muted-foreground pl-1 text-[13px] font-semibold">
        Master password
      </h2>
      <form
        className="rounded-card flex flex-col gap-4 border p-5"
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          form.handleSubmit()
        }}
      >
        <p className="text-muted-foreground text-[13px]">
          Separate from your account password, and never sent to the server. If you forget it, your
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

        <div>
          <Button type="submit" disabled={isLoading || !userKeys}>
            {isLoading ? 'Changing…' : 'Change master password'}
          </Button>
        </div>
      </form>
    </section>
  )
}
