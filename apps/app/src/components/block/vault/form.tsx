import type { ItemSecret } from '@montara-pass/shared/crypto/vault'
import type { VaultItem } from '@montara-pass/shared/types/vault'

import {
  ItemEditFormSchema,
  type ItemEditFormDto,
} from '@montara-pass/shared/api/dtos/vault/schema'
import {
  CARD_FIELDS,
  CONTACT_FIELDS,
  ItemTypeOptions,
  type ItemType,
} from '@montara-pass/shared/constants/vault'
import {
  cardFields,
  contactFields,
  encryptItemUpdate,
  encryptNewItem,
  keepUnedited,
  toCard,
  toContact,
} from '@montara-pass/shared/crypto/vault'
import { useSelector } from '@tanstack/react-form'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'

import SimpleAlertScrollableDialogForm from '@/components/block/common/simple-alert-scrollable-dialog-form'
import { checked, useAppForm } from '@/hooks/form'
import { useFolders, useVaultKeys } from '@/hooks/use-vault'
import { toastAxiosError } from '@/lib/api/axios-error'
import { parseDto } from '@/lib/api/dtos/parse'
import { queries } from '@/lib/api/queries'

/** Select value standing for "no folder": a select item cannot be empty. */
const NO_FOLDER = 'none'

function toSecret(value: ItemEditFormDto): ItemSecret {
  if (value.type === 'secure_note') {
    return {
      name: value.name,
      notes: value.notes,
      // Only "hidden" is written down; a note is visible without it.
      ...(value.visible ? {} : { visible: false }),
    }
  }
  if (value.type === 'contact') {
    return { name: value.name, contact: toContact(value.contact), notes: value.notes }
  }
  if (value.type === 'card') {
    return { name: value.name, card: toCard(value.card), notes: value.notes }
  }
  return {
    name: value.name,
    username: value.username,
    password: value.password,
    url: value.url,
    notes: value.notes,
  }
}

function toFolderId(value: ItemEditFormDto): string | null {
  return value.folder_id && value.folder_id !== NO_FOLDER ? value.folder_id : null
}

interface ItemFieldsFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  confirmText: string
  defaultValues: ItemEditFormDto
  /** Encrypts and sends the validated form. */
  onSave: (value: ItemEditFormDto) => Promise<void>
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
    ...(folders ?? []).map((folder) => ({
      label: folder.name,
      value: folder.id,
    })),
  ]

  const form = useAppForm({
    defaultValues,
    // Checked on saving, and from then on as the fields change: making a
    // password in an empty form is not the moment to ask for a name.
    validationLogic: checked,
    validators: { onDynamic: ItemEditFormSchema },
    onSubmit: async ({ value }) => {
      try {
        await onSave(parseDto(ItemEditFormSchema, value))
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
                generate
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

      {type === 'contact' && (
        <div className="grid gap-4 sm:grid-cols-2">
          {CONTACT_FIELDS.map((contactField) => (
            <div
              key={contactField.key}
              className={'wide' in contactField ? 'sm:col-span-2' : undefined}
            >
              <form.AppField
                name={`contact.${contactField.key}`}
                children={(field) => (
                  <field.TextField
                    label={contactField.label}
                    autoComplete="off"
                    disabled={readOnly}
                  />
                )}
              />
            </div>
          ))}
        </div>
      )}

      {type === 'card' && (
        <div className="grid gap-4 sm:grid-cols-2">
          {CARD_FIELDS.map((cardField) => (
            <div key={cardField.key} className={'wide' in cardField ? 'sm:col-span-2' : undefined}>
              <form.AppField
                name={`card.${cardField.key}`}
                children={(field) =>
                  'secret' in cardField ? (
                    <field.PasswordField
                      label={cardField.label}
                      autoComplete="off"
                      disabled={readOnly}
                    />
                  ) : (
                    <field.TextField
                      label={cardField.label}
                      autoComplete="off"
                      disabled={readOnly}
                    />
                  )
                }
              />
            </div>
          ))}
        </div>
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

      {type === 'secure_note' && (
        <form.AppField
          name="visible"
          children={(field) => (
            <field.SwitchField
              label="Visible"
              description="When off, the note is blurred in its detail until you choose to show it."
              disabled={readOnly}
            />
          )}
        />
      )}
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
      title="New item"
      confirmText="Save"
      defaultValues={{
        type: 'login',
        name: '',
        username: '',
        password: '',
        url: '',
        notes: '',
        folder_id: folderId ?? NO_FOLDER,
        visible: true,
        contact: contactFields(undefined),
        card: cardFields(undefined),
      }}
      loading={mutation.isPending}
      onSave={async (value) => {
        await mutation.mutateAsync({
          type: value.type,
          folder_id: toFolderId(value),
          ...(await encryptNewItem(keys, toSecret(value))),
        })
        toast('Item created')
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
      title={readOnly ? 'View item' : 'Edit item'}
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
        // A secure note may be kept blurred in the item's detail until revealed.
        visible: secret?.visible !== false,
        contact: contactFields(secret?.contact),
        card: cardFields(secret?.card),
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
              // What this form sets is not carried over from the old secret.
              keepUnedited(toSecret(value), secret && { ...secret, visible: undefined })
            ),
            // The API refuses the write if someone else changed the item since.
            revision: record.revision,
          })
        }

        const folderId = toFolderId(value)
        if (folderId !== record.folder_id) {
          await placementMutation.mutateAsync({
            folder_id: folderId,
            favorite: record.favorite,
          })
        }
        toast(readOnly ? 'Folder updated' : 'Item updated')
      }}
    />
  )
}
