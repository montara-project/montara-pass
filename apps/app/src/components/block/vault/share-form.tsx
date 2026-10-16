import { IconTrash } from '@tabler/icons-react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'

import type { Models } from '@/lib/api/models'
import type { VaultItem } from '@/types/vault'

import SelectInput from '@/components/block/common/select-input'
import SimpleAlertScrollableDialogForm from '@/components/block/common/simple-alert-scrollable-dialog-form'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useAppForm } from '@/hooks/form'
import { useVaultKeys } from '@/hooks/use-vault'
import { axiosErrorMessage, isForbidden, isNotFound, toastAxiosError } from '@/lib/api/axios-error'
import { parseDto } from '@/lib/api/dtos/parse'
import { ShareFormSchema, type ShareFormDto } from '@/lib/api/dtos/vault/schema'
import { queries } from '@/lib/api/queries'
import { services } from '@/lib/api/services'
import { ITEM_ROLE_OWNER, ShareRoleOptions } from '@/lib/constants/vault'
import { rotateItemKey, wrapItemKeyFor } from '@/lib/crypto/vault'

/** The public key of a user with a vault, or a readable error when there is none. */
async function lookupPublicKey(email: string): Promise<Models.PublicKey> {
  try {
    const res = await services.keys.publicKey(email)
    return res.data.data
  } catch (error) {
    if (isNotFound(error)) {
      throw new Error(`${email} has no vault yet. They need to sign up and create one first.`)
    }
    throw error
  }
}

type ShareItemFormProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** An item the signed-in user owns. */
  record: VaultItem
}

/**
 * Share an item with another user, and manage who already has it. Sharing
 * wraps the item's key with the recipient's public key in this browser; the
 * server passes the wrapped key along and cannot open it.
 */
export function ShareItemForm({ open, onOpenChange, record }: ShareItemFormProps) {
  const keys = useVaultKeys()

  // A refusal the user can act on, such as the plan gate on sharing, in the
  // server's own words and kept where the action was taken.
  const [refusal, setRefusal] = useState('')

  const { data, isLoading } = useQuery({ ...queries.items.members(record.id), enabled: open })
  const members = data?.data ?? []

  const shareMutation = useMutation(queries.items.share(record.id))
  const roleMutation = useMutation(queries.items.setMemberRole(record.id))
  const removeMutation = useMutation(queries.items.removeMember(record.id))
  const rotateMutation = useMutation(queries.items.rotateKey(record.id))

  const defaultValues: ShareFormDto = { email: '', role: 'viewer' }

  const form = useAppForm({
    defaultValues,
    validators: {
      onSubmit: ShareFormSchema,
    },
    onSubmit: async ({ value }) => {
      setRefusal('')
      try {
        const { email, role } = parseDto(ShareFormSchema, value)
        const recipient = await lookupPublicKey(email)

        await shareMutation.mutateAsync({
          user_id: recipient.user_id,
          role,
          encrypted_item_key: await wrapItemKeyFor(keys, record, recipient),
        })
        toast.success(`Shared with ${recipient.name || recipient.email}`)
        form.reset()
      } catch (error) {
        if (isForbidden(error)) {
          setRefusal(axiosErrorMessage(error))
          return
        }
        toastAxiosError(error)
      }
    },
  })

  const handleRoleChange = async (member: Models.ItemMember, role: string) => {
    try {
      await roleMutation.mutateAsync({ userId: member.user_id, role })
      toast.success(`${member.name || member.email} is now ${role}`)
    } catch (error) {
      toastAxiosError(error)
    }
  }

  // Removing a member only stops the server from serving them the item; they
  // may have kept the item key. So the item is re-encrypted under a new key
  // for everyone who is left.
  const handleRemove = async (member: Models.ItemMember) => {
    try {
      await removeMutation.mutateAsync(member.user_id)
    } catch (error) {
      toastAxiosError(error)
      return
    }

    try {
      if (!record.secret) {
        throw new Error('The item could not be decrypted')
      }

      const remaining = members.filter((m) => m.user_id !== member.user_id)
      const publicKeys = await Promise.all(
        remaining.map(async (m) => {
          const key = await lookupPublicKey(m.email)
          if (key.user_id !== m.user_id) {
            throw new Error(`The key found for ${m.email} belongs to another user`)
          }
          return key
        })
      )

      await rotateMutation.mutateAsync(await rotateItemKey(record, record.secret, publicKeys))
      toast.success(`${member.name || member.email} no longer has access`)
    } catch {
      toast.warning(
        `${member.name || member.email} was removed, but the item could not be re-encrypted. Change the secret it holds if they should not know it.`
      )
    }
  }

  const busy = removeMutation.isPending || rotateMutation.isPending || roleMutation.isPending

  return (
    <SimpleAlertScrollableDialogForm
      onSubmit={(e) => {
        e.preventDefault()
        form.handleSubmit()
      }}
      open={open}
      onOpenChange={onOpenChange}
      title={`Share "${record.secret?.name ?? 'item'}"`}
      description="The other person needs an account with a vault. The item is encrypted for them in your browser."
      cancelText="Close"
      confirmText="Share"
      loading={shareMutation.isPending}
      size="lg"
    >
      <div className="grid gap-4 sm:grid-cols-[1fr_10rem]">
        <form.AppField
          name="email"
          children={(field) => (
            <field.TextField asterisk label="Email" placeholder="their account email" />
          )}
        />

        <form.AppField
          name="role"
          children={(field) => (
            <field.SelectField asterisk label="Access" options={ShareRoleOptions} />
          )}
        />
      </div>

      {/* What the server refused, in its own words: the plan gate on sharing
          says what to do about it, and the sidebar's Billing page is where. */}
      {refusal && (
        <p role="alert" className="text-danger text-[13px] whitespace-pre-line">
          {refusal}
        </p>
      )}

      <div className="flex flex-col gap-2 border-t pt-4">
        <h3 className="text-[15px] font-semibold">People with access</h3>

        {isLoading && <Skeleton className="h-10 w-full" />}

        {members.map((member) => (
          <div key={member.user_id} className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-medium">{member.name || member.email}</p>
              <p className="text-muted-foreground truncate text-[13px]">{member.email}</p>
            </div>

            {member.role === ITEM_ROLE_OWNER ? (
              <span className="text-muted-foreground pr-2 text-[13px]">Owner</span>
            ) : (
              <div className="flex shrink-0 items-center gap-2">
                <SelectInput
                  // Remount when the role changes elsewhere: the select is uncontrolled.
                  key={member.role}
                  className="h-9 w-28"
                  placeholder="Access"
                  options={ShareRoleOptions}
                  defaultValue={member.role}
                  onSelect={(role) => void handleRoleChange(member, role)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  mode="icon"
                  size="icon"
                  aria-label={`Remove ${member.email}`}
                  disabled={busy}
                  onClick={() => void handleRemove(member)}
                >
                  <IconTrash />
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </SimpleAlertScrollableDialogForm>
  )
}
