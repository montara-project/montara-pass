import {
  lazy,
  Suspense,
  useId,
  useState,
  type FormEvent,
  type ReactNode,
  type SelectHTMLAttributes,
} from 'react'

import type { VaultItem } from '@/types/vault'

import { ItemFormSchema, type ItemFormDto } from '@/lib/api/dtos/vault/schema'
import { ItemTypeOptions, type ItemType } from '@/lib/constants/vault'
import {
  encryptItemUpdate,
  encryptNewItem,
  keepIcon,
  type ItemSecret,
  type VaultKeys,
} from '@/lib/crypto/vault'
import { generatePassword } from '@/lib/password'

import { ApiError, createItem, setItemPlacement, SignedOutError, updateItem } from '../../lib/api'
import { fetchIcon } from '../../lib/icon'
import { ChevronDownIcon, EyeIcon, EyeOffIcon } from '../icons'

/** Select value standing for "no folder". */
const NO_FOLDER = ''

export interface FolderOption {
  id: string
  name: string
}

type FieldName = keyof ItemFormDto
type FieldErrors = Partial<Record<FieldName, string>>

// The notes editor is fetched when this form is opened, and so stays out of
// the popup's first load.
const NotesEditor = lazy(() => import('../notes-editor'))

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

/** The first message per field, in the words the web app uses. */
function validate(value: ItemFormDto): FieldErrors {
  const result = ItemFormSchema.safeParse(value)
  if (result.success) return {}

  const errors: FieldErrors = {}
  for (const issue of result.error.issues) {
    const field = issue.path[0] as FieldName
    errors[field] ??= issue.message
  }
  return errors
}

interface FieldProps {
  label: string
  required?: boolean
  error?: string
  children: (props: {
    id: string
    'aria-required'?: true
    'aria-invalid'?: true
    'aria-describedby'?: string
  }) => ReactNode
}

function Field({ label, required, error, children }: FieldProps) {
  const id = useId()
  const errorId = `${id}-error`

  return (
    <div className="form-field">
      <div className="form-label">
        <label htmlFor={id}>{label}</label>
        {/* Kept out of the label so the field is still called "Name". */}
        {required && (
          <span className="asterisk" aria-hidden="true">
            *
          </span>
        )}
      </div>
      {children({
        id,
        ...(required ? { 'aria-required': true as const } : {}),
        ...(error ? { 'aria-invalid': true as const, 'aria-describedby': errorId } : {}),
      })}
      {error && (
        <p className="error field-error" id={errorId}>
          {error}
        </p>
      )}
    </div>
  )
}

/**
 * A native select drawn like the other fields: the browser's own arrow and
 * inner padding are dropped, and the chevron is ours.
 */
function Select({ children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="select-box">
      <select {...props}>{children}</select>
      <ChevronDownIcon width={16} height={16} />
    </div>
  )
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
  const [value, setValue] = useState<ItemFormDto>({
    type: (item?.type as ItemType | undefined) ?? 'login',
    name: item?.secret?.name ?? '',
    username: item?.secret?.username ?? '',
    password: item?.secret?.password ?? '',
    url: item?.secret?.url ?? '',
    notes: item?.secret?.notes ?? '',
    folder_id: item?.folder_id ?? NO_FOLDER,
  })
  const notesId = useId()
  const [errors, setErrors] = useState<FieldErrors>({})
  // Fields are checked as they change once a save has been attempted.
  const [submitted, setSubmitted] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const set = (field: FieldName, next: string) => {
    const updated = { ...value, [field]: next }
    setValue(updated)
    if (submitted) setErrors(validate(updated))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
    setError('')

    const found = validate(value)
    setErrors(found)
    if (Object.keys(found).length > 0) return

    const parsed = ItemFormSchema.parse(value)
    const folderId = parsed.folder_id || null
    setBusy(true)

    try {
      const secret = keepIcon(toSecret(parsed), item?.secret)
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
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="stack detail-body" noValidate onSubmit={(e) => void handleSubmit(e)}>
      <header>
        <h2 className="detail-title">{item ? 'Edit Item' : 'Create Item'}</h2>
        <p className="muted">Encrypted in your browser before it is saved.</p>
      </header>

      <div className="form-grid">
        <Field label="Type" required error={errors.type}>
          {(props) => (
            <Select
              {...props}
              value={value.type}
              onChange={(e) => set('type', e.target.value)}
              // The type of an existing item is fixed.
              disabled={Boolean(item)}
            >
              {ItemTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          )}
        </Field>

        <Field label="Folder" error={errors.folder_id}>
          {(props) => (
            <Select
              {...props}
              value={value.folder_id}
              onChange={(e) => set('folder_id', e.target.value)}
            >
              <option value={NO_FOLDER}>No folder</option>
              {folders.map((folder) => (
                <option key={folder.id} value={folder.id}>
                  {folder.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>

      <Field label="Name" required error={errors.name}>
        {(props) => (
          <input
            {...props}
            value={value.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="e.g. GitHub"
            autoFocus
          />
        )}
      </Field>

      {value.type === 'login' && (
        <>
          <Field label="Username" error={errors.username}>
            {(props) => (
              <input
                {...props}
                value={value.username}
                onChange={(e) => set('username', e.target.value)}
                placeholder="username or email"
                autoComplete="off"
              />
            )}
          </Field>

          <Field label="Password" error={errors.password}>
            {(props) => (
              <div className="row">
                <div className="password-box">
                  <input
                    {...props}
                    type={showPassword ? 'text' : 'password'}
                    value={value.password}
                    onChange={(e) => set('password', e.target.value)}
                    placeholder="password"
                    autoComplete="off"
                  />
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                    onClick={() => setShowPassword((shown) => !shown)}
                  >
                    {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => {
                    set('password', generatePassword())
                    setShowPassword(true)
                  }}
                >
                  Generate
                </button>
              </div>
            )}
          </Field>

          <Field label="URL" error={errors.url}>
            {(props) => (
              <input
                {...props}
                value={value.url}
                onChange={(e) => set('url', e.target.value)}
                placeholder="https://example.com"
              />
            )}
          </Field>
        </>
      )}

      {/* Notes are Markdown for every type, edited as rich text. */}
      <div className="form-field">
        <div className="form-label">
          <span id={notesId}>Notes</span>
        </div>
        <Suspense fallback={<div className="notes-editor notes-loading" />}>
          <NotesEditor
            value={value.notes ?? ''}
            onChange={(notes) => set('notes', notes)}
            placeholder={value.type === 'secure_note' ? 'Write your note' : 'anything else'}
            labelledBy={notesId}
          />
        </Suspense>
        {errors.notes && <p className="error field-error">{errors.notes}</p>}
      </div>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <div className="row form-actions">
        <button type="button" className="secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" disabled={busy}>
          {busy ? 'Saving…' : item ? 'Update' : 'Save'}
        </button>
      </div>
    </form>
  )
}
