import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'

import type { Models } from '@/lib/api/models'
import type { BaseAbstractForm } from '@/types/form'
import type { VaultFolder } from '@/types/vault'

import SimpleAlertScrollableDialogForm from '@/components/block/common/simple-alert-scrollable-dialog-form'
import { useAppForm } from '@/hooks/form'
import { useVaultKeys } from '@/hooks/use-vault'
import { toastAxiosError } from '@/lib/api/axios-error'
import { parseDto } from '@/lib/api/dtos/parse'
import {
  FolderFormSchema,
  type FolderFormDto,
  type FolderRequest,
} from '@/lib/api/dtos/vault/schema'
import { queries } from '@/lib/api/queries'
import { encryptFolderName } from '@/lib/crypto/vault'

type TModel = FolderFormDto
type TMutation = FolderRequest
type TDto = FolderFormDto
type TResponse = Models.Folder

type AbstractFormProps = BaseAbstractForm<TModel, TMutation, TDto, TResponse> & {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function AbstractForm({
  open,
  onOpenChange,
  defaultValues,
  schema,
  mutation,
  isEdit,
}: AbstractFormProps) {
  const keys = useVaultKeys()

  const form = useAppForm({
    defaultValues,
    validators: {
      onSubmit: schema,
      onChange: schema,
    },
    onSubmit: async ({ value }) => {
      try {
        // The name is encrypted here; the API only ever sees the ciphertext.
        const { name } = parseDto(schema, value)
        await mutation.mutateAsync({ encrypted_name: await encryptFolderName(keys, name) })
        toast.success(`Folder ${isEdit ? 'updated' : 'created'} successfully`)
        onOpenChange(false)
        form.reset()
      } catch (error) {
        toastAxiosError(error)
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
      title={`${isEdit ? 'Edit' : 'Create'} Folder`}
      confirmText={isEdit ? 'Update' : 'Save'}
      loading={mutation.isPending}
      size="md"
    >
      <form.AppField
        name="name"
        children={(field) => <field.TextField asterisk label="Name" placeholder="e.g. Work" />}
      />
    </SimpleAlertScrollableDialogForm>
  )
}

type AddFolderFormProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddFolderForm({ open, onOpenChange }: AddFolderFormProps) {
  const mutation = useMutation(queries.folders.create())

  return (
    <AbstractForm
      open={open}
      onOpenChange={onOpenChange}
      defaultValues={{
        name: '',
      }}
      schema={FolderFormSchema}
      mutation={mutation}
    />
  )
}

type EditFolderFormProps = AddFolderFormProps & {
  record: VaultFolder
}

export function EditFolderForm({ open, onOpenChange, record }: EditFolderFormProps) {
  const mutation = useMutation(queries.folders.update(record.id))

  return (
    <AbstractForm
      open={open}
      onOpenChange={onOpenChange}
      defaultValues={{ name: record.name }}
      schema={FolderFormSchema}
      mutation={mutation}
      isEdit
    />
  )
}
