import { useMutation, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'

import SectionCard from '@/components/block/common/section-card'
import { Button } from '@/components/ui/button'
import { useAppForm } from '@/hooks/form'
import { toastAxiosError } from '@/lib/api/axios-error'
import { parseDto } from '@/lib/api/dtos/parse'
import {
  ChangeMasterPasswordFormSchema,
  type ChangeMasterPasswordFormDto,
} from '@/lib/api/dtos/vault/schema'
import { queries } from '@/lib/api/queries'
import { changeMasterPassword } from '@/lib/crypto/vault'

/**
 * Change the master password. Only the vault key is re-wrapped: every item,
 * folder and share keeps working, and the open vault stays unlocked.
 */
export default function ChangeMasterPasswordForm() {
  const { data: userKeys } = useQuery(queries.keys.get())
  const mutation = useMutation(queries.keys.updateKDF())
  const [isLoading, setIsLoading] = useState(false)

  const defaultValues: ChangeMasterPasswordFormDto = {
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
        await mutation.mutateAsync(
          await changeMasterPassword(dto.current_password, dto.master_password, userKeys)
        )
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
    <SectionCard
      title="Master password"
      description="Separate from your sign-in password, and never sent to the server. If you forget it, your vault cannot be recovered."
    >
      <form
        className="flex max-w-md flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          form.handleSubmit()
        }}
      >
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
            {isLoading ? 'Changing...' : 'Change master password'}
          </Button>
        </div>
      </form>
    </SectionCard>
  )
}
