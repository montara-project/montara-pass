import type { Models } from '@montara-pass/shared/api/models'

import {
  MIN_MASTER_PASSWORD_LENGTH,
  SetupVaultFormSchema,
  UnlockFormSchema,
} from '@montara-pass/shared/api/dtos/vault/schema'
import {
  createUserKeys,
  unlockVault,
  WrongMasterPasswordError,
} from '@montara-pass/shared/crypto/vault'
import { initials } from '@montara-pass/shared/string'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

import AuthShell, { authLink } from '@/components/block/auth/auth-shell'
import { Button } from '@/components/ui/button'
import { checked, useAppForm } from '@/hooks/form'
import { submitForm } from '@/hooks/submit-form'
import { useSignOut } from '@/hooks/use-sign-out'
import { axiosErrorMessage } from '@/lib/api/axios-error'
import { queries } from '@/lib/api/queries'
import { FOLDER_QUERY_KEY } from '@/lib/api/queries/folder'
import { ITEM_QUERY_KEY } from '@/lib/api/queries/item'
import { AUTO_LOCK_MINUTES, useVaultStore } from '@/lib/stores/vault'

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
    return (
      <AuthShell title="Opening your vault" foot={<Account />}>
        <p role="status" className="text-muted-foreground text-center text-[13px]">
          Loading…
        </p>
      </AuthShell>
    )
  }

  if (isError) {
    return (
      <AuthShell title="Couldn't load your vault" foot={<Account />}>
        <p role="alert" className="text-danger text-center text-[13px] whitespace-pre-line">
          {axiosErrorMessage(error)}
        </p>
        <Button size="lg" className="mt-1.5 w-full" onClick={() => void refetch()}>
          Try again
        </Button>
      </AuthShell>
    )
  }

  return userKeys ? <UnlockForm userKeys={userKeys} /> : <SetupForm />
}

/** Whose vault this is, and the way to someone else's. */
function Account() {
  const signOut = useSignOut()
  // Only says whose vault this is, so a failure here is not worth reporting.
  const { data: profile } = useQuery(queries.auth.profile())
  const email = profile?.user?.email

  return (
    <>
      {email && (
        <span className="bg-background flex max-w-full items-center gap-2 rounded-full border py-1 pr-3.5 pl-1">
          <span
            aria-hidden="true"
            className="bg-avatar text-avatar-foreground inline-flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold"
          >
            {initials(profile.user.name || email)}
          </span>
          <span className="min-w-0 truncate text-[13px] font-medium">{email}</span>
        </span>
      )}
      <button type="button" className={authLink} onClick={() => void signOut()}>
        Switch account
      </button>
    </>
  )
}

function UnlockForm({ userKeys }: { userKeys: Models.UserKeys }) {
  const unlock = useVaultStore((state) => state.unlock)
  // What unlocking said, as opposed to what the field says about itself.
  const [error, setError] = useState('')

  const form = useAppForm({
    defaultValues: { master_password: '' },
    validationLogic: checked,
    validators: { onDynamic: UnlockFormSchema },
    onSubmit: async ({ value }) => {
      setError('')

      try {
        // The master password is used here and nowhere else: it is not stored
        // and not sent anywhere. Taken as typed: a space is part of it.
        unlock(await unlockVault(value.master_password, userKeys))
      } catch (err) {
        setError(
          err instanceof WrongMasterPasswordError ? err.message : 'The vault could not be unlocked.'
        )
      }
    },
  })

  return (
    <AuthShell title="Unlock your vault" foot={<Account />}>
      <form
        className="flex flex-col gap-3.5"
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          void submitForm(e.currentTarget, form)
        }}
      >
        <form.AppField
          name="master_password"
          children={(field) => (
            <field.AuthField
              label="Master password"
              type="password"
              autoComplete="off"
              autoFocus
              invalid={!!error}
            />
          )}
        />

        {error && (
          <p role="alert" className="text-danger px-0.5 text-[13px]">
            {error}
          </p>
        )}

        <form.AppForm>
          <form.SubmitButton
            label="Unlock Montara Pass"
            busyLabel="Unlocking…"
            size="lg"
            className="mt-1.5 w-full"
          />
        </form.AppForm>
      </form>

      <p className="text-muted-foreground text-center text-[13px] text-balance">
        Locks again after {AUTO_LOCK_MINUTES} minutes without use, and when this page is reloaded.
      </p>
    </AuthShell>
  )
}

function SetupForm() {
  const unlock = useVaultStore((state) => state.unlock)
  const mutation = useMutation(queries.keys.create())
  const [error, setError] = useState('')

  const form = useAppForm({
    defaultValues: { master_password: '', confirm_password: '' },
    validationLogic: checked,
    validators: { onDynamic: SetupVaultFormSchema },
    onSubmit: async ({ value }) => {
      setError('')

      try {
        const { request, keys } = await createUserKeys(value.master_password)
        await mutation.mutateAsync(request)
        unlock(keys)
      } catch (err) {
        setError(axiosErrorMessage(err))
      }
    },
  })

  return (
    <AuthShell
      title="Create your vault"
      note={
        <>
          Choose a master password of at least {MIN_MASTER_PASSWORD_LENGTH} characters. It encrypts
          everything in your vault and is never sent to the server, so nobody can reset it: if you
          forget it, your vault cannot be recovered.
        </>
      }
      foot={<Account />}
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
          name="master_password"
          children={(field) => (
            <field.AuthField label="Master password" type="password" autoComplete="off" autoFocus />
          )}
        />
        <form.AppField
          name="confirm_password"
          children={(field) => (
            <field.AuthField label="Confirm master password" type="password" autoComplete="off" />
          )}
        />

        {error && (
          <p role="alert" className="text-danger px-0.5 text-[13px] whitespace-pre-line">
            {error}
          </p>
        )}

        <form.AppForm>
          <form.SubmitButton
            label="Create vault"
            busyLabel="Creating vault…"
            size="lg"
            className="mt-1.5 w-full"
          />
        </form.AppForm>
      </form>
    </AuthShell>
  )
}
