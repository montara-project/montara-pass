import { useEffect, useRef, useState } from 'react'

import type { Models } from '@/lib/api/models'
import type { VaultItem } from '@/types/vault'

import { ShareFormSchema, type ShareFormDto } from '@/lib/api/dtos/vault/schema'
import { SHARE_ROLES } from '@/lib/constants/vault'
import { wrapItemKeyFor, type VaultKeys } from '@/lib/crypto/vault'

import { ApiError, getPublicKey, listItemMembers, shareItem, SignedOutError } from '../../lib/api'
import { checked, submit, useAppForm } from '../form'
import { ItemTile } from '../item-tile'

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
        onNotice(`Shared with ${recipient.name || recipient.email}`)
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
        setError(
          err instanceof ApiError && err.status === 409
            ? 'They already have access to this item.'
            : err instanceof Error
              ? err.message
              : 'Could not share the item'
        )
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
      </div>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <div className="row form-actions">
        <button type="button" className="secondary" onClick={onDone}>
          Done
        </button>
        <form.AppForm>
          <form.SubmitButton label="Share" busyLabel="Sharing…" />
        </form.AppForm>
      </div>

      <section className="stack">
        <h3 className="section-title">People with access</h3>
        {members === null ? (
          <p className="muted">Loading…</p>
        ) : (
          <ul className="items">
            {members.map((member) => (
              <li key={member.user_id}>
                <div className="item-text">
                  <span className="item-name">{member.name || member.email}</span>
                  <span className="muted">{member.email}</span>
                </div>
                <span className="muted role">{member.role}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="muted meta">
          To change someone's access or take it away, use the web app: it re-encrypts the item for
          the people who are left.
        </p>
      </section>
    </form>
  )
}
