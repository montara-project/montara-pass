'use client'

import { IconLock, IconShieldLock } from '@tabler/icons-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import type { Models } from '@/lib/api/models'

import EmptyState from '@/components/block/common/empty-state'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldGroup } from '@/components/ui/field'
import { Skeleton } from '@/components/ui/skeleton'
import { useAppForm } from '@/hooks/form'
import { axiosErrorMessage, toastAxiosError } from '@/lib/api/axios-error'
import {
  MIN_MASTER_PASSWORD_LENGTH,
  SetupVaultFormSchema,
  UnlockFormSchema,
} from '@/lib/api/dtos/vault/schema'
import { queries } from '@/lib/api/queries'
import { FOLDER_QUERY_KEY } from '@/lib/api/queries/folder'
import { ITEM_QUERY_KEY } from '@/lib/api/queries/item'
import { createUserKeys, unlockVault, WrongMasterPasswordError } from '@/lib/crypto/vault'
import { useVaultStore } from '@/lib/stores/vault'

interface VaultGateProps {
  children: React.ReactNode
}

/**
 * Stands between a signed-in user and their vault: it renders its children
 * only while the vault is unlocked. Signing in proves who the user is; only
 * the master password, which never leaves this browser, can decrypt anything.
 */
export default function VaultGate({ children }: VaultGateProps) {
  const queryClient = useQueryClient()
  const unlocked = useVaultStore((state) => state.keys !== null)

  const { data: userKeys, isLoading, isError, error, refetch } = useQuery(queries.keys.get())

  // Locking drops the keys; drop what was decrypted with them as well.
  useEffect(() => {
    if (!unlocked) {
      queryClient.removeQueries({ queryKey: [ITEM_QUERY_KEY] })
      queryClient.removeQueries({ queryKey: [FOLDER_QUERY_KEY] })
    }
  }, [unlocked, queryClient])

  if (unlocked) {
    return children
  }

  if (isLoading) {
    return <Skeleton className="mx-auto mt-16 h-72 w-full max-w-sm" />
  }

  if (isError) {
    return (
      <EmptyState
        title="Couldn't load your vault"
        description={axiosErrorMessage(error)}
        action={<Button onClick={() => void refetch()}>Try again</Button>}
      />
    )
  }

  return (
    <div className="mx-auto mt-16 w-full max-w-sm">
      {userKeys ? <UnlockForm userKeys={userKeys} /> : <SetupForm />}
    </div>
  )
}

function UnlockForm({ userKeys }: { userKeys: Models.UserKeys }) {
  const unlock = useVaultStore((state) => state.unlock)
  const [isLoading, setIsLoading] = useState(false)

  const form = useAppForm({
    defaultValues: {
      master_password: '',
    },
    validators: {
      onSubmit: UnlockFormSchema,
    },
    onSubmit: async ({ value }) => {
      setIsLoading(true)

      try {
        unlock(await unlockVault(value.master_password, userKeys))
      } catch (error) {
        toast.error(
          error instanceof WrongMasterPasswordError
            ? error.message
            : 'The vault could not be unlocked.'
        )
      } finally {
        setIsLoading(false)
      }
    },
  })

  return (
    <FieldGroup>
      <div className="flex flex-col items-center gap-2 text-center">
        <IconLock className="size-6" />
        <h1 className="text-xl font-bold">Your vault is locked</h1>
        <FieldDescription>Enter your master password to decrypt it.</FieldDescription>
      </div>

      <form
        className="flex flex-col gap-6"
        onSubmit={(e) => {
          e.preventDefault()
          form.handleSubmit()
        }}
      >
        <form.AppField
          name="master_password"
          children={(field) => (
            <field.PasswordField
              label="Master password"
              placeholder="type your master password"
              autoComplete="off"
              asterisk
            />
          )}
        />

        <Field>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Unlocking...' : 'Unlock'}
          </Button>
        </Field>
      </form>
    </FieldGroup>
  )
}

function SetupForm() {
  const unlock = useVaultStore((state) => state.unlock)
  const mutation = useMutation(queries.keys.create())
  const [isLoading, setIsLoading] = useState(false)

  const form = useAppForm({
    defaultValues: {
      master_password: '',
      confirm_password: '',
    },
    validators: {
      onSubmit: SetupVaultFormSchema,
    },
    onSubmit: async ({ value }) => {
      setIsLoading(true)

      try {
        const { request, keys } = await createUserKeys(value.master_password)
        await mutation.mutateAsync(request)
        unlock(keys)
        toast.success('Vault created')
      } catch (error) {
        toastAxiosError(error)
      } finally {
        setIsLoading(false)
      }
    },
  })

  return (
    <FieldGroup>
      <div className="flex flex-col items-center gap-2 text-center">
        <IconShieldLock className="size-6" />
        <h1 className="text-xl font-bold">Create your vault</h1>
        <FieldDescription>
          Choose a master password of at least {MIN_MASTER_PASSWORD_LENGTH} characters. It
          encrypts everything in your vault and is never sent to the server, so nobody can reset
          it: if you forget it, your vault cannot be recovered.
        </FieldDescription>
      </div>

      <form
        className="flex flex-col gap-6"
        onSubmit={(e) => {
          e.preventDefault()
          form.handleSubmit()
        }}
      >
        <form.AppField
          name="master_password"
          children={(field) => (
            <field.PasswordField
              label="Master password"
              placeholder="type a master password"
              autoComplete="off"
              asterisk
            />
          )}
        />

        <form.AppField
          name="confirm_password"
          children={(field) => (
            <field.PasswordField
              label="Confirm master password"
              placeholder="type it again"
              autoComplete="off"
              asterisk
            />
          )}
        />

        <Field>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Creating vault...' : 'Create vault'}
          </Button>
        </Field>
      </form>
    </FieldGroup>
  )
}
