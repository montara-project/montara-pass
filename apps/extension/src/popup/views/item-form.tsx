import type { VaultItem } from '@montara-pass/shared/types/vault'

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
  type ItemSecret,
  type VaultKeys,
} from '@montara-pass/shared/crypto/vault'
import { useStore } from '@tanstack/react-form'
import { useState } from 'react'

import { ApiError, createItem, setItemPlacement, SignedOutError, updateItem } from '../../lib/api'
import { fetchIcon } from '../../lib/icon'
import { ItemEditFormSchema, type ItemEditFormDto } from '../../lib/schemas'
import { checked, submit, useAppForm } from '../form'

/** Select value standing for "no folder". */
const NO_FOLDER = ''

export interface FolderOption {
  id: string
  name: string
}

function toSecret(value: ItemEditFormDto): ItemSecret {
  if (value.type === 'secure_note') {
    return { name: value.name, notes: value.notes }
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

interface ItemFormProps {
  keys: VaultKeys
  /** The item being edited; absent to create one. */
  item?: VaultItem
  /** The user's folders, names decrypted. */
  folders: FolderOption[]
  /** Called with the id of the saved item. */
  onSaved: (id: string) => void
  onCancel: () => void
  onSignedOut: () => void
}

/**
 * Create or edit an item in the full-screen view, with the same fields and
 * rules as the web app's item form. The content is encrypted here and the
 * server only receives ciphertext.
 */
export default function ItemForm({
  keys,
  item,
  folders,
  onSaved,
  onCancel,
  onSignedOut,
}: ItemFormProps) {
  // What saving said, as opposed to what the fields say about themselves.
  const [error, setError] = useState('')

  const defaultValues: ItemEditFormDto = {
    type: (item?.type as ItemType | undefined) ?? 'login',
    name: item?.secret?.name ?? '',
    username: item?.secret?.username ?? '',
    password: item?.secret?.password ?? '',
    url: item?.secret?.url ?? '',
    notes: item?.secret?.notes ?? '',
    folder_id: item?.folder_id ?? NO_FOLDER,
    // A secure note may be kept blurred in the item's detail until revealed.
    visible: item?.secret?.visible !== false,
    contact: contactFields(item?.secret?.contact),
    card: cardFields(item?.secret?.card),
  }

  const form = useAppForm({
    defaultValues,
    validationLogic: checked,
    validators: { onDynamic: ItemEditFormSchema },
    onSubmit: async ({ value }) => {
      setError('')

      const parsed = ItemEditFormSchema.parse(value)
      const folderId = parsed.folder_id || null

      try {
        const secret = keepUnedited(
          {
            ...toSecret(parsed),
            // Only "hidden" is written down; a note is visible without it.
            ...(parsed.type === 'secure_note' && !parsed.visible ? { visible: false } : {}),
          },
          // What this form sets is not carried over from the old secret.
          item?.secret && { ...item.secret, visible: undefined }
        )
        // A new login, a new site, or a site that had no icon last time.
        if (parsed.type === 'login' && !secret.icon) secret.icon = await fetchIcon(secret.url)

        if (item) {
          await updateItem(item.id, {
            encrypted_data: await encryptItemUpdate(keys, item, secret),
            // The API refuses the write if someone else changed the item since.
            revision: item.revision,
          })
          if (folderId !== item.folder_id) {
            await setItemPlacement(item.id, { folder_id: folderId, favorite: item.favorite })
          }
          onSaved(item.id)
        } else {
          const created = await createItem({
            type: parsed.type,
            folder_id: folderId,
            ...(await encryptNewItem(keys, secret)),
          })
          onSaved(created.id)
        }
      } catch (err) {
        if (err instanceof SignedOutError) {
          onSignedOut()
          return
        }
        setError(
          err instanceof ApiError && err.status === 409
            ? 'This item was changed somewhere else. Refresh the vault and try again.'
            : err instanceof Error
              ? err.message
              : 'Could not save the item'
        )
      }
    },
  })

  const type = useStore(form.store, (state) => state.values.type)

  return (
    <form
      className="stack detail-body"
      // The stylesheet gives a secure note's editor the room a login's notes do not need.
      data-type={type}
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        void submit(e.currentTarget, form)
      }}
    >
      <header>
        <h2 className="detail-title">{item ? 'Edit Item' : 'Create Item'}</h2>
        <p className="muted">Encrypted in your browser before it is saved.</p>
      </header>

      <div className="form-grid">
        <form.AppField
          name="type"
          children={(field) => (
            // The type of an existing item is fixed.
            <field.SelectField label="Type" required disabled={Boolean(item)}>
              {ItemTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </field.SelectField>
          )}
        />

        <form.AppField
          name="folder_id"
          children={(field) => (
            <field.SelectField label="Folder">
              <option value={NO_FOLDER}>No folder</option>
              {folders.map((folder) => (
                <option key={folder.id} value={folder.id}>
                  {folder.name}
                </option>
              ))}
            </field.SelectField>
          )}
        />
      </div>

      <form.AppField
        name="name"
        children={(field) => (
          <field.TextField label="Name" required placeholder="e.g. GitHub" autoFocus />
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
                generate
              />
            )}
          />

          <form.AppField
            name="url"
            children={(field) => <field.TextField label="URL" placeholder="https://example.com" />}
          />
        </>
      )}

      {type === 'contact' && (
        <div className="form-grid">
          {CONTACT_FIELDS.map((contactField) => (
            <div
              key={contactField.key}
              className={'wide' in contactField ? 'form-wide' : undefined}
            >
              <form.AppField
                name={`contact.${contactField.key}`}
                children={(field) => (
                  <field.TextField label={contactField.label} autoComplete="off" />
                )}
              />
            </div>
          ))}
        </div>
      )}

      {type === 'card' && (
        <div className="form-grid">
          {CARD_FIELDS.map((cardField) => (
            <div key={cardField.key} className={'wide' in cardField ? 'form-wide' : undefined}>
              <form.AppField
                name={`card.${cardField.key}`}
                children={(field) =>
                  'secret' in cardField ? (
                    <field.PasswordField label={cardField.label} autoComplete="off" />
                  ) : (
                    <field.TextField label={cardField.label} autoComplete="off" />
                  )
                }
              />
            </div>
          ))}
        </div>
      )}

      {/* Notes are Markdown for every type, edited as rich text. */}
      <form.AppField
        name="notes"
        children={(field) => (
          <field.NotesField
            label="Notes"
            placeholder={type === 'secure_note' ? 'Write your note' : 'anything else'}
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
            />
          )}
        />
      )}

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <div className="row form-actions">
        <button type="button" className="secondary" onClick={onCancel}>
          Cancel
        </button>
        <form.AppForm>
          <form.SubmitButton label={item ? 'Update' : 'Save'} busyLabel="Saving…" />
        </form.AppForm>
      </div>
    </form>
  )
}
