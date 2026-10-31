import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { z } from 'zod'

import SimpleAlertScrollableDialogForm from '@/components/block/common/simple-alert-scrollable-dialog-form'
import { useAppForm } from '@/hooks/form'
import { toastApiError } from '@/lib/api/api-error'
import { queries } from '@/lib/api/queries'

/** What the server accepts: an address, a why, and until when. The address's
 * shape is only a courtesy here; the server reads it with net.ParseIP. */
const IP_PATTERN = /^(?:\d{1,3}(?:\.\d{1,3}){3}|[0-9A-Fa-f:]{2,45})$/

const BlockIPSchema = z.object({
  ip: z.string().min(1, 'Required').regex(IP_PATTERN, 'Must be a valid IP address'),
  reason: z.string().max(500, 'At most 500 characters'),
  duration: z.enum(['1h', '24h', '7d', 'never']),
})

type BlockIPForm = z.infer<typeof BlockIPSchema>

const DURATIONS = [
  { value: '1h', label: 'One hour' },
  { value: '24h', label: 'One day' },
  { value: '7d', label: 'One week' },
  { value: 'never', label: 'Forever' },
] as const

/**
 * The dialog that blocks an IP by hand. The block takes hold at once — the
 * server writes the key the API answers 429 on — and stays in the list.
 */
export default function BlockIPForm({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const block = useMutation(queries.security.block())

  const form = useAppForm({
    defaultValues: { ip: '', reason: '', duration: '24h' } as BlockIPForm,
    validators: {
      onSubmit: BlockIPSchema,
      onChange: BlockIPSchema,
    },
    onSubmit: async ({ value }) => {
      try {
        await block.mutateAsync(value)
        toast.success('IP blocked')
        onOpenChange(false)
        form.reset()
      } catch (error) {
        toastApiError(error)
      }
    },
  })

  return (
    <SimpleAlertScrollableDialogForm
      onSubmit={(e) => {
        e.preventDefault()
        form.handleSubmit()
      }}
      open={open}
      onOpenChange={onOpenChange}
      title="Block an IP"
      description="Every request from it is answered 429 until the block runs out — or until you unblock it."
      confirmText="Block IP"
      loading={block.isPending}
      size="md"
    >
      <form.AppField
        name="ip"
        children={(field) => (
          <field.TextField
            asterisk
            label="IP address"
            placeholder="e.g. 203.0.113.7"
            className="font-mono"
          />
        )}
      />
      <form.AppField
        name="reason"
        children={(field) => (
          <field.TextareaField label="Reason" placeholder="Why it is blocked (optional)" />
        )}
      />
      <form.AppField
        name="duration"
        children={(field) => (
          <field.SelectField label="Duration" options={[...DURATIONS]} asterisk />
        )}
      />
    </SimpleAlertScrollableDialogForm>
  )
}
