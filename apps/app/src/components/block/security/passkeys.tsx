import type { Models } from '@montara-pass/shared/api/models'

import { deviceName } from '@montara-pass/shared/activity'
import { SignInSchema } from '@montara-pass/shared/api/dtos/auth/schema'
import { UnlockFormSchema } from '@montara-pass/shared/api/dtos/vault/schema'
import { passkeyCancelled, passkeysSupported } from '@montara-pass/shared/auth/passkey'
import { formatDate } from '@montara-pass/shared/date'
import { IconFingerprint, IconKey } from '@tabler/icons-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import z from 'zod'

import SimpleAlertDialog from '@/components/block/common/simple-alert-dialog'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { checked, useAppForm } from '@/hooks/form'
import { toastApiError } from '@/lib/api/api-error'
import { queries } from '@/lib/api/queries'
import { PASSKEY_QUERY_KEY } from '@/lib/api/queries/passkey'
import { addPasskey } from '@/lib/auth/passkey-auth'
import { cn } from '@/lib/utils'

import { Chip, MethodCard, MONO_NOTE } from './section'

const AddPasskeySchema = SignInSchema.pick({ password: true })
  .extend(UnlockFormSchema.shape)
  .extend({ name: z.string().trim().min(1, 'name is required').max(100) })

/**
 * Passkeys on the account: signing in with a touch or a face instead of the
 * account password and the TOTP code. Where the authenticator has PRF, the
 * passkey unlocks the vault too, instead of the master password.
 */
export default function Passkeys() {
  const queryClient = useQueryClient()
  const { data: passkeys, isLoading } = useQuery(queries.passkeys.list())
  const { data: userKeys } = useQuery(queries.keys.get())
  const remove = useMutation(queries.passkeys.remove())
  const [adding, setAdding] = useState(false)
  const [removing, setRemoving] = useState<Models.AccountPasskey | null>(null)

  const form = useAppForm({
    defaultValues: {
      name: deviceName(navigator.userAgent) || 'Passkey',
      password: '',
      master_password: '',
    },
    validationLogic: checked,
    validators: { onDynamic: AddPasskeySchema },
    onSubmit: async ({ value }) => {
      if (!userKeys) return
      try {
        const passkey = await addPasskey(
          {
            name: value.name.trim(),
            password: value.password,
            masterPassword: value.master_password,
          },
          userKeys
        )
        toast.success(
          passkey.encrypted_vault_key
            ? 'Passkey added: it signs you in and unlocks your vault'
            : 'Passkey added. It signs you in; this authenticator cannot unlock the vault'
        )
        setAdding(false)
        form.reset()
        await queryClient.invalidateQueries({ queryKey: [PASSKEY_QUERY_KEY] })
      } catch (error) {
        if (!passkeyCancelled(error)) toastApiError(error)
      }
    },
  })

  const confirmRemove = async () => {
    const target = removing
    setRemoving(null)
    if (!target) return
    try {
      await remove.mutateAsync(target.id)
      toast.success(`Removed ${target.name}`)
    } catch (error) {
      toastApiError(error)
    }
  }

  const count = passkeys?.length ?? 0

  // The passkeys: loading, the list, or a line saying there are none.
  const renderList = () => {
    if (isLoading) {
      return (
        <div className="border-border/60 flex min-h-[52px] items-center border-b px-4 py-3">
          <Skeleton className="h-4 w-48" />
        </div>
      )
    }
    if (count > 0) {
      return (
        <ul className="divide-border/60 border-border/60 m-0 flex list-none flex-col divide-y border-b p-0">
          {passkeys!.map((passkey) => (
            <li key={passkey.id} className="flex items-center gap-3 px-4 py-2.5">
              <span className="bg-background inline-flex size-8 shrink-0 items-center justify-center rounded-md border">
                <IconKey className="size-4" aria-hidden />
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-[13px] font-medium">{passkey.name}</span>
                <span className={cn(MONO_NOTE, 'truncate tabular-nums')}>
                  {[
                    passkey.encrypted_vault_key ? 'Signs in and unlocks' : 'Signs in only',
                    `Added ${formatDate(passkey.created_at)}`,
                    passkey.last_used_at && `Last used ${formatDate(passkey.last_used_at)}`,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </div>
              <Button
                variant="outline"
                size="xs"
                className="bg-card h-7 px-2.5 text-xs"
                disabled={remove.isPending}
                onClick={() => setRemoving(passkey)}
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>
      )
    }
    // None yet: the chip in the head says so, unless this browser cannot add one.
    return (
      !passkeysSupported() && (
        <p className="border-border/60 text-muted-foreground border-b px-4 py-3 text-[13px]">
          This browser cannot use passkeys.
        </p>
      )
    )
  }

  return (
    <MethodCard
      id="passkeys"
      icon={IconFingerprint}
      on={count > 0}
      title="Passkeys"
      description="A fingerprint, face or security key signs you in without a password."
      className={cn(adding && 'md:col-span-2')}
      aside={
        <>
          <Chip on={count > 0}>{count ? `${count} ${count === 1 ? 'key' : 'keys'}` : 'None'}</Chip>
          {passkeysSupported() && !adding && (
            <Button
              size="sm"
              variant={count ? 'outline' : 'primary'}
              className={cn('h-[30px]', count > 0 && 'bg-card')}
              disabled={!userKeys}
              onClick={() => setAdding(true)}
            >
              Add a passkey
            </Button>
          )}
        </>
      }
      footnote={
        <>
          <IconKey className="size-3" aria-hidden />
          Unlocks the vault too where the authenticator allows it
        </>
      }
    >
      {renderList()}

      {adding && (
        <div className="border-border/60 border-b p-4">
          <form
            className="flex flex-col gap-4"
            noValidate
            onSubmit={(e) => {
              e.preventDefault()
              void form.handleSubmit()
            }}
          >
            <form.AppField
              name="name"
              children={(field) => <field.TextField label="Name" asterisk />}
            />
            <form.AppField
              name="password"
              children={(field) => (
                <field.PasswordField
                  label="Account password"
                  autoComplete="current-password"
                  asterisk
                />
              )}
            />
            <form.AppField
              name="master_password"
              children={(field) => (
                <field.PasswordField
                  label="Master password, so the passkey can unlock the vault"
                  autoComplete="off"
                  asterisk
                />
              )}
            />
            <div className="flex gap-2">
              <form.AppForm>
                <form.SubmitButton label="Add passkey" busyLabel="Waiting for your passkey…" />
              </form.AppForm>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setAdding(false)
                  form.reset()
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      <SimpleAlertDialog
        title={`Remove ${removing?.name ?? 'this passkey'}?`}
        description="It no longer signs you in or unlocks your vault. Delete it from the authenticator too."
        open={removing !== null}
        onOpenChange={(open) => !open && setRemoving(null)}
        onConfirm={() => void confirmRemove()}
        confirmText="Remove"
      />
    </MethodCard>
  )
}
