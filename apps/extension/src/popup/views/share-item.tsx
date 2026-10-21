import type { Models } from '@montara-pass/shared/api/models'
import type { VaultItem } from '@montara-pass/shared/types/vault'

import { ShareFormSchema, type ShareFormDto } from '@montara-pass/shared/api/dtos/vault/schema'
import { SHARE_ROLES } from '@montara-pass/shared/constants/vault'
import { wrapItemKeyFor, type VaultKeys } from '@montara-pass/shared/crypto/vault'
import { useEffect, useRef, useState } from 'react'

import { ApiError, getPublicKey, listItemMembers, shareItem, SignedOutError } from '../../lib/api'
import { checked, submit, useAppForm } from '../form'
import { ItemTile } from '../item-tile'
import { initials } from '../layout'

interface ShareItemProps {
  keys: VaultKeys
  /** An item the signed-in user owns. */
  item: VaultItem
  onDone: () => void
  onSignedOut: () => void
  /** Says what just happened, in the view's toast. */
  onNotice: (notice: string) => void
}

/**
 * Share an item with another user. The item's key is wrapped with the
 * recipient's public key here; the server passes it along and cannot open
 * it. Changing a role or taking access away is done in the web app, which
 * re-encrypts the item for the people who are left.
 */
export default function ShareItem({ keys, item, onDone, onSignedOut, onNotice }: ShareItemProps) {
  const [members, setMembers] = useState<Models.ItemMember[] | null>(null)
  // What sharing said, as opposed to what the fields say about themselves.
  const [error, setError] = useState('')
  const sharing = useRef(false)

  useEffect(() => {
    void listItemMembers(item.id)
      .then(setMembers)
      // The list only informs; sharing works without it.
      .catch(() => setMembers([]))
  }, [item.id])

  const defaultValues: ShareFormDto = { email: '', role: 'viewer' }

  const form = useAppForm({
    defaultValues,
    validationLogic: checked,
    validators: { onDynamic: ShareFormSchema },
    onSubmit: async ({ value, formApi }) => {
      // A second submit can arrive before the button is drawn as disabled.
      if (sharing.current) return
      sharing.current = true
      setError('')

      const { email, role } = ShareFormSchema.parse(value)

      try {
        const recipient = await getPublicKey(email)
        if (!recipient) {
          setError(`${email} has no vault yet. They need to sign up and create one first.`)
          return
        }

        await shareItem(item.id, {
          user_id: recipient.user_id,
          role,
          encrypted_item_key: await wrapItemKeyFor(keys, item, recipient),
        })
        onNotice(`Shared with ${recipient.email}`)
        // Ready for the next person, with the same access as the last.
        formApi.resetField('email')
        // The share went through; a list that fails to reload stays as it was.
        await listItemMembers(item.id)
          .then(setMembers)
          .catch(() => undefined)
      } catch (err) {
        if (err instanceof SignedOutError) {
          onSignedOut()
          return
        }
        if (err instanceof ApiError && err.status === 409) {
          setError('They already have access to this item.')
        } else if (err instanceof Error) {
          setError(err.message)
        } else {
          setError('Could not share the item')
        }
      } finally {
        sharing.current = false
      }
    },
  })

  return (
    <form
      className="stack detail-body"
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        void submit(e.currentTarget, form)
      }}
    >
      <header className="detail-head">
        <ItemTile item={item} large />
        <div className="item-text">
          <h2 className="detail-title">Share {item.secret!.name}</h2>
          <span className="muted">Encrypted for them in this browser.</span>
        </div>
      </header>

      <div className="share-grid">
        <form.AppField
          name="email"
          children={(field) => (
            <field.TextField
              label="Email"
              type="email"
              placeholder="their account email"
              autoFocus
            />
          )}
        />

        <form.AppField
          name="role"
          children={(field) => (
            <field.SelectField label="Access">
              {SHARE_ROLES.map((value) => (
                <option key={value} value={value}>
                  {value[0].toUpperCase() + value.slice(1)}
                </option>
              ))}
            </field.SelectField>
          )}
        />

        {/* In the row it sends: who, with what access, and the way to say so. */}
        <div className="share-submit">
          <form.AppForm>
            <form.SubmitButton label="Share" busyLabel="Sharing…" />
          </form.AppForm>
        </div>
      </div>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <section className="share-people" aria-labelledby="share-people">
        <h3 id="share-people">People with access</h3>
        {members === null ? (
          <p className="muted">Loading…</p>
        ) : (
          members.length > 0 && (
            // Rows in one card, a line between them: who, and what they may do.
            <ul className="share-members">
              {members.map((member) => (
                <li key={member.user_id}>
                  <span className="avatar" aria-hidden="true">
                    {initials(member.name || member.email)}
                  </span>
                  <div className="item-text">
                    <span className="item-name">{member.name || member.email}</span>
                    <span className="muted">{member.email}</span>
                  </div>
                  <span className="muted role">{member.role}</span>
                </li>
              ))}
            </ul>
          )
        )}
        <p className="muted meta">
          To change someone's access or take it away, use the web app: it re-encrypts the item for
          the people who are left.
        </p>
      </section>

      <div className="row form-actions">
        <button type="button" className="secondary" onClick={onDone}>
          Done
        </button>
      </div>
    </form>
  )
}
