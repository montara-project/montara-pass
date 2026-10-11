import { useSelector } from '@tanstack/react-form'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'

import type { ItemSecret } from '@/lib/crypto/vault'
import type { VaultItem } from '@/types/vault'

import SimpleAlertScrollableDialogForm from '@/components/block/common/simple-alert-scrollable-dialog-form'
import { useAppForm } from '@/hooks/form'
import { useFolders, useVaultKeys } from '@/hooks/use-vault'
import { toastAxiosError } from '@/lib/api/axios-error'
import { parseDto } from '@/lib/api/dtos/parse'
import { ItemFormSchema, type ItemFormDto } from '@/lib/api/dtos/vault/schema'
import { queries } from '@/lib/api/queries'
import { ItemTypeOptions, type ItemType } from '@/lib/constants/vault'
import { encryptItemUpdate, encryptNewItem, keepIcon } from '@/lib/crypto/vault'

/** Select value standing for "no folder": a select item cannot be empty. */
const NO_FOLDER = 'none'

function toSecret(value: ItemFormDto): ItemSecret {
  if (value.type === 'secure_note') {
    return { name: value.name, notes: value.notes }
  }
  return {
    name: value.name,
    username: value.username,
    password: value.password,
    url: value.url,
    notes: value.notes,
  }
}

function toFolderId(value: ItemFormDto): string | null {
  return value.folder_id && value.folder_id !== NO_FOLDER ? value.folder_id : null
}

interface ItemFieldsFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  confirmText: string
  defaultValues: ItemFormDto
  /** Encrypts and sends the validated form. */
  onSave: (value: ItemFormDto) => Promise<void>
  loading: boolean
  /** A viewer may read the item but not change its content. */
  readOnly?: boolean
  /** The type of an existing item is fixed. */
  lockType?: boolean
}

function ItemFieldsForm({
  open,
  onOpenChange,
  title,
  confirmText,
  defaultValues,
  onSave,
  loading,
  readOnly = false,
  lockType = false,
}: ItemFieldsFormProps) {
  const { data: folders, isLoading: foldersLoading } = useFolders()

  const folderOptions = [
    { label: 'No folder', value: NO_FOLDER },
    ...(folders ?? []).map((folder) => ({ label: folder.name, value: folder.id })),
  ]

  const form = useAppForm({
    defaultValues,
    validators: {
      onSubmit: ItemFormSchema,
      onChange: ItemFormSchema,
    },
    onSubmit: async ({ value }) => {
      try {
        await onSave(parseDto(ItemFormSchema, value))
        onOpenChange(false)
        form.reset()
      } catch (error) {
        toastAxiosError(error)
      }
    },
  })

  const type = useSelector(form.store, (state) => state.values.type)

  return (
    <SimpleAlertScrollableDialogForm
      onSubmit={(e) => {
        e.preventDefault()
        form.handleSubmit()
      }}
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description="Encrypted in your browser before it is saved."
      confirmText={confirmText}
      loading={loading}
      size="lg"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <form.AppField
          name="type"
          children={(field) => (
            <field.SelectField
              asterisk
              label="Type"
              placeholder="Select type"
              options={ItemTypeOptions}
              disabled={readOnly || lockType}
            />
          )}
        />

        <form.AppField
          name="folder_id"
          children={(field) => (
            <field.SelectField
              label="Folder"
              placeholder="No folder"
              options={folderOptions}
              loading={foldersLoading}
            />
          )}
        />
      </div>

      <form.AppField
        name="name"
        children={(field) => (
          <field.TextField asterisk label="Name" placeholder="e.g. GitHub" disabled={readOnly} />
        )}
      />

      {type === 'login' && (
        <>
          <form.AppField
            name="username"
            children={(field) => (
              <field.TextField
                label="Username"
                placeholder="username or email"
                autoComplete="off"
                disabled={readOnly}
              />
            )}
          />

          <form.AppField
            name="password"
            children={(field) => (
              <field.PasswordField
                label="Password"
                placeholder="password"
                autoComplete="off"
                disabled={readOnly}
              />
            )}
          />

          <form.AppField
            name="url"
            children={(field) => (
              <field.TextField label="URL" placeholder="https://example.com" disabled={readOnly} />
            )}
          />
        </>
      )}

      <form.AppField
        name="notes"
        children={(field) => (
          // Notes are Markdown for every type, edited as rich text.
          <field.RichTextField
            label="Notes"
            placeholder={type === 'secure_note' ? 'Write your note' : 'anything else'}
            disabled={readOnly}
          />
        )}
      />
    </SimpleAlertScrollableDialogForm>
  )
}

type AddItemFormProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Folder the list is filtered by, preselected for the new item. */
  folderId?: string | null
}

export function AddItemForm({ open, onOpenChange, folderId }: AddItemFormProps) {
  const keys = useVaultKeys()
  const mutation = useMutation(queries.items.create())

  return (
    <ItemFieldsForm
      open={open}
      onOpenChange={onOpenChange}
      title="Create Item"
      confirmText="Save"
      defaultValues={{
        type: 'login',
        name: '',
        username: '',
        password: '',
        url: '',
        notes: '',
        folder_id: folderId ?? NO_FOLDER,
      }}
      loading={mutation.isPending}
      onSave={async (value) => {
        await mutation.mutateAsync({
          type: value.type,
          folder_id: toFolderId(value),
          ...(await encryptNewItem(keys, toSecret(value))),
        })
        toast.success('Item created successfully')
      }}
    />
  )
}

type EditItemFormProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  record: VaultItem
}

export function EditItemForm({ open, onOpenChange, record }: EditItemFormProps) {
  const keys = useVaultKeys()
  const updateMutation = useMutation(queries.items.update(record.id))
  const placementMutation = useMutation(queries.items.setPlacement(record.id))

  const readOnly = record.role === 'viewer'
  const secret = record.secret

  return (
    <ItemFieldsForm
      open={open}
      onOpenChange={onOpenChange}
      title={readOnly ? 'View Item' : 'Edit Item'}
      // A viewer can still choose their own folder for the item.
      confirmText={readOnly ? 'Save folder' : 'Update'}
      defaultValues={{
        type: record.type as ItemType,
        name: secret?.name ?? '',
        username: secret?.username ?? '',
        password: secret?.password ?? '',
        url: secret?.url ?? '',
        notes: secret?.notes ?? '',
        folder_id: record.folder_id ?? NO_FOLDER,
      }}
      loading={updateMutation.isPending || placementMutation.isPending}
      readOnly={readOnly}
      lockType
      onSave={async (value) => {
        if (!readOnly) {
          await updateMutation.mutateAsync({
            encrypted_data: await encryptItemUpdate(
              keys,
              record,
              keepIcon(toSecret(value), secret)
            ),
            // The API refuses the write if someone else changed the item since.
            revision: record.revision,
          })
        }

        const folderId = toFolderId(value)
        if (folderId !== record.folder_id) {
          await placementMutation.mutateAsync({ folder_id: folderId, favorite: record.favorite })
        }
        toast.success(readOnly ? 'Folder updated successfully' : 'Item updated successfully')
      }}
    />
  )
}
